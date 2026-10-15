'use client';

import React from 'react';
import { Box, Button, CircularProgress, Link, Typography } from '@mui/material';
import { GOOGLE_PRIVACY_URL, YOUTUBE_TERMS_URL } from '@/lib/youtube';
import { TIKTOK_PRIVACY_URL, TIKTOK_TERMS_URL } from '@/lib/tiktok';
import { TikTokIcon } from '@/components/icons/TikTokIcon';
import {
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  Twitter as TwitterIcon,
  Telegram as TelegramIcon,
  LinkedIn as LinkedInIcon,
  YouTube as YouTubeIcon,
} from '@mui/icons-material';

interface ConnectButtonsProps {
  onFacebookConnect: () => void;
  onTwitterConnect: () => void;
  onTelegramConnect: () => void;
  facebookLoading: boolean;
  twitterLoading: boolean;
}

export function ConnectButtons({
  onFacebookConnect,
  onTwitterConnect,
  onTelegramConnect,
  facebookLoading,
  twitterLoading,
}: ConnectButtonsProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        mb: 2,
        flexWrap: 'wrap',
        flexDirection: { xs: 'column', sm: 'row' },
      }}
    >
      <Button
        variant="contained"
        onClick={onFacebookConnect}
        disabled={facebookLoading}
        fullWidth
        startIcon={
          facebookLoading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <FacebookIcon />
              <InstagramIcon />
            </Box>
          )
        }
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '&:hover': {
            bgcolor: 'primary.dark',
          },
          maxWidth: { sm: 'fit-content' },
        }}
      >
        {facebookLoading ? 'Connecting...' : 'Add Meta Account'}
      </Button>

      <Button
        variant="contained"
        onClick={onTwitterConnect}
        disabled={twitterLoading}
        fullWidth
        startIcon={
          twitterLoading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <TwitterIcon />
          )
        }
        sx={{
          bgcolor: '#000',
          '&:hover': { bgcolor: '#222' },
          color: '#fff',
          maxWidth: { sm: 'fit-content' },
        }}
      >
        Add Twitter Account
      </Button>

      <Button
        variant="contained"
        onClick={onTelegramConnect}
        fullWidth
        startIcon={<TelegramIcon />}
        sx={{
          bgcolor: '#0088cc',
          '&:hover': { bgcolor: '#006699' },
          color: '#fff',
          maxWidth: { sm: 'fit-content' },
        }}
      >
        Add Telegram Channel
      </Button>

      <Button
        variant="contained"
        href="/api/linkedin/auth"
        fullWidth
        startIcon={<LinkedInIcon />}
        sx={{
          bgcolor: '#0a66c2',
          '&:hover': { bgcolor: '#004182' },
          color: '#fff',
          maxWidth: { sm: 'fit-content' },
        }}
      >
        Add LinkedIn Account
      </Button>

      <Button
        variant="contained"
        href="/api/youtube/auth"
        fullWidth
        startIcon={<YouTubeIcon />}
        sx={{
          bgcolor: '#ff0000',
          '&:hover': { bgcolor: '#cc0000' },
          color: '#fff',
          maxWidth: { sm: 'fit-content' },
        }}
      >
        Add YouTube Channel
      </Button>

      <Button
        variant="contained"
        href="/api/tiktok/auth"
        fullWidth
        startIcon={<TikTokIcon />}
        sx={{
          bgcolor: '#000000',
          '&:hover': { bgcolor: '#333333' },
          color: '#fff',
          maxWidth: { sm: 'fit-content' },
        }}
      >
        Add TikTok Account
      </Button>

      <Typography variant="caption" color="text.secondary" sx={{ flexBasis: '100%' }}>
        MockingBird uploads to YouTube through the YouTube API Services. By connecting a YouTube channel you agree to
        the{' '}
        <Link href={YOUTUBE_TERMS_URL} target="_blank" rel="noopener noreferrer">
          YouTube Terms of Service
        </Link>
        ; Google processes your data under the{' '}
        <Link href={GOOGLE_PRIVACY_URL} target="_blank" rel="noopener noreferrer">
          Google Privacy Policy
        </Link>
        .
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ flexBasis: '100%' }}>
        MockingBird posts videos to TikTok through TikTok&apos;s Content Posting API. By connecting a TikTok account you
        agree to the{' '}
        <Link href={TIKTOK_TERMS_URL} target="_blank" rel="noopener noreferrer">
          TikTok Terms of Service
        </Link>
        ; TikTok processes your data under the{' '}
        <Link href={TIKTOK_PRIVACY_URL} target="_blank" rel="noopener noreferrer">
          TikTok Privacy Policy
        </Link>
        .
      </Typography>
    </Box>
  );
}
