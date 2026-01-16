import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
// GET /api/instagram - Get all connected Instagram accounts for the current user
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const client = await pool.connect();
    try {
      // Join connected_instagram_accounts with connected_facebook_pages and users
      // to ensure the Instagram account is associated with a Facebook page
      // that belongs to the authenticated user.
      const result = await client.query(
        `SELECT
            cia.id,
            cia.instagram_account_id,
            cia.username,
            cia.display_name,
            cia.facebook_page_id
         FROM connected_instagram_accounts cia
         JOIN connected_facebook_pages cfp ON cia.facebook_page_id = cfp.id
         WHERE cfp.user_id = $1`,
        [userId]
      );

      return NextResponse.json({
        success: true,
        accounts: result.rows.map(row => ({
          id: row.instagram_account_id,
          username: row.username,
          displayName: row.display_name,
          facebookPageId: row.facebook_page_id,
        }))
      });

    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      return NextResponse.json({ error: 'Failed to retrieve connected Instagram accounts from database' }, { status: 500 });
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// DELETE /api/instagram - Disconnect an Instagram account
export async function DELETE(req: NextRequest) {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { instagram_account_id } = body;

    if (!instagram_account_id) {
      return NextResponse.json({ error: 'Instagram account ID is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // Ensure the Instagram account belongs to a Facebook page connected to the authenticated user
      const result = await client.query(
        `DELETE FROM connected_instagram_accounts cia
         USING connected_facebook_pages cfp
         WHERE cia.facebook_page_id = cfp.id
           AND cfp.user_id = $1
           AND cia.instagram_account_id = $2
         RETURNING cia.id`,
        [userId, instagram_account_id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Instagram account not found or not authorized to delete' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'Instagram account disconnected successfully' });

    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      return NextResponse.json({ error: 'Failed to delete Instagram account from database' }, { status: 500 });
    } finally {
      client.release();
    }

  } catch (parseError) {
    console.error('Failed to parse request body:', parseError);
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }
}
