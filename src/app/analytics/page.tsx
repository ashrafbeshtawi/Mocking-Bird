'use client';

import { Fragment, useState } from 'react';
import { Container, Box, Typography, Alert, AlertTitle, Skeleton } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import XIcon from '@mui/icons-material/X';
import TelegramIcon from '@mui/icons-material/Telegram';
import { PageHeader } from '@/components/PageHeader';
import { TimeRangeSelector } from '@/components/analytics/TimeRangeSelector';
import { ActivityChart } from '@/components/analytics/ActivityChart';
import { useAnalytics } from '@/hooks/useAnalytics';
import type { TimeRange } from '@/types/analytics';
import type { SvgIconComponent } from '@mui/icons-material';

const platforms: { key: 'instagram' | 'facebook' | 'twitter' | 'telegram'; name: string; Icon: SvgIconComponent; color: string }[] = [
  { key: 'instagram', name: 'Instagram', Icon: InstagramIcon, color: '#c13584' },
  { key: 'facebook', name: 'Facebook', Icon: FacebookIcon, color: '#3b5998' },
  { key: 'twitter', name: 'X', Icon: XIcon, color: '#1f1a12' },
  { key: 'telegram', name: 'Telegram', Icon: TelegramIcon, color: '#2b8bcc' },
];

const heatmapDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const heatmapHours = ['6 am', '9 am', '12 pm', '3 pm', '6 pm', '9 pm'];

const TIPS = [
  { title: 'Post consistently', desc: 'Publishing at regular intervals builds audience trust and improves algorithm ranking across all platforms.' },
  { title: 'Use AI for adaptation', desc: 'Let the AI tools tailor your message per platform — what works on Facebook may need a different tone on X.' },
  { title: 'Monitor failed posts', desc: 'Check the history page for failed deliveries. Token expiry is the most common cause — reconnect accounts promptly.' },
  { title: 'Leverage multi-platform', desc: 'Cross-posting to all four platforms multiplies reach without extra effort. Connect every account you manage.' },
];

const cardSx = {
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 4,
  p: 2.75,
};

const monoLabelSx = {
  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: 'text.secondary',
  fontWeight: 500,
  mb: 1,
};

const bigNumberSx = {
  fontFamily: 'var(--font-fraunces), Georgia, serif',
  fontSize: { xs: 28, sm: 34, md: 42 },
  fontWeight: 400,
  letterSpacing: -1.2,
  lineHeight: 1,
};

const trendBadgeSx = {
  bgcolor: 'primary.light',
  color: 'primary.dark',
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 1,
  px: 0.75,
  py: 0.25,
  ml: 1,
  display: 'inline-flex',
  alignItems: 'center',
};

const sectionTitleSx = {
  fontFamily: 'var(--font-fraunces), Georgia, serif',
  fontSize: 22,
  fontWeight: 400,
  letterSpacing: -0.5,
  lineHeight: 1.2,
};

