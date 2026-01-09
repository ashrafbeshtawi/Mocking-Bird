import { Pool } from 'pg';
import { FacebookPublisher, FacebookPageToken } from '@/lib/publishers/facebook';
import { TwitterPublisherV1, TwitterAccountTokenV1 } from '@/lib/publishers/twitterv1.1';
import { MissingAccounts, ReportLogger } from '../types';

export interface FetchedTokens {
  facebookTokens: FacebookPageToken[];
  twitterTokens: TwitterAccountTokenV1[];
}

/**
 * Fetches tokens for all requested accounts in parallel
 */
export async function fetchAllTokens(
  pool: Pool,
  userId: string,
  facebookPages: string[],
  xAccounts: string[],
  reportLogger?: ReportLogger
): Promise<FetchedTokens> {
  reportLogger?.add(`Fetching tokens from database for ${facebookPages.length} Facebook pages and ${xAccounts.length} X accounts`);

  const facebookPublisher = new FacebookPublisher(pool);
  const twitterPublisher = new TwitterPublisherV1(pool);

  const [facebookTokens, twitterTokens] = await Promise.all([
    facebookPublisher.getPageTokens(userId, facebookPages),
    twitterPublisher.getAccountTokens(userId, xAccounts)
  ]);

  reportLogger?.add(`Tokens retrieved. Facebook tokens: ${facebookTokens.length}, Twitter tokens: ${twitterTokens.length}`);

  return { facebookTokens, twitterTokens };
}

/**
 * Validates that all requested accounts were found
 */
export function validateMissingAccounts(
  facebookPages: string[],
  xAccounts: string[],
  facebookTokens: FacebookPageToken[],
  twitterTokens: TwitterAccountTokenV1[]
): MissingAccounts {
  const foundFbIds = new Set(facebookTokens.map(t => t.page_id));
  const foundXIds = new Set(twitterTokens.map(t => t.x_user_id));

  return {
    facebook: facebookPages.filter(id => !foundFbIds.has(id)),
    twitter: xAccounts.filter(id => !foundXIds.has(id))
  };
}

/**
 * Formats missing accounts for error display
 */
export function formatMissingAccounts(missing: MissingAccounts): string[] {
  return [
    ...missing.facebook.map(id => `Facebook Page ID: ${id}`),
    ...missing.twitter.map(id => `X Account ID: ${id}`)
  ];
}

/**
 * Checks if there are any missing accounts
 */
export function hasMissingAccounts(missing: MissingAccounts): boolean {
  return missing.facebook.length > 0 || missing.twitter.length > 0;
}
