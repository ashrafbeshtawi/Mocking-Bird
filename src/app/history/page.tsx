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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import ArticleIcon from '@mui/icons-material/Article';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import TelegramIcon from '@mui/icons-material/Telegram';

interface PublishDestination {
  platform: 'facebook' | 'twitter' | 'instagram' | 'telegram';
  account_id: string;
  account_name?: string;
  post_type?: 'feed' | 'story';
  success: boolean;
}

interface PublishHistoryItem {
  id: number;
  content: string;
  publish_status: 'success' | 'partial_success' | 'failed';
  publish_report?: string;
  publish_destinations?: PublishDestination[];
  created_at: string;
}

const platformConfig = {
  facebook: { icon: FacebookIcon, color: '#1877f2', label: 'Facebook' },
  twitter: { icon: TwitterIcon, color: '#1da1f2', label: 'Twitter/X' },
  instagram: { icon: InstagramIcon, color: '#E1306C', label: 'Instagram' },
  telegram: { icon: TelegramIcon, color: '#0088cc', label: 'Telegram' },
};

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

function HistoryRow({
  item,
  isSelected,
  onSelect,
  onDelete,
  onCopy,
  expandedId,
  onToggleExpand,
}: {
  item: PublishHistoryItem;
  isSelected: boolean;
  onSelect: (id: number, checked: boolean) => void;
  onDelete: (item: PublishHistoryItem) => void;
  onCopy: (content: string) => void;
  expandedId: number | null;
  onToggleExpand: (id: number) => void;
}) {
  const status = statusConfig[item.publish_status] || statusConfig.failed;
  const StatusIcon = status.icon;
  const isExpanded = expandedId === item.id;

  return (
    <>
      <TableRow
        sx={{
          bgcolor: isSelected ? '#E1306C08' : 'transparent',
          '&:hover': { bgcolor: isSelected ? '#E1306C12' : 'action.hover' },
        }}
      >
        <TableCell padding="checkbox">
          <Checkbox
            checked={isSelected}
            onChange={(e) => onSelect(item.id, e.target.checked)}
            sx={{
              '&.Mui-checked': {
                color: '#E1306C',
              },
            }}
          />
        </TableCell>
        <TableCell padding="checkbox">
          <IconButton size="small" onClick={() => onToggleExpand(item.id)}>
            {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" color="text.secondary">
            {new Date(item.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography
            variant="body2"
            sx={{
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.content.substring(0, 50) || 'No content'}
            {item.content.length > 50 && '...'}
          </Typography>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {item.publish_destinations && item.publish_destinations.length > 0 ? (
              // Get unique platforms
              [...new Set(item.publish_destinations.map(d => d.platform))].map((platform) => {
                const config = platformConfig[platform];
                if (!config) return null;
                const PlatformIcon = config.icon;
                const destinationsForPlatform = item.publish_destinations!.filter(d => d.platform === platform);
                const allSuccess = destinationsForPlatform.every(d => d.success);
                const someSuccess = destinationsForPlatform.some(d => d.success);
                return (
                  <Tooltip
                    key={platform}
                    title={`${config.label}: ${destinationsForPlatform.length} destination${destinationsForPlatform.length > 1 ? 's' : ''} (${allSuccess ? 'all success' : someSuccess ? 'partial' : 'failed'})`}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: 1,
                        bgcolor: allSuccess ? `${config.color}15` : someSuccess ? '#f59e0b15' : '#ef444415',
                        border: '1px solid',
                        borderColor: allSuccess ? `${config.color}30` : someSuccess ? '#f59e0b30' : '#ef444430',
                      }}
                    >
                      <PlatformIcon sx={{ fontSize: 16, color: allSuccess ? config.color : someSuccess ? '#f59e0b' : '#ef4444' }} />
                    </Box>
                  </Tooltip>
                );
              })
            ) : (
              <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.75rem' }}>
                —
              </Typography>
            )}
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            icon={<StatusIcon sx={{ fontSize: 16 }} />}
            label={status.label}
            size="small"
            sx={{
              bgcolor: status.bgColor,
              color: status.color,
              fontWeight: 600,
              '& .MuiChip-icon': { color: status.color },
            }}
          />
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Copy content">
              <IconButton
                size="small"
                onClick={() => onCopy(item.content)}
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
                onClick={() => onDelete(item)}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: '#ef4444', bgcolor: '#ef444410' },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 1 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Full Content
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                {item.content || 'No content'}
              </Typography>
              {item.publish_report && (
                <>
                  <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                    Publish Report
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: 'grey.50',
                      borderRadius: 2,
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{ fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}
                    >
                      {item.publish_report}
                    </Typography>
                  </Paper>
                </>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <TableBody>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i}>
          <TableCell padding="checkbox">
            <Skeleton variant="circular" width={24} height={24} />
          </TableCell>
          <TableCell padding="checkbox">
            <Skeleton variant="circular" width={24} height={24} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={100} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={200} />
          </TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Skeleton variant="rounded" width={28} height={28} />
              <Skeleton variant="rounded" width={28} height={28} />
            </Box>
          </TableCell>
          <TableCell>
            <Skeleton variant="rounded" width={80} height={24} />
          </TableCell>
          <TableCell>
            <Skeleton variant="rounded" width={100} height={24} />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

export default function PublishHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialStatus = searchParams.get('status') || 'all';
  const initialPlatform = searchParams.get('platform') || 'all';

  const [history, setHistory] = useState<PublishHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [platformFilter, setPlatformFilter] = useState<string>(initialPlatform);
  const limit = 10;

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);

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

  const fetchPublishHistory = useCallback(async (pageNumber: number, status: string, platform: string) => {
    setLoading(true);
    setError(null);
    setSelectedIds(new Set());
    setExpandedId(null);
    try {
      let url = `/api/publish/publish-history?page=${pageNumber}&limit=${limit}`;
      if (status !== 'all') {
        url += `&status=${status}`;
      }
      if (platform !== 'all') {
        url += `&platform=${platform}`;
      }
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/auth';
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `Backend error: ${response.statusText}`);
      }

      const result: PaginatedResponse = await response.json();
      setHistory(result.history || []);
      setTotalPages(result.totalPages || 1);
      setTotal(result.total || 0);
    } catch (err: unknown) {
      console.error('Error fetching publish history:', err);
      setError((err as Error)?.message || 'An unexpected error occurred while fetching publish history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublishHistory(page, statusFilter, platformFilter);
  }, [fetchPublishHistory, page, statusFilter, platformFilter]);

  const buildUrlParams = (newPage: number, newStatus: string, newPlatform: string) => {
    const params = new URLSearchParams();
    params.set('page', newPage.toString());
    if (newStatus !== 'all') params.set('status', newStatus);
    if (newPlatform !== 'all') params.set('platform', newPlatform);
    return params.toString();
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    router.push(`/history?${buildUrlParams(value, statusFilter, platformFilter)}`, { scroll: false });
  };

  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    const newStatus = event.target.value;
    setStatusFilter(newStatus);
    setPage(1);
    router.push(`/history?${buildUrlParams(1, newStatus, platformFilter)}`, { scroll: false });
  };

  const handlePlatformFilterChange = (event: SelectChangeEvent) => {
    const newPlatform = event.target.value;
    setPlatformFilter(newPlatform);
    setPage(1);
    router.push(`/history?${buildUrlParams(1, statusFilter, newPlatform)}`, { scroll: false });
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

  const handleToggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const isAllSelected = history.length > 0 && selectedIds.size === history.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < history.length;

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
      const remainingItems = bulkDeleteMode ? history.length - selectedIds.size : history.length - 1;

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
        background: 'linear-gradient(180deg, rgba(25,118,210,0.05) 0%, rgba(255,255,255,0) 50%)',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
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
                    background: 'linear-gradient(135deg, #1877f2 0%, #E1306C 100%)',
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
                      fontSize: { xs: '1.75rem', sm: '2.125rem' },
                      background: 'linear-gradient(90deg, #1877f2, #E1306C, #F77737)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Publish History
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {total > 0 ? `${total} post${total !== 1 ? 's' : ''} published` : 'Your publishing activity'}
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
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          {/* Toolbar */}
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isSomeSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  disabled={history.length === 0}
                  sx={{
                    '&.Mui-checked, &.MuiCheckbox-indeterminate': {
                      color: '#E1306C',
                    },
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
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
                  Delete {selectedIds.size}
                </Button>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 130 } }}>
                <InputLabel>Platform</InputLabel>
                <Select value={platformFilter} onChange={handlePlatformFilterChange} label="Platform">
                  <MenuItem value="all">All Platforms</MenuItem>
                  <MenuItem value="facebook">Facebook</MenuItem>
                  <MenuItem value="twitter">Twitter/X</MenuItem>
                  <MenuItem value="instagram">Instagram</MenuItem>
                  <MenuItem value="telegram">Telegram</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 130 } }}>
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} onChange={handleStatusFilterChange} label="Status">
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="success">Published</MenuItem>
                  <MenuItem value="partial_success">Partial</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Table */}
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell padding="checkbox" />
                  <TableCell padding="checkbox" />
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Content</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Platforms</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              {loading ? (
                <LoadingSkeleton />
              ) : history.length === 0 ? (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <ArticleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No publishing history yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Your published posts will appear here. Head to the Publish page to create your first post.
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : (
                <TableBody>
                  {history.map((item) => (
                    <HistoryRow
                      key={item.id}
                      item={item}
                      isSelected={selectedIds.has(item.id)}
                      onSelect={handleSelectItem}
                      onDelete={handleDeleteClick}
                      onCopy={handleCopyContent}
                      expandedId={expandedId}
                      onToggleExpand={handleToggleExpand}
                    />
                  ))}
                </TableBody>
              )}
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box
              sx={{
                p: 2,
                display: 'flex',
                justifyContent: 'center',
                borderTop: '1px solid',
                borderColor: 'divider',
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
        </Paper>
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
              {bulkDeleteMode ? <DeleteSweepIcon sx={{ color: '#ef4444' }} /> : <DeleteIcon sx={{ color: '#ef4444' }} />}
            </Box>
            <Typography variant="h6" fontWeight={600}>
              {bulkDeleteMode ? `Delete ${selectedIds.size} Report${selectedIds.size > 1 ? 's' : ''}` : 'Delete Report'}
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
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleDeleteCancel} disabled={deleting} sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}>
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
            {deleting ? 'Deleting...' : bulkDeleteMode ? `Delete ${selectedIds.size} Report${selectedIds.size > 1 ? 's' : ''}` : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
