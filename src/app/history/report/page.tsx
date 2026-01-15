'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Container,
  Box,
  Typography,
  Alert,
  AlertTitle,
  Paper,
  Button,
  Chip,
  Divider,
  Fade,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ArticleIcon from '@mui/icons-material/Article';
import TerminalIcon from '@mui/icons-material/Terminal';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface ReportData {
  id: number;
  content: string;
  publish_status: 'success' | 'partial_success' | 'failed';
  created_at: string;
  publish_report?: string;
}

const statusConfig = {
  success: {
    icon: CheckCircleIcon,
    color: '#22c55e',
    bgColor: '#22c55e15',
    label: 'Published Successfully',
    description: 'Your post was published to all selected destinations.',
  },
  partial_success: {
    icon: WarningIcon,
    color: '#f59e0b',
    bgColor: '#f59e0b15',
    label: 'Partially Published',
    description: 'Some destinations failed. Check the log for details.',
  },
  failed: {
    icon: ErrorIcon,
    color: '#ef4444',
    bgColor: '#ef444415',
    label: 'Publishing Failed',
    description: 'The post could not be published. Check the log for details.',
  },
};

function LoadingSkeleton() {
  return (
    <Box>
      <Skeleton variant="rounded" width={140} height={36} sx={{ mb: 4 }} />
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Skeleton variant="rounded" width={56} height={56} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="text" width="60%" height={24} />
        </Box>
      </Box>
      <Skeleton variant="rounded" height={200} sx={{ mb: 3 }} />
      <Skeleton variant="rounded" height={300} />
    </Box>
  );
}

export default function ReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get('id');
  const historyPage = searchParams.get('page') || '1';

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchReport = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/publish/publish-history?id=${id}`);

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Backend error: ${response.statusText}`
        );
      }

      const result: ReportData = await response.json();
      setReport(result);
    } catch (err: unknown) {
      console.error('Error fetching report:', err);
      setError(
        (err as Error)?.message ||
          'An unexpected error occurred while fetching the report.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (reportId) {
      fetchReport(reportId);
    } else {
      setLoading(false);
      setError('No report ID provided.');
    }
  }, [fetchReport, reportId]);

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!report) return;

    setDeleting(true);
    try {
      const response = await fetch('/api/publish/publish-history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id: report.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete report');
      }

      setSnackbar({
        open: true,
        message: 'Report deleted successfully',
        severity: 'success',
      });

      // Redirect back to history page after a short delay
      setTimeout(() => {
        router.push(`/history?page=${historyPage}`);
      }, 1000);
    } catch (err: unknown) {
      console.error('Error deleting report:', err);
      setSnackbar({
        open: true,
        message: (err as Error)?.message || 'Failed to delete report',
        severity: 'error',
      });
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleCopyContent = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report.content);
      setSnackbar({
        open: true,
        message: 'Content copied to clipboard',
        severity: 'success',
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      setSnackbar({
        open: true,
        message: 'Failed to copy content',
        severity: 'error',
      });
    }
  };

  const status = report
    ? statusConfig[report.publish_status] || statusConfig.failed
    : null;
  const StatusIcon = status?.icon;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, rgba(25,118,210,0.05) 0%, rgba(255,255,255,0) 50%)',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        ) : !report ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <AlertTitle>Not Found</AlertTitle>
            Report not found.
          </Alert>
        ) : (
          <Fade in timeout={600}>
            <Box>
              {/* Back Button */}
              <Link href={`/history?page=${historyPage}`} passHref>
                <Button
                  variant="text"
                  startIcon={<ArrowBackIcon />}
                  sx={{
                    mb: 3,
                    color: 'text.secondary',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  Back to History
                </Button>
              </Link>

              {/* Status Header */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: status?.color,
                  bgcolor: status?.bgColor,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 1,
                    }}
                  >
                    {StatusIcon && (
                      <StatusIcon sx={{ color: status?.color, fontSize: 32 }} />
                    )}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" fontWeight="bold">
                      {status?.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {status?.description}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={handleCopyContent}
                      sx={{
                        borderRadius: 2,
                        borderColor: '#22c55e50',
                        color: '#22c55e',
                        '&:hover': {
                          borderColor: '#22c55e',
                          bgcolor: '#22c55e10',
                        },
                      }}
                    >
                      Copy
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DownloadIcon />}
                      href={`/api/publish/download-report?id=${report.id}`}
                      download
                      sx={{ borderRadius: 2 }}
                    >
                      Download
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={handleDeleteClick}
                      sx={{
                        borderRadius: 2,
                        borderColor: '#ef444450',
                        color: '#ef4444',
                        '&:hover': {
                          borderColor: '#ef4444',
                          bgcolor: '#ef444410',
                        },
                      }}
                    >
                      Delete
                    </Button>
                  </Box>
                </Box>
              </Paper>

              {/* Post Content */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
                >
                  <ArticleIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    Post Content
                  </Typography>
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    mb: 2,
                  }}
                >
                  {report.content || 'No text content'}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarTodayIcon
                    sx={{ color: 'text.secondary', fontSize: 16 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Published on{' '}
                    {new Date(report.created_at).toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Box>
              </Paper>

              {/* Publish Log */}
              {report.publish_report && (
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 2,
                      bgcolor: 'grey.50',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <TerminalIcon
                      sx={{ color: 'text.secondary', fontSize: 20 }}
                    />
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                    >
                      Publish Log
                    </Typography>
                    <Chip
                      label={`${report.publish_report.split('\n').length} entries`}
                      size="small"
                      sx={{
                        ml: 'auto',
                        height: 20,
                        fontSize: '0.7rem',
                        bgcolor: 'grey.200',
                      }}
                    />
                  </Box>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: '#1e1e1e',
                      maxHeight: 400,
                      overflow: 'auto',
                    }}
                  >
                    <Typography
                      component="pre"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        lineHeight: 1.6,
                        color: '#d4d4d4',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        m: 0,
                      }}
                    >
                      {report.publish_report.split('\n').map((line, i) => {
                        // Color code different log types
                        let color = '#d4d4d4';
                        if (line.includes('ERROR')) color = '#f87171';
                        else if (line.includes('WARN')) color = '#fbbf24';
                        else if (line.includes('success')) color = '#4ade80';
                        else if (line.includes('Starting')) color = '#60a5fa';

                        return (
                          <Box
                            key={i}
                            component="span"
                            sx={{
                              display: 'block',
                              color,
                              '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                              px: 1,
                              mx: -1,
                              borderRadius: 0.5,
                            }}
                          >
                            {line}
                          </Box>
                        );
                      })}
                    </Typography>
                  </Box>
                </Paper>
              )}
            </Box>
          </Fade>
        )}
      </Container>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxWidth: 400,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: '#ef444415',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DeleteIcon sx={{ color: '#ef4444' }} />
            </Box>
            <Typography variant="h6" fontWeight={600}>
              Delete Report
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this publish report? This action
            cannot be undone.
          </DialogContentText>
          {report && (
            <Paper
              elevation={0}
              sx={{
                mt: 2,
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {report.content.substring(0, 80) || 'No text content'}
                {report.content.length > 80 && '...'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(report.created_at).toLocaleString()}
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleDeleteCancel}
            disabled={deleting}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 3,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            disabled={deleting}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 3,
              bgcolor: '#ef4444',
              '&:hover': {
                bgcolor: '#dc2626',
              },
            }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
