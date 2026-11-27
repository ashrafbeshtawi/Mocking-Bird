'use client';

import React, { useState } from 'react';
import { Chip, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';
import {
  describeKinds,
  describeLimits,
  fitContent,
  planContent,
  sameKinds,
  type ContentKind,
  type MediaCounts,
} from '@/lib/publish/contentRules';
import { MediaPickDialog, type PickableMedia } from '@/components/publish/MediaPickDialog';
import type { Platform } from '@/types/accounts';

interface ContentFitBadgeProps {
  platform: Platform;
  /** Kinds present in the post. */
  kinds: ContentKind[];
  /** How many images and videos the post has; drives the per-platform limits. Ignored when `media` is given. */
  counts?: MediaCounts;
  /** The post's media; with `onSelectMedia`, lets the user pick items when there are more than the platform takes. */
  media?: ReadonlyArray<PickableMedia>;
  /** The option chosen for this platform, if any. */
  selection?: ContentKind[];
  /** Enables the chooser; without it the badge only reports. */
  onSelect?: (kinds: ContentKind[]) => void;
  /** The media items picked for this platform, if any. */
  mediaSelection?: string[];
  onSelectMedia?: (chosen: string[]) => void;
}

/**
 * Shows how the post fits a platform: nothing when it fits, an error when the
 * platform cannot take it, a clickable warning (then the chosen part) when only
 * part of it can go. Over a media limit, the chooser also lets the user pick
 * which items go.
 */
export function ContentFitBadge({
  platform,
  kinds,
  counts,
  media,
  selection,
  onSelect,
  mediaSelection,
  onSelectMedia,
}: ContentFitBadgeProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const plan = media ? planContent(platform, kinds.includes('text'), media, { kinds: selection, media: mediaSelection }) : null;
  const fitKinds = plan?.kinds ?? kinds;
  const fitCounts = plan?.counts ?? counts;
  const fit = plan?.fit ?? fitContent(platform, fitKinds, fitCounts);
  const canPick = !!plan?.canPickMedia && !!onSelectMedia;
  const label = PLATFORM_CONFIG[platform].label;
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const pickDialog = canPick && (
    <MediaPickDialog
      open={isPicking}
      platform={platform}
      media={media!}
      chosen={mediaSelection}
      onClose={() => setIsPicking(false)}
      onConfirm={(chosen) => onSelectMedia?.(chosen)}
    />
  );
  const openPicker = (e: React.MouseEvent) => {
    stop(e);
    setAnchor(null);
    setIsPicking(true);
  };
  const pickedChip = plan?.mediaPicked && (
    <Chip
      label={`${plan.media.length} of ${media!.length} media`}
      size="small"
      variant="outlined"
      color="warning"
      onClick={canPick ? openPicker : undefined}
      sx={{ height: 20, fontSize: '0.65rem' }}
    />
  );

  if (fit.status === 'ok') {
    return pickedChip ? (
      <>
        {pickedChip}
        {pickDialog}
      </>
    ) : null;
  }

  const limits = describeLimits(platform, fitCounts);
  const problem = limits
    ? `${label} takes at most ${limits} per post`
    : `${label} can't post ${describeKinds(fitKinds)}${fitKinds.length > 1 ? ' together' : ''}`;
  const canChoose = !!onSelect || canPick;

  if (fit.status === 'unsupported' && !canPick) {
    return (
      <>
        {pickedChip}
        <Tooltip title={`${problem}. It will be skipped.`}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 18 }} aria-label={`${label}: unsupported content`} />
        </Tooltip>
        {pickDialog}
      </>
    );
  }

  const options = fit.status === 'partial' ? fit.options : [];
  const chosen = selection && options.find((o) => sameKinds(o, selection));
  const open = (e: React.MouseEvent<HTMLElement>) => {
    stop(e);
    if (canChoose) setAnchor(e.currentTarget);
  };

  return (
    <>
      {pickedChip}
      {chosen ? (
        <Chip
          label={describeKinds(chosen)}
          size="small"
          variant="outlined"
          color="warning"
          onClick={open}
          sx={{ height: 20, fontSize: '0.65rem' }}
        />
      ) : (
        <Tooltip title={`${problem}. ${canChoose ? 'Choose what to send.' : 'It will be skipped.'}`}>
          <IconButton size="small" onClick={open} sx={{ p: 0.25 }} aria-label={`${label}: choose what to send`}>
            <WarningAmberIcon color="warning" sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}
      <Menu open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} onClick={stop}>
        {canPick && <MenuItem onClick={openPicker}>Choose which media to send…</MenuItem>}
        {onSelect &&
          options.map((option) => (
            <MenuItem
              key={option.join('+')}
              selected={!!chosen && sameKinds(option, chosen)}
              onClick={() => {
                onSelect(option);
                setAnchor(null);
              }}
            >
              Send {describeKinds(option)}
            </MenuItem>
          ))}
      </Menu>
      {pickDialog}
    </>
  );
}
