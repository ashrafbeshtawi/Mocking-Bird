'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  Alert,
  AlertTitle,
  Paper,
  Chip,
  Pagination,
  IconButton,
  Tooltip,
  Fade,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Snackbar,
  Checkbox,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArticleIcon from '@mui/icons-material/Article';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

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
  index,
  isSelected,
  onSelect,
  onDelete,
  onClick,
  onCopy,
}: {
  item: PublishHistoryItem;
  index: number;
  isSelected: boolean;
  onSelect: (id: number, checked: boolean) => void;
  onDelete: (item: PublishHistoryItem) => void;
  onClick: (item: PublishHistoryItem) => void;
  onCopy: (content: string) => void;
}) {
  const status = statusConfig[item.publish_status] || statusConfig.failed;
  const StatusIcon = status.icon;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelect(item.id, e.target.checked);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy(item.content);
  };

  return (
    <Fade in timeout={300 + index * 100}>
      <Paper
        elevation={0}
        onClick={() => onClick(item)}
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: '1px solid',
          borderColor: isSelected ? '#E1306C' : 'divider',
          bgcolor: isSelected ? '#E1306C08' : 'background.paper',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          '&:hover': {
            borderColor: isSelected ? '#E1306C' : status.color,
            boxShadow: `0 4px 20px ${isSelected ? '#E1306C' : status.color}15`,
            transform: 'translateY(-2px)',
          },
        }}
      >
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Checkbox */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
            onClick={handleCheckboxClick}
          >
            <Checkbox
              checked={isSelected}
              onChange={handleCheckboxChange}
              sx={{
                p: 0.5,
                '&.Mui-checked': {
                  color: '#E1306C',
                },
              }}
            />
          </Box>

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
                <Tooltip title="Copy content">
                  <IconButton
                    size="small"
                    onClick={handleCopyClick}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: '#22c55e', bgcolor: '#22c55e10' },
                    }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download report">
                  <IconButton
                    size="small"
                    href={`/api/publish/download-report?id=${item.id}`}
                    download
                    onClick={handleDownloadClick}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete report">
                  <IconButton
                    size="small"
                    onClick={handleDeleteClick}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: '#ef4444', bgcolor: '#ef444410' },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
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
            <Skeleton variant="rounded" width={24} height={24} />
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

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<PublishHistoryItem | null>(null);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
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

  const fetchPublishHistory = useCallback(async (pageNumber: number) => {
    setLoading(true);
    setError(null);
    setSelectedIds(new Set()); // Clear selection on page change
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

  // Selection handlers
  const handleSelectItem = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(history.map((item) => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const isAllSelected = history.length > 0 && selectedIds.size === history.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < history.length;

  // Card click handler - navigate to report detail
  const handleCardClick = (item: PublishHistoryItem) => {
    router.push(`/history/report?id=${item.id}&page=${page}`);
  };

  // Copy handler
  const handleCopyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
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

  // Single delete handlers
  const handleDeleteClick = (item: PublishHistoryItem) => {
    setItemToDelete(item);
    setBulkDeleteMode(false);
    setDeleteDialogOpen(true);
  };

  // Bulk delete handlers
  const handleBulkDeleteClick = () => {
    setBulkDeleteMode(true);
    setItemToDelete(null);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
    setBulkDeleteMode(false);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      let body: { id?: number; ids?: number[] };

      if (bulkDeleteMode) {
        body = { ids: Array.from(selectedIds) };
      } else if (itemToDelete) {
        body = { id: itemToDelete.id };
      } else {
        return;
      }

      const response = await fetch('/api/publish/publish-history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete report(s)');
      }

      const result = await response.json();
      const deletedCount = result.deletedCount || 1;

      // Remove deleted items from local state
      if (bulkDeleteMode) {
        setHistory((prev) => prev.filter((item) => !selectedIds.has(item.id)));
        setTotal((prev) => prev - deletedCount);
        setSelectedIds(new Set());
      } else if (itemToDelete) {
        setHistory((prev) => prev.filter((item) => item.id !== itemToDelete.id));
        setTotal((prev) => prev - 1);
      }

      // If current page is now empty and not the first page, go to previous page
      const remainingItems = bulkDeleteMode
        ? history.length - selectedIds.size
        : history.length - 1;

      if (remainingItems === 0 && page > 1) {
        setPage(page - 1);
        router.push(`/history?page=${page - 1}`, { scroll: false });
      }

      setSnackbar({
        open: true,
        message: `${deletedCount} report${deletedCount > 1 ? 's' : ''} deleted successfully`,
        severity: 'success',
      });
    } catch (err: unknown) {
      console.error('Error deleting report(s):', err);
      setSnackbar({
        open: true,
        message: (err as Error)?.message || 'Failed to delete report(s)',
        severity: 'error',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      setBulkDeleteMode(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
              {/* Selection toolbar */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isSomeSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    sx={{
                      '&.Mui-checked, &.MuiCheckbox-indeterminate': {
                        color: '#E1306C',
                      },
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {selectedIds.size > 0
                      ? `${selectedIds.size} selected`
                      : 'Select all'}
                  </Typography>
                </Box>

                {selectedIds.size > 0 && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DeleteSweepIcon />}
                    onClick={handleBulkDeleteClick}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      borderColor: '#ef444450',
                      color: '#ef4444',
                      '&:hover': {
                        borderColor: '#ef4444',
                        bgcolor: '#ef444410',
                      },
                    }}
                  >
                    Delete {selectedIds.size} report{selectedIds.size > 1 ? 's' : ''}
                  </Button>
                )}
              </Paper>

              {/* History List */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {history.map((item, index) => (
                  <HistoryCard
                    key={item.id}
                    item={item}
                    index={index}
                    isSelected={selectedIds.has(item.id)}
                    onSelect={handleSelectItem}
                    onDelete={handleDeleteClick}
                    onClick={handleCardClick}
                    onCopy={handleCopyContent}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxWidth: 440,
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
              {bulkDeleteMode ? (
                <DeleteSweepIcon sx={{ color: '#ef4444' }} />
              ) : (
                <DeleteIcon sx={{ color: '#ef4444' }} />
              )}
            </Box>
            <Typography variant="h6" fontWeight={600}>
              {bulkDeleteMode
                ? `Delete ${selectedIds.size} Report${selectedIds.size > 1 ? 's' : ''}`
                : 'Delete Report'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {bulkDeleteMode
              ? `Are you sure you want to delete ${selectedIds.size} selected report${selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.`
              : 'Are you sure you want to delete this publish report? This action cannot be undone.'}
          </DialogContentText>
          {!bulkDeleteMode && itemToDelete && (
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
                {itemToDelete.content.substring(0, 80) || 'No text content'}
                {itemToDelete.content.length > 80 && '...'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(itemToDelete.created_at).toLocaleString()}
              </Typography>
            </Paper>
          )}
          {bulkDeleteMode && (
            <Paper
              elevation={0}
              sx={{
                mt: 2,
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                maxHeight: 150,
                overflow: 'auto',
              }}
            >
              {history
                .filter((item) => selectedIds.has(item.id))
                .map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      py: 0.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
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
                      {item.content.substring(0, 60) || 'No text content'}
                      {item.content.length > 60 && '...'}
                    </Typography>
                  </Box>
                ))}
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
            {deleting
              ? 'Deleting...'
              : bulkDeleteMode
              ? `Delete ${selectedIds.size} Report${selectedIds.size > 1 ? 's' : ''}`
              : 'Delete'}
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
