'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    if (res.ok) {
      router.push('/login');
    } else {
      const { error } = await res.json();
      setError(error || 'An error occurred');
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
            label="Email"
            variant="outlined"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            Register
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
