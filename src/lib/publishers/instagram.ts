import axios from 'axios';
import { Pool } from 'pg';
import { MediaFile } from '@/types/interfaces';
import { createLogger } from '@/lib/logger';
import {
  uploadMultipleToCloudinary,
  UploadedMedia,
} from '@/lib/services/cloudinaryService';

const logger = createLogger('InstagramPublisher');

const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface InstagramAccountToken {
  instagram_account_id: string;
  username: string;
  page_access_token: string;
  facebook_page_id: string;
}

export interface InstagramPublishResult {
  platform: 'instagram';
  instagram_account_id: string;
  post_type: 'feed' | 'story';
  result: unknown;
}

export interface InstagramPublishError {
  platform: 'instagram';
  instagram_account_id: string;
  post_type: 'feed' | 'story';
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export interface InstagramPublishOptions {
  text?: string;
  files?: MediaFile[];
}

type MediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS' | 'STORIES';

export class InstagramPublisher {
  constructor(private pool: Pool) {}

  /**
   * Fetches Instagram account tokens by joining with Facebook pages
   * Instagram uses the Facebook page's access token for API calls
   */
  async getAccountTokens(
    userId: string,
    instagramAccountIds: string[]
  ): Promise<InstagramAccountToken[]> {
    logger.info('Starting Instagram account token retrieval', {
      userId,
      accountCount: instagramAccountIds.length,
    });

    if (instagramAccountIds.length === 0) {
      logger.info('No Instagram accounts requested, returning empty array');
      return [];
    }

    const client = await this.pool.connect();
    try {
      // Join Instagram accounts with Facebook pages to get the access token
      const result = await client.query(
        `SELECT
          ia.instagram_account_id,
          ia.username,
          fp.page_access_token,
          fp.page_id as facebook_page_id
        FROM connected_instagram_accounts ia
        INNER JOIN connected_facebook_pages fp ON ia.facebook_page_id = fp.id
        WHERE fp.user_id = $1 AND ia.instagram_account_id = ANY($2)`,
        [userId, instagramAccountIds]
      );

      logger.info('Instagram account tokens retrieved successfully', {
        requested: instagramAccountIds.length,
        found: result.rows.length,
        foundAccountIds: result.rows.map((row) => row.instagram_account_id),
      });

      return result.rows;
    } catch (error) {
      logger.error('Failed to retrieve Instagram account tokens', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validates which requested accounts are missing
   */
  validateMissingAccounts(
    requestedIds: string[],
    foundTokens: InstagramAccountToken[]
  ): string[] {
    const foundIds = new Set(foundTokens.map((t) => t.instagram_account_id));
    const missingIds = requestedIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      logger.warn('Missing Instagram accounts detected', {
        requested: requestedIds,
        found: Array.from(foundIds),
        missing: missingIds,
      });
    }

    return missingIds;
  }

  /**
   * Creates a media container for Instagram
   * Step 1 of the two-step publishing process
   */
  private async createMediaContainer(
    instagramAccountId: string,
    accessToken: string,
    options: {
      imageUrl?: string;
      videoUrl?: string;
      caption?: string;
      mediaType?: MediaType;
      isCarouselItem?: boolean;
    }
  ): Promise<string> {
    const { imageUrl, videoUrl, caption, mediaType, isCarouselItem } = options;

    logger.info('Creating Instagram media container', {
      instagramAccountId,
      hasImage: !!imageUrl,
      hasVideo: !!videoUrl,
      mediaType,
      isCarouselItem,
    });

    const params: Record<string, string | boolean> = {
      access_token: accessToken,
    };

    if (imageUrl) {
      params.image_url = imageUrl;
    }

    if (videoUrl) {
      params.video_url = videoUrl;
      params.media_type = mediaType || 'REELS';
    }

    if (caption && !isCarouselItem) {
      params.caption = caption;
    }

    if (isCarouselItem) {
      params.is_carousel_item = true;
    }

    if (mediaType === 'STORIES') {
      params.media_type = 'STORIES';
    }

    try {
      const response = await axios.post(
        `${GRAPH_API_BASE}/${instagramAccountId}/media`,
        null,
        { params }
      );

      const containerId = response.data.id;
      logger.info('Media container created successfully', {
        containerId,
        instagramAccountId,
      });

      return containerId;
    } catch (error) {
      logger.error('Failed to create media container', {
        instagramAccountId,
        error: axios.isAxiosError(error)
          ? {
              status: error.response?.status,
              data: error.response?.data,
              message: error.message,
            }
          : error,
      });
      throw error;
    }
  }

  /**
   * Creates a carousel container from multiple media items
   */
  private async createCarouselContainer(
    instagramAccountId: string,
    accessToken: string,
    childrenIds: string[],
    caption?: string
  ): Promise<string> {
    logger.info('Creating Instagram carousel container', {
      instagramAccountId,
      childCount: childrenIds.length,
    });

    const params: Record<string, string> = {
      access_token: accessToken,
      media_type: 'CAROUSEL',
      children: childrenIds.join(','),
    };

    if (caption) {
      params.caption = caption;
    }

    try {
      const response = await axios.post(
        `${GRAPH_API_BASE}/${instagramAccountId}/media`,
        null,
        { params }
      );

      const containerId = response.data.id;
      logger.info('Carousel container created successfully', {
        containerId,
        instagramAccountId,
      });

      return containerId;
    } catch (error) {
      logger.error('Failed to create carousel container', {
        instagramAccountId,
        error: axios.isAxiosError(error)
          ? {
              status: error.response?.status,
              data: error.response?.data,
              message: error.message,
            }
          : error,
      });
      throw error;
    }
  }

  /**
   * Checks the status of a media container (for videos that need processing)
   */
  private async checkContainerStatus(
    containerId: string,
    accessToken: string
  ): Promise<'FINISHED' | 'IN_PROGRESS' | 'ERROR'> {
    const response = await axios.get(`${GRAPH_API_BASE}/${containerId}`, {
      params: {
        access_token: accessToken,
        fields: 'status_code',
      },
    });

    return response.data.status_code;
  }

  /**
   * Waits for a video container to finish processing
   */
  private async waitForContainerReady(
    containerId: string,
    accessToken: string,
    maxAttempts = 30,
    delayMs = 5000
  ): Promise<void> {
    logger.info('Waiting for container to be ready', { containerId });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const status = await this.checkContainerStatus(containerId, accessToken);

      if (status === 'FINISHED') {
        logger.info('Container is ready', { containerId, attempt });
        return;
      }

      if (status === 'ERROR') {
        throw new Error('Media container processing failed');
      }

      logger.info('Container still processing', {
        containerId,
        status,
        attempt,
        maxAttempts,
      });

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error('Timeout waiting for media container to be ready');
  }

  /**
   * Publishes a media container
   * Step 2 of the two-step publishing process
   */
  private async publishContainer(
    instagramAccountId: string,
    accessToken: string,
    containerId: string
  ): Promise<unknown> {
    logger.info('Publishing Instagram container', {
      instagramAccountId,
      containerId,
    });

    try {
      const response = await axios.post(
        `${GRAPH_API_BASE}/${instagramAccountId}/media_publish`,
        null,
        {
          params: {
            access_token: accessToken,
            creation_id: containerId,
          },
        }
      );

      logger.info('Container published successfully', {
        instagramAccountId,
        containerId,
        mediaId: response.data.id,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to publish container', {
        instagramAccountId,
        containerId,
        error: axios.isAxiosError(error)
          ? {
              status: error.response?.status,
              data: error.response?.data,
              message: error.message,
            }
          : error,
      });
      throw error;
    }
  }

  /**
   * Publishes a single image to Instagram feed
   */
  private async publishSingleImage(
    token: InstagramAccountToken,
    imageUrl: string,
    caption?: string
  ): Promise<unknown> {
    const containerId = await this.createMediaContainer(
      token.instagram_account_id,
      token.page_access_token,
      { imageUrl, caption }
    );

    // Images don't need processing wait
    return this.publishContainer(
      token.instagram_account_id,
      token.page_access_token,
      containerId
    );
  }

  /**
   * Publishes a single video/reel to Instagram feed
   */
  private async publishSingleVideo(
    token: InstagramAccountToken,
    videoUrl: string,
    caption?: string
  ): Promise<unknown> {
    const containerId = await this.createMediaContainer(
      token.instagram_account_id,
      token.page_access_token,
      { videoUrl, caption, mediaType: 'REELS' }
    );

    // Videos need processing time
    await this.waitForContainerReady(
      containerId,
      token.page_access_token
    );

    return this.publishContainer(
      token.instagram_account_id,
      token.page_access_token,
      containerId
    );
  }

  /**
   * Publishes a carousel (multiple images) to Instagram feed
   */
  private async publishCarousel(
    token: InstagramAccountToken,
    imageUrls: string[],
    caption?: string
  ): Promise<unknown> {
    // Create individual containers for each image (max 10 items)
    const childrenIds: string[] = [];
    const urls = imageUrls.slice(0, 10); // Instagram carousel limit

    for (const url of urls) {
      const childId = await this.createMediaContainer(
        token.instagram_account_id,
        token.page_access_token,
        { imageUrl: url, isCarouselItem: true }
      );
      childrenIds.push(childId);
    }

    // Create the carousel container
    const carouselId = await this.createCarouselContainer(
      token.instagram_account_id,
      token.page_access_token,
      childrenIds,
      caption
    );

    return this.publishContainer(
      token.instagram_account_id,
      token.page_access_token,
      carouselId
    );
  }

  /**
   * Publishes a story to Instagram
   */
  private async publishStory(
    token: InstagramAccountToken,
    mediaUrl: string,
    isVideo: boolean
  ): Promise<unknown> {
    const containerId = await this.createMediaContainer(
      token.instagram_account_id,
      token.page_access_token,
      {
        ...(isVideo ? { videoUrl: mediaUrl } : { imageUrl: mediaUrl }),
        mediaType: 'STORIES',
      }
    );

    if (isVideo) {
      await this.waitForContainerReady(containerId, token.page_access_token);
    }

    return this.publishContainer(
      token.instagram_account_id,
      token.page_access_token,
      containerId
    );
  }

  /**
   * Publishes to Instagram feed (images, videos, or carousels)
   */
  async publishToFeed(
    options: InstagramPublishOptions,
    tokens: InstagramAccountToken[]
  ): Promise<{
    successful: InstagramPublishResult[];
    failed: InstagramPublishError[];
    uploadedMedia: UploadedMedia[];
  }> {
    const { text, files = [] } = options;

    logger.info('Starting Instagram feed publishing', {
      textLength: text?.length || 0,
      fileCount: files.length,
      accountCount: tokens.length,
    });

    const successful: InstagramPublishResult[] = [];
    const failed: InstagramPublishError[] = [];
    let uploadedMedia: UploadedMedia[] = [];

    if (files.length === 0) {
      // Instagram doesn't support text-only posts
      logger.warn('Instagram requires media for feed posts');
      for (const token of tokens) {
        failed.push({
          platform: 'instagram',
          instagram_account_id: token.instagram_account_id,
          post_type: 'feed',
          error: {
            message: 'Instagram feed posts require at least one image or video',
          },
        });
      }
      return { successful, failed, uploadedMedia };
    }

    // Upload files to Cloudinary first
    const uploadResult = await uploadMultipleToCloudinary(files);

    if (uploadResult.successful.length === 0) {
      logger.error('All media uploads to Cloudinary failed');
      for (const token of tokens) {
        failed.push({
          platform: 'instagram',
          instagram_account_id: token.instagram_account_id,
          post_type: 'feed',
          error: {
            message: 'Failed to upload media files',
            details: uploadResult.failed,
          },
        });
      }
      return { successful, failed, uploadedMedia };
    }

    uploadedMedia = uploadResult.successful;
    const images = uploadedMedia.filter((m) => m.resourceType === 'image');
    const videos = uploadedMedia.filter((m) => m.resourceType === 'video');

    // Publish to each account
    const publishPromises = tokens.map(async (token) => {
      try {
        let result: unknown;

        if (videos.length > 0) {
          // Instagram doesn't support mixed media in a single post
          // Publish first video as a Reel
          result = await this.publishSingleVideo(
            token,
            videos[0].publicUrl,
            text
          );
        } else if (images.length === 1) {
          result = await this.publishSingleImage(
            token,
            images[0].publicUrl,
            text
          );
        } else {
          // Multiple images = carousel
          result = await this.publishCarousel(
            token,
            images.map((i) => i.publicUrl),
            text
          );
        }

        successful.push({
          platform: 'instagram',
          instagram_account_id: token.instagram_account_id,
          post_type: 'feed',
          result,
        });
      } catch (error) {
        failed.push({
          platform: 'instagram',
          instagram_account_id: token.instagram_account_id,
          post_type: 'feed',
          error: axios.isAxiosError(error)
            ? {
                message:
                  error.response?.data?.error?.message || error.message,
                code: error.response?.data?.error?.code?.toString(),
                details: error.response?.data,
              }
            : {
                message:
                  error instanceof Error
                    ? error.message
                    : 'Unknown error during Instagram publish',
              },
        });
      }
    });

    await Promise.all(publishPromises);

    logger.info('Instagram feed publishing completed', {
      successful: successful.length,
      failed: failed.length,
    });

    return { successful, failed, uploadedMedia };
  }

  /**
   * Publishes stories to Instagram
   */
  async publishToStories(
    options: InstagramPublishOptions,
    tokens: InstagramAccountToken[]
  ): Promise<{
    successful: InstagramPublishResult[];
    failed: InstagramPublishError[];
    uploadedMedia: UploadedMedia[];
  }> {
    const { files = [] } = options;

    logger.info('Starting Instagram story publishing', {
      fileCount: files.length,
      accountCount: tokens.length,
    });

    const successful: InstagramPublishResult[] = [];
    const failed: InstagramPublishError[] = [];
    let uploadedMedia: UploadedMedia[] = [];

    if (files.length === 0) {
      logger.warn('Instagram stories require media');
      for (const token of tokens) {
        failed.push({
          platform: 'instagram',
          instagram_account_id: token.instagram_account_id,
          post_type: 'story',
          error: {
            message: 'Instagram stories require at least one image or video',
          },
        });
      }
      return { successful, failed, uploadedMedia };
    }

    // Upload first file to Cloudinary (stories are single media)
    const uploadResult = await uploadMultipleToCloudinary([files[0]]);

    if (uploadResult.successful.length === 0) {
      logger.error('Media upload to Cloudinary failed for story');
      for (const token of tokens) {
        failed.push({
          platform: 'instagram',
          instagram_account_id: token.instagram_account_id,
          post_type: 'story',
          error: {
            message: 'Failed to upload media file for story',
            details: uploadResult.failed,
          },
        });
      }
      return { successful, failed, uploadedMedia };
    }

    uploadedMedia = uploadResult.successful;
    const media = uploadedMedia[0];
    const isVideo = media.resourceType === 'video';

    // Publish to each account
    const publishPromises = tokens.map(async (token) => {
      try {
        const result = await this.publishStory(token, media.publicUrl, isVideo);

        successful.push({
          platform: 'instagram',
          instagram_account_id: token.instagram_account_id,
          post_type: 'story',
          result,
        });
      } catch (error) {
        failed.push({
          platform: 'instagram',
          instagram_account_id: token.instagram_account_id,
          post_type: 'story',
          error: axios.isAxiosError(error)
            ? {
                message:
                  error.response?.data?.error?.message || error.message,
                code: error.response?.data?.error?.code?.toString(),
                details: error.response?.data,
              }
            : {
                message:
                  error instanceof Error
                    ? error.message
                    : 'Unknown error during Instagram story publish',
              },
        });
      }
    });

    await Promise.all(publishPromises);

    logger.info('Instagram story publishing completed', {
      successful: successful.length,
      failed: failed.length,
    });

    return { successful, failed, uploadedMedia };
  }
}
