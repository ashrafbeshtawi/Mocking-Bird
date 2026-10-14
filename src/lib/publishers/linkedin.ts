import { Pool } from 'pg';
import { createLogger } from '@/lib/logger';
import { CloudinaryMediaInfo } from '@/lib/publish/types';

const logger = createLogger('LinkedInPublisher');

const API_BASE = 'https://api.linkedin.com/rest';
// LinkedIn supports each monthly API version for about a year.
const LINKEDIN_VERSION = '202606';
const MAX_IMAGES = 20;
const VIDEO_PROCESSING_TIMEOUT_MS = 5 * 60_000;
const VIDEO_POLL_INTERVAL_MS = 3_000;

export interface LinkedInAccountToken {
  linkedin_user_id: string;
  name: string;
  access_token: string;
  expires_at: Date;
}

export interface LinkedInPublishOptions {
  text: string;
  cloudinaryMedia?: CloudinaryMediaInfo[];
}

export interface LinkedInPublishResult {
  platform: 'linkedin';
  account_id: string;
  name: string;
  post_id: string;
}

export interface LinkedInPublishError {
  platform: 'linkedin';
  account_id: string;
  name: string;
  error: { message: string; code?: string };
}

/**
 * Escapes the characters LinkedIn's "little text" commentary format reserves,
 * so the post text is published verbatim.
 */
