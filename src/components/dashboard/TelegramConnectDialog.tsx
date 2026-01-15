'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Link,
  Stepper,
  Step,
  StepLabel,
  Avatar,
  Chip,
} from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { fetchWithAuth } from '@/lib/fetch';

interface TelegramLoginData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramConnectDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Extend Window interface for Telegram widget
declare global {
  interface Window {
    Telegram?: {
      Login: {
        auth: (
          options: { bot_id: string; request_access?: boolean },
          callback: (data: TelegramLoginData | false) => void
        ) => void;
      };
    };
    TelegramLoginCallback?: (data: TelegramLoginData) => void;
  }
}

export function TelegramConnectDialog({
  open,
  onClose,
  onSuccess,
}: TelegramConnectDialogProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [channelId, setChannelId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [botId, setBotId] = useState<string | null>(null);
  const [loadingBotInfo, setLoadingBotInfo] = useState(false);
  const [telegramAuth, setTelegramAuth] = useState<TelegramLoginData | null>(null);
  const [telegramWidgetLoaded, setTelegramWidgetLoaded] = useState(false);
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  const steps = ['Log in with Telegram', 'Connect Channel'];

  // Fetch bot info when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingBotInfo(true);
      fetchWithAuth('/api/telegram/bot-info')
        .then((res) => res.json())
        .then((data) => {
          setBotUsername(data.bot_username);
          setBotId(data.bot_id);
        })
        .catch(() => {
          setBotUsername(null);
          setBotId(null);
        })
        .finally(() => {
          setLoadingBotInfo(false);
        });
    }
  }, [open]);

  // Load Telegram widget script
  useEffect(() => {
    if (!open || !botUsername) return;

    const existingScript = document.getElementById('telegram-widget-script');
    if (existingScript) {
      setTelegramWidgetLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'telegram-widget-script';
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.onload = () => setTelegramWidgetLoaded(true);
    document.body.appendChild(script);

    return () => {
      // Don't remove script as it might be needed again
    };
  }, [open, botUsername]);

  // Handle Telegram Login
  const handleTelegramLogin = useCallback(() => {
    if (!botId || !window.Telegram?.Login) {
      setError('Telegram widget not loaded. Please refresh the page.');
      return;
    }

    setError(null);

    window.Telegram.Login.auth(
      { bot_id: botId, request_access: true },
      (data) => {
        if (data === false) {
          setError('Telegram login was cancelled.');
          return;
        }
        setTelegramAuth(data);
        setActiveStep(1);
      }
    );
  }, [botId]);

  const handleConnect = async () => {
    if (!channelId.trim()) {
      setError('Please enter a channel ID or username');
      return;
    }

    if (!telegramAuth) {
      setError('Please log in with Telegram first');
      setActiveStep(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth('/api/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: channelId.trim(),
          telegram_auth: telegramAuth,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to connect channel');
        return;
      }

      // Success
      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as Error)?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setChannelId('');
    setError(null);
    setActiveStep(0);
    setTelegramAuth(null);
    onClose();
  };

  const renderStepContent = () => {
    if (loadingBotInfo) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      );
    }

    if (!botUsername) {
      return (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Telegram bot is not configured. Please contact the administrator.
        </Alert>
      );
    }

    if (activeStep === 0) {
      return (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            To verify you own the channel you want to connect, please log in with your Telegram account.
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Why is this needed?</strong> We verify that you are an admin of the channel before allowing the connection.
              This prevents unauthorized users from connecting channels they don&apos;t own.
            </Typography>
          </Alert>

          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            {telegramWidgetLoaded ? (
              <Button
                variant="contained"
                size="large"
                onClick={handleTelegramLogin}
                startIcon={<TelegramIcon />}
                sx={{
                  bgcolor: '#0088cc',
                  '&:hover': { bgcolor: '#006699' },
                  px: 4,
                  py: 1.5,
                }}
              >
                Log in with Telegram
              </Button>
            ) : (
              <CircularProgress size={24} />
            )}
          </Box>
        </>
      );
    }

    return (
      <>
        {telegramAuth && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 3,
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 2,
            }}
          >
            <Avatar
              src={telegramAuth.photo_url}
              sx={{ width: 40, height: 40, bgcolor: '#0088cc' }}
            >
              {telegramAuth.first_name[0]}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2">
                {telegramAuth.first_name} {telegramAuth.last_name || ''}
              </Typography>
              {telegramAuth.username && (
                <Typography variant="caption" color="text.secondary">
                  @{telegramAuth.username}
                </Typography>
              )}
            </Box>
            <Chip
              icon={<CheckCircleIcon />}
              label="Verified"
              color="success"
              size="small"
            />
          </Box>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Step 1: Add the bot as admin
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add{' '}
            <Link
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ fontWeight: 600 }}
            >
              @{botUsername}
            </Link>{' '}
            as an administrator to your Telegram channel with permission to post messages.
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Step 2: Enter your channel ID
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter your channel username (e.g., @mychannel) or channel ID (e.g., -1001234567890).
          </Typography>

          <TextField
            fullWidth
            label="Channel ID or Username"
            placeholder="@mychannel or -1001234567890"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Tip:</strong> To find your channel ID, forward any message from your channel to{' '}
            <Link
              href="https://t.me/userinfobot"
              target="_blank"
              rel="noopener noreferrer"
            >
              @userinfobot
            </Link>{' '}
            on Telegram.
          </Typography>
        </Alert>

        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            You must be an <strong>admin</strong> of the channel to connect it. If you&apos;re not an admin,
            the connection will fail.
          </Typography>
        </Alert>
      </>
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TelegramIcon sx={{ color: '#0088cc' }} />
        Connect Telegram Channel
      </DialogTitle>

      <DialogContent>
        {botUsername && (
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <div ref={widgetContainerRef} />
        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {activeStep === 1 && (
          <Button
            onClick={() => {
              setActiveStep(0);
              setTelegramAuth(null);
            }}
            disabled={loading}
          >
            Back
          </Button>
        )}
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        {activeStep === 1 && (
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={loading || !botUsername}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <TelegramIcon />}
            sx={{
              bgcolor: '#0088cc',
              '&:hover': { bgcolor: '#006699' },
            }}
          >
            {loading ? 'Connecting...' : 'Connect Channel'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
