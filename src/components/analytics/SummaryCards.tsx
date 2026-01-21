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
