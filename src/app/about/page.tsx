'use client';

import React from 'react';
import {
  Typography,
  Button,
  Container,
  Box,
  Paper,
  Grid,
  useTheme,
} from '@mui/material';
import Link from 'next/link';

// --- @mui/icons-material Imports ---
import TwitterIcon from '@mui/icons-material/X';
import FacebookIcon from '@mui/icons-material/Facebook';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import PublishIcon from '@mui/icons-material/Publish';


export default function AboutPage() {
  const theme = useTheme();

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* About Us Section */}
        <Box sx={{ my: 8, textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
            About Mockingbird
          </Typography>
          <Typography variant="h5" component="p" sx={{ mb: 4, opacity: 0.9, color: theme.palette.text.secondary }}>
            At Mockingbird, we believe in simplifying your social media management.
            Our mission is to help content creators, marketers, and businesses
            efficiently share their valuable content across multiple platforms,
            starting with seamless Facebook to Twitter (X) automation.
          </Typography>
          <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
            We understand the challenges of maintaining a consistent online presence.
            That's why we've built a reliable, set-it-and-forget-it solution that
            saves you time and ensures your audience never misses an update.
          </Typography>
        </Box>

        {/* Key Features Section (Moved from old HomePage) */}
        <Box id="features" sx={{ my: 8 }}>
          <Typography variant="h4" component="h2" align="center" gutterBottom>
            Key Features
          </Typography>
          <Grid container spacing={4} sx={{ mt: 4 }}>
            {/* Feature Card 1 */}
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

        {/* How It Works Section (Moved from old HomePage) */}
        <Box id="how-it-works" sx={{ my: 8 }}>
          <Typography variant="h4" component="h2" align="center" gutterBottom>
            How It Works
          </Typography>
          <Grid container spacing={4} alignItems="center" sx={{ mt: 4 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 4 }}>
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
                src="https://via.placeholder.com/400x300?text=Flow+Diagram"
                alt="Workflow diagram"
                sx={{ maxWidth: '100%', height: 'auto', borderRadius: theme.shape.borderRadius, boxShadow: theme.shadows[6] }}
              />
            </Grid>
          </Grid>
        </Box>

        {/* Call to Action Section (Re-used for About page) */}
        <Box sx={{ my: 8, textAlign: 'center' }}>
          <Typography variant="h4" component="h2" gutterBottom>
            Ready to Simplify Your Social Presence?
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, color: theme.palette.text.secondary }}>
            Join Mockingbird today and take the hassle out of cross-platform content sharing.
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
        bgcolor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
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