// /lib/publishers/facebook.ts
import axios from 'axios';
import { Pool } from 'pg';
import FormData from 'form-data';
import { MediaFile } from '@/types/interfaces';
import { createLogger } from '@/lib/logger';

const logger = createLogger('FacebookPublisher');

export interface FacebookPageToken {
  page_id: string;
  page_name: string;
  page_access_token: string;
}

export interface FacebookPublishResult {
  platform: 'facebook';
  page_id: string;
  result: unknown;
  /** Set when the post was published but a video's custom thumbnail was not. */
  warning?: string;
}

export interface FacebookPublishError {
  platform: 'facebook';
  page_id: string;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export interface FacebookPublishOptions {
  text?: string;
  files?: MediaFile[];
}

export class FacebookPublisher {
  constructor(private pool: Pool) {}

  async getPageTokens(userId: string, pageIds: string[]): Promise<FacebookPageToken[]> {
    logger.info('Starting Facebook page token retrieval', { userId, pageCount: pageIds.length });
    
    if (pageIds.length === 0) {
      logger.info('No Facebook pages requested, returning empty array');
      return [];
    }

    const client = await this.pool.connect();
    try {
      logger.info('Executing database query for Facebook page tokens', { pageIds });
      
      const result = await client.query(
        'SELECT page_id, page_name, page_access_token FROM connected_facebook_pages WHERE user_id = $1 AND page_id = ANY($2)',
        [userId, pageIds]
      );
      
      logger.info('Facebook page tokens retrieved successfully', { 
        requested: pageIds.length, 
        found: result.rows.length,
        foundPageIds: result.rows.map(row => row.page_id)
      });
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to retrieve Facebook page tokens', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async uploadMediaToFacebook(
    pageId: string, 
    accessToken: string, 
    file: MediaFile,
    publishNow = false,
    description?: string
  ): Promise<string> {
    logger.info(`Uploading media to Facebook page: ${pageId}`, { 
      filename: file.filename, 
      mimetype: file.mimetype,
      size: file.buffer.length,
      publishNow,
    });

    const formData = new FormData();
    formData.append('source', file.buffer, {
      filename: file.filename,
      contentType: file.mimetype,
    });

    const isVideo = file.mimetype.startsWith('video/');
    const endpoint = isVideo 
      ? `https://graph.facebook.com/v19.0/${pageId}/videos`
      : `https://graph.facebook.com/v19.0/${pageId}/photos`;

    if (description) {
      formData.append(isVideo ? 'description' : 'caption', description);
    }

    formData.append('published', publishNow ? 'true' : 'false');

    try {
      const response = await axios.post(endpoint, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const mediaId = response.data.id;
      logger.info(`${isVideo ? 'Video' : 'Photo'} uploaded successfully`, { 
        mediaId, 
        filename: file.filename 
      });
      
      return mediaId;
    } catch (error) {
      logger.error(`Failed to upload ${isVideo ? 'video' : 'photo'} to Facebook page: ${pageId}`, {
        filename: file.filename,
        mimetype: file.mimetype,
        endpoint,
        error: axios.isAxiosError(error) ? {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        } : error
      });
      throw error;
    }
  }

  /**
   * Uploads a video and, when it has a custom thumbnail, makes that the preferred one.
   * A thumbnail failure is returned as a warning, since the video is already published.
   */
  private async publishVideo(
    pageId: string,
    accessToken: string,
    video: MediaFile,
    description?: string
  ): Promise<{ videoId: string; warning?: string }> {
    const videoId = await this.uploadMediaToFacebook(pageId, accessToken, video, true, description);
    if (!video.thumbnailUrl) return { videoId };

    try {
      const image = await axios.get<ArrayBuffer>(video.thumbnailUrl, { responseType: 'arraybuffer' });
      const formData = new FormData();
      formData.append('source', Buffer.from(image.data), { filename: 'thumbnail.jpg', contentType: 'image/jpeg' });
      formData.append('is_preferred', 'true');
      await axios.post(`https://graph.facebook.com/v19.0/${videoId}/thumbnails`, formData, {
        headers: { ...formData.getHeaders(), Authorization: `Bearer ${accessToken}` },
      });
      return { videoId };
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error?.message || error.message
        : error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`Facebook thumbnail was not set for video ${videoId}`, { pageId, error: message });
      return { videoId, warning: `${video.filename} was published, but its thumbnail was not set: ${message}` };
    }
  }

  private async publishTextPost(
    pageId: string, 
    accessToken: string, 
    text: string
  ): Promise<unknown> {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${pageId}/feed`,
      { message: text },
      { 
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${accessToken}` 
        } 
      }
    );
    return response.data;
  }

  private async publishPhotoPost(
    pageId: string, 
    accessToken: string, 
    text: string | undefined, 
    mediaIds: string[]
  ): Promise<unknown> {
    logger.info(`Publishing photo post to Facebook page: ${pageId}`, {
      mediaCount: mediaIds.length,
      mediaIds,
      hasText: !!text
    });

    const attachedMedia = mediaIds.map(id => ({ media_fbid: id }));
    const postData: Record<string, unknown> = {
      attached_media: attachedMedia,
    };
    if (text) {
      postData.message = text;
    }

    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${pageId}/feed`,
      postData,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  }

  validateMissingPages(requestedIds: string[], foundTokens: FacebookPageToken[]): string[] {
    const foundIds = new Set(foundTokens.map(t => t.page_id));
    const missingIds = requestedIds.filter(id => !foundIds.has(id));
    
    if (missingIds.length > 0) {
      logger.warn('Missing Facebook pages detected', { 
        requested: requestedIds, 
        found: Array.from(foundIds), 
        missing: missingIds 
      });
    } else {
      logger.info('All requested Facebook pages found');
    }
    
    return missingIds;
  }

  async publishToPages(
    options: FacebookPublishOptions,
    tokens: FacebookPageToken[]
  ): Promise<{
    successful: FacebookPublishResult[];
    failed: FacebookPublishError[];
  }> {
    const { text, files = [] } = options;
    
    logger.info('Starting Facebook publishing process', { 
      textLength: text?.length || 0, 
      fileCount: files.length,
      pageCount: tokens.length,
      pageIds: tokens.map(t => t.page_id)
    });

    const successful: FacebookPublishResult[] = [];
    const failed: FacebookPublishError[] = [];

    const publishPromises = tokens.map(async (token) => {
      const pageId = token.page_id;
      logger.info(`Publishing to Facebook page: ${pageId}`);
      
      try {
        let result: unknown;
        const warnings: string[] = [];

        if (files.length === 0) {
          if (!text) {
            throw new Error('No content to publish (no text or files provided)');
          }
          result = await this.publishTextPost(pageId, token.page_access_token, text);
        } else {
          const videos = files.filter(f => f.mimetype.startsWith('video/'));
          const photos = files.filter(f => f.mimetype.startsWith('image/'));

          if (videos.length > 0 && photos.length > 0) {
            logger.warn(`Mixed media detected for page ${pageId}. Facebook doesn’t allow combined video + photo posts. Publishing separately.`);

            const results: unknown[] = [];

            for (const video of videos) {
              const { videoId, warning } = await this.publishVideo(pageId, token.page_access_token, video, text);
              results.push(videoId);
              if (warning) warnings.push(warning);
            }

            if (photos.length > 0) {
              const photoIds: string[] = [];
              for (const photo of photos) {
                const photoId = await this.uploadMediaToFacebook(pageId, token.page_access_token, photo, false);
                photoIds.push(photoId);
              }
              const photoResult = await this.publishPhotoPost(pageId, token.page_access_token, text, photoIds);
              results.push(photoResult);
            }

            result = { separate_posts: results };
          } else if (videos.length > 0) {
            const results: unknown[] = [];
            for (const video of videos) {
              const { videoId, warning } = await this.publishVideo(pageId, token.page_access_token, video, text);
              results.push(videoId);
              if (warning) warnings.push(warning);
            }
            result = { video_posts: results };
          } else {
            const mediaIds: string[] = [];
            for (const file of files) {
              const mediaId = await this.uploadMediaToFacebook(pageId, token.page_access_token, file, false);
              mediaIds.push(mediaId);
            }
            result = await this.publishPhotoPost(pageId, token.page_access_token, text, mediaIds);
          }
        }

        successful.push({ 
          platform: 'facebook', 
          page_id: token.page_id, 
          result,
          ...(warnings.length > 0 && { warning: warnings.join(' ') }),
        });
      } catch (error) {
        logger.error(`Failed to publish to Facebook page: ${pageId}`, {
          error: axios.isAxiosError(error) ? {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
          } : error
        });
        
        failed.push({
          platform: 'facebook',
          page_id: token.page_id,
          error: axios.isAxiosError(error)
            ? {
                message: error.response?.data?.error?.message || error.message,
                code: error.response?.data?.error?.code?.toString(),
                details: error.response?.data,
              }
            : { 
                message: error instanceof Error ? error.message : 'Unknown error during Facebook publish' 
              },
        });
      }
    });

    await Promise.all(publishPromises);

    logger.info('Facebook publishing completed', { 
      successful: successful.length, 
      failed: failed.length,
      successfulPages: successful.map(s => s.page_id),
      failedPages: failed.map(f => f.page_id)
    });

    return { successful, failed };
  }
}
