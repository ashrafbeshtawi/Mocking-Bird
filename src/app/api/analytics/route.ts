import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { TimeRange, AnalyticsResponse, PlatformVolume, PlatformReliability } from '@/types/analytics';
import { getAuthUserId } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Analytics');

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

function getGroupByInterval(range: TimeRange): string {
  switch (range) {
    case '7d':
    case '30d':
      return 'day';
    case '90d':
    case 'all':
    default:
      return 'week';
  }
}

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const range = (searchParams.get('range') || '30d') as TimeRange;
  const dateFilter = getDateFilter(range);
  const groupBy = getGroupByInterval(range);

  try {
    // Summary stats
    const summaryResult = await pool.query(
      `SELECT
        COUNT(*) as total_posts,
        COUNT(*) FILTER (WHERE publish_status = 'success') as success_count,
        COUNT(*) FILTER (WHERE publish_status = 'failed') as failed_count
      FROM publish_history
      WHERE user_id = $1 AND ${dateFilter}`,
      [userId]
    );

    const { total_posts, success_count, failed_count } = summaryResult.rows[0];
    const totalPosts = parseInt(total_posts) || 0;
    const successRate = totalPosts > 0 ? (parseInt(success_count) / totalPosts) * 100 : 0;

    // Most used platform - aggregate in SQL using JSONB functions
    const platformResult = await pool.query(
      `WITH platform_posts AS (
        SELECT DISTINCT ON (ph.id, d->>'platform')
          d->>'platform' as platform
        FROM publish_history ph,
             jsonb_array_elements(publish_destinations) as d
        WHERE user_id = $1 AND ${dateFilter} AND publish_destinations IS NOT NULL
      )
      SELECT
        COALESCE(SUM(CASE WHEN platform = 'facebook' THEN 1 ELSE 0 END), 0)::int as facebook,
        COALESCE(SUM(CASE WHEN platform = 'twitter' THEN 1 ELSE 0 END), 0)::int as twitter,
        COALESCE(SUM(CASE WHEN platform = 'instagram' THEN 1 ELSE 0 END), 0)::int as instagram,
        COALESCE(SUM(CASE WHEN platform = 'telegram' THEN 1 ELSE 0 END), 0)::int as telegram
      FROM platform_posts`,
      [userId]
    );

    const platformCounts: PlatformVolume = platformResult.rows[0] || { facebook: 0, twitter: 0, instagram: 0, telegram: 0 };

    const mostUsedPlatform = Object.entries(platformCounts)
      .sort(([, a], [, b]) => b - a)[0];

    // Busiest day
    const busiestDayResult = await pool.query(
      `SELECT TO_CHAR(created_at, 'Day') as day_name, COUNT(*) as count
       FROM publish_history
       WHERE user_id = $1 AND ${dateFilter}
       GROUP BY TO_CHAR(created_at, 'Day'), EXTRACT(DOW FROM created_at)
       ORDER BY count DESC
       LIMIT 1`,
      [userId]
    );

    const busiestDay = busiestDayResult.rows[0]?.day_name?.trim() || null;

    // Activity chart data
    const activityResult = await pool.query(
      `SELECT
        DATE_TRUNC('${groupBy}', created_at) as period,
        COUNT(*) FILTER (WHERE publish_status = 'success') as success,
        COUNT(*) FILTER (WHERE publish_status IN ('failed', 'partial_success')) as failed
       FROM publish_history
       WHERE user_id = $1 AND ${dateFilter}
       GROUP BY DATE_TRUNC('${groupBy}', created_at)
       ORDER BY period ASC`,
      [userId]
    );

    const labels: string[] = [];
    const success: number[] = [];
    const failed: number[] = [];

    for (const row of activityResult.rows) {
      const date = new Date(row.period);
      labels.push(groupBy === 'day'
        ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      );
      success.push(parseInt(row.success) || 0);
      failed.push(parseInt(row.failed) || 0);
    }

    // Platform volume
    const platformVolume = { ...platformCounts };

    // Platform reliability - aggregate success rates in SQL
    const reliabilityResult = await pool.query(
      `WITH destination_stats AS (
        SELECT
          d->>'platform' as platform,
          (d->>'success')::boolean as success
        FROM publish_history ph,
             jsonb_array_elements(publish_destinations) as d
        WHERE user_id = $1 AND ${dateFilter} AND publish_destinations IS NOT NULL
      )
      SELECT
        platform,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE success = true) as success_count
      FROM destination_stats
      WHERE platform IN ('facebook', 'twitter', 'instagram', 'telegram')
      GROUP BY platform`,
      [userId]
    );

    const platformReliability: PlatformReliability = { facebook: 0, twitter: 0, instagram: 0, telegram: 0 };
    for (const row of reliabilityResult.rows) {
      const platform = row.platform as keyof PlatformReliability;
      if (platform in platformReliability) {
        platformReliability[platform] = row.total > 0
          ? (parseInt(row.success_count) / parseInt(row.total)) * 100
          : 0;
      }
    }

    const response: AnalyticsResponse = {
      summary: {
        totalPosts,
        successRate: Math.round(successRate * 10) / 10,
        failedCount: parseInt(failed_count) || 0,
        mostUsedPlatform: mostUsedPlatform && mostUsedPlatform[1] > 0 ? mostUsedPlatform[0] : null,
        busiestDay,
      },
      activityChart: { labels, success, failed },
      platformVolume,
      platformReliability,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to fetch analytics', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
