import axios from 'axios';
import { Pool } from 'pg';
import FormData from 'form-data'; // Required for media uploads
import { MediaFile, TwitterMediaUploadResult } from '@/types/interfaces'; // Import MediaFile and TwitterMediaUploadResult
import { exit } from 'process';

const logger = {
  info: (message: string, data?: unknown) => console.log(`[TwitterPublisher] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : ''),
  error: (message: string, error?: unknown) => console.error(`[TwitterPublisher] ERROR: ${message}`, error),
  warn: (message: string, data?: unknown) => console.warn(`[TwitterPublisher] WARN: ${message}`, data ? JSON.stringify(data, null, 2) : '')
};

export interface TwitterAccountToken {
  x_user_id: string;
  username: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  changed_at: string; // from DB
}

export interface TwitterPublishResult {
  platform: 'x';
  account_id: string;
  result: unknown;
}

export interface TwitterPublishError {
  platform: 'x';
  account_id: string;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export class TwitterPublisher {
  constructor(private pool: Pool) {}

  async getAccountTokens(userId: string, accountIds: string[]): Promise<TwitterAccountToken[]> {
    logger.info('Retrieving Twitter account tokens', { userId, accountCount: accountIds.length });
    if (accountIds.length === 0) return [];

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT x_user_id, username, oauth_token AS access_token, refresh_token, expires_in, changed_at
         FROM connected_x_accounts
         WHERE user_id = $1 AND x_user_id = ANY($2)`,
        [userId, accountIds]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  validateMissingAccounts(requestedIds: string[], foundTokens: TwitterAccountToken[]): string[] {
    const foundIds = new Set(foundTokens.map(t => t.x_user_id));
    const missingIds = requestedIds.filter(id => !foundIds.has(id));

    if (missingIds.length > 0) {
      logger.warn('Missing Twitter accounts detected', {
        requested: requestedIds,
        found: Array.from(foundIds),
        missing: missingIds
      });
    } else {
      logger.info('All requested Twitter accounts found');
    }
    return missingIds;
  }

  private isTokenExpired(account: TwitterAccountToken): boolean {
    const changedAt = new Date(account.changed_at).getTime();
    const expiryTime = changedAt + account.expires_in * 1000; // seconds → ms
    return Date.now() >= expiryTime;
  }

  private async refreshToken(account: TwitterAccountToken, userId: string): Promise<string> {
    logger.info(`Refreshing token for account ${account.username} (${account.x_user_id})`);

    try {
        const response = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: account.refresh_token,
            client_id: process.env.X_CLIENT_ID!
        }).toString(),
        {
            headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64')}`
            }
        }
        );


      const { access_token, refresh_token, expires_in, scope } = response.data;
      const grantedScopesArray = scope?.split(' ') || [];

      const client = await this.pool.connect();
      try {
        await client.query(
          `UPDATE connected_x_accounts
           SET oauth_token = $1,
               refresh_token = $2,
               expires_in = $3,
               granted_scopes = $4
           WHERE user_id = $5 AND x_user_id = $6`,
          [access_token, refresh_token, expires_in, grantedScopesArray, userId, account.x_user_id]
        );
      } finally {
        client.release();
      }

      logger.info(`Token refreshed successfully for account ${account.username}`);
      return access_token;
    } catch (error) {
      logger.error(`Failed to refresh token for ${account.username}`, error);
      throw error;
    }
  }

  private async uploadMedia(
    file: MediaFile,
    accessToken: string
  ): Promise<string> {
    logger.info(`Uploading media to Twitter: ${file.filename} (${file.mimetype})`);

    // Determine media category based on file type
    const getMediaCategory = (mimetype: string): string => {
      if (mimetype.startsWith('image/')) return 'tweet_image';
      if (mimetype.startsWith('video/')) return 'tweet_video';
      if (mimetype === 'image/gif') return 'tweet_gif';
      return 'tweet_image'; // default
    };

    const mediaCategory = getMediaCategory(file.mimetype);
    logger.info(`Using media category: ${mediaCategory}`);

    try {
      // Method 1: Try multipart/form-data with raw binary (preferred)
      const formData = new FormData();
      formData.append('media', file.buffer, {
        filename: file.filename,
        contentType: file.mimetype,
      });

      const response = await axios.post<TwitterMediaUploadResult>(
        `https://upload.twitter.com/1.1/media/upload.json?media_category=${mediaCategory}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${accessToken}`,
          },
          timeout: 60000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      );

      logger.info(`Media uploaded successfully:`, {
        media_id_string: response.data.media_id_string,
        media_key: response.data.media_key,
        size: response.data.size,
        expires_after_secs: response.data.expires_after_secs
      });

      return response.data.media_id_string;

    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        logger.warn('Multipart upload failed with 403, trying base64 method...');
        
        // Method 2: Fallback to base64 with application/x-www-form-urlencoded
        try {
          const base64Data = file.buffer.toString('base64');
          
          const response = await axios.post<TwitterMediaUploadResult>(
            `https://upload.twitter.com/1.1/media/upload.json`,
            new URLSearchParams({
              media_data: base64Data,
              media_category: mediaCategory
            }).toString(),
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              timeout: 60000,
            }
          );

          logger.info('Base64 upload successful:', {
            media_id_string: response.data.media_id_string,
            media_key: response.data.media_key
          });

          return response.data.media_id_string;

        } catch (base64Error) {
          logger.error('Both multipart and base64 uploads failed:', { 
            multipartError: error, 
            base64Error 
          });
          throw base64Error;
        }
      }
      
      logger.error(`Failed to upload media: ${file.filename}`, error);
      throw error;
    }
  }

  async publishToAccounts(
    text: string,
    tokens: TwitterAccountToken[],
    userId: string,
    mediaFiles?: MediaFile[] // Added optional mediaFiles parameter
  ): Promise<{ successful: TwitterPublishResult[]; failed: TwitterPublishError[] }> {
    const successful: TwitterPublishResult[] = [];
    const failed: TwitterPublishError[] = [];

    const mediaIds: string[] = [];
    if (mediaFiles && mediaFiles.length > 0) {
      logger.info(`Processing ${mediaFiles.length} media files for Twitter`);
      for (const file of mediaFiles) {
        try {
          // Twitter API v1.1 media upload supports image/jpeg, image/png, image/gif, video/mp4, video/quicktime
          // and sizes up to 15MB for images, 512MB for videos.
          // The current media processing in route.ts already filters for image/ and video/
          // and has size limits.
          const mediaId = await this.uploadMedia(file, tokens[0].access_token); // Use the first token for media upload
          mediaIds.push(mediaId);
        } catch (error) {
          const errorMsg = `Failed to upload media file ${file.filename} for Twitter: ${error instanceof Error ? error.message : 'Unknown error'}`;
          logger.error(errorMsg, error);
          // If media upload fails, we should not proceed with publishing for this account with media
          // For now, we'll just log and continue, but a more robust solution might skip the tweet or retry.
          // For simplicity, if any media fails to upload, we'll consider the entire tweet with media failed for this account.
          failed.push({
            platform: 'x',
            account_id: tokens[0].x_user_id, // This might be problematic if multiple accounts are used for media upload
            error: axios.isAxiosError(error)
              ? {
                  message: error.response?.data?.detail || error.message,
                  code: error.response?.status?.toString(),
                  details: error.response?.data,
                }
              : { message: errorMsg },
          });
          return { successful: [], failed: failed }; // Exit early if media upload fails for simplicity
        }
      }
      logger.info(`Successfully uploaded ${mediaIds.length} media files for Twitter`);
    }

    for (const account of tokens) {
      let accessToken = account.access_token;

      if (this.isTokenExpired(account)) {
        logger.warn(`Token expired for ${account.username} — refreshing`);
        try {
          accessToken = await this.refreshToken(account, userId);
        } catch (refreshError) {
          failed.push({
            platform: 'x',
            account_id: account.x_user_id,
            error: axios.isAxiosError(refreshError)
              ? {
                  message: refreshError.response?.data?.detail || refreshError.message,
                  code: refreshError.response?.status?.toString(),
                  details: refreshError.response?.data,
                }
              : { message: 'Unknown error during token refresh' },
          });
          continue;
        }
      }

      try {
        const tweetPayload: { text: string; media?: { media_ids: string[] } } = {
          text: text.trim()
        };

        if (mediaIds.length > 0) {
          tweetPayload.media = { media_ids: mediaIds };
        }

        const response = await axios.post(
          'https://api.twitter.com/2/tweets',
          tweetPayload,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        successful.push({ platform: 'x', account_id: account.x_user_id, result: response.data });
      } catch (error) {
        logger.error(`Failed to publish to ${account.username}`, error);
        failed.push({
          platform: 'x',
          account_id: account.x_user_id,
          error: axios.isAxiosError(error)
            ? {
                message: error.response?.data?.detail || error.message,
                code: error.response?.status?.toString(),
                details: error.response?.data,
              }
            : { message: 'Unknown error during X publish' },
        });
      }
    }

    return { successful, failed };
  }
}
