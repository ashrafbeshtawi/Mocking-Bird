import { Pool } from 'pg';
import { createLogger } from '@/lib/logger';
import { CloudinaryMediaInfo } from '@/lib/publish/types';

const logger = createLogger('TelegramPublisher');

export interface TelegramChannelToken {
  channel_id: string;
  channel_title: string;
  channel_username?: string;
}

export interface TelegramPublishOptions {
  text: string;
  cloudinaryMedia?: CloudinaryMediaInfo[];
}

export interface TelegramPublishResult {
  platform: 'telegram';
  channel_id: string;
  channel_title: string;
  message_id: number;
  chat_id: string;
}

export interface TelegramPublishError {
  platform: 'telegram';
  channel_id: string;
  channel_title: string;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export class TelegramPublisher {
  private botToken: string;

  constructor(private pool: Pool) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
    }
    this.botToken = token;
  }

  /**
   * Fetches Telegram channel tokens for a user
   */
  async getChannelTokens(
    userId: string,
    channelIds: string[]
  ): Promise<TelegramChannelToken[]> {
    logger.info('Starting Telegram channel token retrieval', {
      userId,
      channelCount: channelIds.length,
    });

    if (channelIds.length === 0) {
      logger.info('No Telegram channels requested, returning empty array');
      return [];
    }

    const client = await this.pool.connect();
    try {
      const placeholders = channelIds.map((_, i) => `$${i + 2}`).join(', ');
      const query = `
        SELECT channel_id, channel_title, channel_username
        FROM connected_telegram_channels
        WHERE user_id = $1 AND channel_id IN (${placeholders})
      `;

      const result = await client.query(query, [userId, ...channelIds]);

      logger.info('Telegram channel tokens retrieved successfully', {
        requested: channelIds.length,
        found: result.rows.length,
        foundChannelIds: result.rows.map((row) => row.channel_id),
      });

      return result.rows;
    } catch (error) {
      logger.error('Failed to retrieve Telegram channel tokens', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validates which requested channels are missing
   */
  validateMissingChannels(
    requestedIds: string[],
    foundTokens: TelegramChannelToken[]
  ): string[] {
    const foundIds = new Set(foundTokens.map((t) => t.channel_id));
    const missingIds = requestedIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      logger.warn('Missing Telegram channels detected', {
        requested: requestedIds,
        found: Array.from(foundIds),
        missing: missingIds,
      });
    }

    return missingIds;
  }

  /**
   * Publishes to Telegram channels
   */
  async publishToChannels(
    options: TelegramPublishOptions,
    tokens: TelegramChannelToken[]
  ): Promise<{
    successful: TelegramPublishResult[];
    failed: TelegramPublishError[];
  }> {
    const { text, cloudinaryMedia = [] } = options;

    logger.info('Starting Telegram publishing', {
      textLength: text?.length || 0,
      mediaCount: cloudinaryMedia.length,
      channelCount: tokens.length,
    });

    const successful: TelegramPublishResult[] = [];
    const failed: TelegramPublishError[] = [];

    for (const token of tokens) {
      try {
        const result = await this.sendMessage(token.channel_id, text, cloudinaryMedia);
        successful.push({
          platform: 'telegram',
          channel_id: token.channel_id,
          channel_title: token.channel_title,
          message_id: result.message_id,
          chat_id: result.chat.id.toString(),
        });

        logger.info('Successfully published to Telegram channel', {
          channel_id: token.channel_id,
          channel_title: token.channel_title,
          message_id: result.message_id,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failed.push({
          platform: 'telegram',
          channel_id: token.channel_id,
          channel_title: token.channel_title,
          error: {
            message: errorMessage,
            details: error,
          },
        });

        logger.error('Failed to publish to Telegram channel', {
          channel_id: token.channel_id,
          channel_title: token.channel_title,
          error: errorMessage,
        });
      }
    }

    logger.info('Telegram publishing completed', {
      successful: successful.length,
      failed: failed.length,
    });

    return { successful, failed };
  }

  /**
   * Validates that bot is admin in channel AND that a specific user is also an admin
   */
  async validateChannelAccess(
    channelId: string,
    telegramUserId?: number
  ): Promise<{
    valid: boolean;
    channelTitle?: string;
    channelUsername?: string;
    error?: string;
  }> {
    const baseUrl = `https://api.telegram.org/bot${this.botToken}`;

    try {
      // Get channel info
      const chatResponse = await fetch(`${baseUrl}/getChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: channelId }),
      });

      const chatData = await chatResponse.json();
      if (!chatData.ok) {
        return { valid: false, error: chatData.description || 'Channel not found' };
      }

      const chat = chatData.result;
      if (chat.type !== 'channel') {
        return { valid: false, error: 'The provided ID is not a channel' };
      }

      // Check bot is admin
      const adminsResponse = await fetch(`${baseUrl}/getChatAdministrators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: channelId }),
      });

      const adminsData = await adminsResponse.json();
      if (!adminsData.ok) {
        return { valid: false, error: 'Could not verify bot admin status' };
      }

      // Get bot info to check if it's in admin list
      const meResponse = await fetch(`${baseUrl}/getMe`);
      const meData = await meResponse.json();
      if (!meData.ok) {
        return { valid: false, error: 'Could not verify bot identity' };
      }

      const botId = meData.result.id;
      const admins = adminsData.result as Array<{ user: { id: number }; status: string }>;

      const isBotAdmin = admins.some((admin) => admin.user.id === botId);
      if (!isBotAdmin) {
        return {
          valid: false,
          error: 'Bot is not an admin in this channel. Please add the bot as an administrator.',
        };
      }

      // If telegramUserId provided, verify they are also an admin (owner or administrator)
      if (telegramUserId) {
        const userAdmin = admins.find((admin) => admin.user.id === telegramUserId);
        if (!userAdmin) {
          return {
            valid: false,
            error: 'You must be an admin of this channel to connect it. Please verify you have admin rights.',
          };
        }

        logger.info('User admin status verified', {
          channelId,
          telegramUserId,
          userStatus: userAdmin.status,
        });
      }

      return {
        valid: true,
        channelTitle: chat.title,
        channelUsername: chat.username,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to validate channel',
      };
    }
  }

  /**
   * Gets bot username for display
   */
  async getBotUsername(): Promise<string | null> {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/getMe`
      );
      const data = await response.json();
      return data.ok ? data.result.username : null;
    } catch {
      return null;
    }
  }

  /**
   * Gets bot info (id and username) for Telegram Login Widget
   */
  async getBotInfo(): Promise<{ id: string; username: string } | null> {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/getMe`
      );
      const data = await response.json();
      if (data.ok) {
        return {
          id: data.result.id.toString(),
          username: data.result.username,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Sends message to a channel
   */
  private async sendMessage(
    channelId: string,
    text: string,
    cloudinaryMedia: CloudinaryMediaInfo[]
  ): Promise<{ message_id: number; chat: { id: number } }> {
    const baseUrl = `https://api.telegram.org/bot${this.botToken}`;

    // If we have media, send as photo/video/media group
    if (cloudinaryMedia.length > 0) {
      if (cloudinaryMedia.length === 1) {
        // Single media
        const media = cloudinaryMedia[0];
        const isVideo = media.resourceType === 'video';
        const endpoint = isVideo ? 'sendVideo' : 'sendPhoto';
        const mediaKey = isVideo ? 'video' : 'photo';

        const response = await fetch(`${baseUrl}/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: channelId,
            [mediaKey]: media.publicUrl,
            caption: text || undefined,
            parse_mode: 'HTML',
          }),
        });

        const data = await response.json();
        if (!data.ok) {
          throw new Error(data.description || 'Failed to send media');
        }
        return data.result;
      } else {
        // Multiple media - use sendMediaGroup
        const media = cloudinaryMedia.slice(0, 10).map((m, i) => ({
          type: m.resourceType === 'video' ? 'video' : 'photo',
          media: m.publicUrl,
          caption: i === 0 ? text || undefined : undefined,
          parse_mode: i === 0 && text ? 'HTML' : undefined,
        }));

        const response = await fetch(`${baseUrl}/sendMediaGroup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: channelId,
            media,
          }),
        });

        const data = await response.json();
        if (!data.ok) {
          throw new Error(data.description || 'Failed to send media group');
        }
        return data.result[0];
      }
    } else {
      // Text-only message
      const response = await fetch(`${baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          text: text,
          parse_mode: 'HTML',
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.description || 'Failed to send message');
      }
      return data.result;
    }
  }
}
