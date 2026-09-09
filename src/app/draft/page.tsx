import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  TextField,
  Grid,
  Chip,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Publish as PublishIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { PageHeader } from '@/components/PageHeader';

interface Draft {
  id: string;
  content: string;
  platforms: string[];
  mediaUrls: string[];
  status: 'draft' | 'pending' | 'published' | 'failed';
  createdAt: string;
  userId: string;
}

interface LinkedMediaTarget {
  id: string;
  name: string;
  username?: string;
  channel_title?: string;
  channel_id?: string;
  title?: string;
  page_id?: string;
}

interface LinkedTargets {
  facebook_pages: LinkedMediaTarget[];
  x_accounts: LinkedMediaTarget[];
  instagram_accounts: LinkedMediaTarget[];
  telegram_channels: LinkedMediaTarget[];
}

export default function DraftPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [linkedTargets, setLinkedTargets] = useState<LinkedTargets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [formData, setFormData] = useState<{ content: string; platforms: string[]; mediaUrls: string[] }>({ content: '', platforms: [], mediaUrls: [] });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>(
    { open: false, message: '', severity: 'success' }
  );

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load drafts
      const draftsResponse = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'list_drafts',
          arguments: {}
        })
      });

      if (!draftsResponse.ok) {
        throw new Error('Failed to load drafts');
      }

      const draftsData = await draftsResponse.json();

      if (draftsData.success) {
        setDrafts(draftsData.drafts || []);
      } else {
        throw new Error(draftsData.error || 'Failed to load drafts');
      }

      // Load linked targets
      const targetsResponse = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'list_linked_media_targets',
          arguments: {}
        })
      });

      if (!targetsResponse.ok) {
        throw new Error('Failed to load linked targets');
      }

      const targetsData = await targetsResponse.json();

      if (targetsData.success) {
        setLinkedTargets(targetsData.data || null);
      } else {
        console.error('Failed to load linked targets:', targetsData.error);
      }

    } catch (err) {
      setError((err as Error).message);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateDraft = async () => {
    try {
      setIsCreating(true);
      setError(null);

      if (!formData.content.trim()) {
        setSnackbar({ open: true, message: 'Content is required', severity: 'error' });
        return;
      }

      if (formData.platforms.length === 0) {
        setSnackbar({ open: true, message: 'At least one platform is required', severity: 'error' });
        return;
      }

      const response = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'create_draft_post',
          arguments: {
            content: formData.content,
            platforms: formData.platforms,
            mediaUrls: formData.mediaUrls
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create draft');
      }

      const data = await response.json();

      if (data.success) {
        setSnackbar({ open: true, message: 'Draft created successfully', severity: 'success' });
        setFormData({ content: '', platforms: [], mediaUrls: [] });
        await loadData(); // Reload drafts
      } else {
        throw new Error(data.error || 'Failed to create draft');
      }

    } catch (err) {
      setSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
      console.error('Error creating draft:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditDraft = (draft: Draft) => {
    setSelectedDraft(draft);
    setFormData({
      content: draft.content,
      platforms: draft.platforms,
      mediaUrls: draft.mediaUrls
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      if (!selectedDraft) return;

      const response = await fetch(`/api/mcp/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'update_draft',
          arguments: {
            draftId: selectedDraft.id,
            content: formData.content,
            platforms: formData.platforms,
            mediaUrls: formData.mediaUrls
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update draft');
      }

      const data = await response.json();

      if (data.success) {
        setSnackbar({ open: true, message: 'Draft updated successfully', severity: 'success' });
        setIsEditing(false);
        setSelectedDraft(null);
        setFormData({ content: '', platforms: [], mediaUrls: [] });
        await loadData(); // Reload drafts
      } else {
        throw new Error(data.error || 'Failed to update draft');
      }

    } catch (err) {
      setSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
      console.error('Error updating draft:', err);
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) {
      return;
    }

    try {
      const response = await fetch(`/api/mcp/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'delete_draft',
          arguments: { draftId }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete draft');
      }

      const data = await response.json();

      if (data.success) {
        setSnackbar({ open: true, message: 'Draft deleted successfully', severity: 'success' });
        await loadData(); // Reload drafts
      } else {
        throw new Error(data.error || 'Failed to delete draft');
      }

    } catch (err) {
      setSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
      console.error('Error deleting draft:', err);
    }
  };

  const handlePublishDraft = async (draftId: string) => {
    try {
      const response = await fetch(`/api/mcp/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'publish_draft',
          arguments: { draftId }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to publish draft');
      }

      const data = await response.json();

      if (data.success) {
        setSnackbar({ open: true, message: 'Draft published successfully', severity: 'success' });
        await loadData(); // Reload drafts
      } else {
        throw new Error(data.error || 'Failed to publish draft');
      }

    } catch (err) {
      setSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
      console.error('Error publishing draft:', err);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const platformConfig = {
      facebook: { color: '#1877F2', icon: '📘' },
      x: { color: '#000000', icon: 'X' },
      instagram: { color: '#E4405F', icon: '📷' },
      telegram: { color: '#0088CC', icon: '📱' },
    };

    const config = platformConfig[platform as keyof typeof platformConfig];
    if (!config) return null;

    return (
      <Chip
        label={platform}
        size="small"
        sx={{
          bgcolor: config.color + '20',
          color: config.color,
          fontWeight: 600,
          textTransform: 'capitalize',
        }}
      />
    );
  };

  const getStatusIcon = (status: Draft['status']) => {
    switch (status) {
      case 'draft':
        return <EditIcon sx={{ color: 'warning.main', fontSize: 16 }} />;
      case 'pending':
        return <CircularProgress size={16} sx={{ color: 'info.main' }} />;
      case 'published':
        return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16 }} />;
      case 'failed':
        return <ErrorIcon sx={{ color: 'error.main', fontSize: 16 }} />;
      default:
        return null;
    }
  };

  const getAllPlatforms = () => {
    const platforms = [];

    if (linkedTargets?.facebook_pages?.length) {
      platforms.push(...linkedTargets.facebook_pages.map(p => ({ id: p.page_id || p.id, name: p.name, type: 'facebook' as const })));
    }

    if (linkedTargets?.x_accounts?.length) {
      platforms.push(...linkedTargets.x_accounts.map(a => ({ id: a.id, name: a.name, type: 'x' as const })));
    }

    if (linkedTargets?.instagram_accounts?.length) {
      platforms.push(...linkedTargets.instagram_accounts.map(i => ({ id: i.id, name: i.username || i.name, type: 'instagram' as const })));
    }

    if (linkedTargets?.telegram_channels?.length) {
      platforms.push(...linkedTargets.telegram_channels.map(c => ({ id: c.channel_id || c.id, name: c.channel_title || c.title, type: 'telegram' as const })));
    }

    return platforms;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 2, sm: 3, md: 4 } }}>
      <Container maxWidth="lg">
        {/* Header */}
        <PageHeader
          eyebrow="Manage · Drafts"
          title={<>Draft Management</>}
          lead="Create, edit, and publish drafts to your social media platforms."
        />

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Create/Edit Draft Form */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                position: 'sticky',
                top: 80,
              }}
            >
              <Typography
                variant="h6"
                sx={{ mb: 2, fontFamily: 'var(--font-fraunces), Georgia, serif' }}
              >
                {isEditing ? 'Edit Draft' : 'Create New Draft'}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Content"
                  multiline
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your post content here..."
                  variant="outlined"
                  fullWidth
                  required
                />

                <FormControl fullWidth required>
                  <InputLabel>Platforms</InputLabel>
                  <Select
                    multiple
                    value={formData.platforms}
                    onChange={(e) => setFormData(prev => ({ ...prev, platforms: typeof e.target.value === 'string' ? [e.target.value] : e.target.value }))}
                    label="Platforms"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {getAllPlatforms().map((platform) => (
                      <MenuItem key={platform.id} value={platform.type}>
                        {platform.name} ({platform.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Media URLs (comma separated)"
                  value={formData.mediaUrls.join(', ')}
                  onChange={(e) => setFormData(prev => ({ ...prev, mediaUrls: e.target.value.split(',').map(url => url.trim()).filter(Boolean) }))}
                  placeholder="https://example.com/image1.jpg, https://example.com/video1.mp4"
                  variant="outlined"
                  fullWidth
                  helperText="Add media URLs that will be used for this draft"
                />

                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                  {isEditing ? (
                    <>
                      <Button
                        variant="contained"
                        onClick={handleSaveEdit}
                        disabled={isCreating}
                        startIcon={isCreating ? <CircularProgress size={20} /> : null}
                        sx={{ flex: 1, borderRadius: 3, textTransform: 'none' }}
                      >
                        Save Changes
                      </Button>
                      <IconButton
                        onClick={() => {
                          setIsEditing(false);
                          setSelectedDraft(null);
                          setFormData({ content: '', platforms: [], mediaUrls: [] });
                        }}
                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}
                      >
                        <CloseIcon />
                      </IconButton>
                    </>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleCreateDraft}
                      disabled={isCreating}
                      startIcon={isCreating ? <CircularProgress size={20} /> : <AddIcon />}
                      sx={{ flex: 1, borderRadius: 3, textTransform: 'none', fontWeight: 600 }}
                    >
                      {isCreating ? 'Creating...' : 'Create Draft'}
                    </Button>
                  )}
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Drafts List */}
          <Grid size={{ xs: 12, lg: 8 }}>
            {drafts.length === 0 ? (
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
                <Typography variant="h5" color="text.secondary" gutterBottom>
                  No drafts found
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Create your first draft using the form on the left.
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {drafts.map((draft) => (
                  <Grid key={draft.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: 4,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        height: '100%',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        },
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontFamily: 'var(--font-fraunces), Georgia, serif',
                              fontSize: '1.1rem',
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            Draft #{draft.id.slice(-6)}
                          </Typography>
                          {getStatusIcon(draft.status)}
                        </Box>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mb: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {draft.content || '(No content)'}
                        </Typography>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                          {draft.platforms.map((platform) => getPlatformIcon(platform)).filter(Boolean)}
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(draft.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </CardContent>

                      <CardActions sx={{ p: 2, pt: 0, justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditDraft(draft)}
                            sx={{
                              bgcolor: 'action.hover',
                              '&:hover': { bgcolor: 'action.selected' },
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>

                          <IconButton
                            size="small"
                            onClick={() => handleDeleteDraft(draft.id)}
                            sx={{
                              bgcolor: 'error.50',
                              color: 'error.main',
                              '&:hover': { bgcolor: 'error.100' },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>

                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handlePublishDraft(draft.id)}
                          startIcon={<PublishIcon fontSize="small" />}
                          sx={{
                            borderRadius: 3,
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          Publish
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}