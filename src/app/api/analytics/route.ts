import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { TimeRange, AnalyticsResponse } from '@/types/analytics';

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
  const userId = req.headers.get('x-user-id');
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

    // Most used platform (parse from publish_report)
    const platformResult = await pool.query(
      `SELECT publish_report FROM publish_history
       WHERE user_id = $1 AND ${dateFilter} AND publish_report IS NOT NULL`,
      [userId]
    );

    const platformCounts: Record<string, number> = { facebook: 0, twitter: 0, instagram: 0, telegram: 0 };
    for (const row of platformResult.rows) {
      const report = row.publish_report?.toLowerCase() || '';
      if (report.includes('facebook')) platformCounts.facebook++;
      if (report.includes('twitter') || report.includes('x account')) platformCounts.twitter++;
      if (report.includes('instagram')) platformCounts.instagram++;
      if (report.includes('telegram')) platformCounts.telegram++;
    }

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

    // Platform reliability (success rate per platform)
    const platformReliability: Record<string, number> = { facebook: 0, twitter: 0, instagram: 0, telegram: 0 };
    const platformTotal: Record<string, number> = { facebook: 0, twitter: 0, instagram: 0, telegram: 0 };
    const platformSuccess: Record<string, number> = { facebook: 0, twitter: 0, instagram: 0, telegram: 0 };

    const reliabilityResult = await pool.query(
      `SELECT publish_report, publish_status FROM publish_history
       WHERE user_id = $1 AND ${dateFilter} AND publish_report IS NOT NULL`,
      [userId]
    );

    for (const row of reliabilityResult.rows) {
      const report = row.publish_report?.toLowerCase() || '';
      const isSuccess = row.publish_status === 'success';

      if (report.includes('facebook')) {
        platformTotal.facebook++;
        if (isSuccess) platformSuccess.facebook++;
      }
      if (report.includes('twitter') || report.includes('x account')) {
        platformTotal.twitter++;
        if (isSuccess) platformSuccess.twitter++;
      }
      if (report.includes('instagram')) {
        platformTotal.instagram++;
        if (isSuccess) platformSuccess.instagram++;
      }
      if (report.includes('telegram')) {
        platformTotal.telegram++;
        if (isSuccess) platformSuccess.telegram++;
      }
    }

    for (const platform of Object.keys(platformReliability)) {
      platformReliability[platform] = platformTotal[platform] > 0
        ? (platformSuccess[platform] / platformTotal[platform]) * 100
        : 0;
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
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
