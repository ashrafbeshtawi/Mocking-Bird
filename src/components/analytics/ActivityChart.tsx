'use client';

import { Paper, Typography, Box, Skeleton } from '@mui/material';
import {
  LineChart,
  Line,
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
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: { xs: 280, md: 350 } }}>
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
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography sx={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 22, fontWeight: 400, letterSpacing: -0.5, mb: 0.5 }}>
        Publishing Activity
      </Typography>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
        Posts over time
      </Typography>
      <Box sx={{ flex: 1, minHeight: 200 }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eae4d4" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9b917e" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9b917e" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e0d9c8',
                  boxShadow: '0 4px 12px rgba(45,35,20,0.1)',
                  fontSize: 12,
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="success"
                name="Successful"
                stroke="#2d5f3f"
                strokeWidth={2}
                dot={{ r: 3, fill: '#2d5f3f' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="failed"
                name="Failed"
                stroke="#a63d2a"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 2, fill: '#a63d2a' }}
              />
            </LineChart>
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
