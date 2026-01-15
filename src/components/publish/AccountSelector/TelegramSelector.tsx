'use client';

import React from 'react';
import {
  Typography,
  Box,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import type { TelegramChannel } from '@/types/accounts';

interface TelegramSelectorProps {
  channels: TelegramChannel[];
  selected: string[];
  onChange: (channelId: string) => void;
}

const TELEGRAM_COLOR = '#0088cc';

export function TelegramSelector({ channels, selected, onChange }: TelegramSelectorProps) {
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
          borderColor: TELEGRAM_COLOR,
          boxShadow: `0 0 0 1px ${TELEGRAM_COLOR}20`,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.5,
          bgcolor: `${TELEGRAM_COLOR}08`,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <TelegramIcon sx={{ color: TELEGRAM_COLOR, fontSize: 24 }} />
        <Typography variant="subtitle2" fontWeight={600}>
          Telegram Channels
        </Typography>
      </Box>

      <Box sx={{ p: 1.5, flexGrow: 1, maxHeight: 160, overflow: 'auto' }}>
        <FormGroup>
          {channels.length > 0 ? (
            channels.map((channel) => (
              <FormControlLabel
                key={channel.channel_id}
                control={
                  <Checkbox
                    checked={selected.includes(channel.channel_id)}
                    onChange={() => onChange(channel.channel_id)}
                    size="small"
                    sx={{
                      color: 'grey.400',
                      '&.Mui-checked': { color: TELEGRAM_COLOR },
                    }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">{channel.channel_title}</Typography>
                    {channel.channel_username && (
                      <Typography variant="caption" color="text.secondary">
                        @{channel.channel_username}
                      </Typography>
                    )}
                  </Box>
                }
                sx={{ ml: 0 }}
              />
            ))
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              No Telegram channels connected
            </Typography>
          )}
        </FormGroup>
      </Box>
    </Box>
  );
}
