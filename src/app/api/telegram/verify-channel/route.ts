import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { TelegramPublisher } from '@/lib/publishers/telegram';
import crypto from 'crypto';
import { getAuthUserId } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('TelegramVerify');

const VERIFICATION_TTL_SECONDS = 10 * 60;
const UPDATES_PAGE_SIZE = 100;
// Telegram keeps unconfirmed updates for 24h; this bounds one scan at 10k updates.
const MAX_UPDATE_PAGES = 100;
const CODE_PATTERN = /MB-[0-9A-F]{8}/g;

interface TelegramChannelPost {
  message_id: number;
  chat?: { id?: number };
  text?: string;
  caption?: string;
}

interface TelegramUpdate {
  update_id: number;
  channel_post?: TelegramChannelPost;
}

class UpdatesError extends Error {}

// Short, easy-to-copy verification code
function generateVerificationCode(): string {
  return 'MB-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Reads every pending channel post and confirms it (offset = last update_id + 1), paging
 * until Telegram returns no more updates. Confirmed updates are gone for good, so the
 * caller must record codes for all pending verifications, not just the requester's.
 */
async function readNewChannelPosts(baseUrl: string): Promise<TelegramChannelPost[]> {
  const posts: TelegramChannelPost[] = [];
  let offset: number | undefined;

  for (let page = 0; page < MAX_UPDATE_PAGES; page++) {
    const response = await fetch(`${baseUrl}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offset,
        limit: UPDATES_PAGE_SIZE,
        timeout: 0,
        allowed_updates: ['channel_post'],
      }),
    });
    const data = await response.json();

    if (!data.ok) {
      logger.error('getUpdates failed', data);
      if (data.error_code === 409) {
        throw new UpdatesError(
          /webhook/i.test(data.description ?? '')
            ? 'The Telegram bot has a webhook set, so channel posts cannot be read. Remove the webhook (deleteWebhook) and try again.'
            : 'Another check is reading Telegram updates right now. Please try again in a moment.'
        );
      }
      throw new UpdatesError('Failed to verify. Please try again.');
    }

    const updates: TelegramUpdate[] = data.result ?? [];
    if (updates.length === 0) break;

    for (const update of updates) {
      if (update.channel_post) posts.push(update.channel_post);
    }
    offset = Math.max(...updates.map((u) => u.update_id)) + 1;
  }

  return posts;
}

/**
 * Marks pending verifications whose code was posted in the matching channel (by numeric
 * chat id) as verified, and removes the code posts from the channel.
 */
async function recordCodePosts(baseUrl: string, posts: TelegramChannelPost[]): Promise<void> {
  for (const post of posts) {
    const chatId = post.chat?.id;
    if (chatId === undefined) continue;

    const codes = new Set(`${post.text ?? ''}\n${post.caption ?? ''}`.match(CODE_PATTERN) ?? []);
    for (const code of codes) {
      const result = await pool.query(
        `UPDATE telegram_verifications SET verified_at = NOW()
         WHERE code = $1 AND chat_id = $2 AND verified_at IS NULL AND expires_at > NOW()
         RETURNING id`,
        [code, String(chatId)]
      );
      if (!result.rowCount) continue;

      // Keep the channel clean; failing to delete does not affect verification
      try {
        await fetch(`${baseUrl}/deleteMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, message_id: post.message_id }),
        });
      } catch {
        // ignore
      }
    }
  }
}

/**
 * POST: Start verification process - generates a code for the user to post
 */
export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { channel_id } = await req.json();
    if (!channel_id) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ error: 'Telegram bot is not configured' }, { status: 500 });
    }

    // Validate that the channel exists and bot is admin
    const publisher = new TelegramPublisher(pool);
    const validation = await publisher.validateChannelAccess(channel_id);

    if (!validation.valid || !validation.chatId) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const existing = await pool.query(
      'SELECT id FROM connected_telegram_channels WHERE user_id = $1 AND channel_id = $2',
      [userId, channel_id]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Channel already connected' }, { status: 400 });
    }

    await pool.query('DELETE FROM telegram_verifications WHERE expires_at < NOW()');

    const verificationCode = generateVerificationCode();
    await pool.query(
      `INSERT INTO telegram_verifications (user_id, channel_id, chat_id, code, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + make_interval(secs => $5))
       ON CONFLICT (user_id, channel_id) DO UPDATE
       SET chat_id = EXCLUDED.chat_id, code = EXCLUDED.code,
           expires_at = EXCLUDED.expires_at, verified_at = NULL, created_at = NOW()`,
      [userId, channel_id, validation.chatId, verificationCode, VERIFICATION_TTL_SECONDS]
    );

    logger.info('Generated verification code', { channel_id, chatId: validation.chatId });

    return NextResponse.json({
      success: true,
      verification_code: verificationCode,
      channel_title: validation.channelTitle,
      channel_username: validation.channelUsername,
      expires_in: VERIFICATION_TTL_SECONDS,
    });
  } catch (error) {
    logger.error('Failed to start verification', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PUT: Check if verification code was posted in channel, then connect
 */
export async function PUT(req: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { channel_id } = await req.json();
    if (!channel_id) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Telegram bot is not configured' }, { status: 500 });
    }

    const pendingQuery =
      'SELECT id, verified_at, expires_at < NOW() AS expired FROM telegram_verifications WHERE user_id = $1 AND channel_id = $2';
    const pendingResult = await pool.query(pendingQuery, [userId, channel_id]);
    const pending = pendingResult.rows[0];

    if (!pending) {
      return NextResponse.json(
        { error: 'No pending verification found. Please start the verification process again.' },
        { status: 400 }
      );
    }

    if (pending.expired && !pending.verified_at) {
      await pool.query('DELETE FROM telegram_verifications WHERE id = $1', [pending.id]);
      return NextResponse.json(
        { error: 'Verification code has expired. Please start again.' },
        { status: 400 }
      );
    }

    let verified = Boolean(pending.verified_at);
    if (!verified) {
      const baseUrl = `https://api.telegram.org/bot${botToken}`;
      try {
        await recordCodePosts(baseUrl, await readNewChannelPosts(baseUrl));
      } catch (error) {
        if (error instanceof UpdatesError) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        throw error;
      }

      const recheck = await pool.query(pendingQuery, [userId, channel_id]);
      verified = Boolean(recheck.rows[0]?.verified_at);
    }

    if (!verified) {
      return NextResponse.json({
        success: false,
        verified: false,
        message: 'Verification code not found. Please post the code in your channel and try again.',
      });
    }

    // Verification successful - connect the channel
    const publisher = new TelegramPublisher(pool);
    const validation = await publisher.validateChannelAccess(channel_id);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO connected_telegram_channels (user_id, channel_id, channel_title, channel_username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, channel_id, validation.channelTitle, validation.channelUsername]
    );

    await pool.query('DELETE FROM telegram_verifications WHERE id = $1', [pending.id]);

    logger.info('Channel verified and connected', { channel_id, userId });

    return NextResponse.json({
      success: true,
      verified: true,
      channel: {
        id: result.rows[0].id.toString(),
        channel_id,
        channel_title: validation.channelTitle,
        channel_username: validation.channelUsername,
      },
    });
  } catch (error) {
    logger.error('Failed to check verification', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
