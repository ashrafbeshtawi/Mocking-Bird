'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import type { AccountData } from '@/types/accounts';

interface ConfirmDisconnectDialogProps {
  open: boolean;
  account: AccountData | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDisconnectDialog({
  open,
  account,
  onClose,
  onConfirm,
}: ConfirmDisconnectDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Confirm Disconnect</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to disconnect <strong>{account?.name}</strong>?
          This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} color="error" autoFocus>
          Disconnect
        </Button>
      </DialogActions>
    </Dialog>
  );
}
