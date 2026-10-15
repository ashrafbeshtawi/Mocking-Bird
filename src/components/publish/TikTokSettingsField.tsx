'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Switch,
  Typography,
} from '@mui/material';
import { fetchWithAuth } from '@/lib/fetch';
import {
  TIKTOK_BRANDED_CONTENT_URL,
  TIKTOK_MUSIC_USAGE_URL,
  TIKTOK_PRIVACY_LABELS,
  TIKTOK_PRIVACY_LEVELS,
  tiktokSettingsError,
  type TikTokCreatorInfo,
  type TikTokPostSettings,
  type TikTokPrivacyLevel,
} from '@/lib/tiktok';

interface TikTokSettingsFieldProps {
  /** open_ids of the TikTok accounts the post goes to. */
  accountIds: string[];
  /** The video being posted, to check its length against the accounts' limits. */
  videoUrl?: string;
  value: TikTokPostSettings;
  onChange: (value: TikTokPostSettings) => void;
  /** Called with whether the post can go to TikTok as configured. */
  onReadyChange: (isReady: boolean) => void;
}

type CreatorState = { creator: TikTokCreatorInfo } | { error: string };

/**
 * The post settings TikTok requires an app to show before every Direct Post:
 * the target accounts, a visibility with no preset, interaction toggles that
 * start off, the commercial content disclosure and the consent notice.
 */
