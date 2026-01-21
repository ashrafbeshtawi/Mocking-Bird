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
