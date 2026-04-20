'use client';

import React from 'react';
import {
  Box,
  Typography,
  Button,
} from '@mui/material';
import Link from 'next/link';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import XIcon from '@mui/icons-material/X';
import TelegramIcon from '@mui/icons-material/Telegram';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const PLATFORMS = [
  { icon: FacebookIcon, label: 'Facebook', color: '#3b5998' },
  { icon: InstagramIcon, label: 'Instagram', color: '#c13584' },
  { icon: XIcon, label: 'X', color: '#1f1a12' },
  { icon: TelegramIcon, label: 'Telegram', color: '#2b8bcc' },
];

export default function LandingPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          pt: { xs: 10, md: 16 },
          pb: { xs: 12, md: 20 },
          px: 3,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: '0.625rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'primary.main',
            fontWeight: 500,
            mb: 4,
          }}
        >
          Publish across four · in one keystroke
        </Typography>

        <Typography
          component="h1"
          sx={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontWeight: 400,
            fontSize: { xs: '2.25rem', sm: '3.5rem', md: '6.5rem' },
            lineHeight: 0.92,
            letterSpacing: '-0.04em',
            color: 'text.primary',
            maxWidth: 980,
            mb: 4,
          }}
        >
          Write once.
          <br />
          <Box
            component="span"
            sx={{ fontStyle: 'italic', color: 'primary.main' }}
          >
            Land everywhere
          </Box>
          <Box component="span" sx={{ color: 'primary.main' }}>.</Box>
        </Typography>

        <Typography
          sx={{
            fontFamily: 'var(--font-instrument-serif), Georgia, serif',
            fontSize: { xs: '1.1rem', md: '1.4rem' },
            lineHeight: 1.45,
            color: 'text.secondary',
            maxWidth: 560,
            mb: 5,
          }}
        >
          A calm composer for Facebook, Instagram, X and Telegram — tailored per platform, published when you say go.
        </Typography>

        <Link href="/auth" passHref>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
            sx={{
              px: 3,
              py: 1.5,
              fontSize: '0.9375rem',
              fontWeight: 500,
            }}
          >
            Start free
          </Button>
        </Link>

        {/* Platform marks */}
        <Box
          sx={{
            mt: 9,
            display: 'flex',
            gap: 3.5,
            color: 'text.disabled',
            opacity: 0.7,
          }}
        >
          {PLATFORMS.map((p) => (
            <p.icon key={p.label} sx={{ fontSize: 20 }} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
