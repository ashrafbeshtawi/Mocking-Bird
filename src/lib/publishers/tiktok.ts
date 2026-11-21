import { Pool } from 'pg';
import { createLogger } from '@/lib/logger';
import { CloudinaryMediaInfo } from '@/lib/publish/types';
import {
  TIKTOK_API_URL,
  TIKTOK_REVOKE_URL,
  TIKTOK_TOKEN_URL,
  tiktokSettingsError,
  type TikTokCreatorInfo,
  type TikTokPostSettings,
} from '@/lib/tiktok';

const logger = createLogger('TikTokPublisher');

const CAPTION_MAX = 2200;
const MB = 1024 * 1024;
// TikTok takes a video of up to 64 MB in one chunk; larger ones go in chunks of 5–64 MB.
const SINGLE_CHUNK_MAX = 64 * MB;
const CHUNK_SIZE = 10 * MB;
// Refresh tokens this close to expiry, so they cannot lapse mid-upload.
const TOKEN_EXPIRY_MARGIN_MS = 5 * 60_000;

/** How often and how long to ask TikTok whether an uploaded video was published. */
export interface TikTokStatusPolling {
  intervalMs: number;
  timeoutMs: number;
}

const DEFAULT_STATUS_POLLING: TikTokStatusPolling = { intervalMs: 3_000, timeoutMs: 120_000 };

export const TIKTOK_STILL_PROCESSING_WARNING =
  'TikTok is still processing the video. It should appear on the account shortly; check TikTok before posting it again.';

export interface TikTokAccountToken {
  open_id: string;
  display_name: string;
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}

export interface TikTokPublishOptions {
  /** The post text, used as the video's caption. */
  text: string;
  settings: TikTokPostSettings;
  cloudinaryMedia?: CloudinaryMediaInfo[];
}

export interface TikTokPublishResult {
  platform: 'tiktok';
  account_id: string;
  name: string;
  /**
   * The public TikTok post id once TikTok has published the video; otherwise (private
   * visibility, or still processing) TikTok's publish_id.
   */
  post_id: string;
  /** Set when TikTok had not finished processing the video when MockingBird stopped waiting. */
  warning?: string;
}

export interface TikTokPublishError {
  platform: 'tiktok';
  account_id: string;
  name: string;
  error: { message: string; code?: string };
}

// TikTok's message for these is a generic pointer to its guidelines, so they get a plain explanation.
const TIKTOK_ERROR_HINTS: Record<string, string> = {
  unaudited_client_can_only_post_to_private_accounts:
    'Until TikTok has audited this app, it can only post to private TikTok accounts. ' +
    'Make the account private in the TikTok app (Settings and privacy → Privacy → Private account) and choose "Only me".',
  privacy_level_option_mismatch: 'TikTok does not allow the chosen visibility for this account. Choose another one.',
  // fail_reason values reported by /v2/post/publish/status/fetch/ after the upload.
  spam_risk_too_many_posts: 'The account has reached TikTok\'s daily post limit. Try again tomorrow.',
  spam_risk_user_banned_from_posting: 'TikTok has blocked this account from posting. Check the account in the TikTok app.',
  spam_risk_text: 'TikTok flagged the caption as spam. Change the text and try again.',
  spam_risk: 'TikTok flagged the post as spam.',
  duration_check_failed: 'The video is longer (or shorter) than TikTok allows for this account.',
  file_format_check_failed: 'TikTok does not accept this video format. Use an MP4 (H.264), WebM or MOV file.',
  frame_rate_check_failed: 'TikTok does not accept the video\'s frame rate. Use a video between 23 and 60 FPS.',
  picture_size_check_failed: 'TikTok does not accept the video\'s resolution. Use a video at least 360 pixels on each side.',
  video_pull_failed: 'TikTok could not read the uploaded video. Try again.',
  publish_cancelled: 'The post was cancelled on TikTok.',
  auth_removed: 'The account removed MockingBird\'s access while the video was processing. Reconnect it on the dashboard.',
  internal: 'TikTok had an internal error. Try again later.',
};

