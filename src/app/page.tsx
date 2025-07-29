'use client';

import React from 'react';
import {
  Typography,
  Button,
  Container,
  Box,
  useTheme,
} from '@mui/material';
import Link from 'next/link';

export default function HomePage() {
  const theme = useTheme();

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Hero Section (Main Cover) */}
      <Box
        sx={{
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          padding: { xs: theme.spacing(8, 0), md: theme.spacing(12, 0) },
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
            sx={{ mr: { xs: 0, sm: 2 }, mb: { xs: 2, sm: 0 } }}
          >
            Start Mocking Now!
          </Button>
          <Button
            variant="outlined"
            sx={{
                color: theme.palette.primary.contrastText,
                borderColor: theme.palette.primary.contrastText,
                '&:hover': {
                    borderColor: theme.palette.primary.light,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
            }}
            size="large"
            component={Link}
            href="/about" // Link to the new About page
          >
            Learn More
          </Button>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* Simplified Call to Action on Home Page */}
        <Box sx={{ my: 8, textAlign: 'center' }}>
          <Typography variant="h4" component="h2" gutterBottom>
            Ready to Simplify Your Social Presence?
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, color: theme.palette.text.secondary }}>
            Discover how Mockingbird can automate your cross-platform content sharing.
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