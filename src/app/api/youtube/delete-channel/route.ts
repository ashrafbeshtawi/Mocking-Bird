import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('YouTubeDeleteChannel');

export async function DELETE(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { channel_id } = body ?? {};
  if (typeof channel_id !== 'string' || !channel_id) {
    return NextResponse.json({ error: 'channel_id is required' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      'DELETE FROM connected_youtube_channels WHERE channel_id = $1 AND user_id = $2 RETURNING id',
      [channel_id, userId]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'YouTube channel not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'YouTube channel disconnected successfully' });
  } catch (error) {
    logger.error('Failed to delete YouTube channel', error);
    return NextResponse.json({ error: 'Failed to delete YouTube channel' }, { status: 500 });
  }
}
