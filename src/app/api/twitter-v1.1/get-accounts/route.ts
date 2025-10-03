import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_STRING, // Assuming DATABASE_URL is used consistently
});

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT x_user_id, screen_name FROM connected_x_accounts_v1_1 WHERE user_id = $1',
        [userId]
      );

      return NextResponse.json({
        success: true,
        accounts: result.rows.map(row => ({ id: row.x_user_id, name: row.screen_name }))
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