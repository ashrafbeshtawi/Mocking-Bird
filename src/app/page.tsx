'use client';

import React from 'react';
import {
  Box,
  Typography,
  Button,
} from '@mui/material';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';

const PLATFORMS = Object.values(PLATFORM_CONFIG);

const STEPS = [
  {
    title: 'Connect your accounts',
    description:
      'Sign in with Google, GitHub or Discord, then connect your own pages, channels and profiles through each platform\'s official login. You can disconnect any account at any time.',
  },
  {
    title: 'Write one post',
    description:
      'Write a caption once and attach your images or video. Mockingbird checks each platform\'s rules, such as text length and video duration, before you publish.',
  },
  {
    title: 'Adjust per platform',
    description:
      'Pick the accounts to publish to and set what each platform needs: a title for YouTube, or the privacy level, comment, Duet and Stitch settings and commercial content disclosure for TikTok.',
  },
  {
    title: 'Publish when you say go',
    description:
      'Nothing is posted until you click Publish. Mockingbird sends the post to every selected account in parallel and shows the result for each one.',
  },
];

const FEATURES = [
  {
    title: 'One composer, seven platforms',
    description: `Publish to ${PLATFORMS.map((p) => p.label).join(', ')} from a single screen.`,
  },
  {
    title: 'Drafts',
    description: 'Save posts as drafts and publish them later, unchanged or edited.',
  },
  {
    title: 'Publishing history',
    description: 'See what was published where, with per-account results and error details, and retry failed posts.',
  },
  {
    title: 'Analytics',
    description: 'See how much you publish, which platforms you use most and how reliably your posts go out.',
  },
  {
    title: 'AI assistant access',
    description: 'Let AI clients such as Claude create and manage your drafts through a personal MCP token you can revoke.',
  },
  {
    title: 'You stay in control',
    description: 'Mockingbird only posts to accounts you connected, only when you click Publish. No automatic posting.',
  },
];

const FAQ: { question: string; answer: React.ReactNode }[] = [
  {
    question: 'What does Mockingbird cost?',
    answer: 'Mockingbird is currently free of charge.',
  },
  {
    question: 'Who is Mockingbird for?',
    answer: 'Creators and small businesses who publish the same content to several of their own social media accounts.',
  },
  {
    question: 'What data does Mockingbird store?',
    answer: (
      <>
        The access tokens and basic profile details (such as account ID and display name) of the accounts you connect,
        your drafts, and the history of your posts. Details are in our <Link href="/privacy">Privacy Policy</Link>.
      </>
    ),
  },
  {
    question: 'How do I disconnect an account or delete my data?',
    answer: (
      <>
        Disconnect any account from the dashboard; its stored tokens and profile data are deleted. To remove
        everything, <Link href="/delete-account">delete your Mockingbird account</Link>. Use of the service is
        governed by our <Link href="/terms">Terms of Service</Link>.
      </>
    ),
  },
];

const monoLabelSx = {
  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
  fontSize: '0.625rem',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'primary.main',
  fontWeight: 500,
} as const;

const headingSx = {
  fontFamily: 'var(--font-fraunces), Georgia, serif',
  fontWeight: 400,
  color: 'text.primary',
} as const;

const bodySx = {
  fontFamily: 'var(--font-instrument-serif), Georgia, serif',
  fontSize: '1rem',
  lineHeight: 1.7,
  color: 'text.secondary',
} as const;

const cardSx = {
  p: 3,
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
} as const;

// Title on the left, content on the right; stacks on small screens.
function Section({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <Box
      component="section"
      sx={{
        maxWidth: 1120,
        mx: 'auto',
        px: 3,
        py: { xs: 5, md: 7 },
        borderTop: '1px solid',
        borderColor: 'divider',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '280px 1fr' },
        gap: { xs: 3, md: 6 },
      }}
    >
      <Box>
        <Typography sx={{ ...monoLabelSx, mb: 1.5 }}>{label}</Typography>
        <Typography component="h2" sx={{ ...headingSx, fontSize: { xs: '1.75rem', md: '2rem' }, lineHeight: 1.15 }}>
          {title}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}

const cardGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
  gap: 2,
} as const;

export default function LandingPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          pt: { xs: 8, md: 12 },
          pb: { xs: 6, md: 8 },
          px: 3,
        }}
      >
        <Typography sx={{ ...monoLabelSx, mb: 3 }}>
          Publish across seven · in one keystroke
        </Typography>

        <Typography
          component="h1"
          sx={{
            ...headingSx,
            fontSize: { xs: '2.25rem', sm: '3.5rem', md: '5.5rem' },
            lineHeight: 0.92,
            letterSpacing: '-0.04em',
            maxWidth: 980,
            mb: 3,
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
            ...bodySx,
            fontSize: { xs: '1.1rem', md: '1.3rem' },
            lineHeight: 1.45,
            maxWidth: 620,
            mb: 4,
          }}
        >
          Mockingbird lets creators and small businesses publish one post to their own TikTok, YouTube, Instagram,
          Facebook, X, LinkedIn and Telegram accounts at once, tailored per platform and published when you say go.
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

        {/* Supported platforms */}
        <Box
          component="ul"
          aria-label="Supported platforms"
          sx={{ mt: 5, p: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, maxWidth: 720 }}
        >
          {PLATFORMS.map((p) => (
            <Box
              component="li"
              key={p.label}
              sx={{ ...cardSx, p: 0, px: 1.5, py: 0.75, borderRadius: 999, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <p.icon sx={{ fontSize: 18, color: p.color }} />
              <Typography sx={{ ...bodySx, color: 'text.primary', lineHeight: 1 }}>{p.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Section label="How it works" title="From one draft to every account">
        <Box component="ol" sx={{ ...cardGridSx, listStyle: 'none', p: 0, m: 0 }}>
          {STEPS.map((step, i) => (
            <Box component="li" key={step.title} sx={cardSx}>
              <Typography sx={{ ...monoLabelSx, mb: 1 }}>{String(i + 1).padStart(2, '0')}</Typography>
              <Typography component="h3" sx={{ ...headingSx, fontSize: '1.2rem', mb: 0.5 }}>{step.title}</Typography>
              <Typography sx={bodySx}>{step.description}</Typography>
            </Box>
          ))}
        </Box>
      </Section>

      <Section label="Features" title="Everything a post needs, nothing it doesn't">
        <Box sx={cardGridSx}>
          {FEATURES.map((feature) => (
            <Box key={feature.title} sx={cardSx}>
              <Typography component="h3" sx={{ ...headingSx, fontSize: '1.2rem', mb: 0.5 }}>{feature.title}</Typography>
              <Typography sx={bodySx}>{feature.description}</Typography>
            </Box>
          ))}
        </Box>
      </Section>

      <Section label="FAQ" title="Questions, answered">
        <Box>
          {FAQ.map((item, i) => (
            <Box key={item.question} sx={{ py: 2, borderTop: i ? '1px solid' : 'none', borderColor: 'divider', pt: i ? 2 : 0 }}>
              <Typography component="h3" sx={{ ...headingSx, fontSize: '1.2rem', mb: 0.5 }}>{item.question}</Typography>
              <Typography sx={{ ...bodySx, '& a': { color: 'primary.main' } }}>{item.answer}</Typography>
            </Box>
          ))}
        </Box>
      </Section>
    </Box>
  );
}
