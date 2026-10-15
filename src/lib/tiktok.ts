export const TIKTOK_STATE_COOKIE = 'tiktok_oauth_state';
export const TIKTOK_CALLBACK_PATH = '/api/tiktok/auth/callback';
export const TIKTOK_API_URL = 'https://open.tiktokapis.com';
export const TIKTOK_TOKEN_URL = `${TIKTOK_API_URL}/v2/oauth/token/`;
export const TIKTOK_REVOKE_URL = `${TIKTOK_API_URL}/v2/oauth/revoke/`;
export const TIKTOK_TERMS_URL = 'https://www.tiktok.com/legal/page/global/terms-of-service/en';
export const TIKTOK_PRIVACY_URL = 'https://www.tiktok.com/legal/page/row/privacy-policy/en';
export const TIKTOK_MUSIC_USAGE_URL = 'https://www.tiktok.com/legal/page/global/music-usage-confirmation/en';
export const TIKTOK_BRANDED_CONTENT_URL = 'https://www.tiktok.com/legal/page/global/bc-policy/en';

export const TIKTOK_PRIVACY_LEVELS = ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'] as const;
export type TikTokPrivacyLevel = (typeof TIKTOK_PRIVACY_LEVELS)[number];

export const TIKTOK_PRIVACY_LABELS: Record<TikTokPrivacyLevel, string> = {
  PUBLIC_TO_EVERYONE: 'Everyone',
  MUTUAL_FOLLOW_FRIENDS: 'Friends',
  FOLLOWER_OF_CREATOR: 'Followers',
  SELF_ONLY: 'Only me',
};

/** What the user chose for a TikTok post. Nothing is preset: TikTok requires every choice to be the user's. */
export interface TikTokPostSettings {
  /** Empty until the user picks one. */
  privacyLevel: TikTokPrivacyLevel | '';
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  /** Commercial content that promotes the creator's own business. */
  isYourBrand: boolean;
  /** Commercial content that is a paid partnership promoting a third party. */
  isBrandedContent: boolean;
}

export const EMPTY_TIKTOK_SETTINGS: TikTokPostSettings = {
  privacyLevel: '',
  allowComment: false,
  allowDuet: false,
  allowStitch: false,
  isYourBrand: false,
  isBrandedContent: false,
};

/** The TikTok account's current posting options, from TikTok's creator_info endpoint. */
export interface TikTokCreatorInfo {
  nickname: string;
  privacyLevelOptions: TikTokPrivacyLevel[];
  isCommentDisabled: boolean;
  isDuetDisabled: boolean;
  isStitchDisabled: boolean;
  maxVideoDurationSec: number;
}

/** Why the settings cannot be posted, or null when they can. */
export function tiktokSettingsError(settings: TikTokPostSettings): string | null {
  if (!settings.privacyLevel) return 'Choose who can view the TikTok post.';
  if (settings.isBrandedContent && settings.privacyLevel === 'SELF_ONLY') {
    return 'Branded content on TikTok cannot be private. Choose another visibility.';
  }
  return null;
}

/** Parses untrusted settings; anything missing or unknown becomes the empty choice. */
export function parseTikTokSettings(value: unknown): TikTokPostSettings {
  const data = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return {
    privacyLevel: (TIKTOK_PRIVACY_LEVELS as readonly unknown[]).includes(data.privacyLevel)
      ? (data.privacyLevel as TikTokPrivacyLevel)
      : '',
    allowComment: data.allowComment === true,
    allowDuet: data.allowDuet === true,
    allowStitch: data.allowStitch === true,
    isYourBrand: data.isYourBrand === true,
    isBrandedContent: data.isBrandedContent === true,
  };
}
