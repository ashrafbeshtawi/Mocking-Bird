import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';


export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT x_user_id, username FROM connected_x_accounts WHERE user_id = $1',
        [userId]
      );

      return NextResponse.json({
        success: true,
        accounts: result.rows.map(row => ({ id: row.x_user_id, name: row.username }))
      });

    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      return NextResponse.json({ error: 'Failed to retrieve connected X accounts from database' }, { status: 500 });
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
