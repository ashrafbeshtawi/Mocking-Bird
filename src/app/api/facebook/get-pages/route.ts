// app/api/get-pages/route.ts

import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';

export async function GET() {
  try {
    // 1. Get user_id from the session
    const userId = await getAuthUserId();

    // This check acts as a safeguard.
    if (!userId) {
      console.error('[GetPages API Error] User ID not found in session.');
      return NextResponse.json({ error: 'Authentication required: User ID not provided.' }, { status: 401 });
    }

    // 2. Ensure userId is parsed to INTEGER as per schema if it comes as string from header
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      console.error(`[GetPages API Error] Invalid user ID format in header: ${userId}`);
      return NextResponse.json({ error: 'Invalid user ID format.' }, { status: 400 });
    }

    // 3. Connect to the database
    const client = await pool.connect();
    console.log(`Connected to database for user ${parsedUserId} to retrieve pages.`);
    try {
      // 4. Query the 'facebook_pages' table to get all pages for the user
      const { rows: pages } = await client.query(
        'SELECT page_id, page_name FROM connected_facebook_pages WHERE user_id = $1',
        [parsedUserId]
      );

      return NextResponse.json({ success: true, pages });
    } finally {
      client.release(); // Always release the client back to the pool
    }
  } catch (error) {
    console.error('[GetPages API Error]', error);
    // Provide a generic error message for security, log the specific error on the server
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
