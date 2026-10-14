export const YOUTUBE_STATE_COOKIE = 'youtube_oauth_state';
export const YOUTUBE_CALLBACK_PATH = '/api/youtube/auth/callback';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export const YOUTUBE_TITLE_MAX = 100;

/** Why a YouTube title cannot be used, or null when it can. */
export function youtubeTitleError(title: string): string | null {
  if ([...title].length > YOUTUBE_TITLE_MAX) return `YouTube titles can be at most ${YOUTUBE_TITLE_MAX} characters.`;
  if (/[<>]/.test(title)) return 'YouTube titles cannot contain < or >.';
  return null;
}
