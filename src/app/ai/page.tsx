'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Alert,
  AlertTitle,
  useTheme,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { fetchWithAuth } from '@/lib/fetch';

// Interface for a single AI prompt
interface AiPrompt {
  id: number;
  title: string;
  prompt: string;
  created_at: string;
}

export default function AiPromptsComponent() {
  const theme = useTheme();
  const [prompts, setPrompts] = useState<AiPrompt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [addPromptDialogOpen, setAddPromptDialogOpen] = useState<boolean>(false);
  const [newPromptTitle, setNewPromptTitle] = useState<string>('');
  const [newPromptContent, setNewPromptContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editingPromptId, setEditingPromptId] = useState<number | null>(null);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [editedPrompt, setEditedPrompt] = useState<string>('');
  const [openConfirmDialog, setOpenConfirmDialog] = useState<boolean>(false);
  const [promptToDeleteId, setPromptToDeleteId] = useState<number | null>(null);
  const [promptToDeleteTitle, setPromptToDeleteTitle] = useState<string>('');


  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth('/api/ai/prompts');
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch AI prompts.');
      }
      const result = await response.json();
      setPrompts(result.prompts || []);
    } catch (err: unknown) {
      console.error('Error fetching prompts:', err);
      setError((err as Error)?.message || 'An unexpected error occurred while fetching prompts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const handleOpenAddDialog = () => {
    setAddPromptDialogOpen(true);
    setNewPromptTitle('');
    setNewPromptContent('');
    setError(null);
  };

  const handleCloseAddDialog = () => {
    setAddPromptDialogOpen(false);
  };

  const handleAddPrompt = async () => {
    if (newPromptTitle.trim() === '' || newPromptContent.trim() === '') {
      setError('Title and prompt content cannot be empty.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetchWithAuth('/api/ai/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newPromptTitle, prompt: newPromptContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add prompt.');
      }

      handleCloseAddDialog();
      fetchPrompts(); // Refresh the list
    } catch (err: unknown) {
      console.error('Error adding prompt:', err);
      setError((err as Error)?.message || 'An unexpected error occurred while adding the prompt.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePrompt = (id: number, title: string) => {
    setPromptToDeleteId(id);
    setPromptToDeleteTitle(title);
    setOpenConfirmDialog(true);
  };

  const confirmDelete = async () => {
    if (!promptToDeleteId) return;

    setOpenConfirmDialog(false);
    setError(null);

    try {
      const response = await fetchWithAuth('/api/ai/prompts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: promptToDeleteId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete prompt.');
      }

      fetchPrompts(); // Refresh the list
    } catch (err: unknown) {
      console.error('Error deleting prompt:', err);
      setError((err as Error)?.message || 'An unexpected error occurred while deleting the prompt.');
    } finally {
      setPromptToDeleteId(null);
      setPromptToDeleteTitle('');
    }
  };

  const handleCloseDialog = () => {
    setOpenConfirmDialog(false);
    setPromptToDeleteId(null);
    setPromptToDeleteTitle('');
  };

  const handleEditClick = (prompt: AiPrompt) => {
    setEditingPromptId(prompt.id);
    setEditedTitle(prompt.title);
    setEditedPrompt(prompt.prompt);
  };

  const handleSaveEdit = async () => {
    if (editedTitle.trim() === '' || editedPrompt.trim() === '') {
      setError('Title and prompt content cannot be empty.');
      return;
    }

    try {
      const response = await fetchWithAuth('/api/ai/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingPromptId, title: editedTitle, prompt: editedPrompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update prompt.');
      }

      setEditingPromptId(null);
      fetchPrompts(); // Refresh the list
    } catch (err: unknown) {
      console.error('Error updating prompt:', err);
      setError((err as Error)?.message || 'An unexpected error occurred while updating the prompt.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: theme.typography.fontWeightBold, mb: 3 }}>
        AI Prompts
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        These saved AI prompts can be used to configure custom content for specific pages/accounts, where the original post is transformed using an AI model according to your prompt. For example, you can create a prompt to &quot;Summarize the content in 100 characters&quot; or &quot;Rewrite the post in a professional tone.&quot;
      </Typography>

      {/* "Add Prompt" Button - Top Left Position */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 4 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenAddDialog}
          startIcon={<AddIcon />}
          sx={{ textTransform: 'none' }}
        >
          Add Prompt
        </Button>
      </Box>

      {/* List of Existing Prompts */}
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Your Saved Prompts
        </Typography>
        {prompts.length === 0 ? (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            You haven&apos;t saved any prompts yet. Click the &quot;Add Prompt&quot; button to get started.
          </Typography>
        ) : (
          <List>
            {prompts.map((prompt) => (
              <Box key={prompt.id}>
                {editingPromptId === prompt.id ? (
                  <Box sx={{ my: 2 }}>
                    <TextField
                      label="Edit Title"
                      fullWidth
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      label="Edit Content"
                      multiline
                      rows={4}
                      fullWidth
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSaveEdit}
                      startIcon={<SaveIcon />}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => setEditingPromptId(null)}
                      sx={{ ml: 2 }}
                    >
                      Cancel
                    </Button>
                  </Box>
                ) : (
                  <ListItem
                    secondaryAction={
                      <Box>
                        <Tooltip title="Edit">
                          <IconButton edge="end" aria-label="edit" onClick={() => handleEditClick(prompt)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton edge="end" aria-label="delete" onClick={() => handleDeletePrompt(prompt.id, prompt.title)}>
                            <DeleteIcon color="error" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight="bold">
                          {prompt.title}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ whiteSpace: 'pre-wrap' }}
                        >
                          {prompt.prompt}
                        </Typography>
                      }
                    />
                  </ListItem>
                )}
                <Divider component="li" />
              </Box>
            ))}
          </List>
        )}
      </Paper>

      {/* Add Prompt Dialog */}
      <Dialog open={addPromptDialogOpen} onClose={handleCloseAddDialog}>
        <DialogTitle>Add New Prompt</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter a title and the content for your new AI prompt.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Prompt Title"
            type="text"
            fullWidth
            variant="outlined"
            value={newPromptTitle}
            onChange={(e) => setNewPromptTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Prompt Content"
            type="text"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={newPromptContent}
            onChange={(e) => setNewPromptContent(e.target.value)}
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog} color="secondary">Cancel</Button>
          <Button
            onClick={handleAddPrompt}
            variant="contained"
            color="primary"
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          >
            {isSaving ? 'Saving...' : 'Save Prompt'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={openConfirmDialog}
        onClose={handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirm Deletion"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete the prompt &quot;{promptToDeleteTitle}&quot;? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}