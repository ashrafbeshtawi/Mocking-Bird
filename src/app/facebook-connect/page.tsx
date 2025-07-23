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
} from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook'; // Using MUI icon for Facebook

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

export default function FacebookConnectPage() {
  const theme = useTheme(); // Access the current Material UI theme for consistent styling
  const [loading, setLoading] = useState<boolean>(false); // State to manage loading indicators
  const [error, setError] = useState<string | null>(null);   // State to store any error messages
  const [success, setSuccess] = useState<string | null>(null); // State to store success messages

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
  }, []); // Empty dependency array ensures this effect runs only once on mount

  /**
   * Saves the obtained Facebook Page ID and Access Token to your backend.
   * This function sends the data along with the user's JWT for authentication.
   */
  const savePageToBackend = useCallback(
    async (pageId: string, pageAccessToken: string) => {
      setLoading(true); // Indicate loading state for the save operation
      setError(null);    // Clear any previous errors
      setSuccess(null);  // Clear any previous success messages

      // Retrieve the JWT from session storage
      const token = sessionStorage.getItem('token');

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
          body: JSON.stringify({ page_id: pageId, page_access_token: pageAccessToken }),
        });

        // Check if the backend response was successful (status 2xx)
        if (!response.ok) {
          const errorData = await response.json(); // Attempt to read error message from backend
          throw new Error(errorData.message || `Backend error: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Backend Save Result:', result);
        setSuccess('🎉 Page successfully connected and saved to your account!'); // Inform user of success
      } catch (err: unknown) {
        console.error('Error saving page to backend:', err);
        setError((err as Error)?.message || 'An unexpected error occurred while saving the page data.'); // Display detailed error
      } finally {
        setLoading(false); // Always reset loading state
      }
    },
    [] // Dependencies: None, as this function uses stable values or parameters
  );

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
          const page = response.data[0]; // 🎯 For simplicity, we are taking the first page found
          console.log('📄 Found Facebook Page:', page);
          // Proceed to save the page's ID and access token to your backend
          await savePageToBackend(page.id, page.access_token);
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
   * Handles the click event for the "Login with Facebook" button.
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
    <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
      <Box
        sx={{
          p: 4,
          borderRadius: theme.shape.borderRadius,
          boxShadow: theme.shadows[3],
          bgcolor: theme.palette.background.paper,
        }}
      >
        <FacebookIcon sx={{ fontSize: 80, color: '#1877f2', mb: 2 }} />
        <Typography variant="h5" component="h1" gutterBottom sx={{ mb: 3, fontWeight: theme.typography.fontWeightBold }}>
          Connect Your Facebook Page
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, color: theme.palette.text.secondary }}>
          Click the button below to securely log in with Facebook and grant Mockingbird access to your pages for automated posting.
        </Typography>

        {/* Display Error Alert if an error occurs */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        {/* Display Success Alert if the operation is successful */}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <AlertTitle>Success</AlertTitle>
            {success}
          </Alert>
        )}

        {/* Login Button with integrated loading indicator */}
        <Button
          variant="contained"
          color="primary" // Uses theme's primary color, or can be overridden for specific branding
          size="large"
          onClick={handleLogin}
          disabled={loading} // Disable button while operations are in progress
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <FacebookIcon />}
          sx={{
            minWidth: 200,
            py: 1.5,
            fontSize: '1rem',
            backgroundColor: '#1877f2', // Override to Facebook blue for branding
            '&:hover': {
              backgroundColor: '#155eaf', // Darker Facebook blue on hover
            },
            // Custom styles for disabled state to ensure visibility
            '&.Mui-disabled': {
                backgroundColor: theme.palette.action.disabledBackground,
                color: theme.palette.action.disabled,
            }
          }}
        >
          {loading ? 'Connecting...' : 'Login with Facebook'}
        </Button>
      </Box>
    </Container>
  );
}