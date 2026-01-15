'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Backdrop,
  Fade,
  LinearProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { useConnectedAccounts } from '@/hooks/useConnectedAccounts';
import { usePublish } from '@/hooks/usePublish';
import { PostComposer } from '@/components/publish/PostComposer';
import { AccountSelector } from '@/components/publish/AccountSelector';
import { PublishResults } from '@/components/publish/PublishResults';
import type { UploadedMedia } from '@/components/publish/MediaUploader';
import type { InstagramSelection } from '@/types/accounts';
import { TWITTER_CHAR_LIMIT } from '@/types/accounts';

export default function PublishPage() {
  // Data fetching
  const {
    facebookPages,
    xAccounts,
    instagramAccounts,
    telegramChannels,
    loading,
  } = useConnectedAccounts();

  // Publishing logic
  const { isPublishing, error, success, results, statusMessage, stepProgress, publish, clearStatus } = usePublish();

  // Calculate overall progress percentage
  const calculateProgress = () => {
    if (!stepProgress) return 0;
    const { stepIndex, totalSteps, subProgress } = stepProgress;

    // Base progress from completed steps
    const baseProgress = ((stepIndex - 1) / totalSteps) * 100;

    // If we have sub-progress (during publishing step), interpolate within the step
    if (subProgress && subProgress.total > 0) {
      const stepWidth = 100 / totalSteps;
      const subProgressPercent = (subProgress.current / subProgress.total) * stepWidth;
      return baseProgress + subProgressPercent;
    }

    return baseProgress;
  };

  // Form state
  const [postText, setPostText] = useState('');
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [selectedFacebookPages, setSelectedFacebookPages] = useState<string[]>([]);
  const [selectedXAccounts, setSelectedXAccounts] = useState<string[]>([]);
  const [selectedInstagramAccounts, setSelectedInstagramAccounts] = useState<
    Record<string, InstagramSelection>
  >({});
  const [selectedTelegramChannels, setSelectedTelegramChannels] = useState<string[]>([]);

  // Initialize selections when accounts load
  useEffect(() => {
    if (facebookPages.length > 0) {
      setSelectedFacebookPages(facebookPages.map((p) => p.page_id));
    }
  }, [facebookPages]);

  useEffect(() => {
    if (xAccounts.length > 0) {
      setSelectedXAccounts(xAccounts.map((a) => a.id));
    }
  }, [xAccounts]);

  useEffect(() => {
    if (instagramAccounts.length > 0) {
      const initial: Record<string, InstagramSelection> = {};
      instagramAccounts.forEach((a) => {
        initial[a.id] = { publish: false, story: false };
      });
      setSelectedInstagramAccounts(initial);
    }
  }, [instagramAccounts]);

  useEffect(() => {
    if (telegramChannels.length > 0) {
      setSelectedTelegramChannels(telegramChannels.map((c) => c.channel_id));
    }
  }, [telegramChannels]);

  // Auto-select Instagram accounts when media is added, deselect when removed
  useEffect(() => {
    if (instagramAccounts.length === 0) return;

    if (uploadedMedia.length > 0) {
      // Media added - auto-select if nothing is currently selected
      setSelectedInstagramAccounts((prev) => {
        const hasAnySelected = Object.values(prev).some((s) => s.publish || s.story);
        if (!hasAnySelected) {
          const updated: Record<string, InstagramSelection> = {};
          instagramAccounts.forEach((a) => {
            updated[a.id] = { publish: true, story: false };
          });
          return updated;
        }
        return prev;
      });
    } else {
      // All media removed - deselect all Instagram options
      setSelectedInstagramAccounts((prev) => {
        const updated: Record<string, InstagramSelection> = {};
        instagramAccounts.forEach((a) => {
          updated[a.id] = { publish: false, story: false };
        });
        return updated;
      });
    }
  }, [uploadedMedia.length, instagramAccounts]);

  // Handlers
  const handleFacebookChange = useCallback((pageId: string) => {
    setSelectedFacebookPages((prev) =>
      prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]
    );
  }, []);

  const handleXChange = useCallback((accountId: string) => {
    setSelectedXAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  }, []);

  const handleInstagramChange = useCallback(
    (accountId: string, type: 'publish' | 'story') => {
      setSelectedInstagramAccounts((prev) => ({
        ...prev,
        [accountId]: {
          ...(prev[accountId] || { publish: false, story: false }),
          [type]: !prev[accountId]?.[type],
        },
      }));
    },
    []
  );

  const handleTelegramChange = useCallback((channelId: string) => {
    setSelectedTelegramChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  }, []);

  const handlePublish = async () => {
    const wasSuccessful = await publish({
      postText,
      uploadedMedia,
      selectedFacebookPages,
      selectedXAccounts,
      selectedInstagramAccounts,
      selectedTelegramChannels,
    });

    if (wasSuccessful) {
      setPostText('');
      setUploadedMedia([]);
      setSelectedFacebookPages(facebookPages.map((p) => p.page_id));
      setSelectedXAccounts(xAccounts.map((a) => a.id));
      setSelectedTelegramChannels(telegramChannels.map((c) => c.channel_id));

      const resetInstagram: Record<string, InstagramSelection> = {};
      instagramAccounts.forEach((a) => {
        resetInstagram[a.id] = { publish: false, story: false };
      });
      setSelectedInstagramAccounts(resetInstagram);
    }
  };

  // Computed values
  const charCount = postText.length;
  const showTwitterWarning = charCount > TWITTER_CHAR_LIMIT && selectedXAccounts.length > 0;
  const hasAnyAccount =
    facebookPages.length > 0 || xAccounts.length > 0 || instagramAccounts.length > 0 || telegramChannels.length > 0;
  const hasInstagramSelection = Object.values(selectedInstagramAccounts).some(
    (s) => s.publish || s.story
  );
  const canPublish =
    !isPublishing &&
    (postText.trim() !== '' || uploadedMedia.length > 0) &&
    (selectedFacebookPages.length > 0 ||
      selectedXAccounts.length > 0 ||
      hasInstagramSelection ||
      selectedTelegramChannels.length > 0);

  const selectedCount =
    selectedFacebookPages.length +
    selectedXAccounts.length +
    Object.values(selectedInstagramAccounts).filter((s) => s.publish || s.story).length +
    selectedTelegramChannels.length;

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, rgba(25,118,210,0.05) 0%, rgba(255,255,255,0) 50%)',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        {/* Loading overlay */}
        <Backdrop
          sx={{
            color: '#fff',
            zIndex: (theme) => theme.zIndex.drawer + 1,
            flexDirection: 'column',
            gap: 2,
            backdropFilter: 'blur(8px)',
            background: 'rgba(0,0,0,0.7)',
          }}
          open={isPublishing}
        >
          <RocketLaunchIcon sx={{ fontSize: 56, animation: 'pulse 1.5s infinite' }} />
          <Typography variant="h5" fontWeight="medium">
            Publishing your post...
          </Typography>
          <Box sx={{ width: 320, textAlign: 'center' }}>
            <Typography
              variant="body1"
              sx={{
                mb: 2,
                minHeight: 24,
                color: 'grey.300',
                transition: 'opacity 0.3s',
              }}
            >
              {statusMessage || 'Preparing...'}
            </Typography>
            <Box sx={{ width: '100%' }}>
              <LinearProgress
                variant="determinate"
                value={calculateProgress()}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    background: 'linear-gradient(90deg, #1877f2 0%, #E1306C 50%, #F77737 100%)',
                    transition: 'transform 0.3s ease-out',
                  },
                }}
              />
              {stepProgress && (
                <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'grey.400' }}>
                  Step {stepProgress.stepIndex} of {stepProgress.totalSteps}
                  {stepProgress.subProgress && stepProgress.subProgress.total > 0 && (
                    <> &middot; {stepProgress.subProgress.current} of {stepProgress.subProgress.total} accounts</>
                  )}
                </Typography>
              )}
            </Box>
          </Box>
        </Backdrop>

        {/* Header */}
        <Fade in timeout={600}>
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h3"
              fontWeight="bold"
              sx={{
                background: 'linear-gradient(90deg, #1877f2, #E1306C, #F77737)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
              }}
            >
              Create Post
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Share your content across multiple platforms at once
            </Typography>
          </Box>
        </Fade>

        {/* Results */}
        <PublishResults error={error} success={success} results={results} onClose={clearStatus} />

        {!hasAnyAccount ? (
          <Fade in timeout={800}>
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: 4,
                border: '2px dashed',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="h5" color="text.secondary" gutterBottom>
                No accounts connected
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Head to the Dashboard to connect your Facebook, Instagram, X, and Telegram accounts.
              </Typography>
            </Paper>
          </Fade>
        ) : (
          <Fade in timeout={800}>
            <Box>
              {/* Composer Section */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  mb: 3,
                }}
              >
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}
                >
                  Compose Your Post
                </Typography>
                <PostComposer
                  postText={postText}
                  onTextChange={setPostText}
                  uploadedMedia={uploadedMedia}
                  onMediaChange={setUploadedMedia}
                  showTwitterWarning={showTwitterWarning}
                />
              </Paper>

              {/* Account Selector Section */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  mb: 3,
                }}
              >
                <AccountSelector
                  facebookPages={facebookPages}
                  xAccounts={xAccounts}
                  instagramAccounts={instagramAccounts}
                  telegramChannels={telegramChannels}
                  selectedFacebookPages={selectedFacebookPages}
                  selectedXAccounts={selectedXAccounts}
                  selectedInstagramAccounts={selectedInstagramAccounts}
                  selectedTelegramChannels={selectedTelegramChannels}
                  onFacebookChange={handleFacebookChange}
                  onXChange={handleXChange}
                  onInstagramChange={handleInstagramChange}
                  onTelegramChange={handleTelegramChange}
                  mediaSelected={uploadedMedia.length > 0}
                />
              </Paper>

              {/* Publish Button */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: 2,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {selectedCount > 0
                    ? `Publishing to ${selectedCount} destination${selectedCount > 1 ? 's' : ''}`
                    : 'Select at least one account'}
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handlePublish}
                  disabled={!canPublish}
                  endIcon={<SendIcon />}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 3,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    background: canPublish
                      ? 'linear-gradient(90deg, #1877f2 0%, #E1306C 50%, #F77737 100%)'
                      : undefined,
                    '&:hover': {
                      background: canPublish
                        ? 'linear-gradient(90deg, #155eaf 0%, #c02a5c 50%, #d96830 100%)'
                        : undefined,
                    },
                    '&.Mui-disabled': {
                      background: 'action.disabledBackground',
                    },
                  }}
                >
                  Publish Now
                </Button>
              </Box>
            </Box>
          </Fade>
        )}
      </Container>

      {/* Keyframes for animations */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </Box>
  );
}
