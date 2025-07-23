'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const { token } = await res.json();
      sessionStorage.setItem('token', token);
      router.push('/');
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      sx={{ backgroundColor: 'background.default' }} // Use theme background color
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
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Username"
            variant="outlined"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <TextField
            label="Password"
            variant="outlined"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button variant="contained" color="primary" type="submit">
            Login
          </Button>
        </Box>
        <Box mt={2} textAlign="center">
          <Typography variant="body2">
            Do not have an account?{' '}
            <Link href="/register" passHref>
              <Button color="primary" size="small">Register</Button>
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
