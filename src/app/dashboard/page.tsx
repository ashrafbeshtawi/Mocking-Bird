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
import FacebookIcon from '@mui/icons-material/Facebook'; // Using MUI icon for Facebook
import DeleteIcon from '@mui/icons-material/Delete'; // Import DeleteIcon

// Extend Window interface for Facebook SDK to ensure TypeScript recognizes FB object
declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: typeof FB;
  }
}

// Interfaces for Facebook Graph API responses
interface Page {
  id: string;
  name: string;
  access_token: string;
}

interface PagesResponse {
  data: Page[];
  paging?: { // Paging is optional as it might not always be present
    cursors: {
      before: string;
      after: string;
    };
  };
}

// Interface for connected pages from our backend
interface ConnectedPage {
  page_id: string;
  page_name: string;
}

export default function FacebookConnectPage() {
  const theme = useTheme(); // Access the current Material UI theme for consistent styling
  const [loading, setLoading] = useState<boolean>(false); // State to manage loading indicators for Facebook login/save
  const [fetchingPages, setFetchingPages] = useState<boolean>(true); // State to manage loading for fetching connected pages
  const [error, setError] = useState<string | null>(null);   // State to store any error messages
  const [success, setSuccess] = useState<string | null>(null); // State to store success messages
  const [connectedPages, setConnectedPages] = useState<ConnectedPage[]>([]); // State to store connected pages
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null); // State to track which page is being deleted
  const [openConfirmDialog, setOpenConfirmDialog] = useState<boolean>(false); // State for confirmation dialog
  const [pageToDelete, setPageToDelete] = useState<{ id: string; name: string } | null>(null); // State to store page info for deletion

  // Function to fetch connected pages from our backend
  const fetchConnectedPages = useCallback(async () => {
    setFetchingPages(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in to your account first.');
        setFetchingPages(false);
        return;
      }

      const response = await fetch('/api/get-pages', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
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

    // Fetch connected pages when the component mounts
    fetchConnectedPages();
  }, [fetchConnectedPages]); // Dependency array includes fetchConnectedPages

  /**
   * Saves the obtained Facebook Page ID and Access Token to your backend.
   * This function sends the data along with the user's JWT for authentication.
   */
  const savePageToBackend = useCallback(
    async (pageId: string, pageName: string, pageAccessToken: string) => {
      setLoading(true); // Indicate loading state for the save operation
      setError(null);    // Clear any previous errors
      setSuccess(null);  // Clear any previous success messages

      // Retrieve the JWT from session storage
      const token = localStorage.getItem('token');

      // Check if JWT is available; if not, inform the user and stop
      if (!token) {
        setError('Authentication token not found. Please log in to your account first.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/save-page', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, // 🔑 Include the JWT in the Authorization header
          },
          body: JSON.stringify({ page_id: pageId, page_name: pageName, page_access_token: pageAccessToken }),
        });

        // Check if the backend response was successful (status 2xx)
        if (!response.ok) {
          const errorData = await response.json(); // Attempt to read error message from backend
          throw new Error(errorData.message || `Backend error: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Backend Save Result:', result);
        setSuccess('🎉 Page successfully connected and saved to your account!'); // Inform user of success
        fetchConnectedPages(); // Re-fetch pages after a successful save
      } catch (err: unknown) {
        console.error('Error saving page to backend:', err);
        setError((err as Error)?.message || 'An unexpected error occurred while saving the page data.'); // Display detailed error
      } finally {
        setLoading(false); // Always reset loading state
      }
    },
    [fetchConnectedPages] // Dependencies: `fetchConnectedPages` to re-fetch after save
  );

  /**
   * Opens the confirmation dialog for deleting a Facebook Page.
   */
  const handleDeletePageClick = useCallback((pageId: string, pageName: string) => {
    setPageToDelete({ id: pageId, name: pageName });
    setOpenConfirmDialog(true);
  }, []);

  /**
   * Handles the actual deletion of a Facebook Page from the backend after confirmation.
   */
  const confirmDeletePage = useCallback(async () => {
    if (!pageToDelete) return;

    setOpenConfirmDialog(false); // Close the dialog
    setDeletingPageId(pageToDelete.id); // Set the ID of the page being deleted to show loading state
    setError(null);
    setSuccess(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication token not found. Please log in to your account first.');
      setDeletingPageId(null);
      return;
    }

    try {
      const response = await fetch('/api/delete-page', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ page_id: pageToDelete.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Backend error: ${response.statusText}`);
      }

      setSuccess('🗑️ Facebook page deleted successfully!');
      fetchConnectedPages(); // Re-fetch pages after successful deletion
    } catch (err: unknown) {
      console.error('Error deleting Facebook page:', err);
      setError((err as Error)?.message || 'An unexpected error occurred while deleting the page.');
    } finally {
      setDeletingPageId(null); // Reset deleting state
      setPageToDelete(null); // Clear page to delete
    }
  }, [pageToDelete, fetchConnectedPages]); // Dependencies: `pageToDelete`, `fetchConnectedPages`

  /**
   * Closes the confirmation dialog without deleting.
   */
  const handleCloseConfirmDialog = useCallback(() => {
    setOpenConfirmDialog(false);
    setPageToDelete(null);
  }, []);

  /**
   * Fetches the user's Facebook pages after a successful Facebook login.
   * It then calls `savePageToBackend` for the first found page.
   */
  const fetchPages = useCallback(
    (userToken: string) => {
      setLoading(true); // Indicate loading state for fetching pages
      setError(null);
      setSuccess(null);

      // Make a Graph API call to get pages managed by the user
      window.FB.api('/me/accounts', async (response: PagesResponse) => {
        // Check if there are pages and if the response is valid
        if (response && response.data?.length > 0) {
          for (const page of response.data) {
            console.log(`📄 Found Facebook Page: ${page.name} (ID: ${page.id})`);
            // Proceed to save the page's ID and access token to your backend
            await savePageToBackend(page.id, page.name, page.access_token);
          }
        } else {
          // No pages found or insufficient permissions
          setLoading(false); // End loading if no pages found
          setError(
            '❌ No Facebook Pages found or missing required permissions. ' +
            'Please ensure your Facebook user has admin access to at least one page ' +
            'and granted the necessary permissions during the login process.'
          );
          console.warn('❌ No pages found or missing permissions.', response);
        }
      });
    },
    [savePageToBackend] // Dependency: `savePageToBackend` function
  );

  /**
   * Handles the click event for the "Add Facebook Page" button.
   * Initiates the Facebook login process with specified permissions.
   */
  const handleLogin = useCallback(() => {
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
          fetchPages(accessToken);
        } else {
          // Login failed or was cancelled by the user
          setLoading(false); // End loading state
          setError('Facebook login was cancelled or failed. Please try again.');
          console.warn('❌ Facebook login failed or cancelled.', response);
        }
      },
      {
        // 🚨 Define the required permissions (scopes) for your app
        // 'pages_show_list': To list the pages the user manages
        // 'pages_read_engagement': To read content and engagement data from pages
        // 'pages_manage_posts': To create, edit, and delete page posts
        scope: 'pages_show_list,pages_read_engagement,pages_manage_posts',
      }
    );
  }, [fetchPages]); // Dependency: `fetchPages` function

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        {/* Add Facebook Page Button */}
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleLogin}
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
            <button
      className="bg-blue-500 text-white px-4 py-2 rounded"
      onClick={() => window.location.href = '/api/twitter/login'}
    >
      Connect with Twitter
    </button>
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
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell> {/* New column for actions */}
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
                        onClick={() => handleDeletePageClick(page.page_id, page.page_name ?? 'N/A')}
                        color="error"
                        disabled={deletingPageId === page.page_id} // Disable button while deleting
                      >
                        {deletingPageId === page.page_id ? (
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
            Are you sure you want to delete the Facebook page {pageToDelete?.name} (ID: {pageToDelete?.id})? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDeletePage} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
