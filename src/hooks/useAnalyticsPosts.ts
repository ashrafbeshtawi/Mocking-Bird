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
