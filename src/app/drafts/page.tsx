'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Checkbox,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  type SelectChangeEvent,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
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
import { PLATFORMS, type InstagramSelection, type Platform } from '@/types/accounts';

const SEARCH_DEBOUNCE_MS = 300;

export default function DraftsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const query = searchParams.get('q') ?? '';
  const platformParam = searchParams.get('platform') as Platform | null;
  const platform: Platform | 'all' = platformParam && PLATFORMS.includes(platformParam) ? platformParam : 'all';

  const { drafts, total, totalPages, loading, error, refetch, deleteDrafts } = useDrafts({ page, query, platform });
  const { facebookPages, xAccounts, instagramAccounts, telegramChannels } = useConnectedAccounts();
  const { publish, isPublishing, statusMessage } = usePublish();

  const [previewDraft, setPreviewDraft] = useState<Draft | null>(null);
  // Drafts awaiting delete confirmation: one from a row button, or the selection.
  const [deleting, setDeleting] = useState<Draft[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchInput, setSearchInput] = useState(query);
  const [working, setWorking] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const updateUrl = (next: { page?: number; q?: string; platform?: Platform | 'all' }) => {
    const params = new URLSearchParams();
    const nextPage = next.page ?? page;
    const nextQuery = next.q ?? query;
    const nextPlatform = next.platform ?? platform;
    if (nextPage > 1) params.set('page', String(nextPage));
    if (nextQuery.trim()) params.set('q', nextQuery.trim());
    if (nextPlatform !== 'all') params.set('platform', nextPlatform);
    const qs = params.toString();
    router.push(qs ? `/drafts?${qs}` : '/drafts', { scroll: false });
  };

  // The search box writes to the URL after a short pause; the URL drives the fetch.
  useEffect(() => {
    if (searchInput.trim() === query.trim()) return;
    const timer = setTimeout(() => updateUrl({ q: searchInput, page: 1 }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Selection is per page: it resets whenever the visible list changes.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [drafts]);

  const isAllSelected = drafts.length > 0 && selectedIds.size === drafts.length;
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;
  const isFiltered = query.trim() !== '' || platform !== 'all';

  const toggleSelected = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSelectAll = (checked: boolean) =>
    setSelectedIds(checked ? new Set(drafts.map((d) => d.id)) : new Set());

  const handlePlatformChange = (event: SelectChangeEvent) =>
    updateUrl({ platform: event.target.value as Platform | 'all', page: 1 });

  /** Reloads the list; steps back a page when the current one ran empty. */
  const reloadAfterDelete = (deletedCount: number) => {
    const isPageEmptied = deletedCount >= drafts.length && page > 1;
    if (isPageEmptied) updateUrl({ page: page - 1 });
    else refetch();
  };

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
        await deleteDrafts([previewDraft.id]);
        reloadAfterDelete(1);
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
      const deletedCount = await deleteDrafts(deleting.map((d) => d.id));
      setDeleting(null);
      reloadAfterDelete(deletedCount);
      setSnackbar({
        open: true,
        message: `${deletedCount} draft${deletedCount === 1 ? '' : 's'} deleted`,
        severity: 'success',
      });
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

  if (loading && drafts.length === 0 && !isFiltered) {
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

        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Checkbox
                checked={isAllSelected}
                indeterminate={isSomeSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                disabled={drafts.length === 0}
                inputProps={{ 'aria-label': 'Select all drafts on this page' }}
              />
              <Typography variant="body2" color="text.secondary">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
              </Typography>
            </Box>
            {selectedIds.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteSweepIcon />}
                onClick={() => setDeleting(drafts.filter((d) => selectedIds.has(d.id)))}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Delete {selectedIds.size}
              </Button>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField
              size="small"
              placeholder="Search drafts"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              inputProps={{ 'aria-label': 'Search drafts' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: { xs: '100%', sm: 220 } }}
            />
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
              <InputLabel id="drafts-platform-label">Platform</InputLabel>
              <Select labelId="drafts-platform-label" value={platform} onChange={handlePlatformChange} label="Platform">
                <MenuItem value="all">All Platforms</MenuItem>
                {PLATFORMS.map((p) => (
                  <MenuItem key={p} value={p}>
                    {getPlatformConfig(p)?.label ?? p}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : drafts.length === 0 && isFiltered ? (
          <Paper
            elevation={0}
            sx={{ p: 6, textAlign: 'center', borderRadius: 4, border: '1px solid', borderColor: 'divider' }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No drafts match
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try a different search or platform.
            </Typography>
          </Paper>
        ) : drafts.length === 0 ? (
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
                    <Checkbox
                      checked={selectedIds.has(draft.id)}
                      onChange={() => toggleSelected(draft.id)}
                      inputProps={{ 'aria-label': `Select draft ${draft.id}` }}
                      sx={{ mt: -0.75, ml: -1 }}
                    />
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
                    <IconButton size="small" color="error" onClick={() => setDeleting([draft])} title="Delete draft">
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Paper>
              ))}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_event, value) => updateUrl({ page: value })}
                    color="primary"
                    shape="rounded"
                  />
                </Box>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                {total} draft{total === 1 ? '' : 's'}
                {isFiltered ? ' match' : ''}
              </Typography>
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
        <DialogTitle>
          {deleting && deleting.length > 1 ? `Delete ${deleting.length} drafts?` : 'Delete this draft?'}
        </DialogTitle>
        <DialogContent>
          {deleting?.length === 1 ? (
            <Typography variant="body2" color="text.secondary" noWrap>
              {deleting[0].text || '(no text)'}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              The selected drafts are deleted permanently.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleting(null)} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error" disabled={working} sx={{ borderRadius: 2 }}>
            {deleting && deleting.length > 1 ? `Delete ${deleting.length}` : 'Delete'}
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
