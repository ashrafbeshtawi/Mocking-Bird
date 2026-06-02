'use client';

import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  IconButton,
  Popover,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { usePublishTemplates, type PublishTemplate } from '@/hooks/usePublishTemplates';

interface TemplatePickerProps {
  onTemplateSelect: (text: string) => void;
  onOpen?: () => void;
}

export function TemplatePicker({ onTemplateSelect, onOpen }: TemplatePickerProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  const {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = usePublishTemplates();

  const open = Boolean(anchorEl);
  const popoverId = open ? 'template-popover' : undefined;

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    onOpen?.();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleSelect = (template: PublishTemplate) => {
    onTemplateSelect(template.content);
    handleClose();
  };

  const handleManageOpen = () => {
    handleClose();
    setManageOpen(true);
  };

  return (
    <>
      <Tooltip title="Insert template">
        <IconButton
          aria-describedby={popoverId}
          onClick={handleOpen}
          color="primary"
        >
          <DescriptionIcon />
        </IconButton>
      </Tooltip>

      <Popover
        id={popoverId}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableRestoreFocus
      >
        <Box sx={{ width: 360, maxHeight: 420, display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              Templates
            </Typography>
            <Button
              size="small"
              startIcon={<SettingsIcon fontSize="small" />}
              onClick={handleManageOpen}
              sx={{ textTransform: 'none' }}
            >
              Manage
            </Button>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={20} />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ m: 1 }}>
                {error}
              </Alert>
            ) : templates.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3, px: 2, color: 'text.secondary' }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  No templates yet
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon fontSize="small" />}
                  onClick={handleManageOpen}
                  sx={{ textTransform: 'none' }}
                >
                  Create your first template
                </Button>
              </Box>
            ) : (
              <List dense disablePadding>
                {templates.map((template) => (
                  <ListItemButton
                    key={template.id}
                    onClick={() => handleSelect(template)}
                    sx={{ alignItems: 'flex-start', py: 1 }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={500} noWrap>
                          {template.title}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {template.content}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </Box>
      </Popover>

      <ManageTemplatesDialog
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        templates={templates}
        loading={loading}
        onCreate={createTemplate}
        onUpdate={updateTemplate}
        onDelete={deleteTemplate}
      />
    </>
  );
}

interface ManageTemplatesDialogProps {
  open: boolean;
  onClose: () => void;
  templates: PublishTemplate[];
  loading: boolean;
  onCreate: (title: string, content: string) => Promise<PublishTemplate>;
  onUpdate: (id: number, title: string, content: string) => Promise<PublishTemplate>;
  onDelete: (id: number) => Promise<void>;
}

function ManageTemplatesDialog({
  open,
  onClose,
  templates,
  loading,
  onCreate,
  onUpdate,
  onDelete,
}: ManageTemplatesDialogProps) {
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setFormError(null);
  }, []);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleStartNew = () => {
    setEditingId('new');
    setTitle('');
    setContent('');
    setFormError(null);
  };

  const handleStartEdit = (template: PublishTemplate) => {
    setEditingId(template.id);
    setTitle(template.title);
    setContent(template.content);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setFormError('Title and content are required.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editingId === 'new') {
        await onCreate(title.trim(), content);
      } else if (typeof editingId === 'number') {
        await onUpdate(editingId, title.trim(), content);
      }
      resetForm();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this template? This cannot be undone.')) return;
    try {
      await onDelete(id);
      if (editingId === id) resetForm();
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const isEditing = editingId !== null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DescriptionIcon color="primary" />
        Manage Templates
        <IconButton onClick={handleClose} sx={{ ml: 'auto' }} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {!isEditing && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleStartNew}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              New template
            </Button>
          </Box>
        )}

        {isEditing && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {editingId === 'new' ? 'New template' : 'Edit template'}
            </Typography>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 1.5 }}
              disabled={saving}
            />
            <TextField
              label="Content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              fullWidth
              multiline
              minRows={4}
              maxRows={10}
              disabled={saving}
            />
            {formError && (
              <Alert severity="error" sx={{ mt: 1.5 }}>
                {formError}
              </Alert>
            )}
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="text"
                onClick={resetForm}
                disabled={saving}
                sx={{ textTransform: 'none' }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        )}

        {!isEditing && <Divider sx={{ mb: 1 }} />}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={20} />
          </Box>
        ) : templates.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', py: 3 }}
          >
            You don&apos;t have any templates yet.
          </Typography>
        ) : (
          <List dense disablePadding>
            {templates.map((template) => (
              <Box
                key={template.id}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  py: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={500} noWrap>
                    {template.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {template.content}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleStartEdit(template)}
                    aria-label="Edit template"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(template.id)}
                    aria-label="Delete template"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none' }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
