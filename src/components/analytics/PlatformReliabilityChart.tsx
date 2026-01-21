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
