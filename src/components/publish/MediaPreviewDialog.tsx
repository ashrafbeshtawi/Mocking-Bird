'use client';

import React from 'react';
import { Box, Dialog, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export interface PreviewMedia {
  url: string;
  resourceType: 'image' | 'video';
  name: string;
}

/** Full-size view of one image, or one video with controls. Open while `media` is set. */
export function MediaPreviewDialog({ media, onClose }: { media: PreviewMedia | null; onClose: () => void }) {
  return (
    <Dialog open={!!media} onClose={onClose} maxWidth="lg">
      {media && (
        <Box sx={{ position: 'relative', bgcolor: 'black', lineHeight: 0 }}>
          <IconButton
            onClick={onClose}
            aria-label="Close preview"
            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, color: 'white', bgcolor: 'rgba(0,0,0,0.5)' }}
          >
            <CloseIcon />
          </IconButton>
          {media.resourceType === 'video' ? (
            <video src={media.url} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '85vh' }} />
          ) : (
            <img src={media.url} alt={media.name} style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain' }} />
          )}
        </Box>
      )}
    </Dialog>
  );
}
