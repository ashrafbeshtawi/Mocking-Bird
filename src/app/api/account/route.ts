import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';
import { cleanupCloudinaryMedia } from '@/lib/services/cloudinaryService';
import { createLogger } from '@/lib/logger';
import { revokeYouTubeTokens } from '@/lib/publishers/youtube';
import { revokeTikTokTokens } from '@/lib/publishers/tiktok';

const logger = createLogger('AccountAPI');

interface MediaRow {
  media: { publicId?: unknown; resourceType?: unknown; thumbnail?: { publicId?: unknown } } | null;
}

// Media attached to drafts lives in Cloudinary and
// would otherwise outlive the account. Both columns hold JSON arrays of
// CloudinaryMediaInfo; the typeof guard keeps one malformed row from blocking deletion.
const USER_MEDIA_SQL = `
  SELECT item AS media
  FROM drafts,
       jsonb_array_elements(CASE WHEN jsonb_typeof(media) = 'array' THEN media ELSE '[]'::jsonb END) item
  WHERE user_id = $1`;

/**
 * DELETE /api/account — deletes the signed-in user's account.
 * Every user-scoped table cascades from users(id), so one DELETE removes
 * connections, tokens, drafts and publish history. YouTube and TikTok access is
 * revoked at Google and TikTok first, since a stored refresh token would otherwise
 * stay valid there.
 */
export async function DELETE() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { rows } = await pool.query<MediaRow>(USER_MEDIA_SQL, [userId]);
    const media = rows.flatMap(({ media: item }): Array<{ publicId: string; resourceType: 'image' | 'video' }> => [
      ...(typeof item?.publicId === 'string' && (item.resourceType === 'image' || item.resourceType === 'video')
        ? [{ publicId: item.publicId, resourceType: item.resourceType as 'image' | 'video' }]
        : []),
      // A video's custom thumbnail is an image of its own in Cloudinary
      ...(typeof item?.thumbnail?.publicId === 'string'
        ? [{ publicId: item.thumbnail.publicId, resourceType: 'image' as const }]
        : []),
    ]);
    // Best effort: individual Cloudinary failures are logged inside and never block the deletion.
    await cleanupCloudinaryMedia(media);

    const { rows: channels } = await pool.query<{ refresh_token: string }>(
      'SELECT refresh_token FROM connected_youtube_channels WHERE user_id = $1',
      [userId]
    );
    await revokeYouTubeTokens(channels.map((channel) => channel.refresh_token));

    const { rows: tiktokAccounts } = await pool.query<{ access_token: string; refresh_token: string; expires_at: Date }>(
      'SELECT access_token, refresh_token, expires_at FROM connected_tiktok_accounts WHERE user_id = $1',
      [userId]
    );
    await revokeTikTokTokens(tiktokAccounts);

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    logger.info('Account deleted', { userId, mediaRemoved: media.length });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('Failed to delete account', { userId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
