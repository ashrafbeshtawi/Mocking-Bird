import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function DELETE(req: NextRequest) {
  try {
    // 1. Get user_id from the custom 'x-user-id' header set by the middleware
    const userId = req.headers.get('x-user-id');

    // If middleware is correctly configured and working, userId should always be present.
    // This check acts as a safeguard.
    if (!userId) {
      console.error('[DeletePage API Error] User ID not found in headers. Middleware might be missing or failed.');
      return NextResponse.json({ error: 'Authentication required: User ID not provided.' }, { status: 401 });
    }

    // 2. Ensure userId is parsed to INTEGER as per schema if it comes as string from header
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      console.error(`[DeletePage API Error] Invalid user ID format in header: ${userId}`);
      return NextResponse.json({ error: 'Invalid user ID format.' }, { status: 400 });
    }

    const { page_id } = await req.json();

    if (!page_id) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
    }

    // 3. Connect to the database
    const client = await pool.connect();
    console.log(`Connected to database for user ${parsedUserId} to delete page ${page_id}.`);
    try {
      // 4. Delete the Facebook page from the database, ensuring it belongs to the user
      const result = await client.query(
        'DELETE FROM connected_facebook_pages WHERE page_id = $1 AND user_id = $2 RETURNING page_id',
        [page_id, parsedUserId]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Page not found or not authorized to delete' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Facebook page deleted successfully' });
    } finally {
      client.release(); // Always release the client back to the pool
    }
  } catch (error) {
    console.error('[DeletePage API Error]', error);
    // Provide a generic error message for security, log the specific error on the server
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
