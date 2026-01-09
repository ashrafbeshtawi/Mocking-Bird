'use client';

import React from 'react';
import {
  Typography,
  Paper,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import type { ConnectedPage } from '@/types/accounts';

interface FacebookSelectorProps {
  pages: ConnectedPage[];
  selected: string[];
  onChange: (pageId: string) => void;
}

export function FacebookSelector({ pages, selected, onChange }: FacebookSelectorProps) {
  return (
    <>
      <Typography
        variant="subtitle1"
        component="h3"
        sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
      >
        <FacebookIcon color="primary" sx={{ mr: 1 }} />
        Facebook Pages
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
        <FormGroup>
          {pages.length > 0 ? (
            pages.map((page) => (
              <FormControlLabel
                key={page.page_id}
                control={
                  <Checkbox
                    checked={selected.includes(page.page_id)}
                    onChange={() => onChange(page.page_id)}
                  />
                }
                label={page.page_name}
              />
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No Facebook pages found.
            </Typography>
          )}
        </FormGroup>
      </Paper>
    </>
  );
}
