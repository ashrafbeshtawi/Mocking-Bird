'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import { fetchWithAuth } from '@/lib/fetch';

interface TelegramConnectDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface VerificationData {
  verification_code: string;
  channel_title: string;
  channel_username?: string;
  expires_in: number;
}

export function TelegramConnectDialog({
  open,
  onClose,
  onSuccess,
}: TelegramConnectDialogProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [channelId, setChannelId] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [loadingBotInfo, setLoadingBotInfo] = useState(false);
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const steps = ['Enter Channel', 'Verify Ownership', 'Complete'];

  // Fetch bot info when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingBotInfo(true);
      fetchWithAuth('/api/telegram/bot-info')
        .then((res) => res.json())
        .then((data) => {
          setBotUsername(data.bot_username);
        })
        .catch(() => {
          setBotUsername(null);
        })
        .finally(() => {
          setLoadingBotInfo(false);
        });
    }
  }, [open]);

  // Countdown timer for verification expiry
  useEffect(() => {
    if (!verification || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [verification, timeLeft]);

  const handleStartVerification = async () => {
    if (!channelId.trim()) {
      setError('Please enter a channel ID or username');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth('/api/telegram/verify-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: channelId.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to start verification');
        return;
      }

      setVerification(data);
      setTimeLeft(data.expires_in);
      setActiveStep(1);
    } catch (err) {
      setError((err as Error)?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);

    try {
      const response = await fetchWithAuth('/api/telegram/verify-channel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: channelId.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Verification failed');
        return;
      }

      if (!data.verified) {
        setError(data.message || 'Verification code not found. Please post the code in your channel.');
        return;
      }

      // Success!
      setActiveStep(2);
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1500);
    } catch (err) {
      setError((err as Error)?.message || 'An error occurred');
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyCode = useCallback(() => {
    if (verification?.verification_code) {
      navigator.clipboard.writeText(verification.verification_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [verification]);

  const handleClose = () => {
    setChannelId('');
    setError(null);
    setActiveStep(0);
    setVerification(null);
    setTimeLeft(0);
    setCopied(false);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        </>
      );
    }

    if (activeStep === 1 && verification) {
      return (
        <>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              To verify you&apos;re an admin of <strong>{verification.channel_title}</strong>,
              post the verification code below in your channel.
            </Typography>
          </Alert>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              bgcolor: 'action.hover',
              borderRadius: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Post this code in your channel:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Typography
                variant="h4"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  letterSpacing: 2,
                  color: 'primary.main',
                }}
              >
                {verification.verification_code}
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
                <IconButton onClick={handleCopyCode} size="small">
                  {copied ? <CheckCircleIcon color="success" /> : <ContentCopyIcon />}
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              {timeLeft > 0 ? (
                <>Expires in {formatTime(timeLeft)}</>
              ) : (
                <Box component="span" sx={{ color: 'error.main' }}>Code expired - please start over</Box>
              )}
            </Typography>
          </Paper>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            After posting the code:
          </Typography>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li>
              <Typography variant="body2" color="text.secondary">
                Wait a few seconds for the message to appear
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="text.secondary">
                Click &quot;Verify & Connect&quot; below
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="text.secondary">
                The verification message will be automatically deleted
              </Typography>
            </li>
          </ol>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Only channel <strong>admins</strong> can post messages. This proves you have admin access.
            </Typography>
          </Alert>
        </>
      );
    }

    if (activeStep === 2) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" color="success.main">
            Channel Connected Successfully!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {verification?.channel_title} is now ready to use.
          </Typography>
        </Box>
      );
    }

    return null;
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

        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {activeStep === 1 && (
          <Button
            onClick={() => {
              setActiveStep(0);
              setVerification(null);
              setError(null);
            }}
            disabled={verifying}
            startIcon={<RefreshIcon />}
          >
            Start Over
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={handleClose} disabled={loading || verifying}>
          Cancel
        </Button>
        {activeStep === 0 && (
          <Button
            variant="contained"
            onClick={handleStartVerification}
            disabled={loading || !botUsername || !channelId.trim()}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <TelegramIcon />}
            sx={{
              bgcolor: '#0088cc',
              '&:hover': { bgcolor: '#006699' },
            }}
          >
            {loading ? 'Checking...' : 'Continue'}
          </Button>
        )}
        {activeStep === 1 && (
          <Button
            variant="contained"
            onClick={handleVerify}
            disabled={verifying || timeLeft <= 0}
            startIcon={verifying ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
            sx={{
              bgcolor: '#0088cc',
              '&:hover': { bgcolor: '#006699' },
            }}
          >
            {verifying ? 'Verifying...' : 'Verify & Connect'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
