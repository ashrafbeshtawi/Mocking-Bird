# Analytics Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an analytics page showing publishing performance and usage patterns with summary cards, charts, and a filterable posts table.

**Architecture:** Server-side API aggregates data from `publish_history` table. React hooks fetch data. Recharts library renders visualizations. MUI components match existing design system.

**Tech Stack:** Next.js 15, React 19, MUI v7, Recharts, PostgreSQL

---

## Task 1: Install Recharts Dependency

**Files:**
- Modify: `package.json`

**Step 1: Install recharts**

Run: `npm install recharts`

**Step 2: Verify installation**

Run: `npm ls recharts`
Expected: `recharts@2.x.x`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add recharts for analytics charts"
```

---

## Task 2: Create Analytics API Types

**Files:**
- Create: `src/types/analytics.ts`

**Step 1: Create the types file**

```typescript
export type TimeRange = '7d' | '30d' | '90d' | 'all';

export interface AnalyticsSummary {
  totalPosts: number;
  successRate: number;
  failedCount: number;
  mostUsedPlatform: string | null;
  busiestDay: string | null;
}

export interface ActivityChartData {
  labels: string[];
  success: number[];
  failed: number[];
}

export interface PlatformVolume {
  facebook: number;
  twitter: number;
  instagram: number;
  telegram: number;
}

export interface PlatformReliability {
  facebook: number;
  twitter: number;
  instagram: number;
  telegram: number;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  activityChart: ActivityChartData;
  platformVolume: PlatformVolume;
  platformReliability: PlatformReliability;
}

export interface AnalyticsPost {
  id: number;
  created_at: string;
  content: string;
  publish_status: 'success' | 'partial_success' | 'failed';
  publish_report: string | null;
}

