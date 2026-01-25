import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { cleanupCloudinaryMedia } from '@/lib/services/cloudinaryService';
import type { CloudinaryMediaInfo } from '@/lib/publish/types';

const logger = createLogger('CleanupMediaWebhook');

// Verify webhook secret
function verifyWebhookSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-webhook-secret');
  const expectedSecret = process.env.WEBHOOK_SECRET;

  if (!expectedSecret) {
    logger.error('WEBHOOK_SECRET environment variable is not set');
    return false;
  }

  return secret === expectedSecret;
}

// POST: Clean up media from completed scheduled posts
export async function POST(req: NextRequest) {
  // Verify webhook secret
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.info('Media cleanup webhook triggered');

  const client = await pool.connect();
  try {
    // Fetch all completed posts that have media
    const result = await client.query(
      `SELECT id, media_urls
       FROM scheduled_posts
       WHERE status = 'completed'
       AND media_urls IS NOT NULL
       AND media_urls != '[]'::jsonb`
    );

    const postsWithMedia = result.rows;

    if (postsWithMedia.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No media to clean up',
        posts_processed: 0,
        media_deleted: 0
      });
    }

    logger.info(`Found ${postsWithMedia.length} completed posts with media to clean up`);

    let totalMediaDeleted = 0;
    const errors: Array<{ post_id: number; error: string }> = [];

    // Process each post's media
    for (const post of postsWithMedia) {
      try {
        const mediaUrls: CloudinaryMediaInfo[] = post.media_urls;

        if (mediaUrls.length > 0) {
          await cleanupCloudinaryMedia(mediaUrls);
          totalMediaDeleted += mediaUrls.length;
          logger.info(`Cleaned up ${mediaUrls.length} media files for post ${post.id}`);
        }

        // Clear media_urls after successful cleanup
        await client.query(
          `UPDATE scheduled_posts SET media_urls = '[]'::jsonb WHERE id = $1`,
          [post.id]
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to cleanup media for post ${post.id}`, error);
        errors.push({ post_id: post.id, error: errorMessage });
      }
    }

    logger.info(`Media cleanup completed. Processed: ${postsWithMedia.length}, Media deleted: ${totalMediaDeleted}`);

    return NextResponse.json({
      success: errors.length === 0,
      message: `Cleaned up media from ${postsWithMedia.length} posts`,
      posts_processed: postsWithMedia.length,
      media_deleted: totalMediaDeleted,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Media cleanup webhook failed', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    client.release();
  }
}
