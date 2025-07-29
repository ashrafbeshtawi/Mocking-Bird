// app/api/save-page/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_STRING, // Ensure this env variable is set
});

// Define the expected structure of the request body
type RequestBody = {
  page_id: string;
  page_name: string;
  // 💡 Changed from 'access_token' to 'page_access_token' to match schema
  page_access_token: string;
};

export async function POST(req: NextRequest) {
  try {
    // 1. Get user_id from the custom 'x-user-id' header set by the middleware
    const userId = req.headers.get('x-user-id');

    // If middleware is correctly configured and working, userId should always be present.
    // This check acts as a safeguard.
    if (!userId) {
      console.error('[SavePage API Error] User ID not found in headers. Middleware might be missing or failed.');
      return NextResponse.json({ error: 'Authentication required: User ID not provided.' }, { status: 401 });
    }

    const body = (await req.json()) as RequestBody;

    // 2. Basic validation for request body parameters
    // 💡 Changed from 'access_token' to 'page_access_token'
    if (!body.page_id || !body.page_access_token) {
      return NextResponse.json({ error: 'Missing page_id or page_access_token in request body.' }, { status: 400 });
    }

    // 💡 Ensure userId is parsed to INTEGER as per schema if it comes as string from header
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      console.error(`[SavePage API Error] Invalid user ID format in header: ${userId}`);
      return NextResponse.json({ error: 'Invalid user ID format.' }, { status: 400 });
    }


    // 3. Connect to the database
    const client = await pool.connect();
    console.log(`Connected to database for user ${parsedUserId} to save page ${body.page_id}.`);
    try {
      // 4. Check if the page already exists for this specific user in the 'facebook_pages' table
      const { rows } = await client.query(
        'SELECT * FROM facebook_pages WHERE user_id = $1 AND page_id = $2',
        [parsedUserId, body.page_id]
      );

      if (rows.length > 0) {
        // 5. If the page exists for this user, update its page_access_token and created_at timestamp
        await client.query(
          'UPDATE facebook_pages SET page_access_token = $1, created_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND page_id = $3',
          // 💡 Changed from 'access_token' to 'page_access_token' in query
          [body.page_access_token, parsedUserId, body.page_id]
        );
        console.log(`Page ${body.page_id} updated for user ${parsedUserId}.`);
      } else {
        // 6. If the page does not exist for this user, insert a new record into 'facebook_pages'
        await client.query(
          'INSERT INTO facebook_pages (user_id, page_id, page_name, page_access_token) VALUES ($1, $2, $3, $4)',
          // 💡 Changed from 'access_token' to 'page_access_token' in query
          [parsedUserId, body.page_id, body.page_name, body.page_access_token]
        );
        console.log(`Page ${body.page_id} inserted for user ${parsedUserId}.`);
      }
    } finally {
      client.release(); // Always release the client back to the pool
    }

    return NextResponse.json({ success: true, message: 'Facebook page saved successfully!' });
  } catch (error) {
    console.error('[SavePage API Error]', error);
    // Provide a generic error message for security, log the specific error on the server
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}