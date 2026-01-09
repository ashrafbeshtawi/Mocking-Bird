'use client';

import React, { useRef, useCallback } from 'react';
import { Box, TextField, Typography } from '@mui/material';
import { EmojiPicker } from './EmojiPicker';
import { MediaUploader } from './MediaUploader';
import { TWITTER_CHAR_LIMIT } from '@/types/accounts';

interface PostComposerProps {
  postText: string;
  onTextChange: (text: string) => void;
  mediaFiles: File[];
  onMediaChange: (files: File[]) => void;
  showTwitterWarning: boolean;
}

export function PostComposer({
  postText,
  onTextChange,
  mediaFiles,
  onMediaChange,
  showTwitterWarning,
}: PostComposerProps) {
  const textFieldRef = useRef<HTMLInputElement | null>(null);
  const cursorPositionRef = useRef<number | null>(null);

  const charCount = postText.length;

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      const input = textFieldRef.current;
      const cursorPos = cursorPositionRef.current ?? postText.length;

      // Insert emoji at cursor position
      const newText = postText.slice(0, cursorPos) + emoji + postText.slice(cursorPos);
      onTextChange(newText);

      // Update cursor position for next emoji
      const newCursorPos = cursorPos + emoji.length;
      cursorPositionRef.current = newCursorPos;

      // Restore focus and cursor position
      setTimeout(() => {
        if (input) {
          input.focus();
          input.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [postText, onTextChange]
  );

  const handleEmojiPickerOpen = useCallback(() => {
    const input = textFieldRef.current;
    if (input) {
      cursorPositionRef.current = input.selectionStart ?? postText.length;
    }
  }, [postText.length]);

  return (
    <>
      <TextField
        label="What's on your mind?"
        multiline
        rows={6}
        fullWidth
        value={postText}
        onChange={(e) => onTextChange(e.target.value)}
        variant="outlined"
        sx={{ mb: 2 }}
        inputRef={textFieldRef}
        slotProps={{
          input: {
            style: { fontSize: '1.1rem' },
            sx: { textAlign: 'right', direction: 'rtl' },
          },
        }}
      />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {showTwitterWarning && (
            <Typography color="error" variant="caption" display="block" sx={{ mr: 2 }}>
              This post exceeds the {TWITTER_CHAR_LIMIT} character limit for X, but we
              can still try to publish it.
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {charCount}/{TWITTER_CHAR_LIMIT}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
        <MediaUploader files={mediaFiles} onFilesChange={onMediaChange} />
        <EmojiPicker onEmojiSelect={handleEmojiSelect} onOpen={handleEmojiPickerOpen} />
      </Box>
    </>
  );
}
