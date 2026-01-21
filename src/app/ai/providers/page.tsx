'use client';

import React, { useState } from 'react';
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { useAiProviders } from '@/hooks/useAiProviders';
import { COMMON_BASE_URLS } from '@/types/ai';
import type { AiProvider } from '@/types/ai';

export default function AiProvidersPage() {
  const theme = useTheme();
  const { providers, loading, error, addProvider, updateProvider, deleteProvider, clearError } = useAiProviders();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(null);
  const [formData, setFormData] = useState({ name: '', api_key: '', base_url: '', model: '' });
  const [baseUrlPreset, setBaseUrlPreset] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; provider: AiProvider | null }>({ open: false, provider: null });

  const handleOpenDialog = (provider?: AiProvider) => {
    if (provider) {
      setEditingProvider(provider);
      setFormData({ name: provider.name, api_key: '', base_url: provider.base_url, model: provider.model });
      const preset = COMMON_BASE_URLS.find((p) => p.value === provider.base_url);
      setBaseUrlPreset(preset ? preset.value : '');
    } else {
      setEditingProvider(null);
      setFormData({ name: '', api_key: '', base_url: '', model: '' });
      setBaseUrlPreset('');
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProvider(null);
    clearError();
  };

  const handlePresetChange = (value: string) => {
    setBaseUrlPreset(value);
    if (value) {
      setFormData((prev) => ({ ...prev, base_url: value }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    let success: boolean;

    if (editingProvider) {
      const updates: Record<string, string> = {};
      if (formData.name !== editingProvider.name) updates.name = formData.name;
      if (formData.api_key) updates.api_key = formData.api_key;
      if (formData.base_url !== editingProvider.base_url) updates.base_url = formData.base_url;
      if (formData.model !== editingProvider.model) updates.model = formData.model;
      success = await updateProvider(editingProvider.id, updates);
    } else {
      success = await addProvider(formData);
    }

    setIsSaving(false);
    if (success) {
      handleCloseDialog();
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete.provider) return;
    await deleteProvider(confirmDelete.provider.id);
    setConfirmDelete({ open: false, provider: null });
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
        AI Providers
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Configure AI providers to power your content transformations. Supports any OpenAI-compatible API including OpenAI, Claude, Gemini, and local models like Ollama.
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 4 }}>
        <Button variant="contained" color="primary" onClick={() => handleOpenDialog()} startIcon={<AddIcon />} sx={{ textTransform: 'none' }}>
          Add Provider
        </Button>
      </Box>

      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Your AI Providers
        </Typography>
        {providers.length === 0 ? (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            No providers configured yet. Click &quot;Add Provider&quot; to get started.
          </Typography>
        ) : (
          <List>
            {providers.map((provider) => (
              <Box key={provider.id}>
                <ListItem
                  secondaryAction={
                    <Box>
                      <Tooltip title="Edit">
                        <IconButton edge="end" onClick={() => handleOpenDialog(provider)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton edge="end" onClick={() => setConfirmDelete({ open: true, provider })}>
                          <DeleteIcon color="error" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {provider.name}
                        </Typography>
                        <Chip label={provider.model} size="small" variant="outlined" />
                      </Box>
                    }
                    secondary={provider.base_url}
                  />
                </ListItem>
                <Divider component="li" />
              </Box>
            ))}
          </List>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingProvider ? 'Edit Provider' : 'Add New Provider'}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {editingProvider ? 'Update the provider configuration. Leave API key blank to keep existing.' : 'Enter the details for your AI provider.'}
          </DialogContentText>
          <TextField
            autoFocus
            label="Provider Name"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2 }}
            placeholder="e.g., My OpenAI, Claude Sonnet"
          />
          <TextField
            label={editingProvider ? 'API Key (leave blank to keep existing)' : 'API Key'}
            type="password"
            fullWidth
            variant="outlined"
            value={formData.api_key}
            onChange={(e) => setFormData((prev) => ({ ...prev, api_key: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Base URL Preset</InputLabel>
            <Select value={baseUrlPreset} label="Base URL Preset" onChange={(e) => handlePresetChange(e.target.value)}>
              {COMMON_BASE_URLS.map((preset) => (
                <MenuItem key={preset.label} value={preset.value}>
                  {preset.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Base URL"
            fullWidth
            variant="outlined"
            value={formData.base_url}
            onChange={(e) => setFormData((prev) => ({ ...prev, base_url: e.target.value }))}
            sx={{ mb: 2 }}
            placeholder="https://api.openai.com/v1"
          />
          <TextField
            label="Model"
            fullWidth
            variant="outlined"
            value={formData.model}
            onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
            placeholder="e.g., gpt-4o, claude-3-sonnet-20240229"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isSaving || !formData.name || (!editingProvider && !formData.api_key) || !formData.base_url || !formData.model}
            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, provider: null })}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete &quot;{confirmDelete.provider?.name}&quot;? Prompts using this provider will become inactive.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete({ open: false, provider: null })}>Cancel</Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
