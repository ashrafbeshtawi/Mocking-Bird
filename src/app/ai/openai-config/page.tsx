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
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { fetchWithAuth } from '@/lib/fetch';

export default function OpenAiConfigPage() {
  const theme = useTheme();
  const [openAiApiKey, setOpenAiApiKey] = useState<string>('');
  const [isSavingApiKey, setIsSavingApiKey] = useState<boolean>(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [apiKeySuccess, setApiKeySuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchOpenAiApiKey = useCallback(async () => {
    setLoading(true);
    setApiKeyError(null);
    setApiKeySuccess(null);
    try {
      const response = await fetchWithAuth('/api/ai/openai-key');
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch OpenAI API key.');
      }
      const result = await response.json();
      setOpenAiApiKey(result.apiKey || '');
    } catch (err: unknown) {
      console.error('Error fetching OpenAI API key:', err);
      setApiKeyError((err as Error)?.message || 'An unexpected error occurred while fetching the API key.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpenAiApiKey();
  }, [fetchOpenAiApiKey]);

  const handleSaveOpenAiApiKey = async () => {
    if (openAiApiKey.trim() === '') {
      setApiKeyError('API Key cannot be empty.');
      setApiKeySuccess(null);
      return;
    }

    setIsSavingApiKey(true);
    setApiKeyError(null);
    setApiKeySuccess(null);

    try {
      const response = await fetchWithAuth('/api/ai/openai-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: openAiApiKey }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save OpenAI API key.');
      }

      setApiKeySuccess('OpenAI API Key saved successfully!');
    } catch (err: unknown) {
      console.error('Error saving OpenAI API key:', err);
      setApiKeyError((err as Error)?.message || 'An unexpected error occurred while saving the API key.');
    } finally {
      setIsSavingApiKey(false);
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
        OpenAI Configuration
      </Typography>

      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          OpenAI API Key
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter your OpenAI API key to enable AI functionalities. Your key will be securely stored.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="OpenAI API Key"
            type="password"
            fullWidth
            variant="outlined"
            value={openAiApiKey}
            onChange={(e) => setOpenAiApiKey(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveOpenAiApiKey}
            disabled={isSavingApiKey}
            startIcon={isSavingApiKey ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          >
            {isSavingApiKey ? 'Saving...' : 'Save Key'}
          </Button>
        </Box>
        {apiKeyError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {apiKeyError}
          </Alert>
        )}
        {apiKeySuccess && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <AlertTitle>Success</AlertTitle>
            {apiKeySuccess}
          </Alert>
        )}
      </Paper>
    </Container>
  );
}
