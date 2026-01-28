// app/api/get-publish-history/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function DELETE(req: NextRequest) {
  try {
    // 1. Get user_id from the custom 'x-user-id' header set by the middleware
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      console.error('[DeletePublishHistory API Error] User ID not found in headers.');
      return NextResponse.json({ error: 'Authentication required: User ID not provided.' }, { status: 401 });
    }

    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      console.error(`[DeletePublishHistory API Error] Invalid user ID format: ${userId}`);
      return NextResponse.json({ error: 'Invalid user ID format.' }, { status: 400 });
    }

    // 2. Get report ID(s) from request body - supports single ID or array of IDs
    const body = await req.json();
    const reportIds: number[] = [];

    // Handle single ID
    if (body.id !== undefined) {
      const parsedId = parseInt(body.id, 10);
      if (isNaN(parsedId)) {
        return NextResponse.json({ error: 'Invalid report ID format.' }, { status: 400 });
      }
      reportIds.push(parsedId);
    }

    // Handle array of IDs for bulk delete
    if (body.ids && Array.isArray(body.ids)) {
      for (const id of body.ids) {
        const parsedId = parseInt(id, 10);
        if (isNaN(parsedId)) {
          return NextResponse.json({ error: 'Invalid report ID format in ids array.' }, { status: 400 });
        }
        reportIds.push(parsedId);
      }
    }

    if (reportIds.length === 0) {
      return NextResponse.json({ error: 'Report ID(s) required. Provide "id" or "ids" array.' }, { status: 400 });
    }

    // 3. Connect to database and delete
    const client = await pool.connect();
    console.log(`Deleting ${reportIds.length} report(s) for user ${parsedUserId}: [${reportIds.join(', ')}]`);

    try {
      // First verify all reports belong to this user
      const placeholders = reportIds.map((_, i) => `$${i + 2}`).join(', ');
      const { rows: checkRows } = await client.query(
        `SELECT id FROM publish_history WHERE id IN (${placeholders}) AND user_id = $1`,
        [parsedUserId, ...reportIds]
      );

      if (checkRows.length === 0) {
        return NextResponse.json({ error: 'No reports found or unauthorized.' }, { status: 404 });
      }

      const foundIds = checkRows.map((row: { id: number }) => row.id);
      const notFoundIds = reportIds.filter(id => !foundIds.includes(id));

      // Delete the reports that belong to this user
      await client.query(
        `DELETE FROM publish_history WHERE id IN (${placeholders}) AND user_id = $1`,
        [parsedUserId, ...reportIds]
      );

      const deletedCount = foundIds.length;
      console.log(`${deletedCount} report(s) deleted successfully.`);

      return NextResponse.json({
        success: true,
        message: `${deletedCount} report(s) deleted successfully.`,
        deletedCount,
        deletedIds: foundIds,
        notFoundIds: notFoundIds.length > 0 ? notFoundIds : undefined,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[DeletePublishHistory API Error]', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}

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

    // 3. Extract query parameters
    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get('id');

    // 4. Connect to the database
    const client = await pool.connect();
    console.log(`Connected to database for user ${parsedUserId} to retrieve publish history.`);

    try {
      if (reportId) {
        // If reportId is provided, fetch a single report
        const parsedReportId = parseInt(reportId, 10);
        if (isNaN(parsedReportId)) {
          return NextResponse.json({ error: 'Invalid report ID format.' }, { status: 400 });
        }

        const { rows } = await client.query(
          `SELECT id, content, publish_status, created_at, publish_report, publish_destinations
           FROM publish_history
           WHERE id = $1 AND user_id = $2`,
          [parsedReportId, parsedUserId]
        );

        if (rows.length === 0) {
          return NextResponse.json({ error: 'Report not found or unauthorized.' }, { status: 404 });
        }

        return NextResponse.json(rows[0]); // Return the single report object
      } else {
        // Otherwise, proceed with pagination logic
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const status = searchParams.get('status');
        const platform = searchParams.get('platform');

        // Validate status if provided
        const validStatuses = ['success', 'partial_success', 'failed'];
        const statusFilter = status && validStatuses.includes(status) ? status : null;

        // Validate platform if provided
        const validPlatforms = ['facebook', 'twitter', 'instagram', 'telegram'];
        const platformFilter = platform && validPlatforms.includes(platform) ? platform : null;

        // Prevent invalid inputs
        const safePage = page > 0 ? page : 1;
        const safeLimit = limit > 0 && limit <= 100 ? limit : 10; // cap to 100 max
        const offset = (safePage - 1) * safeLimit;

        // Build query conditions
        let whereClause = 'WHERE user_id = $1';
        const queryParams: (number | string)[] = [parsedUserId];

        if (statusFilter) {
          queryParams.push(statusFilter);
          whereClause += ` AND publish_status = $${queryParams.length}`;
        }

        if (platformFilter) {
          // Filter by platform using the JSONB publish_destinations column
          // Check if any destination in the array has the matching platform
          queryParams.push(platformFilter);
          whereClause += ` AND publish_destinations @> ANY(ARRAY[jsonb_build_object('platform', $${queryParams.length}::text)])`;
        }

        // Count total records for pagination metadata
        const { rows: countRows } = await client.query(
          `SELECT COUNT(*)::int AS total FROM publish_history ${whereClause}`,
          queryParams
        );
        const total = countRows[0]?.total || 0;
        const totalPages = Math.ceil(total / safeLimit);

        // Fetch paginated history with publish_report and publish_destinations for expandable rows
        const { rows: history } = await client.query(
          `SELECT id, content, publish_status, publish_report, publish_destinations, created_at
           FROM publish_history
           ${whereClause}
           ORDER BY created_at DESC
           LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
          [...queryParams, safeLimit, offset]
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
      }
    } finally {
      client.release(); // Always release the client back to the pool
    }
  } catch (error) {
    console.error('[GetPublishHistory API Error]', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
