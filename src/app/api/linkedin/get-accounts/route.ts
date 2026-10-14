import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('LinkedInGetAccounts');

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { rows } = await pool.query(
      'SELECT linkedin_user_id, name, expires_at FROM connected_linkedin_accounts WHERE user_id = $1',
      [userId]
    );
    return NextResponse.json({
      success: true,
      accounts: rows.map((row) => ({ id: row.linkedin_user_id, name: row.name, expiresAt: row.expires_at })),
    });
  } catch (error) {
    logger.error('Failed to load LinkedIn accounts', error);
    return NextResponse.json({ error: 'Failed to retrieve connected LinkedIn accounts' }, { status: 500 });
  }
}
