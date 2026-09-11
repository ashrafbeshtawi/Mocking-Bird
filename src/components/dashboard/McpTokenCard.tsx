'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import { fetchWithAuth } from '@/lib/fetch';

const cardSx = {
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 4,
  p: 2.25,
};

const fraunces = 'var(--font-fraunces), Georgia, serif';

export function McpTokenCard() {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetchWithAuth('/api/mcp-token');
        const data = await response.json();
        if (response.ok) setCreatedAt(data.tokenInfo?.created_at ?? null);
      } catch {
        // status stays unknown; the card still allows generating a token
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleGenerate = useCallback(async () => {
    setWorking(true);
    setError(null);
    try {
      const response = await fetchWithAuth('/api/mcp-token', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate token');
      setNewToken(data.token);
      setCreatedAt(new Date().toISOString());
      setCopied(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setWorking(false);
    }
  }, []);

  const handleRevoke = useCallback(async () => {
    setWorking(true);
    setError(null);
    try {
      const response = await fetchWithAuth('/api/mcp-token', { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to revoke token');
      }
      setCreatedAt(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setWorking(false);
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
  }, [newToken]);

  return (
    <Box sx={cardSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <KeyOutlinedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
        <Typography sx={{ fontFamily: fraunces, fontSize: 20, letterSpacing: '-0.02em' }}>
          MCP Access
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5, mb: 2 }}>
        Let AI clients like Claude manage your drafts via the MCP endpoint at{' '}
        <code>/api/mcp</code>. One long-lived token per account — generating a new one replaces
        the old.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <CircularProgress size={20} />
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {createdAt ? (
            <>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mr: 'auto' }}>
                Token active since {new Date(createdAt).toLocaleDateString()}
              </Typography>
              <Button size="small" onClick={handleGenerate} disabled={working} sx={{ textTransform: 'none' }}>
                Regenerate
              </Button>
              <Button size="small" color="error" onClick={handleRevoke} disabled={working} sx={{ textTransform: 'none' }}>
                Revoke
              </Button>
            </>
          ) : (
            <Button
              variant="outlined"
              size="small"
              onClick={handleGenerate}
              disabled={working}
              startIcon={working ? <CircularProgress size={14} /> : <KeyOutlinedIcon sx={{ fontSize: 15 }} />}
              sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 500 }}
            >
              Generate token
            </Button>
          )}
        </Box>
      )}

      {/* One-time token reveal */}
      <Dialog open={!!newToken} onClose={() => setNewToken(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle>Your MCP token</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Copy it now — it is shown only once and cannot be retrieved later.
          </Alert>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              fullWidth
              size="small"
              value={newToken ?? ''}
              InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
            />
            <IconButton onClick={handleCopy} title="Copy token">
              {copied ? <CheckIcon color="success" /> : <ContentCopyIcon />}
            </IconButton>
          </Box>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 2 }}>
            Connect with:{' '}
            <code>
              claude mcp add --transport http mockingbird {'<host>'}/api/mcp --header
              &quot;Authorization: Bearer {'<token>'}&quot;
            </code>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setNewToken(null)} variant="contained" sx={{ borderRadius: 2 }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
