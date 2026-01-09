'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Popover,
  Tabs,
  Tab,
} from '@mui/material';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import { useEmojiHistory } from './useEmojiHistory';
import { EMOJI_CATEGORIES, HISTORY_LABEL } from './emojiData';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onOpen?: () => void;
}

export function EmojiPicker({ onEmojiSelect, onOpen }: EmojiPickerProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [category, setCategory] = useState(0);

  const {
    history,
    addToPending,
    commitPending,
    initPending,
    clearHistory,
  } = useEmojiHistory();

  const open = Boolean(anchorEl);
  const id = open ? 'emoji-popover' : undefined;

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    initPending();
    onOpen?.();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    commitPending();
    setAnchorEl(null);
  };

  const handleCategoryChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCategory(newValue);
  };

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    addToPending(emoji);
  };

  // Build categories with history as first tab
  const categories = [
    {
      label: HISTORY_LABEL,
      emojis: history.length > 0 ? history : [],
    },
    ...EMOJI_CATEGORIES,
  ];

  const currentEmojis = categories[category]?.emojis || [];
  const isHistoryTab = category === 0;

  return (
    <>
      <IconButton
        aria-describedby={id}
        onClick={handleOpen}
        color="primary"
      >
        <SentimentSatisfiedAltIcon />
      </IconButton>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableRestoreFocus
      >
        <Box sx={{ width: 350 }}>
          <Tabs
            value={category}
            onChange={handleCategoryChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="emoji categories"
          >
            {categories.map((cat) => (
              <Tab key={cat.label} label={cat.label} />
            ))}
          </Tabs>

          <Box sx={{ p: 1 }}>
            {isHistoryTab && history.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={clearHistory}
                sx={{ mb: 1 }}
              >
                Clear History
              </Button>
            )}

            {currentEmojis.length > 0 ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: 0.5,
                }}
              >
                {currentEmojis.map((emoji) => (
                  <Button
                    key={emoji}
                    onClick={() => handleEmojiClick(emoji)}
                    sx={{ minWidth: 'auto', p: 0.5 }}
                  >
                    {emoji}
                  </Button>
                ))}
              </Box>
            ) : isHistoryTab ? (
              <Box sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
                No emoji history yet
              </Box>
            ) : null}
          </Box>
        </Box>
      </Popover>
    </>
  );
}
