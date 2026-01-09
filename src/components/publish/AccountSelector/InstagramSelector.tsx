'use client';

import React from 'react';
import {
  Typography,
  Paper,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Box,
} from '@mui/material';
import InstagramIcon from '@mui/icons-material/Instagram';
import type { InstagramAccount, InstagramSelection } from '@/types/accounts';

interface InstagramSelectorProps {
  accounts: InstagramAccount[];
  selected: Record<string, InstagramSelection>;
  onChange: (accountId: string, type: 'publish' | 'story') => void;
  mediaSelected: boolean;
}

export function InstagramSelector({
  accounts,
  selected,
  onChange,
  mediaSelected,
}: InstagramSelectorProps) {
  return (
    <>
      <Typography
        variant="subtitle1"
        component="h3"
        sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
      >
        <InstagramIcon sx={{ color: '#E4405F', mr: 1 }} />
        Instagram Accounts
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
        <FormGroup>
          {accounts.length > 0 ? (
            accounts.map((account) => {
              const publishChecked = selected[account.id]?.publish || false;
              const storyChecked = selected[account.id]?.story || false;

              return (
                <Box key={account.id} sx={{ mb: 1 }}>
                  <Typography variant="body2" component="div" sx={{ fontWeight: 'bold' }}>
                    {account.username} ({account.displayName})
                  </Typography>
                  <Box sx={{ display: 'flex', pl: 2 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={publishChecked}
                          onChange={() => onChange(account.id, 'publish')}
                          disabled={!mediaSelected}
                        />
                      }
                      label="Post"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={storyChecked}
                          onChange={() => onChange(account.id, 'story')}
                          disabled={!mediaSelected}
                        />
                      }
                      label="Story"
                    />
                  </Box>
                </Box>
              );
            })
          ) : (
            <Typography variant="body2" color="text.secondary">
              No Instagram accounts found.
            </Typography>
          )}
        </FormGroup>
      </Paper>
    </>
  );
}
