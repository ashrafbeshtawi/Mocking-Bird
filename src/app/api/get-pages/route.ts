// app/api/get-pages/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_STRING, // Ensure this env variable is set
});

export async function GET(req: NextRequest) {
  try {
    // 1. Get user_id from the custom 'x-user-id' header set by the middleware
    const userId = req.headers.get('x-user-id');

    // If middleware is correctly configured and working, userId should always be present.
    // This check acts as a safeguard.
    if (!userId) {
      console.error('[GetPages API Error] User ID not found in headers. Middleware might be missing or failed.');
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
        'SELECT page_id, page_access_token FROM facebook_pages WHERE user_id = $1',
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
