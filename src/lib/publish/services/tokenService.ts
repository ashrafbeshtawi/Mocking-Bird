import { Pool } from 'pg';
import { FacebookPublisher, FacebookPageToken } from '@/lib/publishers/facebook';
import { TwitterPublisherV1, TwitterAccountTokenV1 } from '@/lib/publishers/twitterv1.1';
import { InstagramPublisher, InstagramAccountToken } from '@/lib/publishers/instagram';
import { TelegramPublisher, TelegramChannelToken } from '@/lib/publishers/telegram';
import { MissingAccounts, ReportLogger } from '../types';

export interface FetchedTokens {
  facebookTokens: FacebookPageToken[];
  twitterTokens: TwitterAccountTokenV1[];
  instagramFeedTokens: InstagramAccountToken[];
  instagramStoryTokens: InstagramAccountToken[];
  telegramTokens: TelegramChannelToken[];
}

/**
 * Fetches tokens for all requested accounts in parallel
 */
export async function fetchAllTokens(
  pool: Pool,
  userId: string,
  facebookPages: string[],
  xAccounts: string[],
  instagramPublishAccounts: string[] = [],
  instagramStoryAccounts: string[] = [],
  telegramChannels: string[] = [],
  reportLogger?: ReportLogger
): Promise<FetchedTokens> {
  reportLogger?.add(
    `Fetching tokens from database for ${facebookPages.length} Facebook pages, ${xAccounts.length} X accounts, ` +
    `${instagramPublishAccounts.length} Instagram feed accounts, ${instagramStoryAccounts.length} Instagram story accounts, ` +
    `${telegramChannels.length} Telegram channels`
  );

  const facebookPublisher = new FacebookPublisher(pool);
  const twitterPublisher = new TwitterPublisherV1(pool);
  const instagramPublisher = new InstagramPublisher(pool);

  // Only create Telegram publisher if bot token is configured
  const telegramPublisher = process.env.TELEGRAM_BOT_TOKEN
    ? new TelegramPublisher(pool)
    : null;

  const [facebookTokens, twitterTokens, instagramFeedTokens, instagramStoryTokens, telegramTokens] = await Promise.all([
    facebookPublisher.getPageTokens(userId, facebookPages),
    twitterPublisher.getAccountTokens(userId, xAccounts),
    instagramPublisher.getAccountTokens(userId, instagramPublishAccounts),
    instagramPublisher.getAccountTokens(userId, instagramStoryAccounts),
    telegramPublisher
      ? telegramPublisher.getChannelTokens(userId, telegramChannels)
      : Promise.resolve([])
  ]);

  reportLogger?.add(
    `Tokens retrieved. Facebook: ${facebookTokens.length}, Twitter: ${twitterTokens.length}, ` +
    `Instagram feed: ${instagramFeedTokens.length}, Instagram story: ${instagramStoryTokens.length}, ` +
    `Telegram: ${telegramTokens.length}`
  );

  return { facebookTokens, twitterTokens, instagramFeedTokens, instagramStoryTokens, telegramTokens };
}

/**
 * Validates that all requested accounts were found
 */
export function validateMissingAccounts(
  facebookPages: string[],
  xAccounts: string[],
  instagramAccounts: string[],
  telegramChannels: string[],
  facebookTokens: FacebookPageToken[],
  twitterTokens: TwitterAccountTokenV1[],
  instagramTokens: InstagramAccountToken[],
  telegramTokens: TelegramChannelToken[]
): MissingAccounts {
  const foundFbIds = new Set(facebookTokens.map(t => t.page_id));
  const foundXIds = new Set(twitterTokens.map(t => t.x_user_id));
  const foundIgIds = new Set(instagramTokens.map(t => t.instagram_account_id));
  const foundTgIds = new Set(telegramTokens.map(t => t.channel_id));

  return {
    facebook: facebookPages.filter(id => !foundFbIds.has(id)),
    twitter: xAccounts.filter(id => !foundXIds.has(id)),
    instagram: instagramAccounts.filter(id => !foundIgIds.has(id)),
    telegram: telegramChannels.filter(id => !foundTgIds.has(id))
  };
}

/**
 * Formats missing accounts for error display
 */
export function formatMissingAccounts(missing: MissingAccounts): string[] {
  return [
    ...missing.facebook.map(id => `Facebook Page ID: ${id}`),
    ...missing.twitter.map(id => `X Account ID: ${id}`),
    ...missing.instagram.map(id => `Instagram Account ID: ${id}`),
    ...missing.telegram.map(id => `Telegram Channel ID: ${id}`)
  ];
}

/**
 * Checks if there are any missing accounts
 */
export function hasMissingAccounts(missing: MissingAccounts): boolean {
  return missing.facebook.length > 0 || missing.twitter.length > 0 || missing.instagram.length > 0 || missing.telegram.length > 0;
}
