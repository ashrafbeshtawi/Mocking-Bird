'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';
import { defaultMediaPick, describeLimits, isValidMediaPick, type PostMedia } from '@/lib/publish/contentRules';
import type { Platform } from '@/types/accounts';

/** A media item the chooser can show. */
export interface PickableMedia extends PostMedia {
  publicUrl: string;
  originalFilename?: string;
  /** Local preview of a fresh upload; falls back to the Cloudinary URL. */
  previewUrl?: string;
  thumbnail?: { publicUrl: string };
}

interface MediaPickDialogProps {
  open: boolean;
  platform: Platform;
  media: ReadonlyArray<PickableMedia>;
  /** The current pick; an invalid or missing one starts from the first items that fit. */
  chosen?: string[];
  onClose: () => void;
  onConfirm: (chosen: string[]) => void;
}

const thumbnailOf = (item: PickableMedia): string | undefined =>
  item.resourceType === 'image' ? item.previewUrl ?? item.publicUrl : item.thumbnail?.publicUrl;

/** Lets the user pick which media items go to a platform that cannot take all of them. */
export function MediaPickDialog({ open, platform, media, chosen, onClose, onConfirm }: MediaPickDialogProps) {
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (open) setPicked(isValidMediaPick(platform, media, chosen) ? [...chosen!] : defaultMediaPick(platform, media));
    // Start over each time the dialog opens; edits while open are local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const label = PLATFORM_CONFIG[platform].label;
  const isValid = isValidMediaPick(platform, media, picked);
  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth onClick={(e) => e.stopPropagation()}>
      <DialogTitle>Choose media for {label}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {label} takes at most {describeLimits(platform)} per post.
        </Typography>
        <List dense disablePadding>
          {media.map((item, index) => {
            const src = thumbnailOf(item);
            const name = item.originalFilename || `${item.resourceType} ${index + 1}`;
            return (
              <ListItemButton key={item.publicId} onClick={() => toggle(item.publicId)} sx={{ borderRadius: 1 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox
                    edge="start"
                    size="small"
                    checked={picked.includes(item.publicId)}
                    tabIndex={-1}
                    inputProps={{ 'aria-label': `Send ${name}` }}
                  />
                </ListItemIcon>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    mr: 1.5,
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <VideocamIcon fontSize="small" color="action" />
                  )}
                </Box>
                <ListItemText
                  primary={name}
                  secondary={item.resourceType}
                  primaryTypographyProps={{ noWrap: true, variant: 'body2' }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!isValid}
          onClick={() => {
            onConfirm(picked);
            onClose();
          }}
        >
          Send {picked.length} of {media.length}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