export function TikTokSettingsField({ accountIds, videoUrl, value, onChange, onReadyChange }: TikTokSettingsFieldProps) {
  const [creators, setCreators] = useState<Record<string, CreatorState>>({});
  const [isCommercial, setIsCommercial] = useState(value.isYourBrand || value.isBrandedContent);
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);
  const accountKey = accountIds.join(',');

  useEffect(() => {
    let isCancelled = false;
    setCreators({});
    accountIds.forEach(async (id) => {
      let state: CreatorState;
      try {
        const response = await fetchWithAuth(`/api/tiktok/creator-info?open_id=${encodeURIComponent(id)}`);
        const data = await response.json();
        state = response.ok ? { creator: data.creator } : { error: data.error ?? 'Could not load the TikTok account.' };
      } catch {
        state = { error: 'Could not load the TikTok account.' };
      }
      if (!isCancelled) setCreators((prev) => ({ ...prev, [id]: state }));
    });
    return () => {
      isCancelled = true;
    };
    // accountKey stands for accountIds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountKey]);

  const loaded = accountIds.map((id) => creators[id]).filter((s): s is CreatorState => s !== undefined);
  const isLoading = loaded.length < accountIds.length;
  const errors = loaded.flatMap((s) => ('error' in s ? [s.error] : []));
  const infos = loaded.flatMap((s) => ('creator' in s ? [s.creator] : []));

  const privacyOptions = TIKTOK_PRIVACY_LEVELS.filter((level) => infos.every((c) => c.privacyLevelOptions.includes(level)));
  const isCommentDisabled = infos.some((c) => c.isCommentDisabled);
  const isDuetDisabled = infos.some((c) => c.isDuetDisabled);
  const isStitchDisabled = infos.some((c) => c.isStitchDisabled);
  const maxDurationSec = infos.length > 0 ? Math.min(...infos.map((c) => c.maxVideoDurationSec)) : null;
  const isTooLong = videoDurationSec !== null && maxDurationSec !== null && videoDurationSec > maxDurationSec;

  const settingsError = tiktokSettingsError(value);
  const isCommercialIncomplete = isCommercial && !value.isYourBrand && !value.isBrandedContent;
  const isReady = !isLoading && errors.length === 0 && !settingsError && !isCommercialIncomplete && !isTooLong &&
    privacyOptions.includes(value.privacyLevel as TikTokPrivacyLevel);

  useEffect(() => {
    onReadyChange(isReady);
  }, [isReady, onReadyChange]);

  const update = (patch: Partial<TikTokPostSettings>) => onChange({ ...value, ...patch });

  const handleCommercialToggle = (isOn: boolean) => {
    setIsCommercial(isOn);
    if (!isOn) update({ isYourBrand: false, isBrandedContent: false });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="caption" color="text.secondary">Loading TikTok account settings…</Typography>
      </Box>
    );
  }

  if (errors.length > 0) {
    return <Alert severity="error">{errors.join(' ')}</Alert>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="subtitle2">
        Posting to TikTok as {infos.map((c) => c.nickname).join(', ')}
      </Typography>

      <FormControl size="small" fullWidth required error={!value.privacyLevel}>
        <InputLabel id="tiktok-privacy-label">Who can view this video</InputLabel>
        <Select
          labelId="tiktok-privacy-label"
          label="Who can view this video"
          value={privacyOptions.includes(value.privacyLevel as TikTokPrivacyLevel) ? value.privacyLevel : ''}
          onChange={(e) => update({ privacyLevel: e.target.value as TikTokPrivacyLevel })}
        >
          {privacyOptions.map((level) => (
            <MenuItem key={level} value={level} disabled={level === 'SELF_ONLY' && value.isBrandedContent}>
              {TIKTOK_PRIVACY_LABELS[level]}
              {level === 'SELF_ONLY' && value.isBrandedContent ? ' (not available for branded content)' : ''}
            </MenuItem>
          ))}
        </Select>
        {settingsError && <FormHelperText>{settingsError}</FormHelperText>}
      </FormControl>

      <FormGroup row>
        <FormControlLabel
          control={<Checkbox checked={value.allowComment && !isCommentDisabled} disabled={isCommentDisabled} onChange={(e) => update({ allowComment: e.target.checked })} />}
          label="Allow comments"
        />
        <FormControlLabel
          control={<Checkbox checked={value.allowDuet && !isDuetDisabled} disabled={isDuetDisabled} onChange={(e) => update({ allowDuet: e.target.checked })} />}
          label="Allow Duet"
        />
        <FormControlLabel
          control={<Checkbox checked={value.allowStitch && !isStitchDisabled} disabled={isStitchDisabled} onChange={(e) => update({ allowStitch: e.target.checked })} />}
          label="Allow Stitch"
        />
      </FormGroup>
      {(isCommentDisabled || isDuetDisabled || isStitchDisabled) && (
        <Typography variant="caption" color="text.secondary">
          Greyed-out interactions are turned off in the account&apos;s TikTok privacy settings.
        </Typography>
      )}

      <FormControlLabel
        control={<Switch checked={isCommercial} onChange={(e) => handleCommercialToggle(e.target.checked)} />}
        label="Disclose commercial content"
      />
      {isCommercial && (
        <Box sx={{ pl: 2 }}>
          <FormGroup>
            <FormControlLabel
              control={<Checkbox checked={value.isYourBrand} onChange={(e) => update({ isYourBrand: e.target.checked })} />}
              label="Your brand: you are promoting yourself or your own business"
            />
            <FormControlLabel
              control={<Checkbox checked={value.isBrandedContent} onChange={(e) => update({ isBrandedContent: e.target.checked })} />}
              label="Branded content: you are promoting another brand or a third party"
            />
          </FormGroup>
          <Typography variant="caption" color={isCommercialIncomplete ? 'error' : 'text.secondary'}>
            {isCommercialIncomplete
              ? 'Choose whether the video promotes your brand, a third party, or both.'
              : `Your video will be labeled as "${value.isBrandedContent ? 'Paid partnership' : 'Promotional content'}".`}
          </Typography>
        </Box>
      )}

      {isTooLong && (
        <Alert severity="error">
          This video is longer than the {maxDurationSec} seconds TikTok allows for this account.
        </Alert>
      )}

      <Typography variant="caption" color="text.secondary">
        By posting, you agree to TikTok&apos;s{' '}
        {value.isBrandedContent && (
          <>
            <Link href={TIKTOK_BRANDED_CONTENT_URL} target="_blank" rel="noopener noreferrer">Branded Content Policy</Link>
            {' and '}
          </>
        )}
        <Link href={TIKTOK_MUSIC_USAGE_URL} target="_blank" rel="noopener noreferrer">Music Usage Confirmation</Link>.
        After posting, TikTok may take a few minutes to process the video before it appears on the profile.
      </Typography>

      {videoUrl && (
        <video
          src={videoUrl}
          preload="metadata"
          hidden
          onLoadedMetadata={(e) => setVideoDurationSec(e.currentTarget.duration)}
        />
      )}
    </Box>
  );
}
