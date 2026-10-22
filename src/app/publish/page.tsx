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
import { YouTubeTitleField } from '@/components/publish/YouTubeTitleField';
import { youtubeTitleError } from '@/lib/youtube';
import { TikTokSettingsField } from '@/components/publish/TikTokSettingsField';
import { EMPTY_TIKTOK_SETTINGS, type TikTokPostSettings } from '@/lib/tiktok';
import { PublishResults } from '@/components/publish/PublishResults';
import { PageHeader } from '@/components/PageHeader';
import type { UploadedMedia } from '@/components/publish/MediaUploader';
import { mapDraftMediaToUploaded } from '@/hooks/useDrafts';
import type { InstagramSelection, Platform, TargetAccount } from '@/types/accounts';
import { TWITTER_CHAR_LIMIT } from '@/types/accounts';
import { contentKinds, fitContent, needsChoice, resolveContent, type ContentKind, type ContentSelection } from '@/lib/publish/contentRules';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';

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
    linkedinAccounts,
    youtubeChannels,
    tiktokAccounts,
    normalizedAccounts,
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
  const [selectedLinkedInAccounts, setSelectedLinkedInAccounts] = useState<string[]>([]);
  const [selectedYouTubeChannels, setSelectedYouTubeChannels] = useState<string[]>([]);
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [selectedTikTokAccounts, setSelectedTikTokAccounts] = useState<string[]>([]);
  const [tiktokSettings, setTiktokSettings] = useState<TikTokPostSettings>(EMPTY_TIKTOK_SETTINGS);
  const [isTiktokReady, setIsTiktokReady] = useState(false);
  // What to send to platforms that cannot take the whole post
  const [contentSelection, setContentSelection] = useState<ContentSelection>({});

  // Publishing overlay visibility
  const [publishingHidden, setPublishingHidden] = useState(false);
  const publishingHiddenRef = useRef(false);

  // Media uploading state
  const [isMediaUploading, setIsMediaUploading] = useState(false);

  // Queue state
  // Draft state
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
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

  useEffect(() => {
    if (linkedinAccounts.length > 0) {
      setSelectedLinkedInAccounts(linkedinAccounts.map((a) => a.id));
    }
  }, [linkedinAccounts]);

  useEffect(() => {
    if (youtubeChannels.length > 0) {
      setSelectedYouTubeChannels(youtubeChannels.map((c) => c.id));
    }
  }, [youtubeChannels]);

  useEffect(() => {
    if (tiktokAccounts.length > 0) {
      setSelectedTikTokAccounts(tiktokAccounts.map((a) => a.id));
    }
  }, [tiktokAccounts]);

  // Draft loading state
  const [draftTargets, setDraftTargets] = useState<TargetAccount[] | null>(null);
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
        setDraftTargets(data.draft.target_accounts);
      } catch (err) {
        if (!cancelled) {
          setSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
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

  // Apply the draft's target accounts once accounts are loaded; targets no longer connected are dropped.
  // Declared after the account-init and media effects so it overrides their defaults.
  useEffect(() => {
    if (!draftTargets || loading || draftTargetsApplied.current) return;
    draftTargetsApplied.current = true;
    const isTargeted = (platform: Platform, id: string) =>
      draftTargets.some((t) => t.platform === platform && t.account_id === id);
    const filterTargeted = (platform: Platform, ids: string[]) => ids.filter((id) => isTargeted(platform, id));
    setSelectedFacebookPages(filterTargeted('facebook', facebookPages.map((p) => p.page_id)));
    setSelectedXAccounts(filterTargeted('twitter', xAccounts.map((a) => a.id)));
    setSelectedTelegramChannels(filterTargeted('telegram', telegramChannels.map((c) => c.channel_id)));
    setSelectedLinkedInAccounts(filterTargeted('linkedin', linkedinAccounts.map((a) => a.id)));
    setSelectedYouTubeChannels(filterTargeted('youtube', youtubeChannels.map((c) => c.id)));
    setSelectedTikTokAccounts(filterTargeted('tiktok', tiktokAccounts.map((a) => a.id)));
    const instagram: Record<string, InstagramSelection> = {};
    instagramAccounts.forEach((a) => {
      instagram[a.id] = {
        publish: isTargeted('instagram', a.id) && uploadedMedia.length > 0,
        story: false,
      };
    });
    setSelectedInstagramAccounts(instagram);
  }, [draftTargets, loading, facebookPages, xAccounts, telegramChannels, linkedinAccounts, youtubeChannels, tiktokAccounts, instagramAccounts, uploadedMedia.length]);

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

  const handleLinkedInChange = useCallback((accountId: string) => {
    setSelectedLinkedInAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  }, []);

  const handleYouTubeChange = useCallback((channelId: string) => {
    setSelectedYouTubeChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  }, []);

  const handleTikTokChange = useCallback((openId: string) => {
    setSelectedTikTokAccounts((prev) =>
      prev.includes(openId)
        ? prev.filter((id) => id !== openId)
        : [...prev, openId]
    );
  }, []);

  const handleContentSelect = useCallback((platform: Platform, kinds: ContentKind[]) => {
    setContentSelection((prev) => ({ ...prev, [platform]: kinds }));
  }, []);

  const resetForm = useCallback(() => {
    setPostText('');
    setUploadedMedia([]);
    setContentSelection({});
    setYoutubeTitle('');
    setTiktokSettings(EMPTY_TIKTOK_SETTINGS);
    setSelectedFacebookPages(facebookPages.map((p) => p.page_id));
    setSelectedXAccounts(xAccounts.map((a) => a.id));
    setSelectedTelegramChannels(telegramChannels.map((c) => c.channel_id));
    setSelectedLinkedInAccounts(linkedinAccounts.map((a) => a.id));
    setSelectedYouTubeChannels(youtubeChannels.map((c) => c.id));
    setSelectedTikTokAccounts(tiktokAccounts.map((a) => a.id));
    const resetInstagram: Record<string, InstagramSelection> = {};
    instagramAccounts.forEach((a) => {
      resetInstagram[a.id] = { publish: false, story: false };
    });
    setSelectedInstagramAccounts(resetInstagram);
  }, [facebookPages, xAccounts, instagramAccounts, telegramChannels, linkedinAccounts, youtubeChannels, tiktokAccounts]);

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
      selectedLinkedInAccounts,
      selectedYouTubeChannels,
      youtubeTitle,
      selectedTikTokAccounts,
      tiktokSettings,
      contentSelection,
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

    // Targets = the selected accounts; an Instagram account counts when its feed or story is selected
    const buildTargetsOn = (platform: Platform, ids: string[]): TargetAccount[] =>
      ids.map((account_id) => ({ platform, account_id }));
    const targetAccounts = [
      ...buildTargetsOn('facebook', selectedFacebookPages),
      ...buildTargetsOn('twitter', selectedXAccounts),
      ...buildTargetsOn(
        'instagram',
        Object.entries(selectedInstagramAccounts)
          .filter(([, s]) => s.publish || s.story)
          .map(([id]) => id)
      ),
      ...buildTargetsOn('telegram', selectedTelegramChannels),
      ...buildTargetsOn('linkedin', selectedLinkedInAccounts),
      ...buildTargetsOn('youtube', selectedYouTubeChannels),
      ...buildTargetsOn('tiktok', selectedTikTokAccounts),
    ];

    try {
      const response = await fetch('/api/drafts', {
        method: draftId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...(draftId ? { id: draftId } : {}),
          text: postText,
          target_accounts: targetAccounts,
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
        setSnackbar({
          open: true,
          message: draftId ? 'Draft updated' : 'Draft saved',
          severity: 'success',
        });
        if (!draftId) resetForm();
      } else {
        setSnackbar({ open: true, message: data.error || 'Failed to save draft', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: (err as Error).message || 'Failed to save draft', severity: 'error' });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Computed values
  const charCount = postText.length;
  const showTwitterWarning = charCount > TWITTER_CHAR_LIMIT && selectedXAccounts.length > 0;
  const hasAnyAccount =
    facebookPages.length > 0 || xAccounts.length > 0 || instagramAccounts.length > 0 || telegramChannels.length > 0 || linkedinAccounts.length > 0 || youtubeChannels.length > 0 || tiktokAccounts.length > 0;
  const kinds = contentKinds(postText, uploadedMedia);
  const selectedPerPlatform: Record<Platform, number> = {
    facebook: selectedFacebookPages.length,
    twitter: selectedXAccounts.length,
    instagram: Object.values(selectedInstagramAccounts).filter((s) => s.publish || s.story).length,
    telegram: selectedTelegramChannels.length,
    linkedin: selectedLinkedInAccounts.length,
    youtube: selectedYouTubeChannels.length,
    tiktok: selectedTikTokAccounts.length,
  };
  const platforms = Object.keys(selectedPerPlatform) as Platform[];
  const showYouTubeTitle = selectedYouTubeChannels.length > 0 && fitContent('youtube', kinds).status !== 'unsupported';
  const showTikTokSettings = selectedTikTokAccounts.length > 0 && resolveContent('tiktok', kinds, contentSelection.tiktok) !== null;
  // Selected destinations whose platform can take the post (or has a choice made)
  const selectedCount = platforms.reduce(
    (count, platform) =>
      count + (resolveContent(platform, kinds, contentSelection[platform]) !== null ? selectedPerPlatform[platform] : 0),
    0
  );
  // Selected platforms that can take part of the post but have no choice made yet
  const undecided = platforms.filter(
    (platform) => selectedPerPlatform[platform] > 0 && needsChoice(platform, kinds, contentSelection[platform])
  );
  const canSaveDraft =
    !isPublishing &&
    !isMediaUploading &&
    !isSavingDraft &&
    (postText.trim() !== '' || uploadedMedia.length > 0);
  const canPublish =
    !isPublishing && !isMediaUploading && !isSavingDraft && selectedCount > 0 && undecided.length === 0 &&
    !(showYouTubeTitle && youtubeTitleError(youtubeTitle.trim())) &&
    !(showTikTokSettings && !isTiktokReady);

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
        <PublishResults error={error} success={success} results={results} accounts={normalizedAccounts} onClose={clearStatus} />

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
                Head to the Dashboard to connect your Facebook, Instagram, X, Telegram, LinkedIn, YouTube, and TikTok accounts.
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
                  linkedinAccounts={linkedinAccounts}
                  youtubeChannels={youtubeChannels}
                  tiktokAccounts={tiktokAccounts}
                  selectedFacebookPages={selectedFacebookPages}
                  selectedXAccounts={selectedXAccounts}
                  selectedInstagramAccounts={selectedInstagramAccounts}
                  selectedTelegramChannels={selectedTelegramChannels}
                  selectedLinkedInAccounts={selectedLinkedInAccounts}
                  selectedYouTubeChannels={selectedYouTubeChannels}
                  selectedTikTokAccounts={selectedTikTokAccounts}
                  onFacebookChange={handleFacebookChange}
                  onXChange={handleXChange}
                  onInstagramChange={handleInstagramChange}
                  onTelegramChange={handleTelegramChange}
                  onLinkedInChange={handleLinkedInChange}
                  onYouTubeChange={handleYouTubeChange}
                  onTikTokChange={handleTikTokChange}
                  contentKinds={kinds}
                  contentSelection={contentSelection}
                  onContentSelect={handleContentSelect}
                />
                {showYouTubeTitle && (
                  <Box sx={{ mt: 2 }}>
                    <YouTubeTitleField value={youtubeTitle} onChange={setYoutubeTitle} />
                  </Box>
                )}
                {showTikTokSettings && (
                  <Box sx={{ mt: 2 }}>
                    <TikTokSettingsField
                      accountIds={selectedTikTokAccounts}
                      videoUrl={uploadedMedia.find((m) => m.resourceType === 'video')?.previewUrl}
                      value={tiktokSettings}
                      onChange={setTiktokSettings}
                      onReadyChange={setIsTiktokReady}
                    />
                  </Box>
                )}
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
                  <Typography
                    variant="body2"
                    sx={{ fontSize: 13, color: undecided.length > 0 ? 'warning.main' : 'text.secondary' }}
                  >
                    {undecided.length > 0
                      ? `Choose what to send to ${undecided.map((p) => PLATFORM_CONFIG[p].label).join(', ')}`
                      : selectedCount > 0
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

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
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
