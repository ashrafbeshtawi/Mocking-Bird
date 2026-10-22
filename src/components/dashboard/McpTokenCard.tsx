'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useConnectedAccounts } from '@/hooks/useConnectedAccounts';
import type { McpAccountAccess } from '@/lib/mcpAccess';
import { MCP_TOKEN_TITLE_MAX_LENGTH, type McpTokenInfo } from '@/types/mcpTokens';
import { McpAccountAccessField, getGrantLabel } from './McpAccountAccessField';

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
  const [tokens, setTokens] = useState<McpTokenInfo[]>([]);
  const [title, setTitle] = useState('');
  const [access, setAccess] = useState<McpAccountAccess>([]);
  const [editing, setEditing] = useState<McpTokenInfo | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { normalizedAccounts } = useConnectedAccounts();
  const accounts = useMemo(() => Object.values(normalizedAccounts).flat(), [normalizedAccounts]);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetchWithAuth('/api/mcp-token');
        const data = await response.json();
        if (response.ok) setTokens(data.tokens ?? []);
      } catch {
        // list stays empty; the card still allows generating a token
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleGenerate = useCallback(async () => {
    setWorking(true);
    setError(null);
    try {
      const response = await fetchWithAuth('/api/mcp-token', {
        method: 'POST',
        body: JSON.stringify({ title, account_access: access }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate token');
      setNewToken(data.token);
      setTokens((prev) => [data.tokenInfo, ...prev]);
      setTitle('');
      setAccess([]);
      setCopied(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setWorking(false);
    }
  }, [title, access]);

  const handleSaveEdit = useCallback(async () => {
    if (!editing) return;
    setWorking(true);
    setError(null);
    try {
      const response = await fetchWithAuth('/api/mcp-token', {
        method: 'PUT',
        body: JSON.stringify({ id: editing.id, title: editing.title, account_access: editing.account_access }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save token');
      setTokens((prev) => prev.map((token) => (token.id === data.tokenInfo.id ? data.tokenInfo : token)));
      setEditing(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setWorking(false);
    }
  }, [editing]);

  const handleRevoke = useCallback(async (id: number) => {
    setWorking(true);
    setError(null);
    try {
      const response = await fetchWithAuth('/api/mcp-token', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to revoke token');
      }
      setTokens((prev) => prev.filter((token) => token.id !== id));
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

  const trimmedTitle = title.trim();
  const describeAccess = (tokenAccess: McpAccountAccess) =>
    tokenAccess.map((grant) => getGrantLabel(grant, accounts)).join(', ');

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
        <code>/api/mcp</code>. Create one token per client, so you can revoke each on its own. Each token
        can only use the accounts you give it access to.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <CircularProgress size={20} />
      ) : (
        <>
          {tokens.map((token) => (
            <Box key={token.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box sx={{ mr: 'auto', minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 500, overflowWrap: 'anywhere' }}>{token.title}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', overflowWrap: 'anywhere' }}>
                  Created {new Date(token.created_at).toLocaleDateString()} · {describeAccess(token.account_access)}
                </Typography>
              </Box>
              <Button
                size="small"
                onClick={() => setEditing(token)}
                disabled={working}
                aria-label={`Edit ${token.title}`}
                sx={{ textTransform: 'none' }}
              >
                Edit
              </Button>
              <Button
                size="small"
                color="error"
                onClick={() => handleRevoke(token.id)}
                disabled={working}
                aria-label={`Revoke ${token.title}`}
                sx={{ textTransform: 'none' }}
              >
                Revoke
              </Button>
            </Box>
          ))}
          <Box
            component="form"
            onSubmit={(event: React.FormEvent) => {
              event.preventDefault();
              if (trimmedTitle && access.length) handleGenerate();
            }}
            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 1.5, mt: tokens.length ? 2 : 0 }}
          >
            <TextField
              size="small"
              label="Token title"
              placeholder="e.g. Claude Desktop"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              slotProps={{ htmlInput: { maxLength: MCP_TOKEN_TITLE_MAX_LENGTH } }}
            />
            <McpAccountAccessField accounts={accounts} value={access} onChange={setAccess} />
            <Button
              type="submit"
              variant="outlined"
              size="small"
              disabled={working || !trimmedTitle || access.length === 0}
              startIcon={working ? <CircularProgress size={14} /> : <KeyOutlinedIcon sx={{ fontSize: 15 }} />}
              sx={{ alignSelf: 'flex-start', borderRadius: 3, textTransform: 'none', fontWeight: 500 }}
            >
              Generate token
            </Button>
          </Box>
        </>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle>Edit MCP token</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField
            size="small"
            label="Token title"
            value={editing?.title ?? ''}
            onChange={(event) => setEditing((prev) => prev && { ...prev, title: event.target.value })}
            slotProps={{ htmlInput: { maxLength: MCP_TOKEN_TITLE_MAX_LENGTH } }}
          />
          <McpAccountAccessField
            accounts={accounts}
            value={editing?.account_access ?? []}
            onChange={(accountAccess) => setEditing((prev) => prev && { ...prev, account_access: accountAccess })}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditing(null)} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={working || !editing?.title.trim() || !editing?.account_access.length}
            sx={{ borderRadius: 2 }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

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
