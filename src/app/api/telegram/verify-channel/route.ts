import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { TelegramPublisher } from '@/lib/publishers/telegram';
import crypto from 'crypto';

// Store pending verifications in memory (in production, use Redis or database)
const pendingVerifications = new Map<string, {
  visitorCode: string;
  channelId: string;
  userId: string;
  expiresAt: number;
}>();

// Generate a short, easy-to-copy verification code
function generateVerificationCode(): string {
  return 'MB-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Clean up expired verifications
function cleanupExpired() {
  const now = Date.now();
  for (const [key, value] of pendingVerifications) {
    if (value.expiresAt < now) {
      pendingVerifications.delete(key);
    }
  }
}

/**
 * POST: Start verification process - generates a code for the user to post
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { channel_id } = await req.json();
    if (!channel_id) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    // Check if bot token is configured
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return NextResponse.json(
        { error: 'Telegram bot is not configured' },
        { status: 500 }
      );
    }

    // Validate that the channel exists and bot is admin
    const publisher = new TelegramPublisher(pool);
    const validation = await publisher.validateChannelAccess(channel_id);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check if already connected
    const existing = await pool.query(
      'SELECT id FROM connected_telegram_channels WHERE user_id = $1 AND channel_id = $2',
      [userId, channel_id]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Channel already connected' },
        { status: 400 }
      );
    }

    // Clean up old verifications
    cleanupExpired();

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationKey = `${userId}-${channel_id}`;

    // Store pending verification (expires in 10 minutes)
    pendingVerifications.set(verificationKey, {
      visitorCode: verificationCode,
      channelId: channel_id,
      userId,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    console.log(`[Telegram Verify] Generated code ${verificationCode} for channel ${channel_id}`);

    return NextResponse.json({
      success: true,
      verification_code: verificationCode,
      channel_title: validation.channelTitle,
      channel_username: validation.channelUsername,
      expires_in: 600, // 10 minutes in seconds
    });
  } catch (error) {
    console.error('[Telegram Verify Error]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Check if verification code was posted in channel, then connect
 */
export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { channel_id } = await req.json();
    if (!channel_id) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: 'Telegram bot is not configured' },
        { status: 500 }
      );
    }

    // Get pending verification
    const verificationKey = `${userId}-${channel_id}`;
    const pending = pendingVerifications.get(verificationKey);

    if (!pending) {
      return NextResponse.json(
        { error: 'No pending verification found. Please start the verification process again.' },
        { status: 400 }
      );
    }

    if (pending.expiresAt < Date.now()) {
      pendingVerifications.delete(verificationKey);
      return NextResponse.json(
        { error: 'Verification code has expired. Please start again.' },
        { status: 400 }
      );
    }

    // Check recent messages in the channel for the verification code
    const baseUrl = `https://api.telegram.org/bot${botToken}`;

    // Use getUpdates with allowed_updates to get channel posts
    // Actually, we need to use a different approach - check channel history
    // Telegram bots can't easily read channel history without being admin
    // But since our bot IS admin, we can use the getChat approach

    // Alternative: Try to get recent messages via updates or use a webhook
    // For simplicity, let's check if there's a message with our code
    // by fetching updates (this requires the bot to have received the message)

    // Simpler approach: Since only admins can post, and we're checking for the code,
    // we'll trust that if they can provide the code back, they saw it in the channel
    // But this defeats the purpose...

    // Best approach: Use getUpdates to check for messages in the channel
    const updatesResponse = await fetch(`${baseUrl}/getUpdates?limit=100&allowed_updates=["channel_post"]`);
    const updatesData = await updatesResponse.json();

    if (!updatesData.ok) {
      console.error('[Telegram Verify] Failed to get updates:', updatesData);
      return NextResponse.json(
        { error: 'Failed to verify. Please try again.' },
        { status: 500 }
      );
    }

    // Look for a channel post with our verification code
    const channelPosts = updatesData.result || [];
    let verified = false;

    for (const update of channelPosts) {
      const post = update.channel_post;
      if (!post) continue;

      // Check if this is from our target channel
      const postChatId = post.chat?.id?.toString();

      // Match by chat ID or username
      const chatMatches = postChatId === channel_id ||
                          postChatId === channel_id.replace('@', '') ||
                          post.chat?.username === channel_id.replace('@', '');

      if (chatMatches && post.text?.includes(pending.visitorCode)) {
        verified = true;

        // Optionally delete the verification message to keep channel clean
        try {
          await fetch(`${baseUrl}/deleteMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: channel_id,
              message_id: post.message_id,
            }),
          });
        } catch {
          // Ignore deletion errors
        }

        break;
      }
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

    // Save to database
    const result = await pool.query(
      `INSERT INTO connected_telegram_channels (user_id, channel_id, channel_title, channel_username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, channel_id, validation.channelTitle, validation.channelUsername]
    );

    // Clean up pending verification
    pendingVerifications.delete(verificationKey);

    console.log(`[Telegram Verify] Channel ${channel_id} verified and connected for user ${userId}`);

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
    console.error('[Telegram Verify Check Error]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
