'use client';

import React, { useState, useCallback } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  AlertTitle,
  Container,
} from '@mui/material';
import { fetchWithAuth } from '@/lib/fetch';
import { useConnectedAccounts } from '@/hooks/useConnectedAccounts';
import { useFacebookSDK, initiateTwitterAuth } from '@/hooks/useFacebookSDK';
import { AccountsTable } from '@/components/dashboard/AccountsTable';
import { ConnectButtons } from '@/components/dashboard/ConnectButtons';
import { ConfirmDisconnectDialog } from '@/components/dashboard/ConfirmDisconnectDialog';
import { TelegramConnectDialog } from '@/components/dashboard/TelegramConnectDialog';
import type { AccountData } from '@/types/accounts';
import { API_CONFIG } from '@/types/accounts';

export default function DashboardPage() {
  const { normalizedAccounts, loading, refetch } = useConnectedAccounts();
  const { login: facebookLogin, isLoading: fbConnecting } = useFacebookSDK();

  const [status, setStatus] = useState<{ error: string | null; success: string | null }>({
    error: null,
    success: null,
  });
  const [twitterConnecting, setTwitterConnecting] = useState(false);
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    account: AccountData | null;
  }>({ open: false, account: null });

  // Handle Facebook connection
  const handleFacebookConnect = useCallback(() => {
    setStatus({ error: null, success: null });

    facebookLogin(
      async (accessToken) => {
        try {
          const response = await fetchWithAuth('/api/facebook/save-page', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shortLivedUserToken: accessToken }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'Failed to connect Facebook page');
          }

          setStatus({ error: null, success: data.message || 'Facebook Page connected!' });
          refetch();
        } catch (err) {
          setStatus({ error: (err as Error).message, success: null });
        }
      },
      () => {
        setStatus({ error: 'Facebook login cancelled.', success: null });
      }
    );
  }, [facebookLogin, refetch]);

  // Handle Twitter connection
  const handleTwitterConnect = useCallback(async () => {
    setTwitterConnecting(true);
    setStatus({ error: null, success: null });

    try {
      await initiateTwitterAuth();
    } catch (err) {
      setStatus({ error: (err as Error).message, success: null });
      setTwitterConnecting(false);
    }
  }, []);

  // Handle Telegram channel connection success
  const handleTelegramSuccess = useCallback(() => {
    setStatus({ error: null, success: 'Telegram channel connected successfully!' });
    refetch();
  }, [refetch]);

  // Handle account deletion
  const handleDeleteAccount = useCallback(
    async (account: AccountData) => {
      setDeletingId(account.id);
      setStatus({ error: null, success: null });

      const config = API_CONFIG[account.platform];

      try {
        const response = await fetchWithAuth(config.deleteUrl, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [config.idParamName]: account.id }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to disconnect account');
        }

        setStatus({ error: null, success: 'Account disconnected successfully.' });
        refetch();
      } catch (err) {
        setStatus({ error: (err as Error).message, success: null });
      } finally {
        setDeletingId(null);
      }
    },
    [refetch]
  );

  const promptDelete = (account: AccountData) => {
    setConfirmDialog({ open: true, account });
  };

  const confirmDelete = () => {
    if (confirmDialog.account) {
      handleDeleteAccount(confirmDialog.account);
    }
    setConfirmDialog({ open: false, account: null });
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <ConnectButtons
        onFacebookConnect={handleFacebookConnect}
        onTwitterConnect={handleTwitterConnect}
        onTelegramConnect={() => setTelegramDialogOpen(true)}
        facebookLoading={fbConnecting}
        twitterLoading={twitterConnecting}
      />

      <Container maxWidth="md">
        {status.error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>Error</AlertTitle>
            {status.error}
          </Alert>
        )}

        {status.success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <AlertTitle>Success</AlertTitle>
            {status.success}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <AccountsTable
            title="Connected Accounts"
            data={[
              ...normalizedAccounts.facebook,
              ...normalizedAccounts.instagram,
              ...normalizedAccounts.twitter,
              ...normalizedAccounts.telegram,
            ]}
            emptyMessage="No accounts connected yet. Use the buttons above to connect your social media accounts."
            loadingId={deletingId}
            onDelete={promptDelete}
          />
        )}
      </Container>

      <ConfirmDisconnectDialog
        open={confirmDialog.open}
        account={confirmDialog.account}
        onClose={() => setConfirmDialog({ open: false, account: null })}
        onConfirm={confirmDelete}
      />

      <TelegramConnectDialog
        open={telegramDialogOpen}
        onClose={() => setTelegramDialogOpen(false)}
        onSuccess={handleTelegramSuccess}
      />
    </Box>
  );
}
