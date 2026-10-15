'use client';

import { TextField } from '@mui/material';
import { YOUTUBE_TITLE_MAX, youtubeTitleError } from '@/lib/youtube';

/** Title for the YouTube upload; blank falls back to the video's file name. */
export function YouTubeTitleField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const error = youtubeTitleError(value.trim());
  return (
    <TextField
      label="YouTube title"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
      size="small"
      error={error !== null}
      helperText={error ?? `${[...value].length}/${YOUTUBE_TITLE_MAX} · Leave blank to use the video's file name`}
    />
  );
}
