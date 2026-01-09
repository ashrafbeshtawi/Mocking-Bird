'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Pagination,
  IconButton,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Interface for a single publish history record
interface PublishHistoryItem {
  id: number;
  content: string;
  publish_status: 'success' | 'partial_success' | 'failed';
  created_at: string;
}

interface PaginatedResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  history: PublishHistoryItem[];
}

export default function PublishHistoryComponent() {
  const theme = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial page from URL, default to 1
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [history, setHistory] = useState<PublishHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(1);
  const limit = 10; // items per page

  const fetchPublishHistory = useCallback(async (pageNumber: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/publish/publish-history?page=${pageNumber}&limit=${limit}`);

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `Backend error: ${response.statusText}`);
      }

      const result: PaginatedResponse = await response.json();
      setHistory(result.history || []);
      setTotalPages(result.totalPages || 1);
    } catch (err: unknown) {
      console.error('Error fetching publish history:', err);
      setError((err as Error)?.message || 'An unexpected error occurred while fetching publish history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublishHistory(page);
  }, [fetchPublishHistory, page]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    // Update URL without full navigation to preserve state
    router.push(`/history?page=${value}`, { scroll: false });
  };

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
        <>
          <TableContainer component={Paper} sx={{ boxShadow: theme.shadows[3] }}>
            <Table aria-label="publish history table">
              <TableHead>
                <TableRow sx={{ backgroundColor: theme.palette.grey[100] }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Content</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((item) => {
                  let statusIcon;
                  let statusColor: 'success' | 'error' | 'warning';
                  let statusLabel: string;

                  switch (item.publish_status) {
                    case 'success':
                      statusIcon = <CheckCircleOutlineIcon fontSize="small" />;
                      statusColor = 'success';
                      statusLabel = 'Success';
                      break;
                    case 'partial_success':
                      statusIcon = <WarningAmberIcon fontSize="small" />;
                      statusColor = 'warning';
                      statusLabel = 'Partial Success';
                      break;
                    case 'failed':
                      statusIcon = <ErrorOutlineIcon fontSize="small" />;
                      statusColor = 'error';
                      statusLabel = 'Failed';
                      break;
                    default:
                      statusIcon = <WarningAmberIcon fontSize="small" />;
                      statusColor = 'warning';
                      statusLabel = 'Unknown';
                  }

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(item.created_at).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {item.content.substring(0, 40) + (item.content.length > 40 ? '...' : '')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={statusIcon}
                          label={statusLabel}
                          color={statusColor}
                          variant="outlined"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      </TableCell>
                      <TableCell>
                        <a href={`/api/publish/download-report?id=${item.id}`} download>
                          <IconButton color="primary" aria-label="download report">
                            <DownloadForOfflineIcon />
                          </IconButton>
                        </a>
                        <a href={`/history/report?id=${item.id}&page=${page}`} style={{ marginLeft: '8px' }}>
                          <IconButton color="secondary" aria-label="view report">
                            <VisibilityIcon />
                          </IconButton>
                        </a>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination Controls */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
              shape="rounded"
            />
          </Box>
        </>
      )}
    </Container>
  );
}
