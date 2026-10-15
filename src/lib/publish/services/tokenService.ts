import { Pool } from 'pg';
import { FacebookPublisher, FacebookPageToken } from '@/lib/publishers/facebook';
import { TwitterPublisherV1, TwitterAccountTokenV1 } from '@/lib/publishers/twitterv1.1';
import { InstagramPublisher, InstagramAccountToken } from '@/lib/publishers/instagram';
import { TelegramPublisher, TelegramChannelToken } from '@/lib/publishers/telegram';
import { LinkedInPublisher, LinkedInAccountToken } from '@/lib/publishers/linkedin';
import { YouTubePublisher, YouTubeChannelToken } from '@/lib/publishers/youtube';
import { TikTokPublisher, TikTokAccountToken } from '@/lib/publishers/tiktok';
import { MissingAccounts, ReportLogger } from '../types';

export interface FetchedTokens {
  facebookTokens: FacebookPageToken[];
  twitterTokens: TwitterAccountTokenV1[];
  instagramFeedTokens: InstagramAccountToken[];
  instagramStoryTokens: InstagramAccountToken[];
  telegramTokens: TelegramChannelToken[];
  linkedinTokens: LinkedInAccountToken[];
  youtubeTokens: YouTubeChannelToken[];
  tiktokTokens: TikTokAccountToken[];
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
  linkedinAccounts: string[] = [],
  youtubeChannels: string[] = [],
  tiktokAccounts: string[] = [],
  reportLogger?: ReportLogger
): Promise<FetchedTokens> {
  reportLogger?.add(
    `Fetching tokens from database for ${facebookPages.length} Facebook pages, ${xAccounts.length} X accounts, ` +
    `${instagramPublishAccounts.length} Instagram feed accounts, ${instagramStoryAccounts.length} Instagram story accounts, ` +
    `${telegramChannels.length} Telegram channels, ${linkedinAccounts.length} LinkedIn accounts, ${youtubeChannels.length} YouTube channels, ${tiktokAccounts.length} TikTok accounts`
  );

  const facebookPublisher = new FacebookPublisher(pool);
  const twitterPublisher = new TwitterPublisherV1(pool);
  const instagramPublisher = new InstagramPublisher(pool);

  // Only create Telegram publisher if bot token is configured
  const telegramPublisher = process.env.TELEGRAM_BOT_TOKEN
    ? new TelegramPublisher(pool)
    : null;

  const [facebookTokens, twitterTokens, instagramFeedTokens, instagramStoryTokens, telegramTokens, linkedinTokens, youtubeTokens, tiktokTokens] = await Promise.all([
    facebookPublisher.getPageTokens(userId, facebookPages),
    twitterPublisher.getAccountTokens(userId, xAccounts),
    instagramPublisher.getAccountTokens(userId, instagramPublishAccounts),
    instagramPublisher.getAccountTokens(userId, instagramStoryAccounts),
    telegramPublisher
      ? telegramPublisher.getChannelTokens(userId, telegramChannels)
      : Promise.resolve([]),
    new LinkedInPublisher(pool).getAccountTokens(userId, linkedinAccounts),
    new YouTubePublisher(pool).getAccountTokens(userId, youtubeChannels),
    new TikTokPublisher(pool).getAccountTokens(userId, tiktokAccounts)
  ]);

  reportLogger?.add(
    `Tokens retrieved. Facebook: ${facebookTokens.length}, Twitter: ${twitterTokens.length}, ` +
    `Instagram feed: ${instagramFeedTokens.length}, Instagram story: ${instagramStoryTokens.length}, ` +
    `Telegram: ${telegramTokens.length}, LinkedIn: ${linkedinTokens.length}, YouTube: ${youtubeTokens.length}, TikTok: ${tiktokTokens.length}`
  );

  return { facebookTokens, twitterTokens, instagramFeedTokens, instagramStoryTokens, telegramTokens, linkedinTokens, youtubeTokens, tiktokTokens };
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
  telegramTokens: TelegramChannelToken[],
  linkedinAccounts: string[] = [],
  linkedinTokens: LinkedInAccountToken[] = [],
  youtubeChannels: string[] = [],
  youtubeTokens: YouTubeChannelToken[] = [],
  tiktokAccounts: string[] = [],
  tiktokTokens: TikTokAccountToken[] = []
): MissingAccounts {
  const foundFbIds = new Set(facebookTokens.map(t => t.page_id));
  const foundXIds = new Set(twitterTokens.map(t => t.x_user_id));
  const foundIgIds = new Set(instagramTokens.map(t => t.instagram_account_id));
  const foundTgIds = new Set(telegramTokens.map(t => t.channel_id));
  const foundLiIds = new Set(linkedinTokens.map(t => t.linkedin_user_id));
  const foundYtIds = new Set(youtubeTokens.map(t => t.channel_id));
  const foundTtIds = new Set(tiktokTokens.map(t => t.open_id));

  return {
    facebook: facebookPages.filter(id => !foundFbIds.has(id)),
    twitter: xAccounts.filter(id => !foundXIds.has(id)),
    instagram: instagramAccounts.filter(id => !foundIgIds.has(id)),
    telegram: telegramChannels.filter(id => !foundTgIds.has(id)),
    linkedin: linkedinAccounts.filter(id => !foundLiIds.has(id)),
    youtube: youtubeChannels.filter(id => !foundYtIds.has(id)),
    tiktok: tiktokAccounts.filter(id => !foundTtIds.has(id))
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
    ...missing.telegram.map(id => `Telegram Channel ID: ${id}`),
    ...missing.linkedin.map(id => `LinkedIn Account ID: ${id}`),
    ...missing.youtube.map(id => `YouTube Channel ID: ${id}`),
    ...missing.tiktok.map(id => `TikTok Account ID: ${id}`)
  ];
}

/**
 * Checks if there are any missing accounts
 */
export function hasMissingAccounts(missing: MissingAccounts): boolean {
  return Object.values(missing).some((ids) => ids.length > 0);
}
