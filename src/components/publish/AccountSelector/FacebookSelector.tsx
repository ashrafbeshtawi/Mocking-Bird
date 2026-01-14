'use client';

import React from 'react';
import {
  Typography,
  Box,
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

const FACEBOOK_COLOR = '#1877f2';

export function FacebookSelector({ pages, selected, onChange }: FacebookSelectorProps) {
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
          borderColor: FACEBOOK_COLOR,
          boxShadow: `0 0 0 1px ${FACEBOOK_COLOR}20`,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.5,
          bgcolor: `${FACEBOOK_COLOR}10`,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <FacebookIcon sx={{ color: FACEBOOK_COLOR, fontSize: 24 }} />
        <Typography variant="subtitle2" fontWeight={600}>
          Facebook Pages
        </Typography>
      </Box>

      <Box sx={{ p: 1.5, flexGrow: 1, maxHeight: 160, overflow: 'auto' }}>
        <FormGroup>
          {pages.length > 0 ? (
            pages.map((page) => (
              <FormControlLabel
                key={page.page_id}
                control={
                  <Checkbox
                    checked={selected.includes(page.page_id)}
                    onChange={() => onChange(page.page_id)}
                    size="small"
                    sx={{
                      color: 'grey.400',
                      '&.Mui-checked': { color: FACEBOOK_COLOR },
                    }}
                  />
                }
                label={
                  <Typography variant="body2">{page.page_name}</Typography>
                }
                sx={{ ml: 0 }}
              />
            ))
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              No Facebook pages connected
            </Typography>
          )}
        </FormGroup>
      </Box>
    </Box>
  );
}
