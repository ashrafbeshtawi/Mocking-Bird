'use client';

import React from 'react';
import {
  Typography,
  Box,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import TwitterIcon from '@mui/icons-material/Twitter';
import type { ConnectedXAccount } from '@/types/accounts';

interface XSelectorProps {
  accounts: ConnectedXAccount[];
  selected: string[];
  onChange: (accountId: string) => void;
}

const X_COLOR = '#000000';

export function XSelector({ accounts, selected, onChange }: XSelectorProps) {
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
          borderColor: X_COLOR,
          boxShadow: `0 0 0 1px ${X_COLOR}20`,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.5,
          bgcolor: `${X_COLOR}08`,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <TwitterIcon sx={{ color: X_COLOR, fontSize: 24 }} />
        <Typography variant="subtitle2" fontWeight={600}>
          X Accounts
        </Typography>
      </Box>

      <Box sx={{ p: 1.5, flexGrow: 1, maxHeight: 160, overflow: 'auto' }}>
        <FormGroup>
          {accounts.length > 0 ? (
            accounts.map((account) => (
              <FormControlLabel
                key={account.id}
                control={
                  <Checkbox
                    checked={selected.includes(account.id)}
                    onChange={() => onChange(account.id)}
                    size="small"
                    sx={{
                      color: 'grey.400',
                      '&.Mui-checked': { color: X_COLOR },
                    }}
                  />
                }
                label={
                  <Typography variant="body2">{account.name}</Typography>
                }
                sx={{ ml: 0 }}
              />
            ))
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              No X accounts connected
            </Typography>
          )}
        </FormGroup>
      </Box>
    </Box>
  );
}