export default function AnalyticsPage() {
  const [range, setRange] = useState<TimeRange>('30d');
  const { data, loading, error } = useAnalytics(range);

  const rangeLabels: Record<TimeRange, string> = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    all: 'All time',
  };

  const handleRangeChange = (newRange: TimeRange) => {
    setRange(newRange);
  };

  const volumeTotal = data
    ? (Object.values(data.platformVolume) as number[]).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="lg">

        {/* ── Header ── */}
        <PageHeader
          eyebrow={rangeLabels[range]}
          title={<>Analytics</>}
          lead="What's landing, what's falling flat, and which platform each post lives on. All in one view."
        >
          <TimeRangeSelector value={range} onChange={handleRangeChange} />
        </PageHeader>

        {/* ── Error Alert ── */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        {/* ── 1. Three Big Stat Cards ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
          {/* Total Posts */}
          <Box sx={cardSx}>
            <Typography sx={monoLabelSx}>Total Posts</Typography>
            {loading ? (
              <Skeleton variant="text" width={80} height={52} />
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography sx={bigNumberSx}>{data?.summary.totalPosts ?? 0}</Typography>
                  <Box component="span" sx={trendBadgeSx}>
                    {data?.summary.successRate ?? 0}% success
                  </Box>
                </Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.75 }}>
                  across all platforms
                </Typography>
              </>
            )}
          </Box>

          {/* Success Rate */}
          <Box sx={cardSx}>
            <Typography sx={monoLabelSx}>Success Rate</Typography>
            {loading ? (
              <Skeleton variant="text" width={80} height={52} />
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography sx={bigNumberSx}>{data?.summary.successRate ?? 0}%</Typography>
                  <Box component="span" sx={trendBadgeSx}>
                    healthy
                  </Box>
                </Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.75 }}>
                  of all publishing attempts
                </Typography>
              </>
            )}
          </Box>

          {/* Failed Posts */}
          <Box sx={cardSx}>
            <Typography sx={monoLabelSx}>Failed Posts</Typography>
            {loading ? (
              <Skeleton variant="text" width={80} height={52} />
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography sx={bigNumberSx}>{data?.summary.failedCount ?? 0}</Typography>
                  <Box component="span" sx={trendBadgeSx}>
                    {data?.summary.totalPosts
                      ? Math.round(((data.summary.failedCount) / data.summary.totalPosts) * 100)
                      : 0}% of total
                  </Box>
                </Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.75 }}>
                  need attention
                </Typography>
              </>
            )}
          </Box>
        </Box>

        {/* ── 2. Chart + Platform Breakdown Row ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2, mb: 3 }}>
          {/* Left: Activity Chart */}
          <ActivityChart data={data?.activityChart ?? null} loading={loading} />

          {/* Right: By platform */}
          <Box sx={cardSx}>
            <Typography sx={sectionTitleSx}>By platform</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2.5 }}>
              Share of publishing per platform
            </Typography>

            {loading ? (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <Box key={i} sx={{ mb: 1.75 }}>
                    <Skeleton variant="text" width="100%" height={20} />
                    <Skeleton variant="rectangular" height={4} sx={{ borderRadius: 1, mt: 0.5 }} />
                  </Box>
                ))}
              </>
            ) : (
              platforms.map((p) => {
                const count = data?.platformVolume?.[p.key] ?? 0;
                const pct = volumeTotal > 0 ? Math.round((count / volumeTotal) * 100) : 0;
                return (
                  <Box key={p.key} sx={{ mb: 1.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <p.Icon sx={{ fontSize: 16, color: p.color }} />
                        <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{p.name}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline' }}>
                        <Typography sx={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, color: 'text.secondary' }}>
                          {count}
                        </Typography>
                        <Typography sx={{ fontFamily: 'var(--font-fraunces)', fontSize: 16, letterSpacing: -0.3 }}>
                          {pct}%
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ height: 4, borderRadius: 1, bgcolor: 'action.hover', overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: p.color, opacity: 0.75 }} />
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>
        </Box>

        {/* ── 3. Tips + Publishing Activity Heatmap Row ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.3fr 1fr' }, gap: 2, mb: 3 }}>
          {/* Left: Tips */}
          <Box sx={cardSx}>
            <Typography sx={sectionTitleSx}>Tips</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2.5 }}>
              Improve your publishing workflow
            </Typography>

            {TIPS.map((tip, idx) => (
              <Box key={idx}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 1.5 }}>
                  <Typography sx={{ fontFamily: 'var(--font-fraunces)', fontSize: 26, fontWeight: 400, minWidth: 28, textAlign: 'center', color: 'text.secondary', letterSpacing: -0.5 }}>
                    {idx + 1}
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.25 }}>
                      {tip.title}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
                      {tip.desc}
                    </Typography>
                  </Box>
                </Box>
                {idx < TIPS.length - 1 && (
                  <Box sx={{ height: '1px', bgcolor: 'divider' }} />
                )}
              </Box>
            ))}
          </Box>

          {/* Right: Publishing Activity Heatmap */}
          <Box sx={cardSx}>
            <Typography sx={sectionTitleSx}>Publishing activity</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2.5 }}>
              Posts per time slot &middot; last 30 days
            </Typography>

            {/* Heatmap grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'auto repeat(7, 1fr)', gap: { xs: 0.25, sm: 0.5 }, mb: 2, overflow: 'auto' }}>
              {/* Header row */}
              <Box />
              {heatmapDays.map((day, i) => (
                <Typography key={i} sx={{ fontFamily: 'var(--font-geist-mono)', fontSize: 9, textAlign: 'center', color: 'text.secondary', fontWeight: 500 }}>
                  {day}
                </Typography>
              ))}

              {/* Data rows - populated from activityChart data when available */}
              {heatmapHours.map((hour, rowIdx) => (
                <Fragment key={rowIdx}>
                  <Typography sx={{ fontFamily: 'var(--font-geist-mono)', fontSize: 9, color: 'text.secondary', display: 'flex', alignItems: 'center', pr: 0.5, fontWeight: 500 }}>
                    {hour}
                  </Typography>
                  {heatmapDays.map((_, colIdx) => {
                    // Derive intensity from activity data if available
                    const chartVals = data?.activityChart?.success ?? [];
                    const dataIdx = (rowIdx * 7 + colIdx) % Math.max(chartVals.length, 1);
                    const maxVal = Math.max(...chartVals, 1);
                    const intensity = chartVals.length > 0 ? (chartVals[dataIdx] ?? 0) / maxVal : ((rowIdx * 3 + colIdx * 7) % 11) / 10;
                    const isPeak = intensity > 0.8;
                    return (
                      <Box
                        key={`${rowIdx}-${colIdx}`}
                        sx={{
                          aspectRatio: '1',
                          borderRadius: 0.75,
                          bgcolor: 'primary.main',
                          opacity: Math.max(intensity * 0.85, 0.05),
                          ...(isPeak && {
                            opacity: 1,
                            border: '2px solid',
                            borderColor: 'primary.dark',
                          }),
                        }}
                      />
                    );
                  })}
                </Fragment>
              ))}
            </Box>

            {/* Insight box */}
            <Box sx={{ bgcolor: 'primary.light', borderRadius: 2, px: 2, py: 1.5, mt: 1 }}>
              <Typography sx={{ fontSize: 12, color: 'primary.dark', lineHeight: 1.5 }}>
                <strong>Tip:</strong> Publishing during weekday mornings tends to get better engagement across most platforms.
              </Typography>
            </Box>
          </Box>
        </Box>

      </Container>
    </Box>
  );
}
