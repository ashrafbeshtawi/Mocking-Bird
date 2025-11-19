'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton, // Import IconButton
  Dialog, // Import Dialog
  DialogActions, // Import DialogActions
  DialogContent, // Import DialogContent
  DialogContentText, // Import DialogContentText
  DialogTitle, // Import DialogTitle
} from '@mui/material';
import TwitterIcon from '@mui/icons-material/Twitter';
import FacebookIcon from '@mui/icons-material/Facebook'; // Using MUI icon for Facebook
import DeleteIcon from '@mui/icons-material/Delete'; // Import DeleteIcon
import {fetchWithAuth} from '@/lib/fetch'; // Custom fetch function for auth
import Cookies from "js-cookie";

// Extend Window interface for Facebook SDK to ensure TypeScript recognizes FB object
declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: typeof FB;
  }
}

// Interface for connected pages from our backend
interface ConnectedPage {
  page_id: string;
  page_name: string;
  page_access_token: string; // Add page_access_token
}

interface InstagramAccount {
  id: string;
  name: string;
  displayName: string;
  facebookPageId: string; // To link it back to the Facebook page
}

export default function FacebookConnectPage() {
  const theme = useTheme(); // Access the current Material UI theme for consistent styling
  const [loading, setLoading] = useState<boolean>(false); // State to manage loading indicators for Facebook login/save
  const [fetchingPages, setFetchingPages] = useState<boolean>(true); // State to manage loading for fetching connected pages
  const [error, setError] = useState<string | null>(null);   // State to store any error messages
  const [success, setSuccess] = useState<string | null>(null); // State to store success messages
  const [connectedPages, setConnectedPages] = useState<ConnectedPage[]>([]); // State to store connected pages
  const [connectedInstagramAccounts, setConnectedInstagramAccounts] = useState<InstagramAccount[]>([]); // State to store connected Instagram accounts
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null); // State to track which account is being deleted
  const [openConfirmDialog, setOpenConfirmDialog] = useState<boolean>(false); // State for confirmation dialog
  const [pageToDelete, setPageToDelete] = useState<{ id: string; name: string; platform: string } | null>(null); // State to store page info for deletion
  const [accountToDelete, setAccountToDelete] = useState<{ id: string; name: string; platform: string } | null>(null); // State to store account info for deletion
  const [twitterLoading, setTwitterLoading] = useState<boolean>(false); // State to manage loading for Twitter connect
  const [connectedXAccounts, setConnectedXAccounts] = useState<{ id: string; name: string }[]>([]); // State for connected X accounts

  // Function to fetch connected X accounts from backend
  const fetchConnectedXAccounts = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/twitter-v1.1/get-accounts');
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || `Backend error: ${response.statusText}`);
      }
      const result = await response.json();
      setConnectedXAccounts(result.accounts || []);
    } catch (err: unknown) {
      console.error('Error fetching connected X accounts:', err);
      // Optionally set an error state for X accounts
    }
  }, []);

  // Function to fetch connected Instagram accounts from backend
  const fetchConnectedInstagramAccounts = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/instagram');
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || `Backend error: ${response.statusText}`);
      }
      const result = await response.json();
      setConnectedInstagramAccounts(result.accounts || []);
    } catch (err: unknown) {
      console.error('Error fetching connected Instagram accounts:', err);
      // Optionally set an error state for Instagram accounts
    }
  }, []);

  // Function to fetch connected pages from our backend
  const fetchConnectedPages = useCallback(async () => {
    setFetchingPages(true);
    setError(null);
    try {
      const response = await fetch('/api/facebook/get-pages', { credentials: 'include' });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login'; // redirect on unauthorized
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || `Backend error: ${response.statusText}`);
      }

      const result = await response.json();
      setConnectedPages(result.pages);
    } catch (err: unknown) {
      console.error('Error fetching connected pages:', err);
      setError((err as Error)?.message || 'An unexpected error occurred while fetching connected pages.');
    } finally {
      setFetchingPages(false);
    }
  }, []);

  // Effect to load the Facebook SDK script once the component mounts
  useEffect(() => {
    // This function is called once the Facebook SDK is loaded
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: '1471736117322956', // 🔑 Your Facebook App ID goes here
        cookie: true, // Enable cookies to allow the server to access the session
        xfbml: true, // Parse social plugins on this page
        version: 'v19.0', // Specify the Graph API version to use
      });
      // Optionally, check login status immediately after init if desired
      // window.FB.getLoginStatus(function(response) {
      //   console.log('FB Login Status:', response);
      // });
    };

    // Dynamically inject the Facebook SDK script if it's not already present
    if (!document.getElementById('facebook-jssdk')) {
      const js = document.createElement('script');
      js.id = 'facebook-jssdk';
      js.src = 'https://connect.facebook.net/en_US/sdk.js'; // Official SDK URL
      document.body.appendChild(js);
    }

    // Fetch connected accounts when the component mounts
    fetchConnectedPages();
    fetchConnectedXAccounts();
    fetchConnectedInstagramAccounts();
  }, [fetchConnectedPages, fetchConnectedXAccounts, fetchConnectedInstagramAccounts]); // Dependency array includes all fetch functions


  /**
   * Saves the obtained Facebook Page ID and Access Token to your backend.
   * This function sends the data along with the user's JWT for authentication.
   */
  const savePageToBackend = useCallback(
    async (userAccessToken : string) => {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const response = await fetch('/api/facebook/save-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // 🔑 send cookie automatically
          body: JSON.stringify({ shortLivedUserToken: userAccessToken }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = '/login';
            return;
          }
          const errorData = await response.json();
          throw new Error(errorData.message || `Backend error: ${response.statusText}`);
        }

        const result = await response.json();
        setSuccess(result.message || '🎉 Page successfully connected and saved to your account!');
        // No need to update connectedInstagramAccounts here as fetchConnectedInstagramAccounts will do it
        fetchConnectedPages();
        fetchConnectedInstagramAccounts(); // Fetch Instagram accounts after saving a Facebook page
      } catch (err: unknown) {
        console.error('Error saving page to backend:', err);
        setError((err as Error)?.message || 'An unexpected error occurred while saving the page data.');
      } finally {
        setLoading(false);
      }
    },
    [fetchConnectedPages, fetchConnectedInstagramAccounts]
  );

  /**
   * Opens the confirmation dialog for deleting an account.
   */
  const handleDeleteAccountClick = useCallback((id: string, name: string, platform: string) => {
    setAccountToDelete({ id, name, platform });
    setOpenConfirmDialog(true);
  }, []);

  /**
   * Handles the actual deletion of an account from the backend after confirmation.
   */
  const confirmDeleteAccount = useCallback(async () => {
    if (!accountToDelete) return;

    setOpenConfirmDialog(false);
    setDeletingAccountId(accountToDelete.id);
    setError(null);
    setSuccess(null);

    let URL = '';
    let body = {};

    if (accountToDelete.platform === 'facebook') {
      URL = '/api/facebook/delete-page';
      body = { page_id: accountToDelete.id };
    } else if (accountToDelete.platform === 'twitter') {
      URL = '/api/twitter-v1.1/delete-account';
      body = { page_id: accountToDelete.id }; // Twitter API expects page_id
    } else if (accountToDelete.platform === 'instagram') {
      URL = '/api/instagram';
      body = { instagram_account_id: accountToDelete.id }; // Instagram API expects instagram_account_id
    } else {
      setError('Unsupported platform for deletion.');
      setDeletingAccountId(null);
      setAccountToDelete(null);
      return;
    }

    try {
      const response = await fetch(URL, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 🔑 send cookie automatically
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || `Backend error: ${response.statusText}`);
      }

      setSuccess('🗑️ Account disconnected successfully!');
      fetchConnectedPages();
      fetchConnectedXAccounts();
      fetchConnectedInstagramAccounts();
    } catch (err: unknown) {
      console.error('Error deleting account:', err);
      setError((err as Error)?.message || 'An unexpected error occurred while deleting the account.');
    } finally {
      setDeletingAccountId(null);
      setAccountToDelete(null);
    }
  }, [accountToDelete, fetchConnectedPages, fetchConnectedXAccounts, fetchConnectedInstagramAccounts]);

  /**
   * Closes the confirmation dialog without deleting.
   */
  const handleCloseConfirmDialog = useCallback(() => {
    setOpenConfirmDialog(false);
    setAccountToDelete(null);
  }, []);


  /**
   * Handles the click event for the "Add Facebook Page" button.
   * Initiates the Facebook login process with specified permissions.
   */
  const handleAddFacebookPage = useCallback(() => {
    setLoading(true); // Indicate loading state for Facebook login
    setError(null);
    setSuccess(null);

    window.FB.login(
      (response: facebook.StatusResponse) => {
        // Check if login was successful and an authResponse (including accessToken) is present
        if (response.authResponse && response.authResponse.accessToken) {
          const accessToken = response.authResponse.accessToken;
          console.log('✅ User access token obtained from Facebook:', accessToken);
          // If successful, proceed to fetch pages
          savePageToBackend(accessToken);
        } else {
          // Login failed or was cancelled by the user
          setLoading(false); // End loading state
          setError('Facebook login was cancelled or failed. Please try again.');
          console.warn('❌ Facebook login failed or cancelled.', response);
        }
      },
      {
        // 🚨 Define the required permissions (scopes) for your app
        scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_engagement,pages_read_user_content,instagram_basic,instagram_content_publish,business_management',
      }
    );
  }, [savePageToBackend]); // Dependency: `savePageToBackend` function

  const handleAddTwitterAccount = useCallback( async () => {
    setTwitterLoading(true);
    const response = await fetch('/api/twitter-v1.1/auth').finally(() => setTwitterLoading(false));
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to initiate authentication');
    }
    Cookies.set('twitter_oauth_secret', data.oauthTokenSecret, { expires: 5 / 1440 }); // 5 minutes
    Cookies.set('temp_jwt', Cookies.get('jwt') || '', { expires: 5 / 1440 }); // 5 minutes

    // Redirect to Twitter authorization page
    window.location.href = data.authUrl;
    console.log('Redirecting to Twitter auth URL:', data);
  }, []);

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 4 }}>
        {/* Add Facebook Page Button */}
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleAddFacebookPage}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <FacebookIcon />}
          sx={{
            backgroundColor: '#1877f2',
            '&:hover': {
              backgroundColor: '#155eaf',
            },
            '&.Mui-disabled': {
                backgroundColor: theme.palette.action.disabledBackground,
                color: theme.palette.action.disabled,
            }
          }}
        >
          {loading ? 'Connecting...' : 'Add Facebook Page'}
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={handleAddTwitterAccount}
          disabled={twitterLoading}
          startIcon={twitterLoading ? <CircularProgress size={20} color="inherit" /> : <TwitterIcon />}
          sx={{
            backgroundColor: '#000',
            '&:hover': {
              backgroundColor: '#222',
            },
            '&.Mui-disabled': {
                backgroundColor: theme.palette.action.disabledBackground,
                color: theme.palette.action.disabled,
            },
            color: '#fff',
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: '0 2px 4px 0 rgba(0,0,0,0.15)',
          }}
        >
          Add Twitter Account
        </Button>
      </Box>

      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3, fontWeight: theme.typography.fontWeightBold }}>
          Connected Facebook Pages
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <AlertTitle>Success</AlertTitle>
            {success}
          </Alert>
        )}

        {fetchingPages ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : connectedPages.length === 0 ? (
          <Typography variant="body1" sx={{ mt: 4, color: theme.palette.text.secondary }}>
            No Facebook pages connected yet. Click &apos;Add Facebook Page&apos; to connect one.
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 4, boxShadow: theme.shadows[3] }}>
            <Table sx={{ minWidth: 650 }} aria-label="connected facebook pages table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Page ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Page Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {connectedPages.map((page) => (
                  <TableRow
                    key={page.page_id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {page.page_id}
                    </TableCell>
                    <TableCell>{page.page_name ??'N/A'}</TableCell>
                    <TableCell>
                      <IconButton
                        aria-label="delete"
                        onClick={() => handleDeleteAccountClick(page.page_id, page.page_name ?? 'N/A', 'facebook')}
                        color="error"
                        disabled={deletingAccountId === page.page_id}
                      >
                        {deletingAccountId === page.page_id ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <DeleteIcon />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Connected Instagram Accounts Table */}
        <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3, mt: 6, fontWeight: theme.typography.fontWeightBold }}>
          Connected Instagram Accounts
        </Typography>
        {connectedInstagramAccounts.length === 0 ? (
          <Typography variant="body1" sx={{ mt: 2, color: theme.palette.text.secondary }}>
            No Instagram accounts linked to connected Facebook pages.
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 2, boxShadow: theme.shadows[3] }}>
            <Table sx={{ minWidth: 650 }} aria-label="connected instagram accounts table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Instagram ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Display Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {connectedInstagramAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell component="th" scope="row">
                      {account.id}
                    </TableCell>
                    <TableCell>{account.name ?? 'N/A'}</TableCell>
                    <TableCell>{account.displayName ?? 'N/A'}</TableCell>
                    <TableCell>
                      <IconButton
                        aria-label="delete"
                        onClick={() => handleDeleteAccountClick(account.id, account.name ?? 'N/A', 'instagram')}
                        color="error"
                        disabled={deletingAccountId === account.id}
                      >
                        {deletingAccountId === account.id ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <DeleteIcon />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Connected X (Twitter) Accounts Table */}
        <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3, mt: 6, fontWeight: theme.typography.fontWeightBold }}>
          Connected X Accounts
        </Typography>
        {connectedXAccounts.length === 0 ? (
          <Typography variant="body1" sx={{ mt: 2, color: theme.palette.text.secondary }}>
            No X accounts connected yet. Click 'Add Twitter Account' to connect one.
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 2, boxShadow: theme.shadows[3] }}>
            <Table sx={{ minWidth: 650 }} aria-label="connected x accounts table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Account ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {connectedXAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell component="th" scope="row">
                      {account.id}
                    </TableCell>
                    <TableCell>{account.name ?? 'N/A'}</TableCell>
                    <TableCell>
                      <IconButton
                        aria-label="delete"
                        onClick={() => handleDeleteAccountClick(account.id, account.name ?? 'N/A', 'twitter')}
                        color="error"
                        disabled={deletingAccountId === account.id}
                      >
                        {deletingAccountId === account.id ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <DeleteIcon />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>

      {/* Confirmation Dialog */}
      <Dialog
        open={openConfirmDialog}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirm Deletion"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete the {accountToDelete?.platform} account "{accountToDelete?.name}" (ID: {accountToDelete?.id})? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDeleteAccount} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
