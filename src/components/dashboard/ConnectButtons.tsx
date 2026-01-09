'use client';

import React from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import {
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
} from '@mui/icons-material';

interface ConnectButtonsProps {
  onFacebookConnect: () => void;
  onTwitterConnect: () => void;
  facebookLoading: boolean;
  twitterLoading: boolean;
}

export function ConnectButtons({
  onFacebookConnect,
  onTwitterConnect,
  facebookLoading,
  twitterLoading,
}: ConnectButtonsProps) {
  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
      <Button
        variant="contained"
        onClick={onFacebookConnect}
        disabled={facebookLoading}
        startIcon={
          facebookLoading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <FacebookIcon />
          )
        }
        sx={{ bgcolor: '#1877f2', '&:hover': { bgcolor: '#155eaf' } }}
      >
        {facebookLoading ? 'Connecting...' : 'Add Facebook Page'}
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
    </Box>
  );
}
