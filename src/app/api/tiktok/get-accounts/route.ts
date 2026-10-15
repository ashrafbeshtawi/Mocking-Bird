import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('TikTokGetAccounts');

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { rows } = await pool.query(
      'SELECT open_id, display_name FROM connected_tiktok_accounts WHERE user_id = $1',
      [userId]
    );
    return NextResponse.json({
      success: true,
      accounts: rows.map((row) => ({ id: row.open_id, name: row.display_name })),
    });
  } catch (error) {
    logger.error('Failed to load TikTok accounts', error);
    return NextResponse.json({ error: 'Failed to retrieve connected TikTok accounts' }, { status: 500 });
  }
}
