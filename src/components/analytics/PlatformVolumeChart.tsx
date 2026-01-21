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