export interface AnalyticsPostsResponse {
  posts: AnalyticsPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Step 2: Commit**

```bash
git add src/types/analytics.ts
git commit -m "feat(analytics): add TypeScript types for analytics API"
```

---

## Task 3: Create Analytics Summary API Endpoint

**Files:**
- Create: `src/app/api/analytics/route.ts`

**Step 1: Create the API route**

```typescript
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
```

**Step 2: Test the endpoint**

Run: `curl -X GET "http://localhost:3000/api/analytics?range=30d" -H "x-user-id: 1" -H "Cookie: token=..."`

Expected: JSON response with summary, activityChart, platformVolume, platformReliability

**Step 3: Commit**

```bash
git add src/app/api/analytics/route.ts
git commit -m "feat(analytics): add analytics summary API endpoint"
```

---

## Task 4: Create Analytics Posts API Endpoint

**Files:**
- Create: `src/app/api/analytics/posts/route.ts`

**Step 1: Create the posts API route**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/app/api/analytics/posts/route.ts
git commit -m "feat(analytics): add paginated posts API endpoint"
```

---

## Task 5: Create useAnalytics Hook

**Files:**
- Create: `src/hooks/useAnalytics.ts`

**Step 1: Create the hook**

```typescript
'use client';

import { useState, useCallback, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/fetch';
import type { TimeRange, AnalyticsResponse } from '@/types/analytics';

interface UseAnalyticsReturn {
  data: AnalyticsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAnalytics(range: TimeRange): UseAnalyticsReturn {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth(`/api/analytics?range=${range}`);

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError((err as Error)?.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { data, loading, error, refetch: fetchAnalytics };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useAnalytics.ts
git commit -m "feat(analytics): add useAnalytics hook"
```

---

## Task 6: Create useAnalyticsPosts Hook

**Files:**
- Create: `src/hooks/useAnalyticsPosts.ts`

**Step 1: Create the hook**

```typescript
'use client';

import { useState, useCallback, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/fetch';
import type { TimeRange, AnalyticsPost, AnalyticsPostsResponse } from '@/types/analytics';

interface UseAnalyticsPostsReturn {
  posts: AnalyticsPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseAnalyticsPostsParams {
  range: TimeRange;
  platform: string;
  status: string;
  page: number;
}

export function useAnalyticsPosts({
  range,
  platform,
  status,
  page,
}: UseAnalyticsPostsParams): UseAnalyticsPostsReturn {
  const [posts, setPosts] = useState<AnalyticsPost[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        range,
        page: page.toString(),
        limit: '20',
      });
      if (platform !== 'all') params.set('platform', platform);
      if (status !== 'all') params.set('status', status);

      const response = await fetchWithAuth(`/api/analytics/posts?${params}`);

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch posts');
      }

      const result: AnalyticsPostsResponse = await response.json();
      setPosts(result.posts);
      setPagination(result.pagination);
    } catch (err) {
      console.error('Error fetching analytics posts:', err);
      setError((err as Error)?.message || 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }, [range, platform, status, page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, pagination, loading, error, refetch: fetchPosts };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useAnalyticsPosts.ts
git commit -m "feat(analytics): add useAnalyticsPosts hook"
```

---

## Task 7: Create TimeRangeSelector Component

**Files:**
- Create: `src/components/analytics/TimeRangeSelector.tsx`

**Step 1: Create the component**

```typescript
'use client';

import { ToggleButton, ToggleButtonGroup, Box } from '@mui/material';
import type { TimeRange } from '@/types/analytics';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

const options: { value: TimeRange; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const handleChange = (_: React.MouseEvent<HTMLElement>, newValue: TimeRange | null) => {
    if (newValue) onChange(newValue);
  };

  return (
    <Box>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={handleChange}
        size="small"
        sx={{
          '& .MuiToggleButton-root': {
            px: 2,
            py: 0.75,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
            border: '1px solid',
            borderColor: 'divider',
            '&.Mui-selected': {
              bgcolor: '#E1306C15',
              color: '#E1306C',
              borderColor: '#E1306C',
              '&:hover': {
                bgcolor: '#E1306C25',
              },
            },
          },
        }}
      >
        {options.map((opt) => (
          <ToggleButton key={opt.value} value={opt.value}>
            {opt.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/analytics/TimeRangeSelector.tsx
git commit -m "feat(analytics): add TimeRangeSelector component"
```

---

## Task 8: Create SummaryCards Component

**Files:**
- Create: `src/components/analytics/SummaryCards.tsx`

**Step 1: Create the component**

```typescript
'use client';

import { Box, Paper, Typography, Skeleton } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import StarIcon from '@mui/icons-material/Star';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import TelegramIcon from '@mui/icons-material/Telegram';
import type { AnalyticsSummary } from '@/types/analytics';

interface SummaryCardsProps {
  data: AnalyticsSummary | null;
  loading: boolean;
}

const platformIcons: Record<string, typeof FacebookIcon> = {
  facebook: FacebookIcon,
  twitter: TwitterIcon,
  instagram: InstagramIcon,
  telegram: TelegramIcon,
};

function getSuccessRateColor(rate: number): string {
  if (rate >= 90) return '#22c55e';
  if (rate >= 70) return '#f59e0b';
  return '#ef4444';
}

export function SummaryCards({ data, loading }: SummaryCardsProps) {
  if (loading) {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Paper key={i} elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Skeleton variant="circular" width={40} height={40} sx={{ mb: 1.5 }} />
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="text" width="80%" height={20} />
          </Paper>
        ))}
      </Box>
    );
  }

  const cards = [
    {
      icon: TrendingUpIcon,
      iconBg: '#1877f215',
      iconColor: '#1877f2',
      value: data?.totalPosts ?? 0,
      label: 'Total Posts',
    },
    {
      icon: CheckCircleIcon,
      iconBg: `${getSuccessRateColor(data?.successRate ?? 0)}15`,
      iconColor: getSuccessRateColor(data?.successRate ?? 0),
      value: `${data?.successRate ?? 0}%`,
      label: 'Success Rate',
    },
    {
      icon: ErrorIcon,
      iconBg: '#ef444415',
      iconColor: '#ef4444',
      value: data?.failedCount ?? 0,
      label: 'Failed Posts',
    },
    {
      icon: data?.mostUsedPlatform ? platformIcons[data.mostUsedPlatform] || StarIcon : StarIcon,
      iconBg: '#E1306C15',
      iconColor: '#E1306C',
      value: data?.mostUsedPlatform ? data.mostUsedPlatform.charAt(0).toUpperCase() + data.mostUsedPlatform.slice(1) : '-',
      label: 'Most Used',
    },
    {
      icon: CalendarTodayIcon,
      iconBg: '#F7773715',
      iconColor: '#F77737',
      value: data?.busiestDay ?? '-',
      label: 'Busiest Day',
    },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2 }}>
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Paper
            key={index}
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: card.iconColor,
                boxShadow: `0 4px 20px ${card.iconColor}15`,
              },
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: card.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5,
              }}
            >
              <Icon sx={{ color: card.iconColor, fontSize: 22 }} />
            </Box>
            <Typography variant="h5" fontWeight={700}>
              {card.value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {card.label}
            </Typography>
          </Paper>
        );
      })}
    </Box>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/analytics/SummaryCards.tsx
git commit -m "feat(analytics): add SummaryCards component"
```

---

## Task 9: Create ActivityChart Component

**Files:**
- Create: `src/components/analytics/ActivityChart.tsx`

**Step 1: Create the component**

```typescript
'use client';

import { Paper, Typography, Box, Skeleton } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ActivityChartData } from '@/types/analytics';

interface ActivityChartProps {
  data: ActivityChartData | null;
  loading: boolean;
}

export function ActivityChart({ data, loading }: ActivityChartProps) {
  if (loading) {
    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: 350 }}>
        <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={270} sx={{ borderRadius: 2 }} />
      </Paper>
    );
  }

  const chartData = data?.labels.map((label, index) => ({
    name: label,
    success: data.success[index],
    failed: data.failed[index],
  })) || [];

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Publishing Activity
      </Typography>
      <Box sx={{ height: 270 }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
              <Legend />
              <Bar dataKey="success" name="Successful" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">No activity data available</Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/analytics/ActivityChart.tsx
git commit -m "feat(analytics): add ActivityChart component"
```

---

## Task 10: Create PlatformVolumeChart Component

**Files:**
- Create: `src/components/analytics/PlatformVolumeChart.tsx`

**Step 1: Create the component**

```typescript
'use client';

import { Paper, Typography, Box, Skeleton } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { PlatformVolume } from '@/types/analytics';

interface PlatformVolumeChartProps {
  data: PlatformVolume | null;
  loading: boolean;
}

const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#1877f2',
  twitter: '#1da1f2',
  instagram: '#E1306C',
  telegram: '#0088cc',
};

