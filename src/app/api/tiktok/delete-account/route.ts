import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';
import { revokeTikTokTokens } from '@/lib/publishers/tiktok';

const logger = createLogger('TikTokDeleteAccount');

export async function DELETE(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { open_id } = body ?? {};
  if (typeof open_id !== 'string' || !open_id) {
    return NextResponse.json({ error: 'open_id is required' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `DELETE FROM connected_tiktok_accounts WHERE open_id = $1 AND user_id = $2
       RETURNING access_token, refresh_token, expires_at`,
      [open_id, userId]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'TikTok account not found' }, { status: 404 });
    }
    await revokeTikTokTokens(result.rows);
    return NextResponse.json({ success: true, message: 'TikTok account disconnected successfully' });
  } catch (error) {
    logger.error('Failed to delete TikTok account', error);
    return NextResponse.json({ error: 'Failed to delete TikTok account' }, { status: 500 });
  }
}
