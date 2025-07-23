'use client';

import React from 'react';
import {
  AppBar, // Not directly used in homepage content, but good to have if layout includes it
  Toolbar, // Same as AppBar
  Typography,
  Button,
  Container,
  Box,
  Paper,
  Grid,
  SvgIcon, // Still needed for the custom SvgIcon components if not using @mui/icons-material directly
  useTheme, // To access theme properties for styling
} from '@mui/material';
// Removed 'styled' import as we're using sx prop
import Link from 'next/link';

// --- @mui/icons-material Imports ---
import TwitterIcon from '@mui/icons-material/X'; // For Twitter (X)
import FacebookIcon from '@mui/icons-material/Facebook'; // For Facebook
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'; // A good alternative for Automation Icon
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'; // Example for step 1
import SettingsIcon from '@mui/icons-material/Settings'; // Example for step 2
import PublishIcon from '@mui/icons-material/Publish'; // Example for step 3


export default function HomePage() {
  const theme = useTheme(); // Access the current theme for dynamic styling

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Hero Section */}
      <Box
        sx={{
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          padding: { xs: theme.spacing(8, 0), md: theme.spacing(12, 0) }, // Responsive padding
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
            Automate Your Social Media Cross-Posting 🚀
          </Typography>
          <Typography variant="h5" component="p" sx={{ mb: 4, opacity: 0.9 }}>
            Seamlessly bridge your content across platforms. Mockingbird lets you
            automatically share your Facebook posts to Twitter (X) effortlessly.
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            component={Link}
            href="/login"
            sx={{ mr: { xs: 0, sm: 2 }, mb: { xs: 2, sm: 0 } }} // Responsive margin and bottom margin for small screens
          >
            Start Mocking Now!
          </Button>
          <Button
            variant="outlined"
            // Use theme.palette.primary.contrastText for text and border on primary background
            sx={{
                color: theme.palette.primary.contrastText,
                borderColor: theme.palette.primary.contrastText,
                '&:hover': {
                    borderColor: theme.palette.primary.light,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Subtle hover on inverse color
                },
            }}
            size="large"
            component={Link}
            href="#how-it-works"
          >
            Learn More
          </Button>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* Key Features Section */}
        <Box id="features" sx={{ my: 8 }}>
          <Typography variant="h4" component="h2" align="center" gutterBottom>
            Key Features
          </Typography>
          <Grid container spacing={4} sx={{ mt: 4 }}>
            {/* Feature Card 1 */}
            <Grid item xs={12} md={4}>
              <Paper
                elevation={theme.shadows[2]} // Use theme's shadow for consistency
                sx={{
                  padding: theme.spacing(4),
                  textAlign: 'center',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: theme.shape.borderRadius, // Use theme's border-radius
                  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: theme.shadows[6], // Deeper shadow on hover
                  },
                }}
              >
                <FacebookIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Facebook to Twitter (X)
                </Typography>
                <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                  Automatically share your Facebook Page posts directly to your Twitter (X) account.
                  Keep your audience updated everywhere.
                </Typography>
              </Paper>
            </Grid>
            {/* Feature Card 2 */}
            <Grid item xs={12} md={4}>
              <Paper
                elevation={theme.shadows[2]}
                sx={{
                  padding: theme.spacing(4),
                  textAlign: 'center',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: theme.shape.borderRadius,
                  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: theme.shadows[6],
                  },
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 60, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Set & Forget Automation
                </Typography>
                <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                  Configure once and let Mockingbird handle the rest. Your content goes live instantly.
                </Typography>
              </Paper>
            </Grid>
            {/* Feature Card 3 */}
            <Grid item xs={12} md={4}>
              <Paper
                elevation={theme.shadows[2]}
                sx={{
                  padding: theme.spacing(4),
                  textAlign: 'center',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: theme.shape.borderRadius,
                  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: theme.shadows[6],
                  },
                }}
              >
                <TwitterIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Maintain Your Brand Voice
                </Typography>
                <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                  Ensure consistency across platforms. Your posts reflect your brand, wherever they appear.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* How It Works Section */}
        <Box id="how-it-works" sx={{ my: 8 }}>
          <Typography variant="h4" component="h2" align="center" gutterBottom>
            How It Works
          </Typography>
          <Grid container spacing={4} alignItems="center" sx={{ mt: 4 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 4 }}> {/* Grouping for each step */}
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckCircleOutlineIcon color="primary" sx={{ mr: 1 }} /> 1. Connect Your Accounts
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, color: theme.palette.text.secondary }}>
                  Easily link your Facebook Page and Twitter (X) account using our secure login process. We guide you through obtaining the necessary permissions.
                </Typography>
              </Box>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <SettingsIcon color="secondary" sx={{ mr: 1 }} /> 2. Set Up Your Rule
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, color: theme.palette.text.secondary }}>
                  Choose your Facebook Page as the source. Mockingbird will monitor it for new posts.
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <PublishIcon sx={{ color: theme.palette.info.main, mr: 1 }} /> 3. Automate Publishing
                </Typography>
                <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                  When you publish a new post on Facebook, Mockingbird automatically fetches it and creates a corresponding tweet on Twitter (X), including text and media (if applicable).
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Box
                component="img"
                src="https://via.placeholder.com/400x300?text=Flow+Diagram" // Replace with a more relevant image
                alt="Workflow diagram"
                sx={{ maxWidth: '100%', height: 'auto', borderRadius: theme.shape.borderRadius, boxShadow: theme.shadows[6] }} // Use theme's border-radius and shadow
              />
            </Grid>
          </Grid>
        </Box>

        {/* Call to Action Section */}
        <Box sx={{ my: 8, textAlign: 'center' }}>
          <Typography variant="h4" component="h2" gutterBottom>
            Ready to Simplify Your Social Presence?
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, color: theme.palette.text.secondary }}>
            Get started with Mockingbird today and take the hassle out of cross-platform content sharing.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            component={Link}
            href="/login"
          >
            Sign Up Now
          </Button>
        </Box>
      </Container>

      {/* Footer Section */}
      <Box component="footer" sx={{
        bgcolor: theme.palette.primary.main, // Use primary color for footer background
        color: theme.palette.primary.contrastText, // Ensure contrast text color
        py: 4,
        textAlign: 'center'
      }}>
        <Container maxWidth="lg">
          <Typography variant="body2">&copy; {new Date().getFullYear()} Mockingbird. All rights reserved.</Typography>
          <Box sx={{ mt: 1 }}>
            <Link href="#" passHref style={{ color: theme.palette.primary.contrastText, textDecoration: 'none', margin: theme.spacing(0, 1) }}>Privacy Policy</Link>
            <Link href="#" passHref style={{ color: theme.palette.primary.contrastText, textDecoration: 'none', margin: theme.spacing(0, 1) }}>Terms of Service</Link>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}