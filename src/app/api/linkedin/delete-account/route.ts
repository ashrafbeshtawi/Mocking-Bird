import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('LinkedInDeleteAccount');

export async function DELETE(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { linkedin_user_id } = body ?? {};
  if (typeof linkedin_user_id !== 'string' || !linkedin_user_id) {
    return NextResponse.json({ error: 'linkedin_user_id is required' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      'DELETE FROM connected_linkedin_accounts WHERE linkedin_user_id = $1 AND user_id = $2 RETURNING id',
      [linkedin_user_id, userId]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'LinkedIn account not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'LinkedIn account disconnected successfully' });
  } catch (error) {
    logger.error('Failed to delete LinkedIn account', error);
    return NextResponse.json({ error: 'Failed to delete LinkedIn account' }, { status: 500 });
  }
}
