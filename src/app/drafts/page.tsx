'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Fade,
  Chip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import { PageHeader } from '@/components/PageHeader';
import { getPlatformConfig } from '@/lib/platformConfig';
import { useDrafts, mapDraftMediaToUploaded, type Draft } from '@/hooks/useDrafts';
import { useConnectedAccounts } from '@/hooks/useConnectedAccounts';
import { usePublish } from '@/hooks/usePublish';
import type { InstagramSelection, Platform } from '@/types/accounts';

export default function DraftsPage() {
  const { drafts, total, loading, error, deleteDraft } = useDrafts();
  const { facebookPages, xAccounts, instagramAccounts, telegramChannels } = useConnectedAccounts();
  const { publish, isPublishing, statusMessage } = usePublish();

  const [previewDraft, setPreviewDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Draft | null>(null);
  const [working, setWorking] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const accountNamesFor = (platform: Platform): string[] => {
    switch (platform) {
      case 'facebook':
        return facebookPages.map((p) => p.page_name);
      case 'twitter':
        return xAccounts.map((a) => `@${a.name}`);
      case 'instagram':
        return instagramAccounts.map((a) => `@${a.username}`);
      case 'telegram':
        return telegramChannels.map((c) => c.channel_title);
    }
  };

  const previewHasMedia = (previewDraft?.media?.length ?? 0) > 0;

  /** Accounts the confirm button would actually publish to. */
  const previewDestinationCount = previewDraft
    ? previewDraft.target_platforms.reduce((count, platform) => {
        if (platform === 'instagram' && !previewHasMedia) return count;
        return count + accountNamesFor(platform).length;
      }, 0)
    : 0;

  const handleConfirmPublish = async () => {
    if (!previewDraft) return;
    const targets = previewDraft.target_platforms;
    const media = mapDraftMediaToUploaded(previewDraft.media);

    const instagram: Record<string, InstagramSelection> = {};
    instagramAccounts.forEach((a) => {
      instagram[a.id] = { publish: targets.includes('instagram') && media.length > 0, story: false };
    });

    const ok = await publish({
      postText: previewDraft.text,
      uploadedMedia: media,
      selectedFacebookPages: targets.includes('facebook') ? facebookPages.map((p) => p.page_id) : [],
      selectedXAccounts: targets.includes('twitter') ? xAccounts.map((a) => a.id) : [],
      selectedInstagramAccounts: instagram,
      selectedTelegramChannels: targets.includes('telegram')
        ? telegramChannels.map((c) => c.channel_id)
        : [],
    });

    if (ok) {
      try {
        await deleteDraft(previewDraft.id);
      } catch {
        // publish went through; a stale draft in the list is not fatal
      }
      setPreviewDraft(null);
      setSnackbar({ open: true, message: 'Draft published', severity: 'success' });
    } else {
      setSnackbar({
        open: true,
        message: 'Publishing failed — see History for details',
        severity: 'error',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    setWorking(true);
    try {
      await deleteDraft(deleting.id);
      setDeleting(null);
      setSnackbar({ open: true, message: 'Draft deleted', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
    } finally {
      setWorking(false);
    }
  };

  const renderPlatformChips = (platforms: Platform[]) =>
    platforms.map((platform) => {
      const config = getPlatformConfig(platform);
      if (!config) return null;
      const Icon = config.icon;
      return (
        <Chip
          key={platform}
          icon={<Icon sx={{ fontSize: 14, color: `${config.color} !important` }} />}
          label={config.label}
          size="small"
          variant="outlined"
          sx={{ height: 22, fontSize: '0.7rem' }}
        />
      );
    });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
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
        <PageHeader
          eyebrow="Draft · manage"
          title={<>Drafts</>}
          lead="Posts you saved for later. Continue editing in the composer, or publish directly."
        />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {drafts.length === 0 ? (
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
                No drafts yet
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Use “Save as Draft” on the Publish page to stash a post for later.
              </Typography>
            </Paper>
          </Fade>
        ) : (
          <Fade in timeout={800}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {drafts.map((draft) => (
                <Paper
                  key={draft.id}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body1"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {draft.text || <em>(no text)</em>}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
                        {renderPlatformChips(draft.target_platforms)}
                        {(draft.media?.length ?? 0) > 0 && (
                          <Chip
                            icon={<ImageOutlinedIcon sx={{ fontSize: 14 }} />}
                            label={`${draft.media!.length} media`}
                            size="small"
                            sx={{ height: 22, fontSize: '0.7rem' }}
                          />
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                          Updated {new Date(draft.updated_at).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => setPreviewDraft(draft)}
                      title="Publish draft"
                    >
                      <SendIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      component={Link}
                      href={`/publish?draft=${draft.id}`}
                      title="Edit in composer"
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleting(draft)} title="Delete draft">
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Paper>
              ))}
              {total > drafts.length && (
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                  Showing the {drafts.length} most recent of {total} drafts
                </Typography>
              )}
            </Box>
          </Fade>
        )}
      </Container>

      {/* Publish preview / confirmation */}
      <Dialog
        open={!!previewDraft}
        onClose={() => !isPublishing && setPreviewDraft(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 1 }}>
          Publish this draft?
          <IconButton
            onClick={() => setPreviewDraft(null)}
            disabled={isPublishing}
            sx={{ ml: 'auto' }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="overline" color="text.secondary">
            Text
          </Typography>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              mb: 2,
              maxHeight: 220,
              overflow: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              whiteSpace: 'pre-wrap',
              fontSize: '0.9rem',
            }}
          >
            {previewDraft?.text || <em>(no text)</em>}
          </Paper>

          {previewHasMedia && (
            <>
              <Typography variant="overline" color="text.secondary">
                Media
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {previewDraft!.media!.map((m, i) =>
                  m.resourceType === 'video' ? (
                    <Chip key={i} icon={<VideocamOutlinedIcon />} label={m.originalFilename ?? 'video'} />
                  ) : (
                    <Box
                      key={i}
                      component="img"
                      src={m.publicUrl}
                      alt={m.originalFilename ?? 'media'}
                      sx={{
                        height: 80,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        objectFit: 'cover',
                      }}
                    />
                  )
                )}
              </Box>
            </>
          )}

          <Typography variant="overline" color="text.secondary">
            Publishing to
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 0.5 }}>
            {previewDraft?.target_platforms.length === 0 && (
              <Alert severity="warning" sx={{ py: 0.5 }}>
                This draft has no target platforms — edit it in the composer first.
              </Alert>
            )}
            {previewDraft?.target_platforms.map((platform) => {
              const names = accountNamesFor(platform);
              const skipped = platform === 'instagram' && !previewHasMedia;
              return (
                <Box key={platform} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {renderPlatformChips([platform])}
                  <Typography variant="caption" color={names.length && !skipped ? 'text.secondary' : 'warning.main'}>
                    {skipped
                      ? 'needs media — will be skipped'
                      : names.length
                        ? names.join(', ')
                        : 'no connected accounts'}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {isPublishing && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="caption" color="text.secondary">
                {statusMessage || 'Publishing...'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setPreviewDraft(null)}
            disabled={isPublishing}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPublish}
            variant="contained"
            disabled={isPublishing || previewDestinationCount === 0}
            endIcon={isPublishing ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
            sx={{ borderRadius: 2 }}
          >
            {isPublishing
              ? 'Publishing...'
              : `Publish to ${previewDestinationCount} destination${previewDestinationCount === 1 ? '' : 's'}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleting} onClose={() => setDeleting(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle>Delete this draft?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" noWrap>
            {deleting?.text || '(no text)'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleting(null)} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error" disabled={working} sx={{ borderRadius: 2 }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
