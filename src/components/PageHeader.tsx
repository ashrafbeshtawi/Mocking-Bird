'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: string;
  children?: React.ReactNode; // Action buttons on the right
}

export function PageHeader({ eyebrow, title, lead, children }: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', md: 'flex-end' },
        justifyContent: 'space-between',
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 2, md: 5 },
        py: { xs: 3, md: 4 },
        px: { xs: 0, md: 0 },
        mb: 3,
      }}
    >
      <Box>
        {eyebrow && (
          <Typography
            sx={{
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: '0.625rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'primary.main',
              fontWeight: 500,
              mb: 1.5,
            }}
          >
            {eyebrow}
          </Typography>
        )}
        <Typography
          component="h1"
          sx={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontWeight: 400,
            fontSize: { xs: '2rem', sm: '2.4rem', md: '2.625rem' },
            letterSpacing: '-0.03em',
            lineHeight: 1,
            color: 'text.primary',
            m: 0,
          }}
        >
          {title}
        </Typography>
        {lead && (
          <Typography
            sx={{
              mt: 1.5,
              fontSize: '0.875rem',
              color: 'text.secondary',
              maxWidth: 520,
              lineHeight: 1.5,
            }}
          >
            {lead}
          </Typography>
        )}
      </Box>
      {children && (
        <Box sx={{ display: 'flex', gap: 1.25, pb: 0.5, flexShrink: 0 }}>
          {children}
        </Box>
      )}
    </Box>
  );
}