/** What /v2/post/publish/status/fetch/ reports about an upload. */
interface TikTokPublishStatus {
  status: 'PROCESSING_UPLOAD' | 'PROCESSING_DOWNLOAD' | 'SEND_TO_USER_INBOX' | 'PUBLISH_COMPLETE' | 'FAILED';
  fail_reason?: string;
  /** Spelled this way by TikTok. Present once a public post is live. */
  publicaly_available_post_id?: (string | number)[];
}

/**
 * Parses a TikTok response body. Post ids are 64-bit integers that JSON.parse would
 * round, so they are turned into strings first.
 */
function parseTikTokJson(text: string): unknown {
  const safe = text.replace(
    /("publicaly_available_post_id"\s*:\s*\[)([^\]]*)\]/g,
    (_, head: string, ids: string) => `${head}${ids.replace(/(^|,)\s*(\d+)\s*(?=,|$)/g, '$1"$2"')}]`
  );
  return JSON.parse(safe);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface TikTokEnvelope<T> {
  data?: T;
  error?: { code?: string; message?: string };
}

/**
 * How a video of `size` bytes is split for TikTok's FILE_UPLOAD: one chunk up to
 * 64 MB, otherwise 10 MB chunks where the last one also carries the remainder.
 */
export function chunkPlan(size: number): { chunkSize: number; totalChunkCount: number } {
  if (size <= SINGLE_CHUNK_MAX) return { chunkSize: size, totalChunkCount: 1 };
  return { chunkSize: CHUNK_SIZE, totalChunkCount: Math.floor(size / CHUNK_SIZE) };
}

/** Exchanges a refresh token for a new access token (and possibly a new refresh token). */
export async function refreshTikTokToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY ?? '',
      client_secret: process.env.TIKTOK_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  const body = (await response.json().catch(() => null)) as
    | { access_token?: string; refresh_token?: string; expires_in?: number }
    | null;
  if (!response.ok || !body?.access_token || !body.refresh_token || !body.expires_in) return null;
  return { access_token: body.access_token, refresh_token: body.refresh_token, expires_in: body.expires_in };
}

/**
 * Revokes MockingBird's TikTok access for each account. Best effort: a failed
 * revocation is logged and never thrown.
 */
export async function revokeTikTokTokens(
  tokens: { access_token: string; refresh_token: string; expires_at: Date }[]
): Promise<void> {
  await Promise.all(
    tokens.map(async (token) => {
      try {
        // TikTok revokes by access token, so an expired one is refreshed first.
        const accessToken = new Date(token.expires_at).getTime() > Date.now()
          ? token.access_token
          : (await refreshTikTokToken(token.refresh_token))?.access_token;
        if (!accessToken) return;
        const response = await fetch(TIKTOK_REVOKE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_KEY ?? '',
            client_secret: process.env.TIKTOK_CLIENT_SECRET ?? '',
            token: accessToken,
          }),
        });
        if (!response.ok) logger.warn('TikTok token revocation failed', { status: response.status });
      } catch (error) {
        logger.warn('TikTok token revocation failed', { error: error instanceof Error ? error.message : String(error) });
      }
    })
  );
}

export class TikTokPublisher {
  constructor(private pool: Pool, private statusPolling: TikTokStatusPolling = DEFAULT_STATUS_POLLING) {}

  async getAccountTokens(userId: string, openIds: string[]): Promise<TikTokAccountToken[]> {
    if (openIds.length === 0) return [];
    const { rows } = await this.pool.query(
      `SELECT open_id, display_name, access_token, refresh_token, expires_at
       FROM connected_tiktok_accounts
       WHERE user_id = $1 AND open_id = ANY($2)`,
      [userId, openIds]
    );
    return rows;
  }

