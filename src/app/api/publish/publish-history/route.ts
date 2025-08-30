// app/api/get-publish-history/route.ts

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

    // Safeguard check for userId
    if (!userId) {
      console.error('[GetPublishHistory API Error] User ID not found in headers. Middleware might be missing or failed.');
      return NextResponse.json({ error: 'Authentication required: User ID not provided.' }, { status: 401 });
    }

    // 2. Ensure userId is a valid integer
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      console.error(`[GetPublishHistory API Error] Invalid user ID format in header: ${userId}`);
      return NextResponse.json({ error: 'Invalid user ID format.' }, { status: 400 });
    }

    // 3. Extract pagination params
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Prevent invalid inputs
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 && limit <= 100 ? limit : 10; // cap to 100 max
    const offset = (safePage - 1) * safeLimit;

    // 4. Connect to the database
    const client = await pool.connect();
    console.log(`Connected to database for user ${parsedUserId} to retrieve publish history.`);

    try {
      // Count total records for pagination metadata
      const { rows: countRows } = await client.query(
        'SELECT COUNT(*)::int AS total FROM publish_history WHERE user_id = $1',
        [parsedUserId]
      );
      const total = countRows[0]?.total || 0;
      const totalPages = Math.ceil(total / safeLimit);

      // Fetch paginated history
      const { rows: history } = await client.query(
        `SELECT id, content, successful_twitter, successful_facebook, 
                failed_twitter, failed_facebook, created_at 
         FROM publish_history 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [parsedUserId, safeLimit, offset]
      );

      // Return paginated response
      return NextResponse.json({
        success: true,
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        history,
      });

    } finally {
      client.release(); // Always release the client back to the pool
    }
  } catch (error) {
    console.error('[GetPublishHistory API Error]', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
