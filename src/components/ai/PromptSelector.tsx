'use client';

import React from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Box,
  Typography,
  Chip,
  CircularProgress,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { AiPrompt } from '@/types/ai';

interface PromptSelectorProps {
  prompts: AiPrompt[];
  selectedPromptId: number | null;
  onChange: (promptId: number | null) => void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

export function PromptSelector({
  prompts,
  selectedPromptId,
  onChange,
  loading = false,
  disabled = false,
  size = 'small',
}: PromptSelectorProps) {
  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);

  if (loading) {
    return <CircularProgress size={20} />;
  }

  return (
    <FormControl size={size} sx={{ minWidth: 180 }} disabled={disabled}>
      <InputLabel>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AutoAwesomeIcon sx={{ fontSize: 16 }} />
          AI Prompt
        </Box>
      </InputLabel>
      <Select
        value={selectedPromptId || ''}
        label="AI Prompt"
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        renderValue={() => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedPrompt ? (
              <>
                <Typography variant="body2">{selectedPrompt.title}</Typography>
                {selectedPrompt.provider_name && (
                  <Chip label={selectedPrompt.provider_name} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                None
              </Typography>
            )}
          </Box>
        )}
      >
        <MenuItem value="">
          <Typography color="text.secondary">None (no transformation)</Typography>
        </MenuItem>
        {prompts.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No prompts available
            </Typography>
          </MenuItem>
        ) : (
          prompts.map((prompt) => (
            <MenuItem key={prompt.id} value={prompt.id} disabled={!prompt.provider_id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="body2">{prompt.title}</Typography>
                {prompt.provider_name ? (
                  <Chip label={prompt.provider_name} size="small" sx={{ ml: 'auto', height: 18, fontSize: '0.65rem' }} />
                ) : (
                  <Chip label="No provider" size="small" color="warning" sx={{ ml: 'auto', height: 18, fontSize: '0.65rem' }} />
                )}
              </Box>
            </MenuItem>
          ))
        )}
      </Select>
    </FormControl>
  );
}
