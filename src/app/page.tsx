'use client';

import React from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Avatar,
  Chip,
} from '@mui/material';
import Link from 'next/link';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import XIcon from '@mui/icons-material/X';
import TelegramIcon from '@mui/icons-material/Telegram';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import HistoryIcon from '@mui/icons-material/History';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';

const FACEBOOK_COLOR = '#1877f2';
const INSTAGRAM_COLOR = '#E1306C';
const X_COLOR = '#000000';
const TELEGRAM_COLOR = '#0088cc';

function FloatingPlatformIcon({
  icon: Icon,
  color,
  delay,
  position,
}: {
  icon: React.ElementType;
  color: string;
  delay: number;
  position: { top?: string; bottom?: string; left?: string; right?: string };
}) {
  return (
    <Box
      sx={{
        position: 'absolute',
        ...position,
        width: 60,
        height: 60,
        borderRadius: '16px',
        bgcolor: 'white',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: `float 3s ease-in-out ${delay}s infinite`,
        '@keyframes float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      }}
    >
      <Icon sx={{ fontSize: 32, color }} />
    </Box>
  );
}

function FeatureCard({
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
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: color,
          transform: 'translateY(-8px)',
          boxShadow: `0 20px 40px ${color}20`,
        },
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 3,
          bgcolor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        <Icon sx={{ fontSize: 28, color }} />
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

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <Box sx={{ textAlign: 'center', position: 'relative' }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1877f2 0%, #E1306C 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
          color: 'white',
          fontWeight: 700,
          fontSize: '1.25rem',
        }}
      >
        {number}
      </Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Box>
  );
}

function TestimonialCard({
  quote,
  author,
  role,
}: {
  quote: string;
  author: string;
  role: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        borderRadius: 4,
        border: '1px solid',
        borderColor: 'divider',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <FormatQuoteIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2, opacity: 0.5 }} />
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ fontStyle: 'italic', mb: 3, flex: 1, lineHeight: 1.8 }}
      >
        &ldquo;{quote}&rdquo;
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.main' }}>{author[0]}</Avatar>
        <Box>
          <Typography variant="subtitle2" fontWeight={600}>
            {author}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {role}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

