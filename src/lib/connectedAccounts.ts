import pool from '@/lib/db';
import { PLATFORMS, type AccountData } from '@/types/accounts';

// Instagram accounts have no user_id; they belong to a user via their Facebook page.
// Each id is the one the publish API takes for that platform.
const CONNECTED_ACCOUNTS_SQL = `
  SELECT 'facebook' AS platform, page_id AS id, page_name AS name
  FROM connected_facebook_pages WHERE user_id = $1
  UNION ALL
  SELECT 'instagram', ia.instagram_account_id, COALESCE(NULLIF(ia.display_name, ''), ia.username)
  FROM connected_instagram_accounts ia JOIN connected_facebook_pages fp ON fp.id = ia.facebook_page_id
  WHERE fp.user_id = $1
  UNION ALL
  SELECT 'twitter', x_user_id, screen_name FROM connected_x_accounts_v1_1 WHERE user_id = $1
  UNION ALL
  SELECT 'telegram', channel_id, channel_title FROM connected_telegram_channels WHERE user_id = $1
  UNION ALL
  SELECT 'linkedin', linkedin_user_id, name FROM connected_linkedin_accounts WHERE user_id = $1
  UNION ALL
  SELECT 'youtube', channel_id, title FROM connected_youtube_channels WHERE user_id = $1
  UNION ALL
  SELECT 'tiktok', open_id, display_name FROM connected_tiktok_accounts WHERE user_id = $1`;

/** Every account/page/channel the user has connected, grouped by platform in PLATFORMS order. */
export async function listConnectedAccounts(userId: number): Promise<AccountData[]> {
  const { rows } = await pool.query<AccountData>(CONNECTED_ACCOUNTS_SQL, [userId]);
  return PLATFORMS.flatMap((platform) => rows.filter((row) => row.platform === platform));
}
