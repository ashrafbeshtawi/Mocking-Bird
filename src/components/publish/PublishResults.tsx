'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import XIcon from '@mui/icons-material/X';
import TelegramIcon from '@mui/icons-material/Telegram';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CelebrationIcon from '@mui/icons-material/Celebration';
import WarningIcon from '@mui/icons-material/Warning';

interface PublishResult {
  platform: string;
  page_id?: string;
  account_id?: string;
  instagram_account_id?: string;
  telegram_channel_id?: string;
  post_type?: 'feed' | 'story';
  error?: {
    message?: string;
    code?: string;
    details?: {
      error?: {
        error_user_msg?: string;
      };
    };
  };
}

interface PublishResultsProps {
  error: { message: string; details?: unknown[] } | null;
  success: string | null;
  results: { successful: PublishResult[]; failed: PublishResult[] } | null;
  onClose?: () => void;
}

const PLATFORM_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  facebook: { icon: FacebookIcon, color: '#1877f2', label: 'Facebook' },
  instagram: { icon: InstagramIcon, color: '#E1306C', label: 'Instagram' },
  x: { icon: XIcon, color: '#000000', label: 'X (Twitter)' },
  telegram: { icon: TelegramIcon, color: '#0088cc', label: 'Telegram' },
};

export function PublishResults({ error, success, results, onClose }: PublishResultsProps) {
  const isOpen = !!(error || success);

  const getAccountLabel = (item: PublishResult): string => {
    switch (item.platform) {
      case 'facebook':
        return item.page_id || 'Page';
      case 'instagram':
        const postType = item.post_type === 'story' ? 'Story' : 'Feed';
        return `${item.instagram_account_id || 'Account'} (${postType})`;
      case 'x':
        return item.account_id || 'Account';
      case 'telegram':
        return item.telegram_channel_id || 'Channel';
      default:
        return 'Account';
    }
  };

  const getPlatformConfig = (platform: string) => {
    return PLATFORM_CONFIG[platform] || { icon: CheckCircleIcon, color: '#666', label: platform };
  };

  const handleClose = () => {
    onClose?.();
  };

  const hasSuccessful = results?.successful && results.successful.length > 0;
  const hasFailed = results?.failed && results.failed.length > 0;
  const isPartialSuccess = hasSuccessful && hasFailed;
  const isFullSuccess = hasSuccessful && !hasFailed;
  const isFullFailure = !hasSuccessful && hasFailed;

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          pb: 1,
        }}
      >
        {isFullSuccess && (
          <>
            <CelebrationIcon sx={{ color: 'success.main', fontSize: 28 }} />
            <Typography variant="h6" fontWeight={600}>
              Published Successfully!
            </Typography>
          </>
        )}
        {isFullFailure && (
          <>
            <ErrorIcon sx={{ color: 'error.main', fontSize: 28 }} />
            <Typography variant="h6" fontWeight={600}>
              Publishing Failed
            </Typography>
          </>
        )}
        {isPartialSuccess && (
          <>
            <WarningIcon sx={{ color: 'warning.main', fontSize: 28 }} />
            <Typography variant="h6" fontWeight={600}>
              Partially Published
            </Typography>
          </>
        )}
        {error && !results && (
          <>
            <ErrorIcon sx={{ color: 'error.main', fontSize: 28 }} />
            <Typography variant="h6" fontWeight={600}>
              Error
            </Typography>
          </>
        )}
      </DialogTitle>

      <DialogContent>
        {error && !results && (
          <Typography color="error.main" sx={{ mb: 2 }}>
            {error.message}
          </Typography>
        )}

        {hasSuccessful && (
          <Box sx={{ mb: hasFailed ? 3 : 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={600} color="success.main">
                Successfully Published To:
              </Typography>
            </Box>
            <List dense disablePadding>
              {results!.successful.map((item, index) => {
                const config = getPlatformConfig(item.platform);
                const Icon = config.icon;
                return (
                  <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Icon sx={{ color: config.color, fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={500}>
                            {config.label}
                          </Typography>
                          <Chip
                            label={getAccountLabel(item)}
                            size="small"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}

        {hasSuccessful && hasFailed && <Divider sx={{ my: 2 }} />}

        {hasFailed && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={600} color="error.main">
                Failed To Publish To:
              </Typography>
            </Box>
            <List dense disablePadding>
              {results!.failed.map((item, index) => {
                const config = getPlatformConfig(item.platform);
                const Icon = config.icon;
                return (
                  <ListItem
                    key={index}
                    sx={{
                      py: 1,
                      px: 0,
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Icon sx={{ color: config.color, fontSize: 20 }} />
                      <Typography variant="body2" fontWeight={500}>
                        {config.label}
                      </Typography>
                      <Chip
                        label={getAccountLabel(item)}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>
                    <Typography
                      variant="caption"
                      color="error.main"
                      sx={{ mt: 0.5, ml: 3.5 }}
                    >
                      {item.error?.message || 'Unknown error'}
                      {item.error?.code && ` (Code: ${item.error.code})`}
                    </Typography>
                    {item.error?.details?.error?.error_user_msg && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 3.5 }}
                      >
                        {item.error.details.error.error_user_msg}
                      </Typography>
                    )}
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant="contained"
          onClick={handleClose}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            background: isFullSuccess
              ? 'linear-gradient(90deg, #1877f2 0%, #E1306C 50%, #F77737 100%)'
              : undefined,
          }}
        >
          {isFullSuccess ? 'Awesome!' : 'Close'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
