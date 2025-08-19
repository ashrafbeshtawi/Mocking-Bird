import React from 'react';
import { Container, Box, Typography, Button, Paper, Stack } from '@mui/material';
import Link from 'next/link';
import TwitterIcon from '@mui/icons-material/Twitter';
import BarChartIcon from '@mui/icons-material/BarChart';
import SecurityIcon from '@mui/icons-material/Security';
import Diversity3Icon from '@mui/icons-material/Diversity3'; // Team icon
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'; // Mission icon
import HistoryEduIcon from '@mui/icons-material/HistoryEdu'; // Story icon

export default function AboutPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Container maxWidth="md" sx={{ textAlign: 'center', mt: 8, mb: 6 }}>
        <Typography variant="h2" component="h1" fontWeight={800} color="primary" gutterBottom>
          🐦 About Mockingbird
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
          Our mission is to help content creators and businesses streamline their social media presence.
        </Typography>
      </Container>

      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} justifyContent="center" alignItems="stretch">
          <Paper elevation={3} sx={{ p: 4, flex: 1, textAlign: 'center', borderRadius: 4 }}>
            <HistoryEduIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" color="primary" fontWeight={700} gutterBottom>Our Story</Typography>
            <Typography color="text.secondary">Mockingbird was born out of a simple need: to make social media management less of a chore. We realized that manually cross-posting content was a time-consuming and repetitive task. Our goal was to build a tool that solves this problem with elegance and reliability.</Typography>
          </Paper>
          <Paper elevation={3} sx={{ p: 4, flex: 1, textAlign: 'center', borderRadius: 4 }}>
            <RocketLaunchIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
            <Typography variant="h6" color="secondary" fontWeight={700} gutterBottom>Our Mission</Typography>
            <Typography color="text.secondary">We are dedicated to providing a seamless and powerful tool for social media automation. We believe that technology should work for you, not against you, allowing you to focus on creating great content and engaging with your audience.</Typography>
          </Paper>
          <Paper elevation={3} sx={{ p: 4, flex: 1, textAlign: 'center', borderRadius: 4 }}>
            <Diversity3Icon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" color="success.main" fontWeight={700} gutterBottom>The Team</Typography>
            <Typography color="text.secondary">We are a small, passionate team of developers and marketers committed to building useful products. We are constantly listening to our users and improving Mockingbird to meet their evolving needs.</Typography>
          </Paper>
        </Stack>
      </Container>

      <Container maxWidth="md" sx={{ mb: 8, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom>Our Core Values</Typography>
        <Box sx={{ mt: 4 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} justifyContent="center" alignItems="center">
            <Paper elevation={2} sx={{ p: 3, flex: 1, textAlign: 'center', bgcolor: 'white', borderRadius: 2 }}>
              <SecurityIcon sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" fontWeight={600} gutterBottom>Privacy & Security</Typography>
              <Typography color="text.secondary">We prioritize the security of your data and connections above all else. Your trust is our top priority.</Typography>
            </Paper>
            <Paper elevation={2} sx={{ p: 3, flex: 1, textAlign: 'center', bgcolor: 'white', borderRadius: 2 }}>
              <BarChartIcon sx={{ fontSize: 32, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h6" fontWeight={600} gutterBottom>Simplicity</Typography>
              <Typography color="text.secondary">Our tools are designed to be intuitive and easy to use, so you can get started in minutes, not hours.</Typography>
            </Paper>
          </Stack>
        </Box>
      </Container>


      <Box component="footer" sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 4, textAlign: 'center', flexShrink: 0 }}>
        <Container maxWidth="md">
          <Typography variant="body2">© 2025 Mockingbird. All rights reserved.</Typography>
        </Container>
      </Box>
    </Box>
  );
}