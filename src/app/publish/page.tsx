'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Snackbar,
  Alert,

} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getPlatformConfig } from '@/lib/platformConfig';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { useConnectedAccounts } from '@/hooks/useConnectedAccounts';
import { usePublish } from '@/hooks/usePublish';
import { PostComposer } from '@/components/publish/PostComposer';
import { AccountSelector } from '@/components/publish/AccountSelector';
import { PublishResults } from '@/components/publish/PublishResults';
import { PageHeader } from '@/components/PageHeader';
import type { UploadedMedia } from '@/components/publish/MediaUploader';
import { mapDraftMediaToUploaded } from '@/hooks/useDrafts';
import type { InstagramSelection, Platform } from '@/types/accounts';
import { TWITTER_CHAR_LIMIT } from '@/types/accounts';

export default function PublishPage() {
  // useSearchParams needs a Suspense boundary in the app router
  return (
    <Suspense fallback={null}>
      <PublishPageInner />
    </Suspense>
  );
}

function PublishPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // When arriving via /publish?draft=<id>, the draft is loaded into the composer
  const draftIdParam = searchParams.get('draft');
  const draftId = draftIdParam ? parseInt(draftIdParam, 10) : null;

  // Data fetching
  const {
    facebookPages,
    xAccounts,
    instagramAccounts,
    telegramChannels,
    loading,
  } = useConnectedAccounts();

  // Publishing logic
  const { isPublishing, error, success, results, statusMessage, stepProgress, accountsProgress, publish, clearStatus, silenceUpdates } = usePublish();

  // Platform icon mapping
  const getPlatformIcon = (platform: string) => {
    const config = getPlatformConfig(platform);
    if (!config) return null;
    const Icon = config.icon;
    return <Icon sx={{ color: config.color }} />;
  };

  // Status icon mapping
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 18 }} />;
      case 'failed':
        return <ErrorIcon sx={{ color: 'error.main', fontSize: 18 }} />;
      case 'publishing':
        return <CircularProgress size={16} sx={{ color: 'info.main' }} />;
      default:
        return <HourglassEmptyIcon sx={{ color: 'grey.500', fontSize: 18 }} />;
    }
  };

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

  // Publishing overlay visibility
  const [publishingHidden, setPublishingHidden] = useState(false);
  const publishingHiddenRef = useRef(false);

  // Media uploading state
  const [isMediaUploading, setIsMediaUploading] = useState(false);

  // Queue state
  const [isQueueing, setIsQueueing] = useState(false);
  // Draft state
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [queueSnackbar, setQueueSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

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

  // Draft loading state
  const [draftTargets, setDraftTargets] = useState<Platform[] | null>(null);
  const draftTargetsApplied = useRef(false);

  // Load the draft's content into the composer
  useEffect(() => {
    if (!draftId) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/drafts?id=${draftId}`, { credentials: 'include' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load draft');
        if (cancelled) return;
        setPostText(data.draft.text);
        setUploadedMedia(mapDraftMediaToUploaded(data.draft.media));
        setDraftTargets(data.draft.target_platforms);
      } catch (err) {
        if (!cancelled) {
          setQueueSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
          router.replace('/publish');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

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

  // Apply the draft's target platforms once accounts are loaded.
  // Declared after the account-init and media effects so it overrides their defaults.
  useEffect(() => {
    if (!draftTargets || loading || draftTargetsApplied.current) return;
    draftTargetsApplied.current = true;
    setSelectedFacebookPages(
      draftTargets.includes('facebook') ? facebookPages.map((p) => p.page_id) : []
    );
    setSelectedXAccounts(draftTargets.includes('twitter') ? xAccounts.map((a) => a.id) : []);
    setSelectedTelegramChannels(
      draftTargets.includes('telegram') ? telegramChannels.map((c) => c.channel_id) : []
    );
    const instagram: Record<string, InstagramSelection> = {};
    instagramAccounts.forEach((a) => {
      instagram[a.id] = {
        publish: draftTargets.includes('instagram') && uploadedMedia.length > 0,
        story: false,
      };
    });
    setSelectedInstagramAccounts(instagram);
  }, [draftTargets, loading, facebookPages, xAccounts, telegramChannels, instagramAccounts, uploadedMedia.length]);

  // A published or queued draft is consumed: delete it and drop the ?draft param
  const consumeDraft = useCallback(async () => {
    if (!draftId) return;
    try {
      await fetch('/api/drafts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: draftId }),
      });
    } catch {
      // not fatal — the draft just stays in the list
    }
    router.replace('/publish');
  }, [draftId, router]);

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

  const resetForm = useCallback(() => {
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
  }, [facebookPages, xAccounts, instagramAccounts, telegramChannels]);

  const handleHidePublishing = useCallback(() => {
    setPublishingHidden(true);
    publishingHiddenRef.current = true;
    resetForm();
    silenceUpdates();
  }, [resetForm, silenceUpdates]);

  const handlePublish = async () => {
    setPublishingHidden(false);
    publishingHiddenRef.current = false;
    const wasSuccessful = await publish({
      postText,
      uploadedMedia,
      selectedFacebookPages,
      selectedXAccounts,
      selectedInstagramAccounts,
      selectedTelegramChannels,
    });

    if (wasSuccessful) {
      await consumeDraft();
    }

    if (publishingHiddenRef.current) {
      // Form was already reset and status silenced when user backgrounded.
      return;
    }

    if (wasSuccessful) {
      resetForm();
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);

    // Targets = platforms with at least one selected account
    const targetPlatforms = [
      selectedFacebookPages.length > 0 ? 'facebook' : null,
      selectedXAccounts.length > 0 ? 'twitter' : null,
      Object.values(selectedInstagramAccounts).some((s) => s.publish || s.story) ? 'instagram' : null,
      selectedTelegramChannels.length > 0 ? 'telegram' : null,
    ].filter(Boolean);

    try {
      const response = await fetch('/api/drafts', {
        method: draftId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...(draftId ? { id: draftId } : {}),
          text: postText,
          target_platforms: targetPlatforms,
          media: uploadedMedia.map((media) => ({
            publicId: media.publicId,
            publicUrl: media.publicUrl,
            resourceType: media.resourceType,
            format: media.format,
            width: media.width,
            height: media.height,
            originalFilename: media.originalFilename,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setQueueSnackbar({
          open: true,
          message: draftId ? 'Draft updated' : 'Draft saved',
          severity: 'success',
        });
        if (!draftId) resetForm();
      } else {
        setQueueSnackbar({ open: true, message: data.error || 'Failed to save draft', severity: 'error' });
      }
    } catch (err) {
      setQueueSnackbar({ open: true, message: (err as Error).message || 'Failed to save draft', severity: 'error' });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleQueuePost = async () => {
    setIsQueueing(true);

    // Process Instagram selections
    const instagramPublishAccounts: string[] = [];
    const instagramStoryAccounts: string[] = [];

    Object.entries(selectedInstagramAccounts).forEach(([accountId, types]) => {
      if (types.publish) {
        instagramPublishAccounts.push(accountId);
      }
      if (types.story) {
        instagramStoryAccounts.push(accountId);
      }
    });

    const payload = {
      text: postText,
      facebookPages: selectedFacebookPages,
      xAccounts: selectedXAccounts,
      instagramPublishAccounts,
      instagramStoryAccounts,
      telegramChannels: selectedTelegramChannels,
      cloudinaryMedia: uploadedMedia.map((media) => ({
        publicId: media.publicId,
        publicUrl: media.publicUrl,
        resourceType: media.resourceType,
        format: media.format,
        width: media.width,
        height: media.height,
        originalFilename: media.originalFilename,
      })),
    };

    try {
      const response = await fetch('/api/publish/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setQueueSnackbar({
          open: true,
          message: `Post added to queue (${data.destinations_count} destinations)`,
          severity: 'success'
        });

        await consumeDraft();

        // Clear form
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
      } else {
        setQueueSnackbar({
          open: true,
          message: data.error || 'Failed to queue post',
          severity: 'error'
        });
      }
    } catch (err) {
      setQueueSnackbar({
        open: true,
        message: (err as Error).message || 'An error occurred',
        severity: 'error'
      });
    } finally {
      setIsQueueing(false);
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
  const canSaveDraft =
    !isPublishing &&
    !isQueueing &&
    !isMediaUploading &&
    !isSavingDraft &&
    (postText.trim() !== '' || uploadedMedia.length > 0);
  const canPublish =
    !isPublishing &&
    !isQueueing &&
    !isMediaUploading &&
    !isSavingDraft &&
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
        bgcolor: 'background.default',
        py: { xs: 2, sm: 3, md: 4 },
        px: { xs: 2, sm: 0 },
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
            background: 'rgba(0,0,0,0.85)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          open={isPublishing && !publishingHidden}
        >
          <RocketLaunchIcon sx={{ fontSize: 48, animation: 'pulse 1.5s infinite' }} />
          <Typography variant="h5" fontWeight="medium">
            Publishing your post...
          </Typography>

          {/* Per-account progress */}
          {accountsProgress.length > 0 && (
            <Paper
              sx={{
                width: { xs: '100%', sm: 400 },
                maxWidth: '90vw',
                maxHeight: 300,
                overflow: 'auto',
                bgcolor: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(4px)',
                borderRadius: 2,
                mt: 1,
              }}
            >
              <List dense sx={{ py: 0.5 }}>
                {accountsProgress.map((account) => (
                  <ListItem
                    key={account.accountId}
                    sx={{
                      py: 0.75,
                      px: 2,
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {getPlatformIcon(account.platform)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                            {account.accountName}
                          </Typography>
                          <Chip
                            label={account.platform.includes('Story') ? 'Story' : account.platform}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              bgcolor: 'rgba(255,255,255,0.2)',
                              color: 'white',
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        account.error && (
                          <Typography variant="caption" sx={{ color: 'error.light', display: 'block', mt: 0.25 }}>
                            {account.error}
                          </Typography>
                        )
                      }
                    />
                    <Box sx={{ ml: 1 }}>
                      {getStatusIcon(account.status)}
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {/* Overall progress */}
          <Box sx={{ width: 400, maxWidth: '90vw', textAlign: 'center', mt: 1 }}>
            <Typography
              variant="body2"
              sx={{
                mb: 1,
                minHeight: 20,
                color: 'grey.400',
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
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    bgcolor: 'primary.main',
                    transition: 'transform 0.3s ease-out',
                  },
                }}
              />
              {stepProgress && (
                <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'grey.500' }}>
                  Step {stepProgress.stepIndex} of {stepProgress.totalSteps}
                  {accountsProgress.length > 0 && (
                    <> &middot; {accountsProgress.filter(a => a.status === 'completed' || a.status === 'failed').length} of {accountsProgress.length} accounts</>
                  )}
                </Typography>
              )}
            </Box>
          </Box>

          <Button
            variant="text"
            onClick={handleHidePublishing}
            sx={{
              mt: 2,
              color: 'grey.400',
              textTransform: 'none',
              '&:hover': {
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            Continue in Background
          </Button>
        </Backdrop>

        {/* Header */}
        <PageHeader
          eyebrow="Draft · compose"
          title={<>Compose</>}
          lead="Write once. Tailor per platform — limits, tone and media adapt automatically."
        />

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
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  mb: 3,
                }}
              >
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ mb: 2, display: 'block' }}
                >
                  Compose Your Post
                </Typography>
                <PostComposer
                  postText={postText}
                  onTextChange={setPostText}
                  uploadedMedia={uploadedMedia}
                  onMediaChange={setUploadedMedia}
                  showTwitterWarning={showTwitterWarning}
                  onUploadingChange={setIsMediaUploading}
                />
              </Paper>

              {/* Account Selector Section */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 4,
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

              {/* Publish Buttons */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'stretch', sm: 'center' },
                  mt: 2,
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
                    {selectedCount > 0
                      ? `Publishing to ${selectedCount} destination${selectedCount > 1 ? 's' : ''}`
                      : 'Select at least one account'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={handleSaveDraft}
                    disabled={!canSaveDraft}
                    endIcon={isSavingDraft ? <CircularProgress size={20} /> : <SaveOutlinedIcon />}
                    sx={{
                      px: 3,
                      py: 1.5,
                      borderRadius: 3,
                      textTransform: 'none',
                      fontSize: '1rem',
                      fontWeight: 600,
                      borderColor: 'divider',
                      color: 'text.primary',
                      '&:hover': {
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    {isSavingDraft ? 'Saving...' : draftId ? 'Update Draft' : 'Save as Draft'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={handleQueuePost}
                    disabled={!canPublish}
                    endIcon={isQueueing ? <CircularProgress size={20} /> : <ScheduleSendIcon />}
                    sx={{
                      px: 3,
                      py: 1.5,
                      borderRadius: 3,
                      textTransform: 'none',
                      fontSize: '1rem',
                      fontWeight: 600,
                      borderColor: 'divider',
                      color: 'text.primary',
                      '&:hover': {
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    {isQueueing ? 'Queueing...' : 'Publish in Background'}
                  </Button>
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
                      bgcolor: canPublish ? 'primary.main' : undefined,
                      color: canPublish ? 'primary.contrastText' : undefined,
                      '&:hover': {
                        bgcolor: canPublish ? 'primary.dark' : undefined,
                      },
                      '&.Mui-disabled': {
                        bgcolor: 'action.disabledBackground',
                      },
                    }}
                  >
                    Publish Now
                  </Button>
                </Box>
              </Box>
            </Box>
          </Fade>
        )}
      </Container>

      {/* Queue Snackbar */}
      <Snackbar
        open={queueSnackbar.open}
        autoHideDuration={4000}
        onClose={() => setQueueSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setQueueSnackbar(prev => ({ ...prev, open: false }))}
          severity={queueSnackbar.severity}
          sx={{ width: '100%' }}
        >
          {queueSnackbar.message}
        </Alert>
      </Snackbar>

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
