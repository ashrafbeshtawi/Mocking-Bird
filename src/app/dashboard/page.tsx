'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Cookies from 'js-cookie';
import {
  Box,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

// --- Types ---

type Platform = 'facebook' | 'instagram' | 'twitter';

interface AccountData {
  id: string;
  name: string; // Normalized name (page_name, username, etc.)
  details?: string; // Extra info like Display Name
  platform: Platform;
}

interface ApiConfig {
  deleteUrl: string;
  idParamName: string;
}

// --- Constants ---

const FB_APP_ID = '1471736117322956';
const API_CONFIG: Record<Platform, ApiConfig> = {
  facebook: { deleteUrl: '/api/facebook/delete-page', idParamName: 'page_id' },
  instagram: { deleteUrl: '/api/instagram', idParamName: 'instagram_account_id' },
  twitter: { deleteUrl: '/api/twitter-v1.1/delete-account', idParamName: 'page_id' },
};

// --- Helper: Reusable Table Component ---

interface AccountsTableProps {
  title: string;
  data: AccountData[];
  emptyMessage: string;
  loadingId: string | null;
  onDelete: (account: AccountData) => void;
}

const AccountsTable: React.FC<AccountsTableProps> = ({
  title,
  data,
  emptyMessage,
  loadingId,
  onDelete,
}) => {
  const theme = useTheme();

  return (
    <>
      <Typography
        variant="h5"
        component="h2"
        sx={{ mb: 2, mt: 6, fontWeight: 'bold' }}
      >
        {title}
      </Typography>
      
      {data.length === 0 ? (
        <Typography variant="body1" color="text.secondary">
          {emptyMessage}
        </Typography>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Name/Handle</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Details</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: 100 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((account) => (
                <TableRow key={`${account.platform}-${account.id}`}>
                  <TableCell>{account.id}</TableCell>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>{account.details || '-'}</TableCell>
                  <TableCell>
                    <Tooltip title="Disconnect Account">
                      <span>
                        <IconButton
                          onClick={() => onDelete(account)}
                          color="error"
                          disabled={loadingId === account.id}
                        >
                          {loadingId === account.id ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : (
                            <DeleteIcon />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
};

// --- Custom Hook: Logic & State Management ---

const useSocialMediaAccounts = () => {
  const [loading, setLoading] = useState({
    global: true,
    fbConnect: false,
    twitterConnect: false,
    deletingId: null as string | null,
  });
  
  const [status, setStatus] = useState({ error: null as string | null, success: null as string | null });
  const [accounts, setAccounts] = useState({
    facebook: [] as AccountData[],
    instagram: [] as AccountData[],
    twitter: [] as AccountData[],
  });

  // Helper for API calls
  const fetchApi = useCallback(async (url: string, options?: RequestInit) => {
    const res = await fetch(url, { ...options, credentials: 'include' });
    if (res.status === 401) {
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    return data;
  }, []);

  const fetchAllAccounts = useCallback(async () => {
    try {
      // Parallel fetching for speed
      const [fbRes, instaRes, twitterRes] = await Promise.allSettled([
        fetchApi('/api/facebook/get-pages'),
        fetchApi('/api/instagram'),
        fetchApi('/api/twitter-v1.1/get-accounts'),
      ]);

      const newAccounts = {
        facebook: [] as AccountData[],
        instagram: [] as AccountData[],
        twitter: [] as AccountData[],
      };

      if (fbRes.status === 'fulfilled') {
        newAccounts.facebook = fbRes.value.pages.map((p: any) => ({
          id: p.page_id,
          name: p.page_name,
          platform: 'facebook',
        }));
      }

      if (instaRes.status === 'fulfilled') {
        newAccounts.instagram = instaRes.value.accounts.map((a: any) => ({
          id: a.id,
          name: a.name,
          details: a.displayName,
          platform: 'instagram',
        }));
      }

      if (twitterRes.status === 'fulfilled') {
        newAccounts.twitter = twitterRes.value.accounts.map((a: any) => ({
          id: a.id,
          name: a.name,
          platform: 'twitter',
        }));
      }

      setAccounts(newAccounts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading((prev) => ({ ...prev, global: false }));
    }
  }, [fetchApi]);

  // Initial Load & FB SDK Setup
  useEffect(() => {
    fetchAllAccounts();

    // Load Facebook SDK
    if (typeof window !== 'undefined') {
      window.fbAsyncInit = function () {
        window.FB.init({
          appId: FB_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v19.0',
        });
      };

      if (!document.getElementById('facebook-jssdk')) {
        const js = document.createElement('script');
        js.id = 'facebook-jssdk';
        js.src = 'https://connect.facebook.net/en_US/sdk.js';
        document.body.appendChild(js);
      }
    }
  }, [fetchAllAccounts]);

  const handleFbLogin = () => {
    setLoading((prev) => ({ ...prev, fbConnect: true }));
    setStatus({ error: null, success: null });

    window.FB.login(
      async (response: any) => {
        if (response.authResponse?.accessToken) {
          try {
            const res = await fetchApi('/api/facebook/save-page', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ shortLivedUserToken: response.authResponse.accessToken }),
            });
            setStatus({ error: null, success: res.message || 'Facebook Page connected!' });
            fetchAllAccounts();
          } catch (err: any) {
            setStatus({ error: err.message, success: null });
          }
        } else {
          setStatus({ error: 'Facebook login cancelled.', success: null });
        }
        setLoading((prev) => ({ ...prev, fbConnect: false }));
      },
      { scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_engagement,pages_read_user_content,instagram_basic,instagram_content_publish,business_management' }
    );
  };

  const handleTwitterAuth = async () => {
    setLoading((prev) => ({ ...prev, twitterConnect: true }));
    try {
      const data = await fetchApi('/api/twitter-v1.1/auth');
      Cookies.set('twitter_oauth_secret', data.oauthTokenSecret, { expires: 5 / 1440 });
      Cookies.set('temp_jwt', Cookies.get('jwt') || '', { expires: 5 / 1440 });
      window.location.href = data.authUrl;
    } catch (err: any) {
      setStatus({ error: err.message, success: null });
    } finally {
      setLoading((prev) => ({ ...prev, twitterConnect: false }));
    }
  };

  const deleteAccount = async (account: AccountData) => {
    setLoading((prev) => ({ ...prev, deletingId: account.id }));
    setStatus({ error: null, success: null });

    const config = API_CONFIG[account.platform];

    try {
      await fetchApi(config.deleteUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [config.idParamName]: account.id }),
      });
      setStatus({ error: null, success: 'Account disconnected successfully.' });
      await fetchAllAccounts();
    } catch (err: any) {
      setStatus({ error: err.message, success: null });
    } finally {
      setLoading((prev) => ({ ...prev, deletingId: null }));
    }
  };

  return {
    accounts,
    loading,
    status,
    handleFbLogin,
    handleTwitterAuth,
    deleteAccount,
  };
};

// --- Main Component ---

export default function FacebookConnectPage() {
  const { accounts, loading, status, handleFbLogin, handleTwitterAuth, deleteAccount } = useSocialMediaAccounts();
  
  // Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; account: AccountData | null }>({
    open: false,
    account: null,
  });

  const promptDelete = (account: AccountData) => {
    setConfirmDialog({ open: true, account });
  };

  const confirmDelete = () => {
    if (confirmDialog.account) {
      deleteAccount(confirmDialog.account);
    }
    setConfirmDialog({ open: false, account: null });
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <Button
          variant="contained"
          onClick={handleFbLogin}
          disabled={loading.fbConnect}
          startIcon={loading.fbConnect ? <CircularProgress size={20} color="inherit" /> : <FacebookIcon />}
          sx={{ bgcolor: '#1877f2', '&:hover': { bgcolor: '#155eaf' } }}
        >
          {loading.fbConnect ? 'Connecting...' : 'Add Facebook Page'}
        </Button>

        <Button
          variant="contained"
          onClick={handleTwitterAuth}
          disabled={loading.twitterConnect}
          startIcon={loading.twitterConnect ? <CircularProgress size={20} color="inherit" /> : <TwitterIcon />}
          sx={{ bgcolor: '#000', '&:hover': { bgcolor: '#222' }, color: '#fff' }}
        >
          Add Twitter Account
        </Button>
      </Box>

      <Container maxWidth="md">
        {/* Status Messages */}
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

        {/* Content */}
        {loading.global ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <AccountsTable
              title="Connected Facebook Pages"
              data={accounts.facebook}
              emptyMessage="No Facebook pages connected yet."
              loadingId={loading.deletingId}
              onDelete={promptDelete}
            />

            <AccountsTable
              title="Connected Instagram Accounts"
              data={accounts.instagram}
              emptyMessage="No Instagram accounts linked."
              loadingId={loading.deletingId}
              onDelete={promptDelete}
            />

            <AccountsTable
              title="Connected X (Twitter) Accounts"
              data={accounts.twitter}
              emptyMessage="No X accounts connected yet."
              loadingId={loading.deletingId}
              onDelete={promptDelete}
            />
          </>
        )}
      </Container>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, account: null })}
      >
        <DialogTitle>Confirm Disconnect</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to disconnect <strong>{confirmDialog.account?.name}</strong>? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, account: null })}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// --- Global Type Augmentation ---
declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}