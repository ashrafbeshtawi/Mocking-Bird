import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_STRING, // Assuming DATABASE_URL is used consistently
});

export async function DELETE(req: NextRequest) {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { x_user_id } = body; // Use x_user_id for Twitter v1.1 accounts

    if (!x_user_id) {
      return NextResponse.json({ error: 'X User ID is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM connected_x_accounts_v1_1 WHERE x_user_id = $1 AND user_id = $2 RETURNING id',
        [x_user_id, userId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'X v1.1 account not found or not authorized to delete' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'X v1.1 account disconnected successfully' });

    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      return NextResponse.json({ error: 'Failed to delete X v1.1 account from database' }, { status: 500 });
    } finally {
      client.release();
    }

  } catch (parseError) {
    console.error('Failed to parse request body:', parseError);
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }
}
