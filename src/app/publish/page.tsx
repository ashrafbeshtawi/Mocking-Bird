'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  useTheme,
} from '@mui/material';
import { useConnectedAccounts } from '@/hooks/useConnectedAccounts';
import { usePublish } from '@/hooks/usePublish';
import { PostComposer } from '@/components/publish/PostComposer';
import { AccountSelector } from '@/components/publish/AccountSelector';
import { PublishResults } from '@/components/publish/PublishResults';
import type { InstagramSelection } from '@/types/accounts';
import { TWITTER_CHAR_LIMIT } from '@/types/accounts';

export default function PublishPage() {
  const theme = useTheme();

  // Data fetching
  const {
    facebookPages,
    xAccounts,
    instagramAccounts,
    loading,
  } = useConnectedAccounts();

  // Publishing logic
  const { isPublishing, error, success, results, publish } = usePublish();

  // Form state
  const [postText, setPostText] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [selectedFacebookPages, setSelectedFacebookPages] = useState<string[]>([]);
  const [selectedXAccounts, setSelectedXAccounts] = useState<string[]>([]);
  const [selectedInstagramAccounts, setSelectedInstagramAccounts] = useState<
    Record<string, InstagramSelection>
  >({});

  // Initialize selections when accounts load
  useEffect(() => {
    if (facebookPages.length > 0) {
      setSelectedFacebookPages(facebookPages.map((p) => p.page_id));
    }
  }, [facebookPages]);

  useEffect(() => {
    if (xAccounts.length > 0) {
      setSelectedXAccounts(xAccounts.map((a) => a.id));
    }
  }, [xAccounts]);

  useEffect(() => {
    if (instagramAccounts.length > 0) {
      const initial: Record<string, InstagramSelection> = {};
      instagramAccounts.forEach((a) => {
        initial[a.id] = { publish: false, story: false };
      });
      setSelectedInstagramAccounts(initial);
    }
  }, [instagramAccounts]);

  // Handlers
  const handleFacebookChange = useCallback((pageId: string) => {
    setSelectedFacebookPages((prev) =>
      prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]
    );
  }, []);

  const handleXChange = useCallback((accountId: string) => {
    setSelectedXAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  }, []);

  const handleInstagramChange = useCallback(
    (accountId: string, type: 'publish' | 'story') => {
      setSelectedInstagramAccounts((prev) => ({
        ...prev,
        [accountId]: {
          ...(prev[accountId] || { publish: false, story: false }),
          [type]: !prev[accountId]?.[type],
        },
      }));
    },
    []
  );

  const handlePublish = async () => {
    const wasSuccessful = await publish({
      postText,
      mediaFiles,
      selectedFacebookPages,
      selectedXAccounts,
      selectedInstagramAccounts,
    });

    if (wasSuccessful) {
      // Reset form on success
      setPostText('');
      setMediaFiles([]);
      setSelectedFacebookPages(facebookPages.map((p) => p.page_id));
      setSelectedXAccounts(xAccounts.map((a) => a.id));

      const resetInstagram: Record<string, InstagramSelection> = {};
      instagramAccounts.forEach((a) => {
        resetInstagram[a.id] = { publish: false, story: false };
      });
      setSelectedInstagramAccounts(resetInstagram);
    }
  };

  // Computed values
  const charCount = postText.length;
  const showTwitterWarning = charCount > TWITTER_CHAR_LIMIT && selectedXAccounts.length > 0;
  const hasAnyAccount =
    facebookPages.length > 0 || xAccounts.length > 0 || instagramAccounts.length > 0;
  const hasInstagramSelection = Object.values(selectedInstagramAccounts).some(
    (s) => s.publish || s.story
  );
  const canPublish =
    !isPublishing &&
    (postText.trim() !== '' || mediaFiles.length > 0) &&
    (selectedFacebookPages.length > 0 ||
      selectedXAccounts.length > 0 ||
      hasInstagramSelection);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontWeight: theme.typography.fontWeightBold }}
      >
        Publish to Social Media
      </Typography>

      <Paper elevation={3} sx={{ p: 4, mt: 3 }}>
        <PublishResults error={error} success={success} results={results} />

        {!hasAnyAccount ? (
          <Box sx={{ textAlign: 'center', my: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No accounts are connected. Please connect your Facebook Pages, Instagram,
              and X accounts first.
            </Typography>
          </Box>
        ) : (
          <>
            <PostComposer
              postText={postText}
              onTextChange={setPostText}
              mediaFiles={mediaFiles}
              onMediaChange={setMediaFiles}
              showTwitterWarning={showTwitterWarning}
            />

            <AccountSelector
              facebookPages={facebookPages}
              xAccounts={xAccounts}
              instagramAccounts={instagramAccounts}
              selectedFacebookPages={selectedFacebookPages}
              selectedXAccounts={selectedXAccounts}
              selectedInstagramAccounts={selectedInstagramAccounts}
              onFacebookChange={handleFacebookChange}
              onXChange={handleXChange}
              onInstagramChange={handleInstagramChange}
              mediaSelected={mediaFiles.length > 0}
            />

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handlePublish}
                disabled={!canPublish}
                startIcon={
                  isPublishing ? <CircularProgress size={20} color="inherit" /> : null
                }
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
