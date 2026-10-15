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
  /** TikTok's publish_id; the post itself appears once TikTok has processed the video. */
  post_id: string;
}

export interface TikTokPublishError {
  platform: 'tiktok';
  account_id: string;
  name: string;
  error: { message: string; code?: string };
}

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
  constructor(private pool: Pool) {}

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
        const publishId = await this.postVideo(token, options);
        successful.push({ platform: 'tiktok', account_id: token.open_id, name: token.display_name, post_id: publishId });
        logger.info('Posted to TikTok', { open_id: token.open_id, publish_id: publishId });
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

  private async postVideo(token: TikTokAccountToken, { text, settings, cloudinaryMedia = [] }: TikTokPublishOptions): Promise<string> {
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
    return publish_id;
  }

  /** POSTs JSON to a TikTok API path and returns its data, or throws TikTok's error. */
  private async call<T>(accessToken: string, path: string, body: object, action: string): Promise<T> {
    const response = await fetch(`${TIKTOK_API_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(body),
    });
    const envelope = (await response.json().catch(() => null)) as TikTokEnvelope<T> | null;
    if (response.status === 401 || envelope?.error?.code === 'access_token_invalid') {
      throw new Error('TikTok rejected the access token. Reconnect the account on the dashboard.');
    }
    if (!response.ok || !envelope?.data || (envelope.error?.code && envelope.error.code !== 'ok')) {
      const message = envelope?.error?.message;
      throw new Error(`TikTok could not ${action} (HTTP ${response.status})${message ? `: ${message}` : ''}`);
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
