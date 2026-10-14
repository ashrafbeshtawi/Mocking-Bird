'use client';

import React, { useState } from 'react';
import { Chip, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';
import {
  describeKinds,
  fitContent,
  sameKinds,
  type ContentKind,
} from '@/lib/publish/contentRules';
import type { Platform } from '@/types/accounts';

interface ContentFitBadgeProps {
  platform: Platform;
  /** Kinds present in the post. */
  kinds: ContentKind[];
  /** The option chosen for this platform, if any. */
  selection?: ContentKind[];
  /** Enables the chooser; without it the badge only reports. */
  onSelect?: (kinds: ContentKind[]) => void;
}

/**
 * Shows how the post fits a platform: nothing when it fits, an error when the
 * platform cannot take it, a clickable warning (then the chosen part) when only
 * part of it can go.
 */
export function ContentFitBadge({ platform, kinds, selection, onSelect }: ContentFitBadgeProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const fit = fitContent(platform, kinds);
  const label = PLATFORM_CONFIG[platform].label;

  if (fit.status === 'ok') return null;

  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const problem = `${label} can't post ${describeKinds(kinds)}${kinds.length > 1 ? ' together' : ''}`;

  if (fit.status === 'unsupported') {
    return (
      <Tooltip title={`${problem}. It will be skipped.`}>
        <ErrorOutlineIcon color="error" sx={{ fontSize: 18 }} aria-label={`${label}: unsupported content`} />
      </Tooltip>
    );
  }

  const chosen = selection && fit.options.find((o) => sameKinds(o, selection));
  const open = (e: React.MouseEvent<HTMLElement>) => {
    stop(e);
    if (onSelect) setAnchor(e.currentTarget);
  };

  return (
    <>
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
        <Tooltip title={`${problem}. ${onSelect ? 'Choose what to send.' : 'It will be skipped.'}`}>
          <IconButton
            size="small"
            onClick={open}
            sx={{ p: 0.25 }}
            aria-label={`${label}: choose what to send`}
          >
            <WarningAmberIcon color="warning" sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}
      <Menu open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} onClick={stop}>
        {fit.options.map((option) => (
          <MenuItem
            key={option.join('+')}
            selected={!!chosen && sameKinds(option, chosen)}
            onClick={() => {
              onSelect?.(option);
              setAnchor(null);
            }}
          >
            Send {describeKinds(option)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
