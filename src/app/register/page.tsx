'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Box, TextField, Button, Typography, Paper, CircularProgress, Alert } from '@mui/material';

interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
}

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setIsLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/login?registered=true');
      } else {
        // Handle field-specific errors
        if (data.field) {
          setFieldErrors({ [data.field]: data.error });
        } else {
          setError(data.error || 'An error occurred');
        }
      }
    } catch (err) {
      console.error('Registration error:', err);
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
      sx={(theme) => ({ backgroundColor: theme.palette.background.default })}
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: '400px' }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Register
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
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
            error={!!fieldErrors.username}
            helperText={fieldErrors.username || 'Letters, numbers, underscores, and hyphens only'}
            autoComplete="username"
          />
          <TextField
            label="Email"
            variant="outlined"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            error={!!fieldErrors.email}
            helperText={fieldErrors.email}
            autoComplete="email"
          />
          <TextField
            label="Password"
            variant="outlined"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            error={!!fieldErrors.password}
            helperText={fieldErrors.password || 'At least 8 characters with letters and numbers'}
            autoComplete="new-password"
          />
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isLoading ? 'Registering...' : 'Register'}
          </Button>
        </Box>

        <Box mt={2} textAlign="center">
          <Typography variant="body2">
            Already have an account?{' '}
            <Link href="/login" passHref>
              <Button color="primary" size="small">
                Login
              </Button>
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
