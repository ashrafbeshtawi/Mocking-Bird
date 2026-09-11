'use client';

import React, { useState } from 'react';
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
  TextField,
  FormControlLabel,
  Checkbox,
  FormGroup,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { PageHeader } from '@/components/PageHeader';
import { getPlatformConfig } from '@/lib/platformConfig';
import { useDrafts, type Draft } from '@/hooks/useDrafts';
import { PLATFORMS, type Platform } from '@/types/accounts';

export default function DraftsPage() {
  const { drafts, total, loading, error, updateDraft, deleteDraft } = useDrafts();

  const [editing, setEditing] = useState<Draft | null>(null);
  const [editText, setEditText] = useState('');
  const [editTargets, setEditTargets] = useState<Platform[]>([]);
  const [deleting, setDeleting] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const openEdit = (draft: Draft) => {
    setEditing(draft);
    setEditText(draft.text);
    setEditTargets(draft.target_platforms);
  };

  const toggleTarget = (platform: Platform) => {
    setEditTargets((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateDraft(editing.id, {
        text: editText,
        target_platforms: editTargets,
        media: editing.media,
      });
      setEditing(null);
      setSnackbar({ open: true, message: 'Draft updated', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await deleteDraft(deleting.id);
      setDeleting(null);
      setSnackbar({ open: true, message: 'Draft deleted', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
    } finally {
      setSaving(false);
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
          lead="Posts you saved for later. Edit, retarget or delete them here."
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
                    <IconButton size="small" onClick={() => openEdit(draft)} title="Edit draft">
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

      {/* Edit dialog */}
      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 1 }}>
          Edit draft
          <IconButton onClick={() => setEditing(null)} sx={{ ml: 'auto' }} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            multiline
            minRows={4}
            maxRows={12}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="What do you want to say?"
            sx={{ mb: 2 }}
          />
          <Typography variant="overline" color="text.secondary">
            Target platforms
          </Typography>
          <FormGroup row>
            {PLATFORMS.map((platform) => {
              const config = getPlatformConfig(platform);
              return (
                <FormControlLabel
                  key={platform}
                  control={
                    <Checkbox
                      size="small"
                      checked={editTargets.includes(platform)}
                      onChange={() => toggleTarget(platform)}
                    />
                  }
                  label={config?.label ?? platform}
                />
              );
            })}
          </FormGroup>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditing(null)} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={saving || (!editText.trim() && (editing?.media?.length ?? 0) === 0)}
            sx={{ borderRadius: 2 }}
          >
            {saving ? 'Saving...' : 'Save'}
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
          <Button onClick={handleConfirmDelete} variant="contained" color="error" disabled={saving} sx={{ borderRadius: 2 }}>
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
