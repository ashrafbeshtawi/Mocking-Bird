import { Pool } from 'pg';
import { TwitterApi } from 'twitter-api-v2';
import { MediaFile } from '@/types/interfaces';
import { SendTweetV2Params } from 'twitter-api-v2/dist/esm/types/v2/tweet.definition.v2';

const logger = {
  info: (message: string, data?: unknown) => console.log(`[TwitterPublisherV1] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : ''),
  error: (message: string, error?: unknown) => console.error(`[TwitterPublisherV1] ERROR: ${message}`, error),
  warn: (message: string, data?: unknown) => console.warn(`[TwitterPublisherV1] WARN: ${message}`, data ? JSON.stringify(data, null, 2) : '')
};

export interface TwitterAccountTokenV1 {
  x_user_id: string;
  username: string;
  oauth_token: string;
  oauth_token_secret: string;
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

export class TwitterPublisherV1 {
  private consumerKey: string;
  private consumerSecret: string;

  constructor(private pool: Pool) {
    this.consumerKey = process.env.X_API_KEY || '';
    this.consumerSecret = process.env.X_API_KEY_SECRET || '';

    if (!this.consumerKey || !this.consumerSecret) {
      throw new Error('Twitter v1.1 requires X_API_KEY and X_API_SECRET environment variables');
    }
  }

  async getAccountTokens(userId: string, accountIds: string[]): Promise<TwitterAccountTokenV1[]> {
    logger.info('Retrieving Twitter v1.1 account tokens', { userId, accountCount: accountIds.length });
    if (accountIds.length === 0) return [];

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT x_user_id, screen_name as username, access_token as oauth_token, access_token_secret as oauth_token_secret
         FROM connected_x_accounts_v1_1
         WHERE user_id = $1 AND x_user_id = ANY($2)`,
        [userId, accountIds]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  validateMissingAccounts(requestedIds: string[], foundTokens: TwitterAccountTokenV1[]): string[] {
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

  private getClient(account: TwitterAccountTokenV1) {
    return new TwitterApi({
      appKey: this.consumerKey,
      appSecret: this.consumerSecret,
      accessToken: account.oauth_token,
      accessSecret: account.oauth_token_secret,
    });
  }

  async publishToAccounts(
    text: string,
    tokens: TwitterAccountTokenV1[],
    mediaFiles?: MediaFile[]
  ): Promise<{ successful: TwitterPublishResult[]; failed: TwitterPublishError[] }> {
    const successful: TwitterPublishResult[] = [];
    const failed: TwitterPublishError[] = [];

    for (const account of tokens) {
      try {
        const client = this.getClient(account);

        // Upload media if provided
        let mediaIds: string[] = [];
        if (mediaFiles && mediaFiles.length > 0) {
          logger.info(`Uploading ${mediaFiles.length} media files for Twitter v1.1`);
          mediaIds = await Promise.all(
            mediaFiles.map(async (file) => {
              const mediaId = await client.v1.uploadMedia(file.buffer, {
                mimeType: file.mimetype,
              });
              return mediaId;
            })
          );
          logger.info(`Uploaded ${mediaIds.length} media files`);
        }

        // Post tweet
        const tweetOptions: Partial<SendTweetV2Params> = {};
        if (mediaIds.length > 0) {
          // Ensure media_ids is a tuple of 1 to 4 strings
          const mediaIdsTuple = mediaIds.slice(0, 4) as [string] | [string, string] | [string, string, string] | [string, string, string, string];
          tweetOptions.media = { media_ids: mediaIdsTuple };
        }
        const tweet = await client.v2.tweet(text.trim(), tweetOptions);
        
        successful.push({ platform: 'x', account_id: account.x_user_id, result: tweet });
      } catch (error: unknown) {
        let errorMessage: string = 'Unknown error during X publish';
        let errorCode: string | undefined;
        let errorDetails: unknown;

        if (error instanceof Error) {
          errorMessage = error.message;
        }

        // Attempt to parse Twitter API v2 error structure
        const twitterError = error as { data?: { errors?: { message: string; code?: number }[] } };
        if (twitterError?.data?.errors && twitterError.data.errors.length > 0) {
          errorMessage = twitterError.data.errors[0].message;
          errorCode = twitterError.data.errors[0].code?.toString();
          errorDetails = twitterError.data;
        }

        logger.error(`Failed to publish to ${account.username}`, error);
        failed.push({
          platform: 'x',
          account_id: account.x_user_id,
          error: {
            message: errorMessage,
            code: errorCode,
            details: errorDetails
          }
        });
      }
    }

    return { successful, failed };
  }
}
