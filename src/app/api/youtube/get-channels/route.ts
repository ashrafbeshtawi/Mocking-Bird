import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('YouTubeGetChannels');

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { rows } = await pool.query(
      'SELECT channel_id, title FROM connected_youtube_channels WHERE user_id = $1',
      [userId]
    );
    return NextResponse.json({
      success: true,
      channels: rows.map((row) => ({ id: row.channel_id, name: row.title })),
    });
  } catch (error) {
    logger.error('Failed to load YouTube channels', error);
    return NextResponse.json({ error: 'Failed to retrieve connected YouTube channels' }, { status: 500 });
  }
}
