'use client';

import React from 'react';
import {
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Box,
  Chip,
} from '@mui/material';
import InstagramIcon from '@mui/icons-material/Instagram';
import type { InstagramAccount, InstagramSelection } from '@/types/accounts';

interface InstagramSelectorProps {
  accounts: InstagramAccount[];
  selected: Record<string, InstagramSelection>;
  onChange: (accountId: string, type: 'publish' | 'story') => void;
  mediaSelected: boolean;
}

const INSTAGRAM_COLOR = '#E1306C';

export function InstagramSelector({
  accounts,
  selected,
  onChange,
  mediaSelected,
}: InstagramSelectorProps) {
  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: INSTAGRAM_COLOR,
          boxShadow: `0 0 0 1px ${INSTAGRAM_COLOR}20`,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.5,
          bgcolor: `${INSTAGRAM_COLOR}10`,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <InstagramIcon sx={{ color: INSTAGRAM_COLOR, fontSize: 24 }} />
        <Typography variant="subtitle2" fontWeight={600}>
          Instagram Accounts
        </Typography>
        {!mediaSelected && (
          <Chip
            label="Media required"
            size="small"
            sx={{
              ml: 'auto',
              fontSize: '0.65rem',
              height: 20,
              bgcolor: 'warning.light',
              color: 'warning.contrastText',
            }}
          />
        )}
      </Box>

      <Box sx={{ p: 1.5, flexGrow: 1, maxHeight: 160, overflow: 'auto' }}>
        <FormGroup>
          {accounts.length > 0 ? (
            accounts.map((account) => {
              const publishChecked = selected[account.id]?.publish || false;
              const storyChecked = selected[account.id]?.story || false;

              return (
                <Box key={account.id} sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
                  <Typography
                    variant="body2"
                    component="div"
                    sx={{ fontWeight: 600, mb: 0.5 }}
                  >
                    {account.displayName || account.username}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={publishChecked}
                          onChange={() => onChange(account.id, 'publish')}
                          disabled={!mediaSelected}
                          size="small"
                          sx={{
                            color: 'grey.400',
                            '&.Mui-checked': { color: INSTAGRAM_COLOR },
                          }}
                        />
                      }
                      label={<Typography variant="caption">Post</Typography>}
                      sx={{ ml: 0, mr: 0 }}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={storyChecked}
                          onChange={() => onChange(account.id, 'story')}
                          disabled={!mediaSelected}
                          size="small"
                          sx={{
                            color: 'grey.400',
                            '&.Mui-checked': { color: INSTAGRAM_COLOR },
                          }}
                        />
                      }
                      label={<Typography variant="caption">Story</Typography>}
                      sx={{ ml: 0 }}
                    />
                  </Box>
                </Box>
              );
            })
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              No Instagram accounts connected
            </Typography>
          )}
        </FormGroup>
      </Box>
    </Box>
  );
}
