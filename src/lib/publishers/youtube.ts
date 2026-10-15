import { Pool } from 'pg';
import { createLogger } from '@/lib/logger';
import { CloudinaryMediaInfo } from '@/lib/publish/types';
import { GOOGLE_REVOKE_URL, GOOGLE_TOKEN_URL, YOUTUBE_TITLE_MAX } from '@/lib/youtube';

const logger = createLogger('YouTubePublisher');

const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
const DESCRIPTION_MAX = 5000;
// Refresh tokens this close to expiry, so they cannot lapse mid-upload.
const TOKEN_EXPIRY_MARGIN_MS = 5 * 60_000;
// Videos from API projects that have not passed YouTube's compliance audit are locked to private.
const PRIVACY_STATUS = 'private';

export interface YouTubeChannelToken {
  channel_id: string;
  title: string;
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}

export interface YouTubePublishOptions {
  /** The video's title; blank uses the video's file name. */
  title: string;
  /** The post text, used as the video's description. */
  text: string;
  cloudinaryMedia?: CloudinaryMediaInfo[];
}

export interface YouTubePublishResult {
  platform: 'youtube';
  account_id: string;
  name: string;
  post_id: string;
}

export interface YouTubePublishError {
  platform: 'youtube';
  account_id: string;
  name: string;
  error: { message: string; code?: string };
}

const truncate = (text: string, max: number) => [...text].slice(0, max).join('');

// YouTube rejects angle brackets in titles and descriptions.
const sanitize = (text: string) => text.replace(/</g, '‹').replace(/>/g, '›');

/**
 * Title and description for an upload: the given title, or the video's file name
 * when it is blank, and the post text as the description.
 */
export function videoMetadata(title: string, text: string, fileName: string): { title: string; description: string } {
  const videoTitle = title.trim() || fileName.replace(/\.[^.]+$/, '') || 'Untitled video';
  return {
    title: truncate(sanitize(videoTitle), YOUTUBE_TITLE_MAX),
    description: truncate(sanitize(text.trim()), DESCRIPTION_MAX),
  };
}

/**
 * Revokes MockingBird's Google access for each refresh token (which also ends its
 * access tokens). Best effort: a failed revocation is logged and never thrown.
 */
export async function revokeYouTubeTokens(refreshTokens: string[]): Promise<void> {
  await Promise.all(
    refreshTokens.map(async (token) => {
      try {
        const response = await fetch(GOOGLE_REVOKE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token }),
        });
        if (!response.ok) logger.warn('YouTube token revocation failed', { status: response.status });
      } catch (error) {
        logger.warn('YouTube token revocation failed', { error: error instanceof Error ? error.message : String(error) });
      }
    })
  );
}

export class YouTubePublisher {
  constructor(private pool: Pool) {}

  async getAccountTokens(userId: string, channelIds: string[]): Promise<YouTubeChannelToken[]> {
    if (channelIds.length === 0) return [];
    const { rows } = await this.pool.query(
      `SELECT channel_id, title, access_token, refresh_token, expires_at
       FROM connected_youtube_channels
       WHERE user_id = $1 AND channel_id = ANY($2)`,
      [userId, channelIds]
    );
    return rows;
  }

  async publishToAccounts(
    options: YouTubePublishOptions,
    tokens: YouTubeChannelToken[]
  ): Promise<{ successful: YouTubePublishResult[]; failed: YouTubePublishError[] }> {
    const successful: YouTubePublishResult[] = [];
    const failed: YouTubePublishError[] = [];

    for (const token of tokens) {
      try {
        const videoId = await this.uploadVideo(token, options);
        successful.push({ platform: 'youtube', account_id: token.channel_id, name: token.title, post_id: videoId });
        logger.info('Uploaded to YouTube', { channel_id: token.channel_id, video_id: videoId });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        failed.push({ platform: 'youtube', account_id: token.channel_id, name: token.title, error: { message } });
        logger.error('Failed to upload to YouTube', { channel_id: token.channel_id, error: message });
      }
    }

    return { successful, failed };
  }

  private async uploadVideo(token: YouTubeChannelToken, options: YouTubePublishOptions): Promise<string> {
    const media = options.cloudinaryMedia ?? [];
    const videos = media.filter((m) => m.resourceType === 'video');
    if (videos.length !== 1 || media.length !== 1) {
      throw new Error('YouTube uploads take exactly one video.');
    }
    const video = videos[0];
    const accessToken = await this.freshAccessToken(token);

    // ponytail: buffers the whole video in memory; stream from Cloudinary if large videos exhaust RAM.
    const download = await fetch(video.publicUrl);
    if (!download.ok) throw new Error(`Could not download video ${video.publicUrl} (HTTP ${download.status})`);
    const contentType = download.headers.get('content-type') ?? 'video/*';
    const bytes = await download.arrayBuffer();

    const session = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(bytes.byteLength),
        'X-Upload-Content-Type': contentType,
      },
      body: JSON.stringify({
        snippet: videoMetadata(options.title, options.text, video.originalFilename),
        status: { privacyStatus: PRIVACY_STATUS, selfDeclaredMadeForKids: false },
      }),
    });
    if (!session.ok) throw await this.apiError(session, 'start the upload');
    const uploadUrl = session.headers.get('location');
    if (!uploadUrl) throw new Error('YouTube did not return an upload URL.');

    const upload = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': contentType },
      body: bytes,
    });
    if (!upload.ok) throw await this.apiError(upload, 'upload the video');
    const { id } = (await upload.json()) as { id: string };
    return id;
  }

  /** The channel's access token, refreshed and stored first when it is about to expire. */
  private async freshAccessToken(token: YouTubeChannelToken): Promise<string> {
    if (new Date(token.expires_at).getTime() - Date.now() > TOKEN_EXPIRY_MARGIN_MS) {
      return token.access_token;
    }
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token,
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      }),
    });
    if (!response.ok) {
      throw new Error('YouTube access was revoked or has expired. Reconnect the channel on the dashboard.');
    }
    const { access_token, expires_in } = (await response.json()) as { access_token: string; expires_in: number };
    await this.pool.query(
      `UPDATE connected_youtube_channels
       SET access_token = $1, expires_at = NOW() + make_interval(secs => $2)
       WHERE channel_id = $3 AND refresh_token = $4`,
      [access_token, expires_in, token.channel_id, token.refresh_token]
    );
    return access_token;
  }

  private async apiError(response: Response, action: string): Promise<Error> {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    if (response.status === 401) {
      return new Error('YouTube rejected the access token. Reconnect the channel on the dashboard.');
    }
    const message = body?.error?.message;
    return new Error(`YouTube could not ${action} (HTTP ${response.status})${message ? `: ${message}` : ''}`);
  }
}
