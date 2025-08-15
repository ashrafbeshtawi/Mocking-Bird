import axios from 'axios';
import { Pool } from 'pg';

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
  error: unknown;
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

  async publishToAccounts(
    text: string,
    tokens: TwitterAccountToken[],
    userId: string
  ): Promise<{ successful: TwitterPublishResult[]; failed: TwitterPublishError[] }> {
    const successful: TwitterPublishResult[] = [];
    const failed: TwitterPublishError[] = [];

    for (const account of tokens) {
      let accessToken = account.access_token;

      if (this.isTokenExpired(account)) {
        logger.warn(`Token expired for ${account.username} — refreshing`);
        try {
          accessToken = await this.refreshToken(account, userId);
        } catch {
          failed.push({ platform: 'x', account_id: account.x_user_id, error: 'Token refresh failed' });
          continue;
        }
      }

      try {
        const response = await axios.post(
          'https://api.twitter.com/2/tweets',
          { text: text.trim() },
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
        failed.push({ platform: 'x', account_id: account.x_user_id, error });
      }
    }

    return { successful, failed };
  }
}
