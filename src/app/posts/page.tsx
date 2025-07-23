'use client';

import { useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';

interface Post {
  id: string;
  story?: string;
  created_time?: string;
}

export default function PagePostsView() {
  const [pageId, setPageId] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetch = async () => {
    setError('');
    setPosts([]);
    setLoading(true);

    try {
      const res = await fetchWithAuth(`/api/page-posts?pageId=${pageId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setPosts(data.posts?.data || []);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: 10,
        px: 4,
        backgroundColor: 'background.default', // Use theme background color
      }}
    >
      <Paper elevation={3} sx={{ maxWidth: '700px', mx: 'auto', p: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
          📄 Facebook Page Posts Viewer
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Enter Facebook Page ID"
            variant="outlined"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            fullWidth
            sx={{ flexGrow: 1 }}
            disabled={loading}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleFetch}
            disabled={!pageId || loading}
            sx={{ height: '56px' }} // Match TextField height
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Fetch Posts'}
          </Button>
        </Box>

        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}

        {posts.length > 0 && (
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="simple table">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.200' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>🆔 ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>📝 Message</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>📅 Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell component="th" scope="row" sx={{ fontFamily: 'monospace' }}>
                      {post.id}
                    </TableCell>
                    <TableCell>
                      {post.story ? post.story : <em style={{ color: 'grey' }}>No story</em>}
                    </TableCell>
                    <TableCell>
                      {post.created_time
                        ? new Date(post.created_time).toLocaleString()
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {posts.length === 0 && !loading && !error && (
          <Typography color="text.secondary" variant="body2" fontStyle="italic">
            No posts to display.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
