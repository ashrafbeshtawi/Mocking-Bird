'use client';

import React from 'react';
import Link from 'next/link';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid2 as Grid,
  useTheme,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatIcon from '@mui/icons-material/Chat';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const cards = [
  {
    href: '/ai/providers',
    icon: SettingsIcon,
    title: 'AI Providers',
    description: 'Configure your AI providers (OpenAI, Claude, Gemini, or any OpenAI-compatible API)',
  },
  {
    href: '/ai/prompts',
    icon: ChatIcon,
    title: 'Prompts',
    description: 'Create and manage prompts for content transformation',
  },
];

export default function AiPage() {
  const theme = useTheme();

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ fontWeight: theme.typography.fontWeightBold, mb: 1 }}
      >
        AI Tools
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Configure AI providers and prompts to automatically transform your content before publishing.
      </Typography>

      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid size={{ xs: 12, md: 6 }} key={card.href}>
            <Paper
              component={Link}
              href={card.href}
              elevation={0}
              sx={{
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#E1306C',
                  bgcolor: '#E1306C08',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px rgba(225,48,108,0.12)',
                },
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: '#E1306C15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <card.icon sx={{ fontSize: 28, color: '#E1306C' }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                  {card.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.description}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#E1306C', mt: 'auto' }}>
                <Typography variant="body2" fontWeight={500}>
                  Configure
                </Typography>
                <ArrowForwardIcon sx={{ fontSize: 18 }} />
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
