import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { TelegramPublisher } from '@/lib/publishers/telegram';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if bot token is configured
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return NextResponse.json(
        { error: 'Telegram bot is not configured', bot_username: null, bot_id: null },
        { status: 200 }
      );
    }

    const publisher = new TelegramPublisher(pool);
    const botInfo = await publisher.getBotInfo();

    return NextResponse.json({
      bot_username: botInfo?.username || null,
      bot_id: botInfo?.id || null,
    });
  } catch (error) {
    console.error('[Telegram Bot Info Error]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
