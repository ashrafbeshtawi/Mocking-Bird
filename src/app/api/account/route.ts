import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';
import { cleanupCloudinaryMedia } from '@/lib/services/cloudinaryService';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AccountAPI');

interface MediaRow {
  media: { publicId?: unknown; resourceType?: unknown } | null;
}

// Media attached to unpublished drafts / scheduled posts lives in Cloudinary and
// would otherwise outlive the account. Both columns hold JSON arrays of
// CloudinaryMediaInfo; the typeof guard keeps one malformed row from blocking deletion.
const USER_MEDIA_SQL = `
  SELECT item AS media
  FROM scheduled_posts,
       jsonb_array_elements(CASE WHEN jsonb_typeof(media_urls) = 'array' THEN media_urls ELSE '[]'::jsonb END) item
  WHERE user_id = $1
  UNION ALL
  SELECT item
  FROM drafts,
       jsonb_array_elements(CASE WHEN jsonb_typeof(media) = 'array' THEN media ELSE '[]'::jsonb END) item
  WHERE user_id = $1`;

/**
 * DELETE /api/account — deletes the signed-in user's account.
 * Every user-scoped table cascades from users(id) (migration 023 restores the
 * constraints that 018 dropped), so one DELETE removes connections, tokens,
 * drafts, publish history and scheduled posts.
 */
export async function DELETE() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { rows } = await pool.query<MediaRow>(USER_MEDIA_SQL, [userId]);
    const media = rows
      .map((row) => row.media)
      .filter(
        (item): item is { publicId: string; resourceType: 'image' | 'video' } =>
          typeof item?.publicId === 'string' &&
          (item.resourceType === 'image' || item.resourceType === 'video')
      );
    // Best effort: individual Cloudinary failures are logged inside and never block the deletion.
    await cleanupCloudinaryMedia(media);

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    logger.info('Account deleted', { userId, mediaRemoved: media.length });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('Failed to delete account', { userId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
