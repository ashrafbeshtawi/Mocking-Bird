import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const result = await pool.query(
      `SELECT id, channel_id, channel_title, channel_username
       FROM connected_telegram_channels
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return NextResponse.json({
      channels: result.rows.map((row) => ({
        id: row.id.toString(),
        channel_id: row.channel_id,
        channel_title: row.channel_title,
        channel_username: row.channel_username,
      })),
    });
  } catch (error) {
    console.error('[Telegram Get Channels Error]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
