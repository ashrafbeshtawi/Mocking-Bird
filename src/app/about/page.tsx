'use client';

import React from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

// Bird logo mark (same as Navbar)
function BirdMark({ size = 64 }: { size?: number }) {
  const theme = useTheme();
  const accent = theme.palette.primary.main;
  const ink = theme.palette.primary.contrastText;
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: `${size * 0.24}px`,
        bgcolor: accent,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none">
        <circle cx="7" cy="8" r="2.4" fill={ink} />
        <path
          d="M6.5 10.8 C 7.5 14, 10 17, 17 17 L 20 14 L 16 13 L 17 10 L 13 11.5 Z"
          fill={ink}
        />
        <path d="M8.8 7.2 L 11 5.5" stroke={ink} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </Box>
  );
}

// Principle row for the two-column layout
function Principle({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 2, md: 6 },
        borderTop: '1px solid',
        borderColor: 'divider',
        pt: { xs: 4, md: 5 },
        pb: { xs: 4, md: 5 },
      }}
    >
      {/* Left label column */}
      <Box sx={{ width: { xs: '100%', md: 240 }, flexShrink: 0 }}>
        <Typography
          sx={{
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: '0.625rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            fontWeight: 500,
            mb: 1,
          }}
        >
          {number}
        </Typography>
      </Box>

      {/* Right content column */}
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontWeight: 400,
            color: 'text.primary',
            mb: 2,
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            fontFamily: 'var(--font-instrument-serif), Georgia, serif',
            fontSize: '1rem',
            lineHeight: 1.7,
            color: 'text.secondary',
            maxWidth: 520,
          }}
        >
          {description}
        </Typography>
      </Box>
    </Box>
  );
}

// Stat item for the stats strip
function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography
        sx={{
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontSize: { xs: '2.5rem', md: '3.5rem' },
          fontWeight: 400,
          lineHeight: 1,
          color: 'text.primary',
          letterSpacing: '-0.03em',
          mb: 1,
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
          fontSize: '0.625rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          fontWeight: 500,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

export default function AboutPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* ── Hero Section ── */}
      <Box
        sx={{
          pt: { xs: 10, md: 16 },
          pb: { xs: 10, md: 14 },
          textAlign: 'center',
          px: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <BirdMark size={64} />
        </Box>

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
          The Story
        </Typography>

        <Typography
          component="h1"
          sx={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontWeight: 400,
            fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
            lineHeight: 1,
            letterSpacing: '-0.03em',
            color: 'text.primary',
            maxWidth: 780,
            mx: 'auto',
            mb: 4,
          }}
        >
          Small teams deserve a{' '}
          <Box
            component="span"
            sx={{ fontStyle: 'italic', color: 'primary.main' }}
          >
            calmer
          </Box>{' '}
          way to publish.
        </Typography>

        <Typography
          sx={{
            fontFamily: 'var(--font-instrument-serif), Georgia, serif',
            fontSize: { xs: '1.1rem', md: '1.3rem' },
            lineHeight: 1.55,
            color: 'text.secondary',
            maxWidth: 560,
            mx: 'auto',
          }}
        >
          Mockingbird grew from a simple frustration: copying the same post across
          four platforms shouldn&apos;t eat your afternoon. We built a quiet tool
          that lets you compose once and land everywhere.
        </Typography>
      </Box>

      {/* ── Principles Section ── */}
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
        <Typography
          sx={{
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: '0.625rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'primary.main',
            fontWeight: 500,
            mb: 6,
          }}
        >
          Principles
        </Typography>

        <Principle
          number="01"
          title="Calm over loud"
          description="Publishing tools shouldn't shout for attention. Mockingbird stays quiet until you need it, with a warm interface that feels like paper, not a control room."
        />
        <Principle
          number="02"
          title="One keystroke, four platforms"
          description="Write your message once and send it to Facebook, Instagram, X, and Telegram simultaneously. AI adapts tone and format per channel so every post feels native."
        />
        <Principle
          number="03"
          title="Insight without overwhelm"
          description="A clear analytics dashboard, full publishing history, and exportable reports give you the picture without the noise. See what landed and move on."
        />
      </Container>

      {/* ── Stats Strip ── */}
      <Box
        sx={{
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 6, md: 8 },
        }}
      >
        <Container maxWidth="md">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: { xs: 5, md: 4 },
            }}
          >
            <StatItem label="Posts published" value="2.4M" />
            <StatItem label="Active studios" value="1,840" />
            <StatItem label="Avg weekly save" value="4.2h" />
            <StatItem label="Founded" value="2024" />
          </Box>
        </Container>
      </Box>

      {/* ── CTA Footer ── */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          py: { xs: 8, md: 12 },
          px: 3,
        }}
      >
        <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
          <Typography
            sx={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontWeight: 400,
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              lineHeight: 1,
              letterSpacing: '-0.03em',
              color: 'primary.contrastText',
              mb: 3,
            }}
          >
            Say hello.
          </Typography>

          <Typography
            sx={{
              fontFamily: 'var(--font-instrument-serif), Georgia, serif',
              fontSize: '1.1rem',
              lineHeight: 1.55,
              color: 'rgba(251,249,244,0.75)',
              maxWidth: 440,
              mx: 'auto',
              mb: 4,
            }}
          >
            Got questions, feedback, or just want to chat about social media
            workflows? We&apos;d love to hear from you.
          </Typography>

          <Box
            sx={{
              display: 'inline-block',
              bgcolor: 'rgba(251,249,244,0.12)',
              border: '1px solid rgba(251,249,244,0.2)',
              borderRadius: 999,
              px: 3,
              py: 1.25,
              mb: 4,
            }}
          >
            <Typography
              sx={{
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: '0.8125rem',
                letterSpacing: '0.02em',
                color: 'primary.contrastText',
              }}
            >
              hello@mockingbird.app
            </Typography>
          </Box>

          <Box sx={{ display: 'block' }}>
            <Link href="/auth" passHref>
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  bgcolor: 'primary.contrastText',
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: 'rgba(251,249,244,0.9)',
                  },
                }}
              >
                Get started free
              </Button>
            </Link>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
