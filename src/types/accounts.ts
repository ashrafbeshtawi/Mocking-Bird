// Account types for social media platforms

export type Platform = 'facebook' | 'instagram' | 'twitter' | 'telegram' | 'linkedin' | 'youtube' | 'tiktok';

export const PLATFORMS: readonly Platform[] = ['facebook', 'instagram', 'twitter', 'telegram', 'linkedin', 'youtube', 'tiktok'];

// Facebook page from API
export interface ConnectedPage {
  page_id: string;
  page_name: string;
}

// X (Twitter) account from API
export interface ConnectedXAccount {
  id: string;
  name: string;
}

// LinkedIn account from API
export interface LinkedInAccount {
  id: string;
  name: string;
  expiresAt: string;
}

// YouTube channel from API
export interface YouTubeChannel {
  id: string;
  name: string;
}

// TikTok account from API
export interface TikTokAccount {
  id: string;
  name: string;
}

// Instagram account from API
export interface InstagramAccount {
  id: string;
  username: string;
  displayName: string;
  facebookPageId: string;
}

// Unified account data structure (used in dashboard)
export interface AccountData {
  id: string;
  name: string;
  details?: string;
  platform: Platform;
}

// One connected account a post goes to; account_id is the id the publish API takes
export type InstagramPostType = 'feed' | 'story';
export const INSTAGRAM_POST_TYPES: InstagramPostType[] = ['feed', 'story'];

export interface TargetAccount {
  platform: Platform;
  account_id: string;
  /** Instagram only: what to post there; feed when absent. */
  post_types?: InstagramPostType[];
}

// Instagram selection state for publish page
export interface InstagramSelection {
  publish: boolean;
  story: boolean;
}

/** The Instagram selection a draft target stands for; no target selects nothing. */
export const getInstagramSelection = (target?: TargetAccount): InstagramSelection => ({
  publish: !!target && (!target.post_types || target.post_types.includes('feed')),
  story: !!target?.post_types?.includes('story'),
});

/** Draft target for an Instagram selection; null when nothing is selected. Feed alone is the default. */
export function buildInstagramTarget(accountId: string, selection: InstagramSelection): TargetAccount | null {
  if (!selection.publish && !selection.story) return null;
  if (!selection.story) return { platform: 'instagram', account_id: accountId };
  return {
    platform: 'instagram',
    account_id: accountId,
    post_types: selection.publish ? ['feed', 'story'] : ['story'],
  };
}

// API configuration for account operations
export interface ApiConfig {
  deleteUrl: string;
  idParamName: string;
}

export const API_CONFIG: Record<Platform, ApiConfig> = {
  facebook: { deleteUrl: '/api/facebook/delete-page', idParamName: 'page_id' },
  instagram: { deleteUrl: '/api/instagram', idParamName: 'instagram_account_id' },
  twitter: { deleteUrl: '/api/twitter-v1.1/delete-account', idParamName: 'x_user_id' },
  telegram: { deleteUrl: '/api/telegram/delete-channel', idParamName: 'channel_id' },
  linkedin: { deleteUrl: '/api/linkedin/delete-account', idParamName: 'linkedin_user_id' },
  youtube: { deleteUrl: '/api/youtube/delete-channel', idParamName: 'channel_id' },
  tiktok: { deleteUrl: '/api/tiktok/delete-account', idParamName: 'open_id' },
};

// Twitter character limit
export const TWITTER_CHAR_LIMIT = 280;

// Facebook App ID
export const FB_APP_ID = '1471736117322956';

// Telegram channel from API
export interface TelegramChannel {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_username?: string;
}

// Telegram channel token for publishing
export interface TelegramChannelToken {
  channel_id: string;
  channel_title: string;
  channel_username?: string;
}
