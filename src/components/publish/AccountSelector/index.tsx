'use client';

import React from 'react';
import {
  Typography,
  Box,
  Checkbox,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
} from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import XIcon from '@mui/icons-material/X';
import TelegramIcon from '@mui/icons-material/Telegram';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import type {
  ConnectedPage,
  ConnectedXAccount,
  InstagramAccount,
  TelegramChannel,
  InstagramSelection,
} from '@/types/accounts';

interface AiEnabledAccounts {
  facebook: string[];
  twitter: string[];
  instagram: string[];
  telegram: string[];
}

interface AccountSelectorProps {
  facebookPages: ConnectedPage[];
  xAccounts: ConnectedXAccount[];
  instagramAccounts: InstagramAccount[];
  telegramChannels: TelegramChannel[];
  selectedFacebookPages: string[];
  selectedXAccounts: string[];
  selectedInstagramAccounts: Record<string, InstagramSelection>;
  selectedTelegramChannels: string[];
  onFacebookChange: (pageId: string) => void;
  onXChange: (accountId: string) => void;
  onInstagramChange: (accountId: string, type: 'publish' | 'story') => void;
  onTelegramChange: (channelId: string) => void;
  mediaSelected: boolean;
  aiEnabledAccounts?: AiEnabledAccounts;
}

const PLATFORM_CONFIG = {
  facebook: { icon: FacebookIcon, color: '#1877f2', label: 'Facebook' },
  instagram: { icon: InstagramIcon, color: '#E1306C', label: 'Instagram' },
  x: { icon: XIcon, color: '#000000', label: 'X' },
  telegram: { icon: TelegramIcon, color: '#0088cc', label: 'Telegram' },
};

