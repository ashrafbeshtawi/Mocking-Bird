'use client';

import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Collapse,
  Skeleton,
  Pagination,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import { useState } from 'react';
import type { AnalyticsPost } from '@/types/analytics';

interface PostsTableProps {
  posts: AnalyticsPost[];
  loading: boolean;
  pagination: {
    page: number;
    totalPages: number;
    total: number;
  };
  filters: {
    platform: string;
    status: string;
  };
  onFilterChange: (key: 'platform' | 'status', value: string) => void;
  onPageChange: (page: number) => void;
}

const statusConfig = {
  success: { icon: CheckCircleIcon, color: '#22c55e', bgColor: '#22c55e15', label: 'Success' },
  partial_success: { icon: WarningIcon, color: '#f59e0b', bgColor: '#f59e0b15', label: 'Partial' },
  failed: { icon: ErrorIcon, color: '#ef4444', bgColor: '#ef444415', label: 'Failed' },
};

function PostRow({ post }: { post: AnalyticsPost }) {
  const [open, setOpen] = useState(false);
  const status = statusConfig[post.publish_status] || statusConfig.failed;
  const StatusIcon = status.icon;

  return (
    <>
      <TableRow sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
        <TableCell padding="checkbox">
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" color="text.secondary">
            {new Date(post.created_at).toLocaleDateString('en-US', {
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
            {post.content.substring(0, 50) || 'No content'}
            {post.content.length > 50 && '...'}
          </Typography>
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
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 1 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Full Content
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                {post.content || 'No content'}
              </Typography>
              {post.publish_report && (
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
                      {post.publish_report}
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

export function PostsTable({
  posts,
  loading,
  pagination,
  filters,
  onFilterChange,
  onPageChange,
}: PostsTableProps) {
  const handlePlatformChange = (event: SelectChangeEvent) => {
    onFilterChange('platform', event.target.value);
  };

  const handleStatusChange = (event: SelectChangeEvent) => {
    onFilterChange('status', event.target.value);
  };

  return (
    <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Recent Posts
            {pagination.total > 0 && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                ({pagination.total} total)
              </Typography>
            )}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Platform</InputLabel>
              <Select value={filters.platform} onChange={handlePlatformChange} label="Platform">
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="facebook">Facebook</MenuItem>
                <MenuItem value="twitter">Twitter</MenuItem>
                <MenuItem value="instagram">Instagram</MenuItem>
                <MenuItem value="telegram">Telegram</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select value={filters.status} onChange={handleStatusChange} label="Status">
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="success">Success</MenuItem>
                <MenuItem value="partial_success">Partial</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Date</TableCell>
              <TableCell>Content</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell padding="checkbox"><Skeleton variant="circular" width={24} height={24} /></TableCell>
                  <TableCell><Skeleton variant="text" width={100} /></TableCell>
                  <TableCell><Skeleton variant="text" width={200} /></TableCell>
                  <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
                </TableRow>
              ))
            ) : posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No posts found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => <PostRow key={post.id} post={post} />)
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination.totalPages > 1 && (
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
          <Pagination
            count={pagination.totalPages}
            page={pagination.page}
            onChange={(_, page) => onPageChange(page)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}
    </Paper>
  );
}
