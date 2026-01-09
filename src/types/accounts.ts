// Account types for social media platforms

export type Platform = 'facebook' | 'instagram' | 'twitter';

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

// Instagram selection state for publish page
export interface InstagramSelection {
  publish: boolean;
  story: boolean;
}

// API configuration for account operations
export interface ApiConfig {
  deleteUrl: string;
  idParamName: string;
}

export const API_CONFIG: Record<Platform, ApiConfig> = {
  facebook: { deleteUrl: '/api/facebook/delete-page', idParamName: 'page_id' },
  instagram: { deleteUrl: '/api/instagram', idParamName: 'instagram_account_id' },
  twitter: { deleteUrl: '/api/twitter-v1.1/delete-account', idParamName: 'page_id' },
};

// Twitter character limit
export const TWITTER_CHAR_LIMIT = 280;

// Facebook App ID
export const FB_APP_ID = '1471736117322956';
