'use client';

import React from 'react';
import { Typography, Grid, Divider } from '@mui/material';
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
      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom>
        Select Accounts to Publish to
      </Typography>

      <Grid container spacing={2}>
        <Grid>
          <FacebookSelector
            pages={facebookPages}
            selected={selectedFacebookPages}
            onChange={onFacebookChange}
          />
        </Grid>

        <Grid>
          <XSelector
            accounts={xAccounts}
            selected={selectedXAccounts}
            onChange={onXChange}
          />
        </Grid>

        <Grid>
          <InstagramSelector
            accounts={instagramAccounts}
            selected={selectedInstagramAccounts}
            onChange={onInstagramChange}
            mediaSelected={mediaSelected}
          />
        </Grid>
      </Grid>
    </>
  );
}
