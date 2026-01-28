import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { TimeRange, AnalyticsResponse, PlatformVolume, PlatformReliability } from '@/types/analytics';
import { getAuthUserId } from '@/lib/api-auth';

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

    // Most used platform (using publish_destinations JSONB column)
    const platformResult = await pool.query(
      `SELECT publish_destinations FROM publish_history
       WHERE user_id = $1 AND ${dateFilter} AND publish_destinations IS NOT NULL`,
      [userId]
    );

    const platformCounts: PlatformVolume = { facebook: 0, twitter: 0, instagram: 0, telegram: 0 };
    for (const row of platformResult.rows) {
      const destinations = row.publish_destinations || [];
      // Count unique platforms per publish (a single publish to multiple facebook pages counts once)
      const platformsInPost = new Set<string>();
      for (const dest of destinations) {
        if (dest.platform) {
          platformsInPost.add(dest.platform);
        }
      }
      for (const platform of platformsInPost) {
        if (platform in platformCounts) {
          platformCounts[platform as keyof PlatformVolume]++;
        }
      }
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

    // Platform reliability (success rate per platform using publish_destinations)
    const platformReliability: PlatformReliability = { facebook: 0, twitter: 0, instagram: 0, telegram: 0 };
    const platformTotal: PlatformVolume = { facebook: 0, twitter: 0, instagram: 0, telegram: 0 };
    const platformSuccess: PlatformVolume = { facebook: 0, twitter: 0, instagram: 0, telegram: 0 };

    const reliabilityResult = await pool.query(
      `SELECT publish_destinations FROM publish_history
       WHERE user_id = $1 AND ${dateFilter} AND publish_destinations IS NOT NULL`,
      [userId]
    );

    for (const row of reliabilityResult.rows) {
      const destinations = row.publish_destinations || [];
      for (const dest of destinations) {
        const platform = dest.platform as keyof PlatformVolume;
        if (platform && platform in platformTotal) {
          platformTotal[platform]++;
          if (dest.success) {
            platformSuccess[platform]++;
          }
        }
      }
    }

    const platforms: (keyof PlatformReliability)[] = ['facebook', 'twitter', 'instagram', 'telegram'];
    for (const platform of platforms) {
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
