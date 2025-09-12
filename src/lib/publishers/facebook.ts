// /lib/publishers/facebook.ts
import axios from 'axios';
import { Pool } from 'pg';
import FormData from 'form-data';

// Simple logger utility
const logger = {
  info: (message: string, data?: unknown) => {
    console.log(`[FacebookPublisher] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error?: unknown) => {
    console.error(`[FacebookPublisher] ERROR: ${message}`, error);
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`[FacebookPublisher] WARN: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

export interface FacebookPageToken {
  page_id: string;
  page_name: string;
  page_access_token: string;
}

export interface FacebookPublishResult {
  platform: 'facebook';
  page_id: string;
  result: unknown;
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

export interface FacebookMediaFile {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

export interface FacebookPublishOptions {
  text?: string;
  files?: FacebookMediaFile[];
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
    file: FacebookMediaFile
  ): Promise<string> {
    logger.info(`Uploading media to Facebook page: ${pageId}`, { 
      filename: file.filename, 
      mimetype: file.mimetype,
      size: file.buffer.length
    });

    const formData = new FormData();
    formData.append('source', file.buffer, {
      filename: file.filename,
      contentType: file.mimetype,
    });

    // Determine if this is a video or image
    const isVideo = file.mimetype.startsWith('video/');
    const endpoint = isVideo 
      ? `https://graph.facebook.com/v19.0/${pageId}/videos`
      : `https://graph.facebook.com/v19.0/${pageId}/photos`;

    formData.append('published', 'false');


    try {
      const response = await axios.post(endpoint, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const mediaId = response.data.id;
      logger.info(`${isVideo ? 'Video' : 'Photo'} uploaded successfully to Facebook page: ${pageId}`, { 
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
private async publishMediaPost(
    pageId: string, 
    accessToken: string, 
    text: string | undefined, 
    mediaIds: string[]
  ): Promise<unknown> {
    logger.info(`Publishing media post to Facebook page: ${pageId}`, {
      mediaCount: mediaIds.length,
      mediaIds,
      hasText: !!text
    });

    // This single block of code handles both single and multiple photo posts
    const attachedMedia = mediaIds.map(id => ({ media_fbid: id }));
    const postData: Record<string, unknown> = {
      attached_media: attachedMedia,
    };
    if (text) {
      postData.message = text;
    }

    logger.info(`Publishing post with ${mediaIds.length} photos`, postData);

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



  // Legacy method for backward compatibility
  async publishTextToPages(
    text: string, 
    tokens: FacebookPageToken[]
  ): Promise<{
    successful: FacebookPublishResult[];
    failed: FacebookPublishError[];
  }> {
    return this.publishToPages({ text }, tokens);
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

      if (files.length === 0) {
        // Text-only post
        if (!text) {
          throw new Error('No content to publish (no text or files provided)');
        }
        result = await this.publishTextPost(pageId, token.page_access_token, text);
      } else {
        // Check if we have mixed media (photos + videos)
        const videos = files.filter(f => f.mimetype.startsWith('video/'));
        const photos = files.filter(f => f.mimetype.startsWith('image/'));
        
        if (videos.length > 0 && photos.length > 0) {
          logger.warn(`Mixed media detected for page ${pageId}. Publishing videos and photos separately.`);
          
          // Upload and publish videos first
          for (const video of videos) {
            const videoId = await this.uploadMediaToFacebook(pageId, token.page_access_token, video);
            await this.publishVideoPost(pageId, token.page_access_token, text, videoId);
          }
          
          // Then handle photos if any
          const photoIds: string[] = [];
          for (const photo of photos) {
            const photoId = await this.uploadMediaToFacebook(pageId, token.page_access_token, photo);
            photoIds.push(photoId);
          }
          result = await this.publishMediaPost(pageId, token.page_access_token, text, photoIds);
        } else if (videos.length > 0) {
          // Video-only posts
          if (videos.length === 1) {
            const videoId = await this.uploadMediaToFacebook(pageId, token.page_access_token, videos[0]);
            result = await this.publishVideoPost(pageId, token.page_access_token, text, videoId);
          } else {
            // Multiple videos - each needs to be posted separately
            logger.info(`Publishing ${videos.length} videos separately for page ${pageId}`);
            const videoResults = [];
            for (const video of videos) {
              const videoId = await this.uploadMediaToFacebook(pageId, token.page_access_token, video);
              const postResult = await this.publishVideoPost(pageId, token.page_access_token, text, videoId);
              videoResults.push(postResult);
            }
            result = { video_posts: videoResults };
          }
        } else {
          // Photo-only posts (original logic)
          const mediaIds: string[] = [];
          for (const file of files) {
            const mediaId = await this.uploadMediaToFacebook(pageId, token.page_access_token, file);
            mediaIds.push(mediaId);
          }
          result = await this.publishMediaPost(pageId, token.page_access_token, text, mediaIds);
        }
      }
      
      interface FacebookPostResponse {
        id?: string;
        [key: string]: unknown;
      }
      const postResult = result as FacebookPostResponse;
      logger.info(`Successfully published to Facebook page: ${pageId}`, { 
        postId: postResult.id,
        resultData: result 
      });
      
      successful.push({ 
        platform: 'facebook', 
        page_id: token.page_id, 
        result 
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
private async publishVideoPost(
  pageId: string, 
  accessToken: string, 
  text: string | undefined, 
  videoId: string
): Promise<unknown> {
  logger.info(`Publishing video post to Facebook page: ${pageId}`, {
    videoId,
    hasText: !!text
  });

  const postData: Record<string, unknown> = {
    attached_media: [{ media_fbid: videoId }],
  };
  if (text) {
    postData.message = text;
  }
  console.log(`videoId: ${videoId}`);

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
}