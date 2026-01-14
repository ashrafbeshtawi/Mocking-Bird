'use client';

import React from 'react';
import { Typography, Box } from '@mui/material';
import { FacebookSelector } from './FacebookSelector';
import { XSelector } from './XSelector';
import { InstagramSelector } from './InstagramSelector';
import type {
  ConnectedPage,
  ConnectedXAccount,
  InstagramAccount,
  InstagramSelection,
} from '@/types/accounts';

interface AccountSelectorProps {
  facebookPages: ConnectedPage[];
  xAccounts: ConnectedXAccount[];
  instagramAccounts: InstagramAccount[];
  selectedFacebookPages: string[];
  selectedXAccounts: string[];
  selectedInstagramAccounts: Record<string, InstagramSelection>;
  onFacebookChange: (pageId: string) => void;
  onXChange: (accountId: string) => void;
  onInstagramChange: (accountId: string, type: 'publish' | 'story') => void;
  mediaSelected: boolean;
}

export function AccountSelector({
  facebookPages,
  xAccounts,
  instagramAccounts,
  selectedFacebookPages,
  selectedXAccounts,
  selectedInstagramAccounts,
  onFacebookChange,
  onXChange,
  onInstagramChange,
  mediaSelected,
}: AccountSelectorProps) {
  return (
    <>
      <Typography
        variant="subtitle2"
        color="text.secondary"
        sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}
      >
        Select Destinations
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <FacebookSelector
          pages={facebookPages}
          selected={selectedFacebookPages}
          onChange={onFacebookChange}
        />

        <InstagramSelector
          accounts={instagramAccounts}
          selected={selectedInstagramAccounts}
          onChange={onInstagramChange}
          mediaSelected={mediaSelected}
        />

        <XSelector
          accounts={xAccounts}
          selected={selectedXAccounts}
          onChange={onXChange}
        />
      </Box>
    </>
  );
}
