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
  IconButton,
  Tooltip,
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
  Tabs,
  Tab,
  Fade,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatIcon from '@mui/icons-material/Chat';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScienceIcon from '@mui/icons-material/Science';
import { useAiProviders } from '@/hooks/useAiProviders';
import { useAiPrompts } from '@/hooks/useAiPrompts';
import { COMMON_BASE_URLS } from '@/types/ai';
import type { AiProvider, AiPrompt } from '@/types/ai';
import { fetchWithAuth } from '@/lib/fetch';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AiPage() {
  const [tabValue, setTabValue] = useState(0);

  // Providers state
  const { providers, loading: providersLoading, error: providersError, addProvider, updateProvider, deleteProvider, clearError: clearProvidersError } = useAiProviders();
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(null);
  const [providerFormData, setProviderFormData] = useState({ name: '', api_key: '', base_url: '', model: '' });
  const [baseUrlPreset, setBaseUrlPreset] = useState('');
  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [confirmDeleteProvider, setConfirmDeleteProvider] = useState<{ open: boolean; provider: AiProvider | null }>({ open: false, provider: null });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Prompts state
  const { prompts, loading: promptsLoading, refetch: refetchPrompts } = useAiPrompts();
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<AiPrompt | null>(null);
  const [promptFormData, setPromptFormData] = useState({ title: '', prompt: '', provider_id: null as number | null });
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [confirmDeletePrompt, setConfirmDeletePrompt] = useState<{ open: boolean; prompt: AiPrompt | null }>({ open: false, prompt: null });
  const [promptError, setPromptError] = useState<string | null>(null);

  // Test prompt state
  const [testPromptDialog, setTestPromptDialog] = useState<{ open: boolean; prompt: AiPrompt | null }>({ open: false, prompt: null });
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [isTestingPrompt, setIsTestingPrompt] = useState(false);
  const [testPromptError, setTestPromptError] = useState<string | null>(null);

  // Provider handlers
  const handleOpenProviderDialog = (provider?: AiProvider) => {
    setTestResult(null);
    if (provider) {
      setEditingProvider(provider);
      setProviderFormData({ name: provider.name, api_key: '', base_url: provider.base_url, model: provider.model });
      const preset = COMMON_BASE_URLS.find((p) => p.value === provider.base_url);
      setBaseUrlPreset(preset ? preset.value : '');
    } else {
      setEditingProvider(null);
      setProviderFormData({ name: '', api_key: '', base_url: '', model: '' });
      setBaseUrlPreset('');
    }
    setProviderDialogOpen(true);
  };

  const handleCloseProviderDialog = () => {
    setProviderDialogOpen(false);
    setEditingProvider(null);
    setTestResult(null);
    clearProvidersError();
  };

  const handlePresetChange = (value: string) => {
    setBaseUrlPreset(value);
    if (value) {
      setProviderFormData((prev) => ({ ...prev, base_url: value }));
    }
  };

  const handleTestProvider = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await fetchWithAuth('/api/ai/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: providerFormData.api_key,
          base_url: providerFormData.base_url,
          model: providerFormData.model,
        }),
      });
      const data = await response.json();
      setTestResult({ success: data.success, message: data.success ? 'Connection successful!' : data.error });
    } catch (err) {
      setTestResult({ success: false, message: (err as Error).message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveProvider = async () => {
    setIsSavingProvider(true);
    let success: boolean;

    if (editingProvider) {
      const updates: Record<string, string> = {};
      if (providerFormData.name !== editingProvider.name) updates.name = providerFormData.name;
      if (providerFormData.api_key) updates.api_key = providerFormData.api_key;
      if (providerFormData.base_url !== editingProvider.base_url) updates.base_url = providerFormData.base_url;
      if (providerFormData.model !== editingProvider.model) updates.model = providerFormData.model;
      success = await updateProvider(editingProvider.id, updates);
    } else {
      success = await addProvider(providerFormData);
    }

    setIsSavingProvider(false);
    if (success) {
      handleCloseProviderDialog();
    }
  };

  const handleDeleteProvider = async () => {
    if (!confirmDeleteProvider.provider) return;
    await deleteProvider(confirmDeleteProvider.provider.id);
    setConfirmDeleteProvider({ open: false, provider: null });
    refetchPrompts();
  };

  // Prompt handlers
  const handleOpenPromptDialog = (prompt?: AiPrompt) => {
    setPromptError(null);
    if (prompt) {
      setEditingPrompt(prompt);
      setPromptFormData({ title: prompt.title, prompt: prompt.prompt, provider_id: prompt.provider_id });
    } else {
      setEditingPrompt(null);
      setPromptFormData({ title: '', prompt: '', provider_id: null });
    }
    setPromptDialogOpen(true);
  };

  const handleClosePromptDialog = () => {
    setPromptDialogOpen(false);
    setEditingPrompt(null);
    setPromptError(null);
  };

  const handleSavePrompt = async () => {
    if (!promptFormData.title.trim() || !promptFormData.prompt.trim()) {
      setPromptError('Title and prompt content are required.');
      return;
    }

    setIsSavingPrompt(true);
    setPromptError(null);

    try {
      const method = editingPrompt ? 'PUT' : 'POST';
      const body = editingPrompt
        ? { id: editingPrompt.id, title: promptFormData.title, prompt: promptFormData.prompt, provider_id: promptFormData.provider_id }
        : { title: promptFormData.title, prompt: promptFormData.prompt, provider_id: promptFormData.provider_id };

      const response = await fetchWithAuth('/api/ai/prompts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save prompt');
      }

      refetchPrompts();
      handleClosePromptDialog();
    } catch (err) {
      setPromptError((err as Error).message);
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleDeletePrompt = async () => {
    if (!confirmDeletePrompt.prompt) return;

    try {
      const response = await fetchWithAuth('/api/ai/prompts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmDeletePrompt.prompt.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete prompt');
      }

      refetchPrompts();
    } catch (err) {
      setPromptError((err as Error).message);
    } finally {
      setConfirmDeletePrompt({ open: false, prompt: null });
    }
  };

  // Test prompt handlers
  const handleOpenTestPromptDialog = (prompt: AiPrompt) => {
    setTestPromptDialog({ open: true, prompt });
    setTestInput('');
    setTestOutput('');
    setTestPromptError(null);
  };

  const handleCloseTestPromptDialog = () => {
    setTestPromptDialog({ open: false, prompt: null });
    setTestInput('');
    setTestOutput('');
    setTestPromptError(null);
  };

  const handleTestPrompt = async () => {
    if (!testPromptDialog.prompt || !testInput.trim()) return;

    setIsTestingPrompt(true);
    setTestPromptError(null);
    setTestOutput('');

    try {
      const response = await fetchWithAuth('/api/ai/prompts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_id: testPromptDialog.prompt.id,
          input: testInput.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to test prompt');
      }

      setTestOutput(data.result);
    } catch (err) {
      setTestPromptError((err as Error).message);
    } finally {
      setIsTestingPrompt(false);
    }
  };

  const loading = providersLoading || promptsLoading;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, rgba(25,118,210,0.05) 0%, rgba(255,255,255,0) 50%)',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        {/* Header */}
        <Fade in timeout={600}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #1877f2 0%, #E1306C 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AutoAwesomeIcon sx={{ color: '#fff', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{
                    background: 'linear-gradient(90deg, #1877f2, #E1306C, #F77737)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  AI Tools
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure AI providers and prompts for content transformation
                </Typography>
              </Box>
            </Box>
          </Box>
        </Fade>

        {/* Tabs */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  minHeight: 56,
                },
                '& .Mui-selected': {
                  color: '#E1306C',
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#E1306C',
                },
              }}
            >
              <Tab icon={<SettingsIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Providers" />
              <Tab icon={<ChatIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Prompts" />
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>
            {/* Providers Tab */}
            <TabPanel value={tabValue} index={0}>
              {providersError && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={clearProvidersError}>
                  <AlertTitle>Error</AlertTitle>
                  {providersError}
                </Alert>
              )}

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure AI providers to power your content transformations. Supports any OpenAI-compatible API including OpenAI, Claude, Gemini, and local models like Ollama.
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 3 }}>
                <Button
                  variant="contained"
                  onClick={() => handleOpenProviderDialog()}
                  startIcon={<AddIcon />}
                  sx={{
                    textTransform: 'none',
                    borderRadius: 2,
                    background: 'linear-gradient(90deg, #1877f2 0%, #E1306C 100%)',
                    '&:hover': {
                      background: 'linear-gradient(90deg, #155eaf 0%, #c02a5c 100%)',
                    },
                  }}
                >
                  Add Provider
                </Button>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : providers.length === 0 ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    borderRadius: 3,
                    border: '2px dashed',
                    borderColor: 'divider',
                    bgcolor: 'grey.50',
                  }}
                >
                  <SettingsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No providers configured
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add an AI provider to enable content transformation.
                  </Typography>
                </Paper>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {providers.map((provider) => (
                    <Paper
                      key={provider.id}
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: '#E1306C50',
                          boxShadow: '0 4px 12px rgba(225,48,108,0.1)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 2,
                              bgcolor: '#E1306C15',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <SettingsIcon sx={{ color: '#E1306C', fontSize: 20 }} />
                          </Box>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="subtitle1" fontWeight={600} noWrap>
                                {provider.name}
                              </Typography>
                              <Chip label={provider.model} size="small" sx={{ height: 22, fontSize: '0.7rem' }} />
                            </Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '100%',
                              }}
                            >
                              {provider.base_url}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ flexShrink: 0, display: 'flex' }}>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpenProviderDialog(provider)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => setConfirmDeleteProvider({ open: true, provider })} sx={{ color: '#ef4444' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </TabPanel>

            {/* Prompts Tab */}
            <TabPanel value={tabValue} index={1}>
              {promptError && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setPromptError(null)}>
                  <AlertTitle>Error</AlertTitle>
                  {promptError}
                </Alert>
              )}

              {providers.length === 0 && (
                <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                  <AlertTitle>No AI Providers</AlertTitle>
                  Add an AI provider first to enable content transformation.{' '}
                  <Typography
                    component="span"
                    sx={{ cursor: 'pointer', textDecoration: 'underline', color: 'primary.main' }}
                    onClick={() => setTabValue(0)}
                  >
                    Go to Providers
                  </Typography>
                </Alert>
              )}

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create prompts to transform your content before publishing. Each prompt can be linked to a specific AI provider.
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 3 }}>
                <Button
                  variant="contained"
                  onClick={() => handleOpenPromptDialog()}
                  startIcon={<AddIcon />}
                  sx={{
                    textTransform: 'none',
                    borderRadius: 2,
                    background: 'linear-gradient(90deg, #1877f2 0%, #E1306C 100%)',
                    '&:hover': {
                      background: 'linear-gradient(90deg, #155eaf 0%, #c02a5c 100%)',
                    },
                  }}
                >
                  Add Prompt
                </Button>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : prompts.length === 0 ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    borderRadius: 3,
                    border: '2px dashed',
                    borderColor: 'divider',
                    bgcolor: 'grey.50',
                  }}
                >
                  <ChatIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No prompts created
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create a prompt to start transforming your content.
                  </Typography>
                </Paper>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {prompts.map((prompt) => (
                    <Paper
                      key={prompt.id}
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: '#E1306C50',
                          boxShadow: '0 4px 12px rgba(225,48,108,0.1)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 2,
                              bgcolor: '#1877f215',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <ChatIcon sx={{ color: '#1877f2', fontSize: 20 }} />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {prompt.title}
                              </Typography>
                              {prompt.provider_name ? (
                                <Chip label={prompt.provider_name} size="small" color="primary" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                              ) : (
                                <Chip label="No provider" size="small" color="warning" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                              )}
                            </Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {prompt.prompt}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ flexShrink: 0 }}>
                          <Tooltip title={prompt.provider_id ? "Test Prompt" : "No provider - cannot test"}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenTestPromptDialog(prompt)}
                                disabled={!prompt.provider_id}
                                sx={{ color: prompt.provider_id ? '#10b981' : undefined }}
                              >
                                <ScienceIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpenPromptDialog(prompt)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => setConfirmDeletePrompt({ open: true, prompt })} sx={{ color: '#ef4444' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </TabPanel>
          </Box>
        </Paper>
      </Container>

      {/* Provider Add/Edit Dialog */}
      <Dialog open={providerDialogOpen} onClose={handleCloseProviderDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: '#E1306C15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SettingsIcon sx={{ color: '#E1306C' }} />
            </Box>
            <Typography variant="h6" fontWeight={600}>
              {editingProvider ? 'Edit Provider' : 'Add New Provider'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {editingProvider ? 'Update the provider configuration. Leave API key blank to keep existing.' : 'Enter the details for your AI provider. Test the connection before saving.'}
          </DialogContentText>
          <TextField
            autoFocus
            label="Provider Name"
            fullWidth
            variant="outlined"
            value={providerFormData.name}
            onChange={(e) => setProviderFormData((prev) => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2 }}
            placeholder="e.g., My OpenAI, Claude Sonnet"
          />
          <TextField
            label={editingProvider ? 'API Key (leave blank to keep existing)' : 'API Key'}
            type="password"
            fullWidth
            variant="outlined"
            value={providerFormData.api_key}
            onChange={(e) => setProviderFormData((prev) => ({ ...prev, api_key: e.target.value }))}
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
            value={providerFormData.base_url}
            onChange={(e) => setProviderFormData((prev) => ({ ...prev, base_url: e.target.value }))}
            sx={{ mb: 2 }}
            placeholder="https://api.openai.com/v1"
          />
          <TextField
            label="Model"
            fullWidth
            variant="outlined"
            value={providerFormData.model}
            onChange={(e) => setProviderFormData((prev) => ({ ...prev, model: e.target.value }))}
            placeholder="e.g., gpt-4o, claude-3-sonnet-20240229"
          />

          {/* Test Connection Result */}
          {testResult && (
            <Alert
              severity={testResult.success ? 'success' : 'error'}
              sx={{ mt: 2, borderRadius: 2 }}
              icon={testResult.success ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
            >
              {testResult.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseProviderDialog} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleTestProvider}
            variant="outlined"
            disabled={isTesting || !providerFormData.api_key || !providerFormData.base_url || !providerFormData.model}
            startIcon={isTesting ? <CircularProgress size={18} /> : <PlayArrowIcon />}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button
            onClick={handleSaveProvider}
            variant="contained"
            disabled={isSavingProvider || !providerFormData.name || (!editingProvider && !providerFormData.api_key) || !providerFormData.base_url || !providerFormData.model}
            startIcon={isSavingProvider ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              background: 'linear-gradient(90deg, #1877f2 0%, #E1306C 100%)',
              '&:hover': {
                background: 'linear-gradient(90deg, #155eaf 0%, #c02a5c 100%)',
              },
            }}
          >
            {isSavingProvider ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Provider Delete Confirmation */}
      <Dialog open={confirmDeleteProvider.open} onClose={() => setConfirmDeleteProvider({ open: false, provider: null })} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#ef444415', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DeleteIcon sx={{ color: '#ef4444' }} />
            </Box>
            <Typography variant="h6" fontWeight={600}>
              Delete Provider
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete &quot;{confirmDeleteProvider.provider?.name}&quot;? Prompts using this provider will become inactive.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setConfirmDeleteProvider({ open: false, provider: null })} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={handleDeleteProvider} variant="contained" sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Prompt Add/Edit Dialog */}
      <Dialog open={promptDialogOpen} onClose={handleClosePromptDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: '#1877f215',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChatIcon sx={{ color: '#1877f2' }} />
            </Box>
            <Typography variant="h6" fontWeight={600}>
              {editingPrompt ? 'Edit Prompt' : 'Add New Prompt'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Prompt Title"
            fullWidth
            variant="outlined"
            value={promptFormData.title}
            onChange={(e) => setPromptFormData((prev) => ({ ...prev, title: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
            placeholder="e.g., Shorten for Twitter, Professional Tone"
          />
          <TextField
            label="Prompt Content"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={promptFormData.prompt}
            onChange={(e) => setPromptFormData((prev) => ({ ...prev, prompt: e.target.value }))}
            sx={{ mb: 2 }}
            placeholder="e.g., Rewrite this content in a professional tone while keeping the main message..."
          />
          <FormControl fullWidth>
            <InputLabel>AI Provider</InputLabel>
            <Select
              value={promptFormData.provider_id || ''}
              label="AI Provider"
              onChange={(e) => setPromptFormData((prev) => ({ ...prev, provider_id: e.target.value ? Number(e.target.value) : null }))}
            >
              <MenuItem value="">None (Template only)</MenuItem>
              {providers.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name} ({p.model})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {promptError && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {promptError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClosePromptDialog} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSavePrompt}
            variant="contained"
            disabled={isSavingPrompt || !promptFormData.title.trim() || !promptFormData.prompt.trim()}
            startIcon={isSavingPrompt ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              background: 'linear-gradient(90deg, #1877f2 0%, #E1306C 100%)',
              '&:hover': {
                background: 'linear-gradient(90deg, #155eaf 0%, #c02a5c 100%)',
              },
            }}
          >
            {isSavingPrompt ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Prompt Delete Confirmation */}
      <Dialog open={confirmDeletePrompt.open} onClose={() => setConfirmDeletePrompt({ open: false, prompt: null })} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#ef444415', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DeleteIcon sx={{ color: '#ef4444' }} />
            </Box>
            <Typography variant="h6" fontWeight={600}>
              Delete Prompt
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete &quot;{confirmDeletePrompt.prompt?.title}&quot;? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setConfirmDeletePrompt({ open: false, prompt: null })} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={handleDeletePrompt} variant="contained" sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Prompt Dialog */}
      <Dialog
        open={testPromptDialog.open}
        onClose={handleCloseTestPromptDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: '#10b98115',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ScienceIcon sx={{ color: '#10b981' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Test Prompt
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {testPromptDialog.prompt?.title}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Prompt Template:
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {testPromptDialog.prompt?.prompt}
            </Typography>
          </Box>

          <TextField
            label="Your Input"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Enter the content you want to transform with this prompt..."
            sx={{ mb: 2 }}
          />

          {testPromptError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {testPromptError}
            </Alert>
          )}

          {testOutput && (
            <Box sx={{ p: 2, bgcolor: '#10b98110', borderRadius: 2, border: '1px solid', borderColor: '#10b98130' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                AI Output:
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {testOutput}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseTestPromptDialog} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Close
          </Button>
          <Button
            onClick={handleTestPrompt}
            variant="contained"
            disabled={isTestingPrompt || !testInput.trim()}
            startIcon={isTestingPrompt ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              bgcolor: '#10b981',
              '&:hover': { bgcolor: '#059669' },
            }}
          >
            {isTestingPrompt ? 'Testing...' : 'Run Test'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
