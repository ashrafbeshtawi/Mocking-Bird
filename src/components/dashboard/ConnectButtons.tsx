'use client';

import React from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import {
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  Twitter as TwitterIcon,
  Telegram as TelegramIcon,
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
    <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
      <Button
        variant="contained"
        onClick={onFacebookConnect}
        disabled={facebookLoading}
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
          background: 'linear-gradient(90deg, #1877f2 0%, #E1306C 50%, #F77737 100%)',
          '&:hover': {
            background: 'linear-gradient(90deg, #155eaf 0%, #c02a5c 50%, #d96830 100%)',
          },
        }}
      >
        {facebookLoading ? 'Connecting...' : 'Add Meta Account'}
      </Button>

      <Button
        variant="contained"
        onClick={onTwitterConnect}
        disabled={twitterLoading}
        startIcon={
          twitterLoading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <TwitterIcon />
          )
        }
        sx={{ bgcolor: '#000', '&:hover': { bgcolor: '#222' }, color: '#fff' }}
      >
        Add Twitter Account
      </Button>

      <Button
        variant="contained"
        onClick={onTelegramConnect}
        startIcon={<TelegramIcon />}
        sx={{ bgcolor: '#0088cc', '&:hover': { bgcolor: '#006699' }, color: '#fff' }}
      >
        Add Telegram Channel
      </Button>
    </Box>
  );
}
