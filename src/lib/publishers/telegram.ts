import { Pool } from 'pg';
import { createLogger } from '@/lib/logger';
import { CloudinaryMediaInfo } from '@/lib/publish/types';

const logger = createLogger('TelegramPublisher');

/** Telegram limit for a photo/video caption (text-only messages allow 4096). */
export const TELEGRAM_CAPTION_LIMIT = 1024;
/** Telegram limit for the text of one sendMessage call. */
export const TELEGRAM_TEXT_LIMIT = 4096;
/** Telegram limit for the number of items in one sendMediaGroup call. */
export const TELEGRAM_MEDIA_GROUP_LIMIT = 10;

const isHighSurrogate = (code: number) => code >= 0xd800 && code <= 0xdbff;

/**
 * Splits plain text into chunks of at most `limit` characters, cutting at the
 * last whitespace before the limit and never inside a surrogate pair. Split
 * the raw text, then escape each chunk: Telegram counts entities as one character.
 */
export function splitText(text: string, limit = TELEGRAM_TEXT_LIMIT): string[] {
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = -1;
    for (let i = limit; i > 0; i--) {
      if (/\s/.test(rest[i])) {
        cut = i;
        break;
      }
    }
    let chunk = cut > 0 ? rest.slice(0, cut).trimEnd() : '';
    if (!chunk) {
      cut = isHighSurrogate(rest.charCodeAt(limit - 1)) ? limit - 1 : limit;
      chunk = rest.slice(0, cut);
    }
    chunks.push(chunk);
    rest = rest.slice(cut).trimStart();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

/**
 * Escapes plain composer text for Telegram's HTML parse mode. Telegram rejects
 * any `<`, `>` or `&` that is not part of a tag or entity, so all of them are escaped.
 */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

type TelegramMessage = { message_id: number; chat: { id: number } };

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
  warning?: string;
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
        const { result, warning } = await this.sendMessage(token.channel_id, text, cloudinaryMedia);
        successful.push({
          platform: 'telegram',
          channel_id: token.channel_id,
          channel_title: token.channel_title,
          message_id: result.message_id,
          chat_id: result.chat.id.toString(),
          ...(warning && { warning }),
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
   * Calls a Bot API method and returns its result, throwing Telegram's description on failure.
   */
  private async callApi<T>(method: string, body: object, fallbackError: string): Promise<T> {
    const response = await fetch(`https://api.telegram.org/bot${this.botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.description || fallbackError);
    }
    return data.result;
  }

  /**
   * Sends message to a channel. The composer text is plain text, so it is
   * escaped before being sent with parse_mode HTML. A caption longer than
   * Telegram's 1024 limit is sent as a separate text message after the media,
   * and text longer than 4096 is split into several messages.
   */
  private async sendMessage(
    channelId: string,
    text: string,
    cloudinaryMedia: CloudinaryMediaInfo[]
  ): Promise<{ result: TelegramMessage; warning?: string }> {
    const sendPart = (part: string) =>
      this.callApi<TelegramMessage>(
        'sendMessage',
        { chat_id: channelId, text: escapeHtml(part), parse_mode: 'HTML' },
        'Failed to send message'
      );

    if (cloudinaryMedia.length === 0) {
      const [first, ...more] = splitText(text);
      const result = await sendPart(first ?? text);
      for (const [i, part] of more.entries()) {
        try {
          await sendPart(part);
        } catch (error) {
          // Earlier parts are already posted; failing the channel would invite a duplicate retry.
          const message = error instanceof Error ? error.message : 'Unknown error';
          const total = more.length + 1;
          return {
            result,
            warning: `Only ${i + 1} of ${total} parts of the text were posted (Telegram allows ${TELEGRAM_TEXT_LIMIT} characters per message): ${message}`,
          };
        }
      }
      return { result };
    }

    const captionFits = text.length <= TELEGRAM_CAPTION_LIMIT;
    const caption = text && captionFits ? escapeHtml(text) : undefined;
    const warnings: string[] = [];
    let result: TelegramMessage;

    if (cloudinaryMedia.length === 1) {
      const media = cloudinaryMedia[0];
      const isVideo = media.resourceType === 'video';

      result = await this.callApi<TelegramMessage>(
        isVideo ? 'sendVideo' : 'sendPhoto',
        {
          chat_id: channelId,
          [isVideo ? 'video' : 'photo']: media.publicUrl,
          cover: isVideo ? media.thumbnail?.publicUrl : undefined,
          caption,
          parse_mode: caption ? 'HTML' : undefined,
        },
        'Failed to send media'
      );
    } else {
      const sent = cloudinaryMedia.slice(0, TELEGRAM_MEDIA_GROUP_LIMIT);
      const dropped = cloudinaryMedia.length - sent.length;
      if (dropped > 0) {
        warnings.push(
          `Telegram allows at most ${TELEGRAM_MEDIA_GROUP_LIMIT} media per post, so ${dropped} of ${cloudinaryMedia.length} were not posted.`
        );
      }

      const media = sent.map((m, i) => ({
        type: m.resourceType === 'video' ? 'video' : 'photo',
        media: m.publicUrl,
        caption: i === 0 ? caption : undefined,
        parse_mode: i === 0 && caption ? 'HTML' : undefined,
      }));

      const results = await this.callApi<TelegramMessage[]>(
        'sendMediaGroup',
        { chat_id: channelId, media },
        'Failed to send media group'
      );
      result = results[0];
    }

    if (text && !captionFits) {
      logger.info('Caption exceeds Telegram limit, sending text as a separate message', {
        channelId,
        textLength: text.length,
      });
      const parts = splitText(text);
      for (const [i, part] of parts.entries()) {
        try {
          await sendPart(part);
        } catch (error) {
          // The media is already posted; failing the channel would invite a duplicate retry.
          const message = error instanceof Error ? error.message : 'Unknown error';
          warnings.push(
            i === 0
              ? `The media was posted, but the text (too long for a caption) could not be sent: ${message}`
              : `The media was posted, but only ${i} of ${parts.length} parts of the text could be sent: ${message}`
          );
          break;
        }
      }
    }

    return { result, ...(warnings.length > 0 && { warning: warnings.join(' ') }) };
  }
}
