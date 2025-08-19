'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  AlertTitle,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid,
} from '@mui/material';
import TwitterIcon from '@mui/icons-material/Twitter';
import FacebookIcon from '@mui/icons-material/Facebook';
import { fetchWithAuth } from '@/lib/fetch';

// Interface for a single publish history record
interface PublishHistoryItem {
  id: number;
  content: string;
  successful_twitter: string[];
  successful_facebook: string[];
  failed_twitter: string[];
  failed_facebook: string[];
  created_at: string;
}

export default function PublishHistoryComponent() {
  const theme = useTheme();
  const [history, setHistory] = useState<PublishHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPublishHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/publish/publish-history');

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login if unauthorized
          window.location.href = '/login';
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `Backend error: ${response.statusText}`);
      }

      const result = await response.json();
      setHistory(result.history || []);
    } catch (err: unknown) {
      console.error('Error fetching publish history:', err);
      setError((err as Error)?.message || 'An unexpected error occurred while fetching publish history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublishHistory();
  }, [fetchPublishHistory]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: theme.typography.fontWeightBold, mb: 3 }}>
        Publish History
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {history.length === 0 ? (
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No publishing history found. Start publishing to see your past posts here.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: theme.shadows[3] }}>
          <Table aria-label="publish history table">
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.grey[100] }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Content</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>Successful Platforms</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>Failed Platforms</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(item.created_at).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {item.content}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Grid container spacing={1}>
                      {item.successful_facebook.map((name, index) => (
                        <Grid item key={`fb-success-${index}`}>
                          <Chip
                            icon={<FacebookIcon sx={{ fontSize: 16 }} />}
                            label={name}
                            color="success"
                            variant="outlined"
                            sx={{ mr: 1, mb: 1 }}
                          />
                        </Grid>
                      ))}
                      {item.successful_twitter.map((username, index) => (
                        <Grid item key={`x-success-${index}`}>
                          <Chip
                            icon={<TwitterIcon sx={{ fontSize: 16 }} />}
                            label={`@${username}`}
                            color="success"
                            variant="outlined"
                            sx={{ mb: 1 }}
                          />
                        </Grid>
                      ))}
                      {(item.successful_facebook.length === 0 && item.successful_twitter.length === 0) && (
                         <Typography variant="body2" color="text.secondary" sx={{ml: 1}}>N/A</Typography>
                      )}
                    </Grid>
                  </TableCell>
                  <TableCell>
                    <Grid container spacing={1}>
                      {item.failed_facebook.map((name, index) => (
                        <Grid item key={`fb-failed-${index}`}>
                          <Chip
                            icon={<FacebookIcon sx={{ fontSize: 16 }} />}
                            label={name}
                            color="error"
                            variant="outlined"
                            sx={{ mr: 1, mb: 1 }}
                          />
                        </Grid>
                      ))}
                      {item.failed_twitter.map((username, index) => (
                        <Grid item key={`x-failed-${index}`}>
                          <Chip
                            icon={<TwitterIcon sx={{ fontSize: 16 }} />}
                            label={`@${username}`}
                            color="error"
                            variant="outlined"
                            sx={{ mb: 1 }}
                          />
                        </Grid>
                      ))}
                       {(item.failed_facebook.length === 0 && item.failed_twitter.length === 0) && (
                         <Typography variant="body2" color="text.secondary" sx={{ml: 1}}>N/A</Typography>
                      )}
                    </Grid>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}