export default function LandingPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          pt: { xs: 8, md: 12 },
          pb: { xs: 12, md: 16 },
          background:
            'linear-gradient(180deg, rgba(24,119,242,0.08) 0%, rgba(225,48,108,0.05) 50%, rgba(255,255,255,0) 100%)',
        }}
      >
        {/* Floating Platform Icons */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <FloatingPlatformIcon
            icon={FacebookIcon}
            color={FACEBOOK_COLOR}
            delay={0}
            position={{ top: '15%', left: '10%' }}
          />
          <FloatingPlatformIcon
            icon={InstagramIcon}
            color={INSTAGRAM_COLOR}
            delay={0.5}
            position={{ top: '25%', right: '12%' }}
          />
          <FloatingPlatformIcon
            icon={XIcon}
            color={X_COLOR}
            delay={1}
            position={{ bottom: '30%', left: '15%' }}
          />
          <FloatingPlatformIcon
            icon={TelegramIcon}
            color={TELEGRAM_COLOR}
            delay={1.5}
            position={{ bottom: '25%', right: '8%' }}
          />
        </Box>

        <Container maxWidth="md" sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
            label="Social Media Publishing Made Simple"
            sx={{
              mb: 3,
              bgcolor: 'white',
              border: '1px solid',
              borderColor: 'divider',
              fontWeight: 500,
            }}
          />

          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.5rem', md: '4rem' },
              fontWeight: 800,
              lineHeight: 1.1,
              mb: 3,
            }}
          >
            Publish Once,{' '}
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(90deg, #1877f2, #E1306C, #F77737)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Reach Everywhere
            </Box>
          </Typography>

          <Typography
            variant="h5"
            color="text.secondary"
            sx={{ mb: 5, maxWidth: 600, mx: 'auto', lineHeight: 1.6 }}
          >
            Create your content once and instantly share it across Facebook, Instagram, X, and Telegram.
            Save hours every week with automated multi-platform publishing.
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
                  background: 'linear-gradient(90deg, #1877f2 0%, #E1306C 50%, #F77737 100%)',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #155eaf 0%, #c02a5c 50%, #d96830 100%)',
                  },
                }}
              >
                Get Started Free
              </Button>
            </Link>
            <Link href="/about" passHref>
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
                }}
              >
                Learn More
              </Button>
            </Link>
          </Box>

          {/* Platform Pills */}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'center',
              mt: 6,
              flexWrap: 'wrap',
            }}
          >
            {[
              { icon: FacebookIcon, label: 'Facebook', color: FACEBOOK_COLOR },
              { icon: InstagramIcon, label: 'Instagram', color: INSTAGRAM_COLOR },
              { icon: XIcon, label: 'X (Twitter)', color: X_COLOR },
              { icon: TelegramIcon, label: 'Telegram', color: TELEGRAM_COLOR },
            ].map((platform) => (
              <Box
                key={platform.label}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: 'white',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <platform.icon sx={{ fontSize: 20, color: platform.color }} />
                <Typography variant="body2" fontWeight={500}>
                  {platform.label}
                </Typography>
                <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography
            variant="h3"
            fontWeight={700}
            sx={{ mb: 2 }}
          >
            Why Choose Mockingbird?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Everything you need to manage your social media presence efficiently
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <FeatureCard
              icon={RocketLaunchIcon}
              title="One-Click Publishing"
              description="Write your post once and publish to all your connected accounts with a single click. No more copy-pasting between platforms."
              color={FACEBOOK_COLOR}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FeatureCard
              icon={CloudUploadIcon}
              title="Media Support"
              description="Upload images and videos that automatically adapt to each platform's requirements. Your content looks great everywhere."
              color={INSTAGRAM_COLOR}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FeatureCard
              icon={SpeedIcon}
              title="Real-Time Progress"
              description="Watch your posts go live with real-time status updates. Know exactly when your content reaches each platform."
              color="#F77737"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FeatureCard
              icon={HistoryIcon}
              title="Complete History"
              description="Access your full publishing history with detailed logs. Track what worked and optimize your content strategy."
              color="#8b5cf6"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FeatureCard
              icon={SecurityIcon}
              title="Secure & Private"
              description="Your credentials are encrypted and stored securely. We never post without your explicit permission."
              color="#22c55e"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FeatureCard
              icon={AutoAwesomeIcon}
              title="Smart Optimization"
              description="Character limits, hashtags, and media formats are automatically handled for each platform's requirements."
              color="#ec4899"
            />
          </Grid>
        </Grid>
      </Container>

      {/* How It Works Section */}
      <Box sx={{ bgcolor: 'grey.50', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" fontWeight={700} sx={{ mb: 2 }}>
              How It Works
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Get started in minutes with our simple setup process
            </Typography>
          </Box>

          <Grid container spacing={4} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StepCard
                number={1}
                title="Create Account"
                description="Sign up for free and access your dashboard instantly"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StepCard
                number={2}
                title="Connect Accounts"
                description="Link your Facebook, Instagram, X, and Telegram accounts securely"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StepCard
                number={3}
                title="Create Content"
                description="Write your post and upload any images or videos"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StepCard
                number={4}
                title="Publish"
                description="Hit publish and watch your content go live everywhere"
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h3" fontWeight={700} sx={{ mb: 2 }}>
            Loved by Content Creators
          </Typography>
          <Typography variant="body1" color="text.secondary">
            See what our users have to say about Mockingbird
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TestimonialCard
              quote="Mockingbird has completely transformed how I manage my social media. What used to take hours now takes minutes."
              author="Sarah Chen"
              role="Content Creator"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TestimonialCard
              quote="The real-time publishing updates are amazing. I can see exactly when my posts go live on each platform."
              author="Marcus Johnson"
              role="Marketing Manager"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TestimonialCard
              quote="Finally, a tool that actually works! Setup was easy and the interface is intuitive. Highly recommend."
              author="Emily Rodriguez"
              role="Small Business Owner"
            />
          </Grid>
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1877f2 0%, #E1306C 50%, #F77737 100%)',
          py: { xs: 8, md: 10 },
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography
            variant="h3"
            fontWeight={700}
            sx={{ color: 'white', mb: 2 }}
          >
            Ready to Simplify Your Social Media?
          </Typography>
          <Typography
            variant="h6"
            sx={{ color: 'rgba(255,255,255,0.9)', mb: 4, fontWeight: 400 }}
          >
            Join thousands of creators who save time with Mockingbird
          </Typography>
          <Link href="/register" passHref>
            <Button
              variant="contained"
              size="large"
              sx={{
                px: 5,
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
              Start Publishing for Free
            </Button>
          </Link>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          bgcolor: '#111',
          color: 'grey.400',
          py: 6,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} justifyContent="space-between" alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
                Mockingbird
              </Typography>
              <Typography variant="body2">
                Simplifying social media publishing for creators and businesses.
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 3,
                  justifyContent: { xs: 'flex-start', md: 'flex-end' },
                  flexWrap: 'wrap',
                }}
              >
                <Link href="/about" passHref>
                  <Typography
                    variant="body2"
                    sx={{ color: 'grey.400', '&:hover': { color: 'white' }, cursor: 'pointer' }}
                  >
                    About
                  </Typography>
                </Link>
                <Link href="/privacy" passHref>
                  <Typography
                    variant="body2"
                    sx={{ color: 'grey.400', '&:hover': { color: 'white' }, cursor: 'pointer' }}
                  >
                    Privacy Policy
                  </Typography>
                </Link>
                <Link href="/login" passHref>
                  <Typography
                    variant="body2"
                    sx={{ color: 'grey.400', '&:hover': { color: 'white' }, cursor: 'pointer' }}
                  >
                    Login
                  </Typography>
                </Link>
              </Box>
            </Grid>
          </Grid>
          <Box
            sx={{
              borderTop: '1px solid',
              borderColor: 'grey.800',
              mt: 4,
              pt: 4,
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="grey.600">
              © {new Date().getFullYear()} Mockingbird. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
