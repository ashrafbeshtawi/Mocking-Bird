'use client';

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import { signOut } from 'next-auth/react';
import { fetchWithAuth } from '@/lib/fetch';

const cardSx = {
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 4,
  p: 2.25,
};

const fraunces = 'var(--font-fraunces), Georgia, serif';

export function DeleteAccountCard() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setWorking(true);
    setError(null);
    try {
      const response = await fetchWithAuth('/api/account', { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete account');
      }
      await signOut({ callbackUrl: '/' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete account');
      setWorking(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Box sx={cardSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <DeleteForeverOutlinedIcon sx={{ fontSize: 18, color: 'error.main' }} />
        <Typography sx={{ fontFamily: fraunces, fontSize: 20, letterSpacing: '-0.02em' }}>
          Delete account
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5, mb: 2 }}>
        Permanently removes your account, connected social media accounts and their access tokens,
        drafts, scheduled posts and publish history. Posts already published on the platforms stay.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Button
        variant="outlined"
        color="error"
        size="small"
        onClick={() => setConfirmOpen(true)}
        startIcon={<DeleteForeverOutlinedIcon sx={{ fontSize: 15 }} />}
        sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 500 }}
      >
        Delete account
      </Button>

      <Dialog open={confirmOpen} onClose={() => !working && setConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle>Delete your account?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This cannot be undone. All your data in Mockingbird is deleted and you are signed out.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={working} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={working}
            startIcon={working ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Delete permanently
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
