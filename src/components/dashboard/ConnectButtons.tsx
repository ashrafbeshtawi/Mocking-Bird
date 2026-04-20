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
    </Box>
  );
}
