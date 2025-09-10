'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
  TextField,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Paper,
  Divider,
  useTheme,
  Grid,
  IconButton, // Added for emoji button
  Popover, // Added for emoji picker
  Tabs, // Added for emoji categories
  Tab, // Added for emoji categories
} from '@mui/material';
import TwitterIcon from '@mui/icons-material/Twitter';
import FacebookIcon from '@mui/icons-material/Facebook';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt'; // Added for emoji icon
import { fetchWithAuth } from '@/lib/fetch';

// Define interfaces for connected pages and accounts
interface ConnectedPage {
  page_id: string;
  page_name: string;
}

interface ConnectedXAccount {
  id: string;
  name: string;
}

// Twitter character limit
const TWITTER_CHAR_LIMIT = 280;

export default function PublishComponent() {
  const theme = useTheme();
  const [facebookPages, setFacebookPages] = useState<ConnectedPage[]>([]);
  const [xAccounts, setXAccounts] = useState<ConnectedXAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{ message: string; details?: unknown[] } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [postText, setPostText] = useState<string>('');
  const [selectedFacebookPages, setSelectedFacebookPages] = useState<string[]>([]);
  const [selectedXAccounts, setSelectedXAccounts] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishResults, setPublishResults] = useState<{ successful: unknown[]; failed: unknown[] } | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null); // State for emoji popover anchor
  const [emojiCategory, setEmojiCategory] = useState(0); // 0: History, 1: Smileys, ...
  const [emojiHistory, setEmojiHistory] = useState<string[]>([]); // Stores last used emojis

  // Load emoji history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('emojiHistory');
    if (stored) {
      try {
        setEmojiHistory(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const charCount = postText.length;
  const isTwitterWarning = charCount > TWITTER_CHAR_LIMIT && selectedXAccounts.length > 0;

  const handleEmojiClick = (emoji: string) => {
    setPostText((prevText) => prevText + emoji);
    setEmojiHistory((prev) => {
      const filtered = prev.filter((e) => e !== emoji);
      const updated = [emoji, ...filtered].slice(0, 16);
      localStorage.setItem('emojiHistory', JSON.stringify(updated));
      return updated;
    });
  } // Do not close popover after selecting emoji

  const handleClearEmojiHistory = () => {
    setEmojiHistory([]);
    localStorage.removeItem('emojiHistory');
  };

  const handlePopoverOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }

  const handlePopoverClose = () => {
    setAnchorEl(null);
  }

  const handleCategoryChange = (_event: React.SyntheticEvent, newValue: number) => {
    setEmojiCategory(newValue);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'emoji-popover' : undefined;

  // Emoji categories (History first)
  const emojiCategories = [
    {
      label: '⌛',
      emojis: emojiHistory.length > 0 ? emojiHistory : [''],
    },
    {
      label: '😀',
      emojis: ['😀','😂','😊','😍','🤩','😎','🥳','😇','😉','😜','😭','😡','😱','😴','🤗','😏','😅','😬','🤔','😤','😢','😆','😃','😄','😁','😚','😘','😋','😌','😝','😺','😸','😹','😻','😼','😽','🙀','😿','😾'],
    },
    {
      label: '🐶',
      emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🦄','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷','🦂'],
    },
    {
      label: '🍏',
      emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶','🫑','🌽','🥕','🧄','🧅','🥔','🍠','🥐','🍞','🥖','🥨','🥯','🥞','🧇','🧀','🍖','🍗','🥩','🥓','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🥙','🧆','🥚','🍳','🥘','🍲','🥣','🥗','🍿','🧈','🧂','🥫'],
    },
    {
      label: '⚽',
      emojis: ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🥅','🏒','🏑','🏏','⛳','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛷','⛸','🥌','🎿','⛷','🏂','🪂','🏋️‍♂️','🏋️‍♀️','🤼‍♂️','🤼‍♀️','🤸‍♂️','🤸‍♀️','⛹️‍♂️','⛹️‍♀️','🤺','🤾‍♂️','🤾‍♀️','🏇','🏄‍♂️','🏄‍♀️','🏊‍♂️','🏊‍♀️','🤽‍♂️','🤽‍♀️','🚣‍♂️','🚣‍♀️','🧗‍♂️','🧗‍♀️','🚵‍♂️','🚵‍♀️','🚴‍♂️','🚴‍♀️'],
    },
    {
      label: '💡',
      emojis: ['👍', '⚠️', '📌','❤️','🔥','💯','✨','🚀','💡','👏','🎉','🙌','🙏','💪','⭐','🌟','💥','💫','🌀','💤','💢','💦','💨','🕳','💣','💎','🔔','🔑','🔒','🔓','🔨','🛡','🧭','🧱','🧲','🧪','🧫','🧬','🧯','🛒','🚪','🛏','🛋','🚽','🚿','🛁','🧴','🧷','🧹','🧺','🧻','🧼','🧽'],
    },
  ];

  const fetchConnectedPages = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/facebook/get-pages');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch Facebook pages.');
      }
      const result = await response.json();
      setFacebookPages(result.pages);
    } catch (err: unknown) {
      console.error('Error fetching Facebook pages:', err);
      setError({ message: (err as Error)?.message || 'An unexpected error occurred while fetching Facebook pages.' });
    }
  }, []);

  const fetchConnectedXAccounts = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/twitter/get-accounts');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch X accounts.');
      }
      const result = await response.json();
      setXAccounts(result.accounts);
    } catch (err: unknown) {
      console.error('Error fetching X accounts:', err);
      setError({ message: (err as Error)?.message || 'An unexpected error occurred while fetching X accounts.' });
    }
  }, []);

  // 💡 Add this new useEffect hook
  // It runs whenever facebookPages or xAccounts arrays are populated.
  // It automatically selects all IDs from the fetched data.
  useEffect(() => {
    if (facebookPages.length > 0) {
      setSelectedFacebookPages(facebookPages.map(page => page.page_id));
    }
    if (xAccounts.length > 0) {
      setSelectedXAccounts(xAccounts.map(account => account.id));
    }
  }, [facebookPages, xAccounts]);

  // Initial data fetch on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([fetchConnectedPages(), fetchConnectedXAccounts()]);
      setLoading(false);
    };
    fetchData();
  }, [fetchConnectedPages, fetchConnectedXAccounts]);

  // Handle checkbox change for Facebook pages
  const handleFacebookChange = (pageId: string) => {
    setSelectedFacebookPages((prev) =>
      prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]
    );
  };

  // Handle checkbox change for X accounts
  const handleXChange = (accountId: string) => {
    setSelectedXAccounts((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    );
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);
    setSuccess(null);

    if (selectedFacebookPages.length === 0 && selectedXAccounts.length === 0) {
      setError({ message: 'Please select at least one page or account to publish to.' });
      setIsPublishing(false);
      return;
    }

    if (postText.trim() === '') {
      setError({ message: 'Post text cannot be empty.' });
      setIsPublishing(false);
      return;
    }

    const postData = {
      text: postText,
      facebookPages: selectedFacebookPages,
      xAccounts: selectedXAccounts,
    };

    try {
      const response = await fetchWithAuth('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      const responseData = await response.json();

      if (response.status === 207) { // Partial success
        setPublishResults(responseData);
        setSuccess('Some posts were published successfully, but others failed. See details below.');
        setError(null);
      } else if (!response.ok) {
        setError({ message: responseData.error || 'Failed to publish post.', details: responseData.details });
        setSuccess(null);
        setPublishResults(null);
      } else { // Full success
        setSuccess('🎉 Your post has been published successfully!');
        setPublishResults(responseData);
        setError(null);
        setPostText('');
        // This resets the selection after a successful publish
        setSelectedFacebookPages(facebookPages.map(page => page.page_id));
        setSelectedXAccounts(xAccounts.map(account => account.id));
      }
    } catch (err: unknown) {
      console.error('Publishing error:', err);
      setError({ message: (err as Error)?.message || 'An unexpected error occurred during publishing.' });
      setSuccess(null);
      setPublishResults(null);
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const allConnectedAccounts = [...facebookPages, ...xAccounts];

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: theme.typography.fontWeightBold }}>
        Publish to Social Media
      </Typography>
      <Paper elevation={3} sx={{ p: 4, mt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>Error</AlertTitle>
            {error.message}
            {error.details && (
              <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                {error.details.map((detail, index) => (
                  <Typography component="li" variant="body2" key={index}>
                    {String(detail)}
                  </Typography>
                ))}
              </Box>
            )}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <AlertTitle>Success</AlertTitle>
            {success}
            {publishResults?.successful && publishResults.successful.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Successfully Published To:</Typography>
                <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                  {publishResults.successful.map((item: unknown, index: number) => (
                    <Typography component="li" variant="body2" key={index}>
                      {(item as { platform: string; page_id: string; account_id: string }).platform === 'facebook'
                        ? `Facebook Page: ${(item as { page_id: string }).page_id}`
                        : `X Account: ${(item as { account_id: string }).account_id}`}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}
            {publishResults?.failed && publishResults.failed.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="error">Failed To Publish To:</Typography>
                <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                  {publishResults.failed.map((item: unknown, index: number) => (
                    <Typography component="li" variant="body2" key={index}>
                      {(item as { platform: string; page_id?: string; account_id?: string; error?: { message?: string; code?: string } }).platform === 'facebook'
                        ? `Facebook Page: ${(item as { page_id?: string }).page_id}`
                        : `X Account: ${(item as { account_id?: string }).account_id}`} - {(item as { error?: { message?: string } }).error?.message || 'Unknown error'} (Code: {(item as { error?: { code?: string } }).error?.code || 'N/A'})
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}
          </Alert>
        )}

        {allConnectedAccounts.length === 0 ? (
          <Box sx={{ textAlign: 'center', my: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No accounts are connected. Please connect your Facebook Pages and X accounts first.
            </Typography>
          </Box>
        ) : (
          <>
            <TextField
              label="What's on your mind?"
              multiline
              rows={6}
              fullWidth
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              variant="outlined"
              sx={{ mb: 2 }}
              InputProps={{
                style: { fontSize: '1.1rem' },
                // 💡 Add textAlign property to align the text to the right
                sx: { textAlign: 'right', direction: 'rtl' }
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <IconButton aria-describedby={id} onClick={handlePopoverOpen} color="primary">
                <SentimentSatisfiedAltIcon />
              </IconButton>
              <Popover
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={handlePopoverClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                disableRestoreFocus
              >
                <Box sx={{ width: 550 }}>
                  <Tabs
                    value={emojiCategory}
                    onChange={handleCategoryChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="emoji categories"
                  >
                    {emojiCategories.map((cat, idx) => (
                      <Tab key={cat.label} label={cat.label} />
                    ))}
                  </Tabs>
                  <Box sx={{ p: 1 }}>
                    {emojiCategory === 0 && (
                      <Button variant="outlined" color="error" size="small" onClick={handleClearEmojiHistory} sx={{ mb: 1 }}>
                        Clear History
                      </Button>
                    )}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 0.5 }}>
                      {emojiCategories[emojiCategory].emojis.map((emoji) => (
                        emoji ? (
                          <Button key={emoji} onClick={() => handleEmojiClick(emoji)} sx={{ minWidth: 'auto', p: 0.5 }}>
                            {emoji}
                          </Button>
                        ) : null
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Popover>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {isTwitterWarning && selectedXAccounts.length > 0 && (
                    <Typography color="error" variant="caption" display="block" sx={{ mr: 2 }}>
                        ⚠️ This post exceeds the {TWITTER_CHAR_LIMIT} character limit for X, but we still can try to publish it.
                    </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                    {charCount}/{TWITTER_CHAR_LIMIT}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Select Accounts to Publish to
            </Typography>
            <Grid container spacing={2}>
              <Grid>
                <Typography variant="subtitle1" component="h3" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <FacebookIcon color="primary" sx={{ mr: 1 }} />
                  Facebook Pages
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
                  <FormGroup>
                    {facebookPages.length > 0 ? (
                      facebookPages.map((page) => (
                        <FormControlLabel
                          key={page.page_id}
                          control={
                            <Checkbox
                              checked={selectedFacebookPages.includes(page.page_id)}
                              onChange={() => handleFacebookChange(page.page_id)}
                            />
                          }
                          label={page.page_name}
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No Facebook pages found.
                      </Typography>
                    )}
                  </FormGroup>
                </Paper>
              </Grid>

              <Grid>
                <Typography variant="subtitle1" component="h3" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TwitterIcon sx={{ color: '#000', mr: 1 }} />
                  X Accounts
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
                  <FormGroup>
                    {xAccounts.length > 0 ? (
                      xAccounts.map((account) => (
                        <FormControlLabel
                          key={account.id}
                          control={
                            <Checkbox
                              checked={selectedXAccounts.includes(account.id)}
                              onChange={() => handleXChange(account.id)}
                            />
                          }
                          label={account.name}
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No X accounts found.
                      </Typography>
                    )}
                  </FormGroup>
                </Paper>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handlePublish}
                disabled={isPublishing || postText.trim() === '' || (selectedFacebookPages.length === 0 && selectedXAccounts.length === 0)}
                startIcon={isPublishing ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {isPublishing ? 'Publishing...' : 'Publish Post'}
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
}
