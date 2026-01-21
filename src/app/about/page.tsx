'use client';

import React from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Avatar,
  Button,
} from '@mui/material';
import Link from 'next/link';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import XIcon from '@mui/icons-material/X';
import TelegramIcon from '@mui/icons-material/Telegram';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import GroupsIcon from '@mui/icons-material/Groups';
import FavoriteIcon from '@mui/icons-material/Favorite';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BarChartIcon from '@mui/icons-material/BarChart';
import PsychologyIcon from '@mui/icons-material/Psychology';
import HistoryIcon from '@mui/icons-material/History';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const FACEBOOK_COLOR = '#1877f2';
const INSTAGRAM_COLOR = '#E1306C';
const X_COLOR = '#000000';
const TELEGRAM_COLOR = '#0088cc';

function ValueCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        height: '100%',
        borderRadius: 4,
        border: '1px solid',
        borderColor: 'divider',
        textAlign: 'center',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: color,
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 24px ${color}15`,
        },
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: 3,
          bgcolor: `${color}12`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 3,
        }}
      >
        <Icon sx={{ fontSize: 32, color }} />
      </Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
        {description}
      </Typography>
    </Paper>
  );
}

function TimelineItem({
  year,
  title,
  description,
  isLast = false,
}: {
  year: string;
  title: string;
  description: string;
  isLast?: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1877f2 0%, #E1306C 100%)',
            flexShrink: 0,
          }}
        />
        {!isLast && (
          <Box
            sx={{
              width: 2,
              flex: 1,
              bgcolor: 'divider',
              my: 1,
            }}
          />
        )}
      </Box>
      <Box sx={{ pb: isLast ? 0 : 4 }}>
        <Typography
          variant="caption"
          sx={{
            color: 'primary.main',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {year}
        </Typography>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
          {description}
        </Typography>
      </Box>
    </Box>
  );
}

export default function AboutPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          pt: { xs: 8, md: 12 },
          pb: { xs: 10, md: 14 },
          background:
            'linear-gradient(180deg, rgba(24,119,242,0.08) 0%, rgba(225,48,108,0.05) 50%, rgba(255,255,255,0) 100%)',
          overflow: 'hidden',
        }}
      >
        {/* Decorative Elements */}
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${FACEBOOK_COLOR}10 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '10%',
            right: '5%',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${INSTAGRAM_COLOR}10 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        <Container maxWidth="md" sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: 4,
              background: 'linear-gradient(135deg, #1877f2 0%, #E1306C 50%, #F77737 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 4,
              boxShadow: '0 12px 40px rgba(225,48,108,0.3)',
            }}
          >
            <RocketLaunchIcon sx={{ fontSize: 40, color: 'white' }} />
          </Box>

          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              mb: 3,
              fontSize: { xs: '2.5rem', md: '3.5rem' },
            }}
          >
            About{' '}
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(90deg, #1877f2, #E1306C, #F77737)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Mockingbird
            </Box>
          </Typography>

          <Typography
            variant="h5"
            color="text.secondary"
            sx={{ maxWidth: 700, mx: 'auto', lineHeight: 1.6, fontWeight: 400 }}
          >
            Simplifying social media publishing with powerful tools for analytics,
            history tracking, and AI-powered content optimization.
          </Typography>
        </Container>
      </Box>

      {/* Mission Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography
              variant="overline"
              sx={{
                color: 'primary.main',
                fontWeight: 600,
                letterSpacing: 2,
                mb: 2,
                display: 'block',
              }}
            >
              Our Mission
            </Typography>
            <Typography variant="h3" fontWeight={700} sx={{ mb: 3 }}>
              Making Social Media Management Effortless
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
              In today&apos;s digital world, maintaining a presence across multiple social platforms
              is essential but time-consuming. We believe your time is better spent creating
              great content, not copying and pasting it across platforms.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              Mockingbird was built to solve this problem. With just one click, you can share
              your message with your entire audience, no matter where they are. Plus, with our
              analytics dashboard, publishing history, and AI-powered content tools, you have
              everything you need to optimize your social media strategy.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                display: 'flex',
                gap: 3,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              {[
                { icon: FacebookIcon, color: FACEBOOK_COLOR, label: 'Facebook' },
                { icon: InstagramIcon, color: INSTAGRAM_COLOR, label: 'Instagram' },
                { icon: XIcon, color: X_COLOR, label: 'X' },
                { icon: TelegramIcon, color: TELEGRAM_COLOR, label: 'Telegram' },
              ].map((platform, index) => (
                <Paper
                  key={platform.label}
                  elevation={0}
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    transition: 'all 0.3s ease',
                    animation: `float 3s ease-in-out ${index * 0.3}s infinite`,
                    '@keyframes float': {
                      '0%, 100%': { transform: 'translateY(0px)' },
                      '50%': { transform: 'translateY(-8px)' },
                    },
                    '&:hover': {
                      borderColor: platform.color,
                      boxShadow: `0 8px 24px ${platform.color}20`,
                    },
                  }}
                >
                  <platform.icon sx={{ fontSize: 40, color: platform.color }} />
                  <Typography variant="caption" fontWeight={500}>
                    {platform.label}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Features Section */}
      <Box sx={{ bgcolor: 'grey.50', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" fontWeight={700} sx={{ mb: 2 }}>
              Powerful Features
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              Everything you need to manage and optimize your social media presence
            </Typography>
          </Box>

          <Grid container spacing={4}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <ValueCard
                icon={CloudUploadIcon}
                title="Cross-Platform Publishing"
                description="Write once, publish everywhere. Share your content across Facebook, Instagram, X, and Telegram simultaneously."
                color={FACEBOOK_COLOR}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <ValueCard
                icon={HistoryIcon}
                title="Publishing History"
                description="Track all your posts with detailed logs. Filter by platform or status, download reports, and manage with bulk actions."
                color="#8b5cf6"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <ValueCard
                icon={BarChartIcon}
                title="Analytics Dashboard"
                description="Visualize your publishing activity with interactive charts showing volume, success rates, and platform performance."
                color="#22c55e"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <ValueCard
                icon={PsychologyIcon}
                title="AI Content Tools"
                description="Transform your content with AI-powered prompts. Configure multiple AI providers and create custom prompts for each platform."
                color={INSTAGRAM_COLOR}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Values Section */}
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" fontWeight={700} sx={{ mb: 2 }}>
              Our Core Values
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              These principles guide everything we do at Mockingbird
            </Typography>
          </Box>

          <Grid container spacing={4}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <ValueCard
                icon={SpeedIcon}
                title="Simplicity"
                description="We believe powerful tools don't need to be complicated. Our interface is clean, intuitive, and gets out of your way."
                color={FACEBOOK_COLOR}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <ValueCard
                icon={SecurityIcon}
                title="Security"
                description="Your data and credentials are protected with industry-standard encryption. We take your privacy seriously."
                color="#22c55e"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <ValueCard
                icon={FavoriteIcon}
                title="User First"
                description="Every feature we build starts with understanding what our users actually need. Your feedback shapes our roadmap."
                color={INSTAGRAM_COLOR}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <ValueCard
                icon={EmojiObjectsIcon}
                title="Innovation"
                description="We're constantly exploring new ways to make social media management easier and more effective for everyone."
                color="#F77737"
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Story Timeline */}
      <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h3" fontWeight={700} sx={{ mb: 2 }}>
            Our Journey
          </Typography>
          <Typography variant="body1" color="text.secondary">
            From idea to reality - here&apos;s how Mockingbird came to be
          </Typography>
        </Box>

        <Box sx={{ maxWidth: 600, mx: 'auto' }}>
          <TimelineItem
            year="The Beginning"
            title="A Simple Frustration"
            description="Like many content creators, we were tired of manually posting the same content across multiple platforms. There had to be a better way."
          />
          <TimelineItem
            year="Development"
            title="Building the Solution"
            description="We set out to create a tool that would let anyone publish to all their social accounts with just one click. Simple, fast, and reliable."
          />
          <TimelineItem
            year="Launch"
            title="Going Live"
            description="Mockingbird launched with support for Facebook, Instagram, X, and Telegram. The response from early users exceeded our expectations."
          />
          <TimelineItem
            year="Today"
            title="Growing Together"
            description="We've added powerful features including analytics dashboards, comprehensive publishing history with filtering, and AI-powered content tools. And we're just getting started."
            isLast
          />
        </Box>
      </Container>

      {/* Team Section */}
      <Box
        sx={{
          background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
          py: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: 3,
              bgcolor: '#8b5cf615',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 4,
            }}
          >
            <GroupsIcon sx={{ fontSize: 36, color: '#8b5cf6' }} />
          </Box>

          <Typography variant="h3" fontWeight={700} sx={{ mb: 3 }}>
            Built by Creators, for Creators
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.8, mb: 4 }}
          >
            We&apos;re a small, passionate team who understand the challenges of managing
            a social media presence. We use Mockingbird every day, and we&apos;re committed
            to making it the best tool it can be.
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: FACEBOOK_COLOR, width: 56, height: 56 }}>
              <LightbulbIcon />
            </Avatar>
            <Avatar sx={{ bgcolor: INSTAGRAM_COLOR, width: 56, height: 56 }}>
              <FavoriteIcon />
            </Avatar>
            <Avatar sx={{ bgcolor: '#F77737', width: 56, height: 56 }}>
              <RocketLaunchIcon />
            </Avatar>
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1877f2 0%, #E1306C 50%, #F77737 100%)',
          py: { xs: 8, md: 10 },
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h3" fontWeight={700} sx={{ color: 'white', mb: 2 }}>
            Ready to Get Started?
          </Typography>
          <Typography
            variant="h6"
            sx={{ color: 'rgba(255,255,255,0.9)', mb: 4, fontWeight: 400 }}
          >
            Join the community of creators who publish smarter with Mockingbird
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" passHref>
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  bgcolor: 'white',
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.9)',
                  },
                }}
              >
                Create Free Account
              </Button>
            </Link>
            <Link href="/" passHref>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                Back to Home
              </Button>
            </Link>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          bgcolor: '#111',
          color: 'grey.400',
          py: 4,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="body2">
            © {new Date().getFullYear()} Mockingbird. All rights reserved.
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', gap: 3, justifyContent: 'center' }}>
            <Link href="/privacy" passHref>
              <Typography
                variant="body2"
                sx={{ color: 'grey.400', '&:hover': { color: 'white' }, cursor: 'pointer' }}
              >
                Privacy Policy
              </Typography>
            </Link>
            <Link href="/" passHref>
              <Typography
                variant="body2"
                sx={{ color: 'grey.400', '&:hover': { color: 'white' }, cursor: 'pointer' }}
              >
                Home
              </Typography>
            </Link>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
