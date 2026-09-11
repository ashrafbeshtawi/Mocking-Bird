import pool from '@/lib/db';
import { PLATFORMS, type Platform } from '@/types/accounts';

// Instagram accounts have no user_id; they belong to a user via their Facebook page.
const PLATFORM_EXISTS_SQL: Record<Platform, string> = {
  facebook: 'SELECT EXISTS (SELECT 1 FROM connected_facebook_pages WHERE user_id = $1) AS connected',
  instagram: `SELECT EXISTS (
       SELECT 1 FROM connected_instagram_accounts ia
       JOIN connected_facebook_pages fp ON fp.id = ia.facebook_page_id
       WHERE fp.user_id = $1) AS connected`,
  twitter: 'SELECT EXISTS (SELECT 1 FROM connected_x_accounts_v1_1 WHERE user_id = $1) AS connected',
  telegram: 'SELECT EXISTS (SELECT 1 FROM connected_telegram_channels WHERE user_id = $1) AS connected',
};

/**
 * Platform types the user has at least one connected account/page/channel for.
 */
export async function getConnectedPlatformTypes(userId: number): Promise<Platform[]> {
  const checks = await Promise.all(
    PLATFORMS.map(async (platform) => {
      const { rows } = await pool.query(PLATFORM_EXISTS_SQL[platform], [userId]);
      return rows[0]?.connected ? platform : null;
    })
  );
  return checks.filter((p): p is Platform => p !== null);
}
