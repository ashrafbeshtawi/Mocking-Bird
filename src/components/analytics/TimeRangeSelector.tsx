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
          gap: 1,
          '& .MuiToggleButton-root': {
            px: 2,
            py: 0.75,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.8125rem',
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.secondary',
            '&.Mui-selected': {
              bgcolor: 'primary.light',
              color: 'primary.dark',
              borderColor: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.light',
              },
            },
            '&:hover': {
              bgcolor: 'action.hover',
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
