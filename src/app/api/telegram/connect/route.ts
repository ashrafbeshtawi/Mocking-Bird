import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { TelegramPublisher } from '@/lib/publishers/telegram';
import { verifyTelegramAuth, isAuthDateValid, TelegramLoginData } from '@/lib/telegram/auth';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { channel_id, telegram_auth } = body as {
      channel_id: string;
      telegram_auth: TelegramLoginData;
    };

    if (!channel_id) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    if (!telegram_auth) {
      return NextResponse.json(
        { error: 'Telegram authentication is required' },
        { status: 400 }
      );
    }

    // Check if bot token is configured
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: 'Telegram bot is not configured' },
        { status: 500 }
      );
    }

    // Verify Telegram auth data
    if (!verifyTelegramAuth(telegram_auth, botToken)) {
      return NextResponse.json(
        { error: 'Invalid Telegram authentication' },
        { status: 401 }
      );
    }

    // Check auth is not expired (1 hour max)
    if (!isAuthDateValid(telegram_auth.auth_date)) {
      return NextResponse.json(
        { error: 'Telegram authentication has expired. Please log in again.' },
        { status: 401 }
      );
    }

    // Validate channel access with user's Telegram ID
    const publisher = new TelegramPublisher(pool);
    const validation = await publisher.validateChannelAccess(channel_id, telegram_auth.id);

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

    // Save to database
    const result = await pool.query(
      `INSERT INTO connected_telegram_channels (user_id, channel_id, channel_title, channel_username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, channel_id, validation.channelTitle, validation.channelUsername]
    );

    console.log(`[Telegram Connect] Channel ${channel_id} connected for user ${userId} (verified Telegram user: ${telegram_auth.id})`);

    return NextResponse.json({
      success: true,
      channel: {
        id: result.rows[0].id.toString(),
        channel_id,
        channel_title: validation.channelTitle,
        channel_username: validation.channelUsername,
      },
    });
  } catch (error) {
    console.error('[Telegram Connect Error]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