export function escapeCommentary(text: string): string {
  return text.replace(/[\\|{}@[\]()<>#*_~]/g, (c) => `\\${c}`);
}

export class LinkedInPublisher {
  constructor(private pool: Pool) {}

  async getAccountTokens(userId: string, accountIds: string[]): Promise<LinkedInAccountToken[]> {
    if (accountIds.length === 0) return [];
    const { rows } = await this.pool.query(
      `SELECT linkedin_user_id, name, access_token, expires_at
       FROM connected_linkedin_accounts
       WHERE user_id = $1 AND linkedin_user_id = ANY($2)`,
      [userId, accountIds]
    );
    return rows;
  }

  async publishToAccounts(
    options: LinkedInPublishOptions,
    tokens: LinkedInAccountToken[]
  ): Promise<{ successful: LinkedInPublishResult[]; failed: LinkedInPublishError[] }> {
    const successful: LinkedInPublishResult[] = [];
    const failed: LinkedInPublishError[] = [];

    for (const token of tokens) {
      try {
        const postId = await this.publishPost(token, options);
        successful.push({ platform: 'linkedin', account_id: token.linkedin_user_id, name: token.name, post_id: postId });
        logger.info('Published to LinkedIn', { account_id: token.linkedin_user_id, post_id: postId });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        failed.push({ platform: 'linkedin', account_id: token.linkedin_user_id, name: token.name, error: { message } });
        logger.error('Failed to publish to LinkedIn', { account_id: token.linkedin_user_id, error: message });
      }
    }

    return { successful, failed };
  }

  private async publishPost(token: LinkedInAccountToken, options: LinkedInPublishOptions): Promise<string> {
    if (new Date(token.expires_at) <= new Date()) {
      throw new Error('LinkedIn access has expired. Reconnect the account on the dashboard.');
    }
    const media = options.cloudinaryMedia ?? [];
    const videos = media.filter((m) => m.resourceType === 'video');
    if (videos.length > 0 && media.length > 1) {
      throw new Error('LinkedIn posts can contain one video, without other media.');
    }
    if (media.length > MAX_IMAGES) {
      throw new Error(`LinkedIn allows at most ${MAX_IMAGES} images per post.`);
    }

    const author = `urn:li:person:${token.linkedin_user_id}`;
    const mediaUrns = videos.length === 1
      ? [await this.uploadVideo(token.access_token, author, videos[0].publicUrl)]
      : await Promise.all(media.map((m) => this.uploadImage(token.access_token, author, m.publicUrl)));

    const response = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: { ...this.headers(token.access_token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author,
        commentary: escapeCommentary(options.text),
        visibility: 'PUBLIC',
        distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
        ...(mediaUrns.length === 1 && { content: { media: { id: mediaUrns[0] } } }),
        ...(mediaUrns.length > 1 && { content: { multiImage: { images: mediaUrns.map((id) => ({ id })) } } }),
      }),
    });
    if (!response.ok) throw await this.apiError(response, 'create post');
    return response.headers.get('x-restli-id') ?? '';
  }

  private async uploadImage(accessToken: string, owner: string, imageUrl: string): Promise<string> {
    const init = await fetch(`${API_BASE}/images?action=initializeUpload`, {
      method: 'POST',
      headers: { ...this.headers(accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ initializeUploadRequest: { owner } }),
    });
    if (!init.ok) throw await this.apiError(init, 'initialize image upload');
    const { value } = (await init.json()) as { value: { uploadUrl: string; image: string } };

    const image = await fetch(imageUrl);
    if (!image.ok) throw new Error(`Could not download image ${imageUrl} (HTTP ${image.status})`);

    const upload = await fetch(value.uploadUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: await image.arrayBuffer(),
    });
    if (!upload.ok) throw await this.apiError(upload, 'upload image');
    return value.image;
  }

  /**
   * Uploads a video in the parts LinkedIn assigns, finalizes it, and waits until
   * LinkedIn has processed it, since a post can only reference an available video.
   */
  private async uploadVideo(accessToken: string, owner: string, videoUrl: string): Promise<string> {
    // ponytail: buffers the whole video in memory; stream ranges from Cloudinary if large videos exhaust RAM.
    const download = await fetch(videoUrl);
    if (!download.ok) throw new Error(`Could not download video ${videoUrl} (HTTP ${download.status})`);
    const bytes = new Uint8Array(await download.arrayBuffer());

    const init = await fetch(`${API_BASE}/videos?action=initializeUpload`, {
      method: 'POST',
      headers: { ...this.headers(accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initializeUploadRequest: { owner, fileSizeBytes: bytes.byteLength, uploadCaptions: false, uploadThumbnail: false },
      }),
    });
    if (!init.ok) throw await this.apiError(init, 'initialize video upload');
    const { value } = (await init.json()) as {
      value: {
        video: string;
        uploadToken: string;
        uploadInstructions: { uploadUrl: string; firstByte: number; lastByte: number }[];
      };
    };

    const uploadedPartIds: string[] = [];
    for (const { uploadUrl, firstByte, lastByte } of value.uploadInstructions) {
      const part = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: bytes.subarray(firstByte, lastByte + 1),
      });
      if (!part.ok) throw await this.apiError(part, 'upload video');
      uploadedPartIds.push(part.headers.get('etag') ?? '');
    }

    const finalize = await fetch(`${API_BASE}/videos?action=finalizeUpload`, {
      method: 'POST',
      headers: { ...this.headers(accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        finalizeUploadRequest: { video: value.video, uploadToken: value.uploadToken, uploadedPartIds },
      }),
    });
    if (!finalize.ok) throw await this.apiError(finalize, 'finalize video upload');

    await this.waitForVideo(accessToken, value.video);
    return value.video;
  }

  private async waitForVideo(accessToken: string, videoUrn: string): Promise<void> {
    const deadline = Date.now() + VIDEO_PROCESSING_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const response = await fetch(`${API_BASE}/videos/${encodeURIComponent(videoUrn)}`, {
        headers: this.headers(accessToken),
      });
      if (!response.ok) throw await this.apiError(response, 'read video status');
      const { status } = (await response.json()) as { status: string };
      if (status === 'AVAILABLE') return;
      if (status === 'PROCESSING_FAILED') throw new Error('LinkedIn could not process the video.');
      await new Promise((resolve) => setTimeout(resolve, VIDEO_POLL_INTERVAL_MS));
    }
    throw new Error('LinkedIn did not finish processing the video in time.');
  }

  private headers(accessToken: string) {
    return {
      Authorization: `Bearer ${accessToken}`,
      'LinkedIn-Version': LINKEDIN_VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
    };
  }

  private async apiError(response: Response, action: string): Promise<Error> {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    if (response.status === 401) {
      return new Error('LinkedIn rejected the access token. Reconnect the account on the dashboard.');
    }
    return new Error(`LinkedIn could not ${action} (HTTP ${response.status})${body?.message ? `: ${body.message}` : ''}`);
  }
}