  async publishToAccounts(
    options: TikTokPublishOptions,
    tokens: TikTokAccountToken[]
  ): Promise<{ successful: TikTokPublishResult[]; failed: TikTokPublishError[] }> {
    const successful: TikTokPublishResult[] = [];
    const failed: TikTokPublishError[] = [];

    for (const token of tokens) {
      try {
        const { postId, warning } = await this.postVideo(token, options);
        successful.push({
          platform: 'tiktok',
          account_id: token.open_id,
          name: token.display_name,
          post_id: postId,
          ...(warning && { warning }),
        });
        logger.info('Posted to TikTok', { open_id: token.open_id, post_id: postId, still_processing: Boolean(warning) });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        failed.push({ platform: 'tiktok', account_id: token.open_id, name: token.display_name, error: { message } });
        logger.error('Failed to post to TikTok', { open_id: token.open_id, error: message });
      }
    }

    return { successful, failed };
  }

  /** The account's current posting options; throws when TikTok will not take a post now. */
  async creatorInfo(token: TikTokAccountToken): Promise<TikTokCreatorInfo> {
    const accessToken = await this.freshAccessToken(token);
    const data = await this.call<{
      creator_nickname: string;
      privacy_level_options: TikTokCreatorInfo['privacyLevelOptions'];
      comment_disabled: boolean;
      duet_disabled: boolean;
      stitch_disabled: boolean;
      max_video_post_duration_sec: number;
    }>(accessToken, '/v2/post/publish/creator_info/query/', {}, 'read the account\'s posting options');
    return {
      nickname: data.creator_nickname,
      privacyLevelOptions: data.privacy_level_options,
      isCommentDisabled: data.comment_disabled,
      isDuetDisabled: data.duet_disabled,
      isStitchDisabled: data.stitch_disabled,
      maxVideoDurationSec: data.max_video_post_duration_sec,
    };
  }

