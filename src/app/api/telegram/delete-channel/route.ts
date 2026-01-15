import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function DELETE(req: NextRequest) {
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

    const result = await pool.query(
      'DELETE FROM connected_telegram_channels WHERE user_id = $1 AND channel_id = $2 RETURNING id',
      [userId, channel_id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    console.log(`[Telegram Delete] Channel ${channel_id} deleted for user ${userId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Telegram Delete Channel Error]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