export function PlatformVolumeChart({ data, loading }: PlatformVolumeChartProps) {
  if (loading) {
    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: 350 }}>
        <Skeleton variant="text" width="50%" height={28} sx={{ mb: 2 }} />
        <Skeleton variant="circular" width={200} height={200} sx={{ mx: 'auto' }} />
      </Paper>
    );
  }

  const chartData = data
    ? Object.entries(data)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: PLATFORM_COLORS[name],
        }))
    : [];

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Platform Usage
      </Typography>
      <Box sx={{ height: 270 }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
              <Legend />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                <tspan x="50%" dy="-0.5em" fontSize="24" fontWeight="700">{total}</tspan>
                <tspan x="50%" dy="1.5em" fontSize="12" fill="#6b7280">Total</tspan>
              </text>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">No platform data available</Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/analytics/PlatformVolumeChart.tsx
git commit -m "feat(analytics): add PlatformVolumeChart component"
```

---

## Task 11: Create PlatformReliabilityChart Component

**Files:**
- Create: `src/components/analytics/PlatformReliabilityChart.tsx`

**Step 1: Create the component**

```typescript
'use client';

import { Paper, Typography, Box, Skeleton, LinearProgress, Stack } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import TelegramIcon from '@mui/icons-material/Telegram';
import type { PlatformReliability } from '@/types/analytics';

interface PlatformReliabilityChartProps {
  data: PlatformReliability | null;
  loading: boolean;
}

const PLATFORM_CONFIG: Record<string, { icon: typeof FacebookIcon; color: string; label: string }> = {
  facebook: { icon: FacebookIcon, color: '#1877f2', label: 'Facebook' },
  twitter: { icon: TwitterIcon, color: '#1da1f2', label: 'Twitter' },
  instagram: { icon: InstagramIcon, color: '#E1306C', label: 'Instagram' },
  telegram: { icon: TelegramIcon, color: '#0088cc', label: 'Telegram' },
};

function getReliabilityColor(rate: number): string {
  if (rate >= 90) return '#22c55e';
  if (rate >= 70) return '#f59e0b';
  return '#ef4444';
}

export function PlatformReliabilityChart({ data, loading }: PlatformReliabilityChartProps) {
  if (loading) {
    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Skeleton variant="text" width="50%" height={28} sx={{ mb: 2 }} />
        <Stack spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Box key={i}>
              <Skeleton variant="text" width="30%" height={20} />
              <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 1 }} />
            </Box>
          ))}
        </Stack>
      </Paper>
    );
  }

  const platforms = data ? Object.entries(data).map(([key, value]) => ({
    key,
    ...PLATFORM_CONFIG[key],
    reliability: Math.round(value * 10) / 10,
  })) : [];

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Platform Reliability
      </Typography>
      <Stack spacing={2.5}>
        {platforms.map((platform) => {
          const Icon = platform.icon;
          const barColor = platform.reliability > 0 ? getReliabilityColor(platform.reliability) : '#e5e7eb';
          return (
            <Box key={platform.key}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon sx={{ fontSize: 18, color: platform.color }} />
                  <Typography variant="body2" fontWeight={500}>
                    {platform.label}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ color: platform.reliability > 0 ? barColor : 'text.secondary' }}
                >
                  {platform.reliability > 0 ? `${platform.reliability}%` : 'N/A'}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={platform.reliability}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: '#f3f4f6',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    bgcolor: barColor,
                  },
                }}
              />
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/analytics/PlatformReliabilityChart.tsx
git commit -m "feat(analytics): add PlatformReliabilityChart component"
```

---

## Task 12: Create PostsTable Component

**Files:**
- Create: `src/components/analytics/PostsTable.tsx`

**Step 1: Create the component**

```typescript
'use client';