  private async postVideo(
    token: TikTokAccountToken,
    { text, settings, cloudinaryMedia = [] }: TikTokPublishOptions
  ): Promise<{ postId: string; warning?: string }> {
    const settingsError = tiktokSettingsError(settings);
    if (settingsError) throw new Error(settingsError);
    const videos = cloudinaryMedia.filter((m) => m.resourceType === 'video');
    if (videos.length !== 1 || cloudinaryMedia.length !== 1) {
      throw new Error('TikTok posts take exactly one video.');
    }

    // TikTok requires the latest creator info before every post; it also reports posting limits.
    const creator = await this.creatorInfo(token);
    if (!creator.privacyLevelOptions.includes(settings.privacyLevel as TikTokCreatorInfo['privacyLevelOptions'][number])) {
      throw new Error('This TikTok account does not allow the chosen visibility. Choose another one.');
    }
    const duration = videos[0].duration;
    if (typeof duration === 'number' && duration > creator.maxVideoDurationSec) {
      throw new Error(
        `The video is ${Math.ceil(duration)} seconds long, but TikTok allows at most ${creator.maxVideoDurationSec} seconds for this account.`
      );
    }
    const accessToken = await this.freshAccessToken(token);

    // ponytail: buffers the whole video in memory; stream from Cloudinary if large videos exhaust RAM.
    const download = await fetch(videos[0].publicUrl);
    if (!download.ok) throw new Error(`Could not download video ${videos[0].publicUrl} (HTTP ${download.status})`);
    const contentType = download.headers.get('content-type') ?? 'video/mp4';
    const bytes = new Uint8Array(await download.arrayBuffer());
    const { chunkSize, totalChunkCount } = chunkPlan(bytes.byteLength);

    const { publish_id, upload_url } = await this.call<{ publish_id: string; upload_url: string }>(
      accessToken,
      '/v2/post/publish/video/init/',
      {
        post_info: {
          title: [...text].slice(0, CAPTION_MAX).join(''),
          privacy_level: settings.privacyLevel,
          disable_comment: creator.isCommentDisabled || !settings.allowComment,
          disable_duet: creator.isDuetDisabled || !settings.allowDuet,
          disable_stitch: creator.isStitchDisabled || !settings.allowStitch,
          brand_organic_toggle: settings.isYourBrand,
          brand_content_toggle: settings.isBrandedContent,
        },
        source_info: { source: 'FILE_UPLOAD', video_size: bytes.byteLength, chunk_size: chunkSize, total_chunk_count: totalChunkCount },
      },
      'start the upload'
    );

    for (let index = 0; index < totalChunkCount; index++) {
      const start = index * chunkSize;
      const end = index === totalChunkCount - 1 ? bytes.byteLength : start + chunkSize;
      const upload = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end - 1}/${bytes.byteLength}`,
        },
        body: bytes.subarray(start, end),
      });
      if (!upload.ok) throw new Error(`TikTok could not upload the video (HTTP ${upload.status})`);
    }
    return this.awaitPublish(token, publish_id);
  }

  /**
   * Waits until TikTok has processed an uploaded video. Throws TikTok's reason when it
   * rejects the video. When TikTok is still processing at the deadline the upload counts
   * as a success with a warning, since posting it again could publish it twice.
   */
  private async awaitPublish(token: TikTokAccountToken, publishId: string): Promise<{ postId: string; warning?: string }> {
    const deadline = Date.now() + this.statusPolling.timeoutMs;
    for (;;) {
      await sleep(this.statusPolling.intervalMs);
      let status: TikTokPublishStatus | null = null;
      try {
        const accessToken = await this.freshAccessToken(token);
        status = await this.call<TikTokPublishStatus>(
          accessToken,
          '/v2/post/publish/status/fetch/',
          { publish_id: publishId },
          'report the post\'s status'
        );
      } catch (error) {
        // The video is already uploaded; a status hiccup must not turn it into a failure.
        logger.warn('Could not fetch TikTok publish status', {
          publish_id: publishId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      if (status?.status === 'FAILED') {
        const reason = status.fail_reason ?? 'unknown';
        const hint = TIKTOK_ERROR_HINTS[reason];
        throw new Error(`TikTok rejected the video (${reason})${hint ? `: ${hint}` : ''}`);
      }
      if (status?.status === 'PUBLISH_COMPLETE') {
        const postId = status.publicaly_available_post_id?.[0];
        return { postId: postId !== undefined ? String(postId) : publishId };
      }
      if (Date.now() >= deadline) {
        logger.warn('TikTok still processing after polling timeout', { publish_id: publishId, status: status?.status });
        return { postId: publishId, warning: TIKTOK_STILL_PROCESSING_WARNING };
      }
    }
  }

  /** POSTs JSON to a TikTok API path and returns its data, or throws TikTok's error. */
  private async call<T>(accessToken: string, path: string, body: object, action: string): Promise<T> {
    const response = await fetch(`${TIKTOK_API_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(body),
    });
    const envelope = (await response.text().then(parseTikTokJson).catch(() => null)) as TikTokEnvelope<T> | null;
    if (response.status === 401 || envelope?.error?.code === 'access_token_invalid') {
      throw new Error('TikTok rejected the access token. Reconnect the account on the dashboard.');
    }
    if (!response.ok || !envelope?.data || (envelope.error?.code && envelope.error.code !== 'ok')) {
      const code = envelope?.error?.code;
      const reason = (code && TIKTOK_ERROR_HINTS[code]) ?? envelope?.error?.message;
      throw new Error(`TikTok could not ${action} (HTTP ${response.status}${code ? `, ${code}` : ''})${reason ? `: ${reason}` : ''}`);
    }
    return envelope.data;
  }

  /** The account's access token, refreshed and stored first when it is about to expire. */
  private async freshAccessToken(token: TikTokAccountToken): Promise<string> {
    if (new Date(token.expires_at).getTime() - Date.now() > TOKEN_EXPIRY_MARGIN_MS) {
      return token.access_token;
    }
    const refreshed = await refreshTikTokToken(token.refresh_token);
    if (!refreshed) {
      throw new Error('TikTok access was revoked or has expired. Reconnect the account on the dashboard.');
    }
    // TikTok may rotate the refresh token, so both are stored.
    await this.pool.query(
      `UPDATE connected_tiktok_accounts
       SET access_token = $1, refresh_token = $2, expires_at = NOW() + make_interval(secs => $3)
       WHERE open_id = $4 AND refresh_token = $5`,
      [refreshed.access_token, refreshed.refresh_token, refreshed.expires_in, token.open_id, token.refresh_token]
    );
    Object.assign(token, {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000),
    });
    return refreshed.access_token;
  }
}
