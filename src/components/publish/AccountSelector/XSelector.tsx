'use client';

import React from 'react';
import {
  Typography,
  Paper,
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

export function XSelector({ accounts, selected, onChange }: XSelectorProps) {
  return (
    <>
      <Typography
        variant="subtitle1"
        component="h3"
        sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
      >
        <TwitterIcon sx={{ color: '#000', mr: 1 }} />
        X Accounts
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
        <FormGroup>
          {accounts.length > 0 ? (
            accounts.map((account) => (
              <FormControlLabel
                key={account.id}
                control={
                  <Checkbox
                    checked={selected.includes(account.id)}
                    onChange={() => onChange(account.id)}
                  />
                }
                label={account.name}
              />
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No X accounts found.
            </Typography>
          )}
        </FormGroup>
      </Paper>
    </>
  );
}
