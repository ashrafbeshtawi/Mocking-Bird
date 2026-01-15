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
  Paper,
  Chip,
  Pagination,
  IconButton,
  Tooltip,
  Fade,
  Skeleton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HistoryIcon from '@mui/icons-material/History';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArticleIcon from '@mui/icons-material/Article';

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

const statusConfig = {
  success: {
    icon: CheckCircleIcon,
    color: '#22c55e',
    bgColor: '#22c55e15',
    label: 'Published',
  },
  partial_success: {
    icon: WarningIcon,
    color: '#f59e0b',
    bgColor: '#f59e0b15',
    label: 'Partial',
  },
  failed: {
    icon: ErrorIcon,
    color: '#ef4444',
    bgColor: '#ef444415',
    label: 'Failed',
  },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function HistoryCard({
  item,
  page,
  index,
}: {
  item: PublishHistoryItem;
  page: number;
  index: number;
}) {
  const status = statusConfig[item.publish_status] || statusConfig.failed;
  const StatusIcon = status.icon;

  return (
    <Fade in timeout={300 + index * 100}>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: status.color,
            boxShadow: `0 4px 20px ${status.color}15`,
            transform: 'translateY(-2px)',
          },
        }}
      >
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Status indicator */}
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: status.bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <StatusIcon sx={{ color: status.color, fontSize: 24 }} />
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 1,
                mb: 1,
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {item.content.substring(0, 60) || 'No text content'}
                {item.content.length > 60 && '...'}
              </Typography>
              <Chip
                label={status.label}
                size="small"
                sx={{
                  bgcolor: status.bgColor,
                  color: status.color,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 24,
                  flexShrink: 0,
                }}
              />
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon
                  sx={{ fontSize: 14, color: 'text.secondary' }}
                />
                <Tooltip title={new Date(item.created_at).toLocaleString()}>
                  <Typography variant="caption" color="text.secondary">
                    {formatRelativeTime(item.created_at)}
                  </Typography>
                </Tooltip>
              </Box>

              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="View details">
                  <IconButton
                    size="small"
                    href={`/history/report?id=${item.id}&page=${page}`}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download report">
                  <IconButton
                    size="small"
                    href={`/api/publish/download-report?id=${item.id}`}
                    download
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Fade>
  );
}

function LoadingSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Paper
          key={i}
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Skeleton variant="rounded" width={48} height={48} />
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton variant="rounded" width={60} height={24} />
              </Box>
              <Skeleton variant="text" width="30%" height={20} />
            </Box>
          </Box>
        </Paper>
      ))}
    </Box>
  );
}

export default function PublishHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [history, setHistory] = useState<PublishHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const limit = 10;

  const fetchPublishHistory = useCallback(async (pageNumber: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/publish/publish-history?page=${pageNumber}&limit=${limit}`
      );

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

      const result: PaginatedResponse = await response.json();
      setHistory(result.history || []);
      setTotalPages(result.totalPages || 1);
      setTotal(result.total || 0);
    } catch (err: unknown) {
      console.error('Error fetching publish history:', err);
      setError(
        (err as Error)?.message ||
          'An unexpected error occurred while fetching publish history.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublishHistory(page);
  }, [fetchPublishHistory, page]);

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
    router.push(`/history?page=${value}`, { scroll: false });
  };

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
        {/* Header */}
        <Fade in timeout={600}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  background:
                    'linear-gradient(135deg, #1877f2 0%, #E1306C 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <HistoryIcon sx={{ color: '#fff', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{
                    background:
                      'linear-gradient(90deg, #1877f2, #E1306C, #F77737)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Publish History
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {total > 0
                    ? `${total} post${total !== 1 ? 's' : ''} published`
                    : 'Your publishing activity'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Fade>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        {/* Content */}
        {loading ? (
          <LoadingSkeleton />
        ) : history.length === 0 ? (
          <Fade in timeout={800}>
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: 4,
                border: '2px dashed',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <ArticleIcon
                sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No publishing history yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your published posts will appear here. Head to the Publish page
                to create your first post.
              </Typography>
            </Paper>
          </Fade>
        ) : (
          <Fade in timeout={800}>
            <Box>
              {/* History List */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {history.map((item, index) => (
                  <HistoryCard
                    key={item.id}
                    item={item}
                    page={page}
                    index={index}
                  />
                ))}
              </Box>

              {/* Pagination */}
              {totalPages > 1 && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    mt: 4,
                  }}
                >
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    shape="rounded"
                    sx={{
                      '& .MuiPaginationItem-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                </Box>
              )}
            </Box>
          </Fade>
        )}
      </Container>
    </Box>
  );
}
