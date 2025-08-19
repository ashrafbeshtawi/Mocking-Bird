
import React from 'react';
import { Container, Box, Typography, Button, Paper, Stack } from '@mui/material';
import Link from 'next/link';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/X';
import BarChartIcon from '@mui/icons-material/BarChart';
import SecurityIcon from '@mui/icons-material/Security';

export default function AboutPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Container maxWidth="md" sx={{ textAlign: 'center', mt: 8, mb: 6 }}>
        <Typography variant="h2" component="h1" fontWeight={800} color="primary" gutterBottom>
          🐦 Mockingbird
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
          Automate your social media cross-posting. Effortlessly share your Facebook posts to Twitter (X) and keep your audience engaged everywhere.
        </Typography>
      </Container>

      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} justifyContent="center" alignItems="stretch">
          <Paper elevation={3} sx={{ p: 4, flex: 1, textAlign: 'center', borderRadius: 4 }}>
            <FacebookIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <TwitterIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2, ml: 2 }} />
            <Typography variant="h6" color="primary" fontWeight={700} gutterBottom>Automated Cross-Posting</Typography>
            <Typography color="text.secondary">Connect your Facebook and Twitter accounts. Mockingbird automatically shares your posts across platforms, saving you time.</Typography>
          </Paper>
          <Paper elevation={3} sx={{ p: 4, flex: 1, textAlign: 'center', borderRadius: 4 }}>
            <BarChartIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
            <Typography variant="h6" color="secondary" fontWeight={700} gutterBottom>Publish History & Analytics</Typography>
            <Typography color="text.secondary">Track your cross-posts and view engagement stats. Stay informed and optimize your social strategy.</Typography>
          </Paper>
          <Paper elevation={3} sx={{ p: 4, flex: 1, textAlign: 'center', borderRadius: 4 }}>
            <SecurityIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" color="success.main" fontWeight={700} gutterBottom>Secure & Private</Typography>
            <Typography color="text.secondary">Your data is protected with industry-standard security. You control your connections and privacy.</Typography>
          </Paper>
        </Stack>
      </Container>

      <Container maxWidth="md" sx={{ mb: 8, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom>How It Works</Typography>
        <Box component="ol" sx={{ textAlign: 'left', display: 'inline-block', mx: 'auto', color: 'text.secondary', fontSize: 18, lineHeight: 2 }}>
          <li>Sign up and connect your Facebook and Twitter accounts.</li>
          <li>Choose which Facebook pages and Twitter accounts to link.</li>
          <li>Post on Facebook—Mockingbird automatically shares it to Twitter (X).</li>
          <li>View your publish history and analytics in your dashboard.</li>
        </Box>
      </Container>

      <Container maxWidth="sm" sx={{ mb: 8, textAlign: 'center' }}>
        <Typography variant="h6" color="primary" fontWeight={700} gutterBottom>What Our Users Say</Typography>
        <Paper elevation={2} sx={{ bgcolor: 'white', borderRadius: 2, boxShadow: 1, p: 3, mb: 2 }}>
          <Typography variant="body1" fontStyle="italic" color="text.secondary">“Mockingbird saves me hours every week. My posts reach more people, and I never forget to update both platforms!”</Typography>
          <Typography variant="caption" color="text.disabled" display="block" mt={1}>— Social Media Manager</Typography>
        </Paper>
        <Paper elevation={2} sx={{ bgcolor: 'white', borderRadius: 2, boxShadow: 1, p: 3 }}>
          <Typography variant="body1" fontStyle="italic" color="text.secondary">“Setup was a breeze, and the analytics help me see what’s working. Highly recommend!”</Typography>
          <Typography variant="caption" color="text.disabled" display="block" mt={1}>— Small Business Owner</Typography>
        </Paper>
      </Container>

      <Box component="footer" sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 4, textAlign: 'center', flexShrink: 0 }}>
        <Container maxWidth="md">
          <Typography variant="body2">© 2025 Mockingbird. All rights reserved.</Typography>
        </Container>
      </Box>
    </Box>
  );
}