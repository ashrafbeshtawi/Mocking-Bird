import {
  FailedPublishResult,
  SuccessfulPublishResult,
  FacebookFailedItem,
  TwitterFailedItem,
  FacebookSuccessItem,
  TwitterSuccessItem,
  InstagramFailedItem,
  InstagramSuccessItem,
  TelegramFailedItem,
  TelegramSuccessItem
} from '@/types/interfaces';

/**
 * Maps Facebook failed items to standardized FailedPublishResult
 */
export function mapFacebookFailed(failed: FacebookFailedItem[]): FailedPublishResult[] {
  return failed.map(item => ({
    platform: item.platform,
    page_id: item.page_id,
    error: item.error
      ? {
          message: item.error.message,
          code: item.error.code,
          details: typeof item.error.details === 'object'
            ? (
                item.error.details && item.error.details.error
                  ? { error: item.error.details.error }
                  : undefined
              )
            : undefined
        }
      : undefined
  }));
}

/**
 * Maps Twitter failed items to standardized FailedPublishResult
 */
export function mapTwitterFailed(failed: TwitterFailedItem[]): FailedPublishResult[] {
  return failed.map(item => ({
    platform: item.platform,
    account_id: item.account_id,
    error: item.error
      ? {
          message: item.error.message,
          code: item.error.code,
          details: item.error.details
        }
      : undefined
  }));
}

/**
 * Maps Facebook successful items to standardized SuccessfulPublishResult
 */
export function mapFacebookSuccess(successful: FacebookSuccessItem[]): SuccessfulPublishResult[] {
  return successful.map(item => ({
    platform: item.platform,
    page_id: item.page_id,
    post_id: item.result?.id
  }));
}

/**
 * Maps Twitter successful items to standardized SuccessfulPublishResult
 */
export function mapTwitterSuccess(successful: TwitterSuccessItem[]): SuccessfulPublishResult[] {
  return successful.map(item => ({
    platform: item.platform,
    account_id: item.account_id,
    tweet_id: item.result?.id_str || item.result?.id
  }));
}

/**
 * Maps Instagram failed items to standardized FailedPublishResult
 */
export function mapInstagramFailed(failed: InstagramFailedItem[]): FailedPublishResult[] {
  return failed.map(item => ({
    platform: item.platform,
    instagram_account_id: item.instagram_account_id,
    post_type: item.post_type,
    error: item.error
      ? {
          message: item.error.message,
          code: item.error.code,
          details: typeof item.error.details === 'object'
            ? (
                item.error.details && item.error.details.error
                  ? { error: item.error.details.error }
                  : undefined
              )
            : undefined
        }
      : undefined
  }));
}

/**
 * Maps Instagram successful items to standardized SuccessfulPublishResult
 */
export function mapInstagramSuccess(successful: InstagramSuccessItem[]): SuccessfulPublishResult[] {
  return successful.map(item => ({
    platform: item.platform,
    instagram_account_id: item.instagram_account_id,
    instagram_media_id: item.result?.id,
    post_type: item.post_type
  }));
}

/**
 * Maps Telegram failed items to standardized FailedPublishResult
 */
export function mapTelegramFailed(failed: TelegramFailedItem[]): FailedPublishResult[] {
  return failed.map(item => ({
    platform: item.platform,
    telegram_channel_id: item.channel_id,
    error: item.error
      ? {
          message: item.error.message,
          code: item.error.code,
          details: undefined
        }
      : undefined
  }));
}

/**
 * Maps Telegram successful items to standardized SuccessfulPublishResult
 */
export function mapTelegramSuccess(successful: TelegramSuccessItem[]): SuccessfulPublishResult[] {
  return successful.map(item => ({
    platform: item.platform,
    telegram_channel_id: item.channel_id,
    telegram_message_id: item.message_id.toString()
  }));
}

/**
 * Formats failed publish details for logging
 */
export function formatFailedDetails(allFailed: FailedPublishResult[]): string {
  return allFailed.map(item => {
    let detailMessage = `${item.platform}: `;
    if (item.page_id) {
      detailMessage += `Page ID ${item.page_id}`;
    } else if (item.account_id) {
      detailMessage += `Account ID ${item.account_id}`;
    } else if (item.instagram_account_id) {
      detailMessage += `Instagram Account ${item.instagram_account_id} (${item.post_type || 'feed'})`;
    } else if (item.telegram_channel_id) {
      detailMessage += `Telegram Channel ${item.telegram_channel_id}`;
    }
    detailMessage += ` - Error: ${item.error?.message || 'Unknown error'}`;

    if ((item.platform === 'facebook' || item.platform === 'instagram') && item.error?.details?.error?.error_user_msg) {
      detailMessage += ` (${item.error.details.error.error_user_msg})`;
    }
    if (item.platform === 'x' && item.error?.details?.errors?.[0]?.message) {
      detailMessage += ` (${item.error.details.errors[0].message})`;
    }

    if (item.error?.code) {
      detailMessage += ` (Code: ${item.error.code})`;
    }
    return detailMessage;
  }).join('; ');
}