import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Collapse,
  Skeleton,
  Pagination,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import { useState } from 'react';
import type { AnalyticsPost } from '@/types/analytics';

interface PostsTableProps {
  posts: AnalyticsPost[];
  loading: boolean;
  pagination: {
    page: number;
    totalPages: number;
    total: number;
  };
  filters: {
    platform: string;
    status: string;
  };
  onFilterChange: (key: 'platform' | 'status', value: string) => void;
  onPageChange: (page: number) => void;
}

const statusConfig = {
  success: { icon: CheckCircleIcon, color: '#22c55e', bgColor: '#22c55e15', label: 'Success' },
  partial_success: { icon: WarningIcon, color: '#f59e0b', bgColor: '#f59e0b15', label: 'Partial' },
  failed: { icon: ErrorIcon, color: '#ef4444', bgColor: '#ef444415', label: 'Failed' },
};

function PostRow({ post }: { post: AnalyticsPost }) {
  const [open, setOpen] = useState(false);
  const status = statusConfig[post.publish_status] || statusConfig.failed;
  const StatusIcon = status.icon;

  return (
    <>
      <TableRow sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
        <TableCell padding="checkbox">
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" color="text.secondary">
            {new Date(post.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography
            variant="body2"
            sx={{
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {post.content.substring(0, 50) || 'No content'}
            {post.content.length > 50 && '...'}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            icon={<StatusIcon sx={{ fontSize: 16 }} />}
            label={status.label}
            size="small"
            sx={{
              bgcolor: status.bgColor,
              color: status.color,
              fontWeight: 600,
              '& .MuiChip-icon': { color: status.color },
            }}
          />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 1 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Full Content
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                {post.content || 'No content'}
              </Typography>
              {post.publish_report && (
                <>
                  <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                    Publish Report
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: 'grey.50',
                      borderRadius: 2,
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{ fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}
                    >
                      {post.publish_report}
                    </Typography>
                  </Paper>
                </>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export function PostsTable({
  posts,
  loading,
  pagination,
  filters,
  onFilterChange,
  onPageChange,
}: PostsTableProps) {
  const handlePlatformChange = (event: SelectChangeEvent) => {
    onFilterChange('platform', event.target.value);
  };

  const handleStatusChange = (event: SelectChangeEvent) => {
    onFilterChange('status', event.target.value);
  };

  return (
    <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Recent Posts
            {pagination.total > 0 && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                ({pagination.total} total)
              </Typography>
            )}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Platform</InputLabel>
              <Select value={filters.platform} onChange={handlePlatformChange} label="Platform">
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="facebook">Facebook</MenuItem>
                <MenuItem value="twitter">Twitter</MenuItem>
                <MenuItem value="instagram">Instagram</MenuItem>
                <MenuItem value="telegram">Telegram</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select value={filters.status} onChange={handleStatusChange} label="Status">
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="success">Success</MenuItem>
                <MenuItem value="partial_success">Partial</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Date</TableCell>
              <TableCell>Content</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell padding="checkbox"><Skeleton variant="circular" width={24} height={24} /></TableCell>
                  <TableCell><Skeleton variant="text" width={100} /></TableCell>
                  <TableCell><Skeleton variant="text" width={200} /></TableCell>
                  <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
                </TableRow>
              ))
            ) : posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No posts found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => <PostRow key={post.id} post={post} />)
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination.totalPages > 1 && (
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
          <Pagination
            count={pagination.totalPages}
            page={pagination.page}
            onChange={(_, page) => onPageChange(page)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}
    </Paper>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/analytics/PostsTable.tsx
git commit -m "feat(analytics): add PostsTable component with filters"
```

---

## Task 13: Create Analytics Page

**Files:**
- Create: `src/app/analytics/page.tsx`

**Step 1: Create the page**

```typescript
'use client';

import { useState } from 'react';
import { Container, Box, Typography, Alert, AlertTitle, Fade } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import { TimeRangeSelector } from '@/components/analytics/TimeRangeSelector';
import { SummaryCards } from '@/components/analytics/SummaryCards';
import { ActivityChart } from '@/components/analytics/ActivityChart';
import { PlatformVolumeChart } from '@/components/analytics/PlatformVolumeChart';
import { PlatformReliabilityChart } from '@/components/analytics/PlatformReliabilityChart';
import { PostsTable } from '@/components/analytics/PostsTable';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAnalyticsPosts } from '@/hooks/useAnalyticsPosts';
import type { TimeRange } from '@/types/analytics';

export default function AnalyticsPage() {
  const [range, setRange] = useState<TimeRange>('30d');
  const [filters, setFilters] = useState({ platform: 'all', status: 'all' });
  const [postsPage, setPostsPage] = useState(1);

  const { data, loading, error } = useAnalytics(range);
  const {
    posts,
    pagination,
    loading: postsLoading,
  } = useAnalyticsPosts({
    range,
    platform: filters.platform,
    status: filters.status,
    page: postsPage,
  });

  const handleRangeChange = (newRange: TimeRange) => {
    setRange(newRange);
    setPostsPage(1);
  };

  const handleFilterChange = (key: 'platform' | 'status', value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPostsPage(1);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, rgba(25,118,210,0.05) 0%, rgba(255,255,255,0) 50%)',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Fade in timeout={600}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #1877f2 0%, #E1306C 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BarChartIcon sx={{ color: '#fff', fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    sx={{
                      background: 'linear-gradient(90deg, #1877f2, #E1306C, #F77737)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Analytics
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Publishing performance and usage patterns
                  </Typography>
                </Box>
              </Box>
              <TimeRangeSelector value={range} onChange={handleRangeChange} />
            </Box>
          </Box>
        </Fade>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <Fade in timeout={700}>
          <Box sx={{ mb: 3 }}>
            <SummaryCards data={data?.summary ?? null} loading={loading} />
          </Box>
        </Fade>

        {/* Charts Row */}
        <Fade in timeout={800}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3, mb: 3 }}>
            <ActivityChart data={data?.activityChart ?? null} loading={loading} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <PlatformVolumeChart data={data?.platformVolume ?? null} loading={loading} />
              <PlatformReliabilityChart data={data?.platformReliability ?? null} loading={loading} />
            </Box>
          </Box>
        </Fade>

        {/* Posts Table */}
        <Fade in timeout={900}>
          <Box>
            <PostsTable
              posts={posts}
              loading={postsLoading}
              pagination={{ page: pagination.page, totalPages: pagination.totalPages, total: pagination.total }}
              filters={filters}
              onFilterChange={handleFilterChange}
              onPageChange={setPostsPage}
            />
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/analytics/page.tsx
git commit -m "feat(analytics): add main analytics page"
```

---

## Task 14: Add Analytics Link to Navbar

**Files:**
- Modify: `src/components/Navbar.tsx`

**Step 1: Import the icon**

Add to imports at line ~34:
```typescript
import BarChartIcon from '@mui/icons-material/BarChart';
```

**Step 2: Add Analytics to nav links**

In the `getNavLinks` function, add Analytics link after History (around line 57):

Change from:
```typescript
{ href: '/history', label: 'History', icon: HistoryIcon },
{
  label: 'AI Tools',
```

To:
```typescript
{ href: '/history', label: 'History', icon: HistoryIcon },
{ href: '/analytics', label: 'Analytics', icon: BarChartIcon },
{
  label: 'AI Tools',
```

**Step 3: Commit**

```bash
git add src/components/Navbar.tsx
git commit -m "feat(analytics): add Analytics link to navbar"
```

---

## Task 15: Create Component Index File

**Files:**
- Create: `src/components/analytics/index.ts`

**Step 1: Create barrel export**

```typescript
export { TimeRangeSelector } from './TimeRangeSelector';
export { SummaryCards } from './SummaryCards';
export { ActivityChart } from './ActivityChart';
export { PlatformVolumeChart } from './PlatformVolumeChart';
export { PlatformReliabilityChart } from './PlatformReliabilityChart';
export { PostsTable } from './PostsTable';
```

**Step 2: Commit**

```bash
git add src/components/analytics/index.ts
git commit -m "feat(analytics): add component barrel exports"
```

---

## Task 16: Test the Implementation

**Step 1: Start the dev server**

Run: `npm run dev`

**Step 2: Verify the analytics page loads**

Navigate to: `http://localhost:3000/analytics`

Expected:
- Page loads without errors
- Summary cards display (may show zeros if no data)
- Charts render (may show empty state)
- Posts table displays with filters
- Time range selector works
- Navbar shows Analytics link

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(analytics): complete analytics page implementation"
```

---

## Summary

This plan implements:
1. **Types** - TypeScript interfaces for API responses
2. **API endpoints** - `/api/analytics` and `/api/analytics/posts`
3. **Hooks** - `useAnalytics` and `useAnalyticsPosts`
4. **Components** - TimeRangeSelector, SummaryCards, ActivityChart, PlatformVolumeChart, PlatformReliabilityChart, PostsTable
5. **Page** - `/analytics` with full dashboard layout
6. **Navigation** - Analytics link in navbar

All data comes from the existing `publish_history` table with no database changes required.
