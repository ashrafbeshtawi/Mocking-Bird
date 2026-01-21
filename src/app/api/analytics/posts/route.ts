import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { TimeRange, AnalyticsPostsResponse } from '@/types/analytics';

function getDateFilter(range: TimeRange): string {
  switch (range) {
    case '7d':
      return "created_at >= NOW() - INTERVAL '7 days'";
    case '30d':
      return "created_at >= NOW() - INTERVAL '30 days'";
    case '90d':
      return "created_at >= NOW() - INTERVAL '90 days'";
    case 'all':
    default:
      return '1=1';
  }
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const range = (searchParams.get('range') || '30d') as TimeRange;
  const platform = searchParams.get('platform');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const dateFilter = getDateFilter(range);

  try {
    let whereClause = `user_id = $1 AND ${dateFilter}`;
    const params: (string | number)[] = [userId];
    let paramIndex = 2;

    // Status filter
    if (status && status !== 'all') {
      whereClause += ` AND publish_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Platform filter (search in publish_report)
    if (platform && platform !== 'all') {
      const platformSearch = platform === 'twitter' ? '(twitter|x account)' : platform;
      whereClause += ` AND publish_report ~* $${paramIndex}`;
      params.push(platformSearch);
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM publish_history WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total) || 0;

    // Get paginated posts
    const postsResult = await pool.query(
      `SELECT id, created_at, content, publish_status, publish_report
       FROM publish_history
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const response: AnalyticsPostsResponse = {
      posts: postsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Analytics posts API error:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}
