// /lib/publishers/facebook.ts
import axios from 'axios';
import { Pool } from 'pg';

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
  error: unknown;
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
        'SELECT page_id, page_access_token FROM connected_facebook_pages WHERE user_id = $1 AND page_id = ANY($2)',
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

  async publishToPages(
    text: string, 
    tokens: FacebookPageToken[]
  ): Promise<{
    successful: FacebookPublishResult[];
    failed: FacebookPublishError[];
  }> {
    logger.info('Starting Facebook publishing process', { 
      textLength: text.length, 
      pageCount: tokens.length,
      pageIds: tokens.map(t => t.page_id)
    });

    const successful: FacebookPublishResult[] = [];
    const failed: FacebookPublishError[] = [];

    const publishPromises = tokens.map(async (token) => {
      const pageId = token.page_id;
      logger.info(`Publishing to Facebook page: ${pageId}`);
      
      try {
        const response = await axios.post(
          `https://graph.facebook.com/v19.0/${token.page_id}/feed`,
          { message: text },
          { 
            headers: { 
              'Content-Type': 'application/json', 
              Authorization: `Bearer ${token.page_access_token}` 
            } 
          }
        );
        
        logger.info(`Successfully published to Facebook page: ${pageId}`, { 
          postId: response.data?.id,
          responseData: response.data 
        });
        
        successful.push({ 
          platform: 'facebook', 
          page_id: token.page_id, 
          result: response.data 
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
          error: axios.isAxiosError(error) ? error.response?.data : 'Unknown error',
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
}