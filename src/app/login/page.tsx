'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Box, TextField, Button, Typography, Paper, CircularProgress } from '@mui/material';
import { useAuth } from '../hooks/AuthProvider';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { isLoggedIn, checkAuth } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      router.push('/dashboard');
    }
  }, [isLoggedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include', // Important: receive and store cookies
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Re-check auth to update the global state
        await checkAuth();
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      sx={{ backgroundColor: 'background.default' }}
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: '400px' }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Login
        </Typography>

        {error && (
          <Typography color="error" align="center" gutterBottom>
            {error}
          </Typography>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <TextField
            label="Username"
            variant="outlined"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isLoading}
            autoComplete="username"
          />
          <TextField
            label="Password"
            variant="outlined"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            autoComplete="current-password"
          />
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </Box>

        <Box mt={2} textAlign="center">
          <Typography variant="body2">
            Do not have an account?{' '}
            <Link href="/register" passHref>
              <Button color="primary" size="small">
                Register
              </Button>
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