export function AccountSelector({
  facebookPages,
  xAccounts,
  instagramAccounts,
  telegramChannels,
  selectedFacebookPages,
  selectedXAccounts,
  selectedInstagramAccounts,
  selectedTelegramChannels,
  onFacebookChange,
  onXChange,
  onInstagramChange,
  onTelegramChange,
  mediaSelected,
  aiEnabledAccounts,
}: AccountSelectorProps) {
  const hasAnyAccount =
    facebookPages.length > 0 ||
    xAccounts.length > 0 ||
    instagramAccounts.length > 0 ||
    telegramChannels.length > 0;

  if (!hasAnyAccount) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <Typography variant="body2" color="text.secondary">
          No accounts connected. Go to Dashboard to connect your accounts.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Typography
        variant="subtitle2"
        color="text.secondary"
        sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}
      >
        Select Destinations
      </Typography>

      <List dense sx={{ py: 0 }}>
        {/* Facebook Pages */}
        {facebookPages.map((page) => {
          const config = PLATFORM_CONFIG.facebook;
          const Icon = config.icon;
          const isSelected = selectedFacebookPages.includes(page.page_id);
          const hasAi = aiEnabledAccounts?.facebook?.includes(page.page_id);

          return (
            <ListItem
              key={`fb-${page.page_id}`}
              sx={{
                py: 1,
                px: 1.5,
                borderRadius: 2,
                mb: 0.5,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                bgcolor: isSelected ? `${config.color}10` : 'transparent',
                '&:hover': {
                  bgcolor: isSelected ? `${config.color}15` : 'action.hover',
                },
              }}
              onClick={() => onFacebookChange(page.page_id)}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Icon sx={{ color: config.color, fontSize: 24 }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {page.page_name}
                    </Typography>
                    {hasAi && (
                      <Tooltip title="AI transformation enabled">
                        <SmartToyIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                      </Tooltip>
                    )}
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Checkbox
                  edge="end"
                  checked={isSelected}
                  onChange={() => onFacebookChange(page.page_id)}
                  sx={{
                    color: 'grey.400',
                    '&.Mui-checked': { color: config.color },
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}

        {/* X Accounts */}
        {xAccounts.map((account) => {
          const config = PLATFORM_CONFIG.x;
          const Icon = config.icon;
          const isSelected = selectedXAccounts.includes(account.id);
          const hasAi = aiEnabledAccounts?.twitter?.includes(account.id);

          return (
            <ListItem
              key={`x-${account.id}`}
              sx={{
                py: 1,
                px: 1.5,
                borderRadius: 2,
                mb: 0.5,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                bgcolor: isSelected ? `${config.color}10` : 'transparent',
                '&:hover': {
                  bgcolor: isSelected ? `${config.color}15` : 'action.hover',
                },
              }}
              onClick={() => onXChange(account.id)}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Icon sx={{ color: config.color, fontSize: 24 }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight={500}>
                      @{account.name}
                    </Typography>
                    {hasAi && (
                      <Tooltip title="AI transformation enabled">
                        <SmartToyIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                      </Tooltip>
                    )}
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Checkbox
                  edge="end"
                  checked={isSelected}
                  onChange={() => onXChange(account.id)}
                  sx={{
                    color: 'grey.400',
                    '&.Mui-checked': { color: config.color },
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}

        {/* Instagram Accounts */}
        {instagramAccounts.map((account) => {
          const config = PLATFORM_CONFIG.instagram;
          const Icon = config.icon;
          const publishChecked = selectedInstagramAccounts[account.id]?.publish || false;
          const storyChecked = selectedInstagramAccounts[account.id]?.story || false;
          const isSelected = publishChecked || storyChecked;
          const hasAi = aiEnabledAccounts?.instagram?.includes(account.id);

          return (
            <ListItem
              key={`ig-${account.id}`}
              sx={{
                py: 1,
                px: 1.5,
                borderRadius: 2,
                mb: 0.5,
                transition: 'background-color 0.2s',
                bgcolor: isSelected ? `${config.color}10` : 'transparent',
                opacity: mediaSelected ? 1 : 0.6,
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Icon sx={{ color: config.color, fontSize: 24 }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight={500}>
                      @{account.username}
                    </Typography>
                    {hasAi && (
                      <Tooltip title="AI transformation enabled">
                        <SmartToyIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                      </Tooltip>
                    )}
                    {!mediaSelected && (
                      <Chip
                        label="Media required"
                        size="small"
                        sx={{
                          fontSize: '0.6rem',
                          height: 18,
                          bgcolor: 'warning.light',
                          color: 'warning.contrastText',
                          ml: 0.5,
                        }}
                      />
                    )}
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Tooltip title="Post to feed">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Checkbox
                        size="small"
                        checked={publishChecked}
                        onChange={() => onInstagramChange(account.id, 'publish')}
                        disabled={!mediaSelected}
                        sx={{
                          color: 'grey.400',
                          '&.Mui-checked': { color: config.color },
                          p: 0.5,
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                        Post
                      </Typography>
                    </Box>
                  </Tooltip>
                  <Tooltip title="Post to story">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Checkbox
                        size="small"
                        checked={storyChecked}
                        onChange={() => onInstagramChange(account.id, 'story')}
                        disabled={!mediaSelected}
                        sx={{
                          color: 'grey.400',
                          '&.Mui-checked': { color: config.color },
                          p: 0.5,
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Story
                      </Typography>
                    </Box>
                  </Tooltip>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}

        {/* Telegram Channels */}
        {telegramChannels.map((channel) => {
          const config = PLATFORM_CONFIG.telegram;
          const Icon = config.icon;
          const isSelected = selectedTelegramChannels.includes(channel.channel_id);
          const hasAi = aiEnabledAccounts?.telegram?.includes(channel.channel_id);

          return (
            <ListItem
              key={`tg-${channel.channel_id}`}
              sx={{
                py: 1,
                px: 1.5,
                borderRadius: 2,
                mb: 0.5,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                bgcolor: isSelected ? `${config.color}10` : 'transparent',
                '&:hover': {
                  bgcolor: isSelected ? `${config.color}15` : 'action.hover',
                },
              }}
              onClick={() => onTelegramChange(channel.channel_id)}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Icon sx={{ color: config.color, fontSize: 24 }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {channel.channel_title}
                    </Typography>
                    {hasAi && (
                      <Tooltip title="AI transformation enabled">
                        <SmartToyIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                      </Tooltip>
                    )}
                  </Box>
                }
                secondary={
                  channel.channel_username && (
                    <Typography variant="caption" color="text.secondary">
                      @{channel.channel_username}
                    </Typography>
                  )
                }
              />
              <ListItemSecondaryAction>
                <Checkbox
                  edge="end"
                  checked={isSelected}
                  onChange={() => onTelegramChange(channel.channel_id)}
                  sx={{
                    color: 'grey.400',
                    '&.Mui-checked': { color: config.color },
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}
      </List>
    </>
  );
}
