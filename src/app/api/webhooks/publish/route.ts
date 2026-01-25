import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { processCloudinaryMedia } from '@/lib/publish/validators/mediaValidator';
import { createReportLogger, savePublishReport, determinePublishStatus } from '@/lib/publish/services/reportService';
import { executePublish } from '@/lib/publish/orchestrator';
import type { FacebookPageToken } from '@/lib/publishers/facebook';
import type { TwitterAccountTokenV1 } from '@/lib/publishers/twitterv1.1';
import type { InstagramAccountToken } from '@/lib/publishers/instagram';
import type { TelegramChannelToken } from '@/lib/publishers/telegram';
import type { CloudinaryMediaInfo } from '@/lib/publish/types';

const logger = createLogger('PublishWebhook');

interface Destination {
  platform: string;
  account_id: string;
  account_name: string;
  transformed_content: string | null;
  post_type?: string;
}

interface ScheduledPost {
  id: number;
  user_id: number;
  content: string;
  media_urls: CloudinaryMediaInfo[];
  destinations: Destination[];
  status: string;
  created_at: string;
}

interface PublishResult {
  post_id: number;
  status: 'success' | 'partial_success' | 'failed';
  successful_count: number;
  failed_count: number;
}

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

// Fetch tokens for a single post
async function fetchTokensForPost(
  userId: number,
  destinations: Destination[]
): Promise<{
  facebookTokens: FacebookPageToken[];
  twitterTokens: TwitterAccountTokenV1[];
  instagramFeedTokens: InstagramAccountToken[];
  instagramStoryTokens: InstagramAccountToken[];
  telegramTokens: TelegramChannelToken[];
}> {
  const client = await pool.connect();
  try {
    const facebookTokens: FacebookPageToken[] = [];
    const twitterTokens: TwitterAccountTokenV1[] = [];
    const instagramFeedTokens: InstagramAccountToken[] = [];
    const instagramStoryTokens: InstagramAccountToken[] = [];
    const telegramTokens: TelegramChannelToken[] = [];

    for (const dest of destinations) {
      switch (dest.platform) {
        case 'facebook': {
          const result = await client.query(
            `SELECT page_id, page_name, page_access_token
             FROM connected_facebook_pages
             WHERE page_id = $1 AND user_id = $2`,
            [dest.account_id, userId]
          );
          if (result.rows[0]) {
            facebookTokens.push({
              page_id: result.rows[0].page_id,
              page_name: result.rows[0].page_name,
              page_access_token: result.rows[0].page_access_token
            });
          }
          break;
        }
        case 'twitter': {
          const result = await client.query(
            `SELECT x_user_id, username, oauth_token, oauth_token_secret
             FROM connected_x_accounts_v1_1
             WHERE id = $1 AND user_id = $2`,
            [dest.account_id, userId]
          );
          if (result.rows[0]) {
            twitterTokens.push({
              x_user_id: result.rows[0].x_user_id,
              username: result.rows[0].username,
              oauth_token: result.rows[0].oauth_token,
              oauth_token_secret: result.rows[0].oauth_token_secret
            });
          }
          break;
        }
        case 'instagram': {
          const result = await client.query(
            `SELECT ia.instagram_account_id, ia.username, ia.facebook_page_id, fp.page_access_token
             FROM connected_instagram_accounts ia
             JOIN connected_facebook_pages fp ON ia.facebook_page_id = fp.page_id AND ia.user_id = fp.user_id
             WHERE ia.id = $1 AND ia.user_id = $2`,
            [dest.account_id, userId]
          );
          if (result.rows[0]) {
            const token: InstagramAccountToken = {
              instagram_account_id: result.rows[0].instagram_account_id,
              username: result.rows[0].username,
              page_access_token: result.rows[0].page_access_token,
              facebook_page_id: result.rows[0].facebook_page_id
            };
            if (dest.post_type === 'story') {
              instagramStoryTokens.push(token);
            } else {
              instagramFeedTokens.push(token);
            }
          }
          break;
        }
        case 'telegram': {
          const result = await client.query(
            `SELECT channel_id, channel_title
             FROM connected_telegram_channels
             WHERE channel_id = $1 AND user_id = $2`,
            [dest.account_id, userId]
          );
          if (result.rows[0]) {
            telegramTokens.push({
              channel_id: result.rows[0].channel_id,
              channel_title: result.rows[0].channel_title
            });
          }
          break;
        }
      }
    }

    return { facebookTokens, twitterTokens, instagramFeedTokens, instagramStoryTokens, telegramTokens };
  } finally {
    client.release();
  }
}

// Publish a single scheduled post
async function publishScheduledPost(post: ScheduledPost): Promise<PublishResult> {
  const reportLogger = createReportLogger();
  reportLogger.add(`Processing scheduled post ID: ${post.id}`);

  try {
    // Fetch tokens for this post
    const tokens = await fetchTokensForPost(post.user_id, post.destinations);

    // Process media if needed (download for Facebook/Twitter)
    const needsDownload = tokens.facebookTokens.length > 0 || tokens.twitterTokens.length > 0;
    const mediaResult = needsDownload && post.media_urls.length > 0
      ? await processCloudinaryMedia(post.media_urls, reportLogger)
      : { files: [], errors: [], totalFiles: post.media_urls.length, allFailed: false };

    // Build content map for transformed content per destination
    const contentByDestination = new Map<string, string>();
    for (const dest of post.destinations) {
      const key = `${dest.platform}-${dest.account_id}-${dest.post_type || 'default'}`;
      contentByDestination.set(key, dest.transformed_content || post.content);
    }

    // For now, use the base content for publishing (the orchestrator doesn't support per-destination content yet)
    // The transformed content is stored and could be used in a more sophisticated orchestrator
    const publishContent = post.content;

    // Execute publishing
    const result = await executePublish({
      pool,
      text: publishContent,
      mediaFiles: mediaResult.files,
      cloudinaryMedia: post.media_urls,
      facebookTokens: tokens.facebookTokens,
      twitterTokens: tokens.twitterTokens,
      instagramFeedTokens: tokens.instagramFeedTokens,
      instagramStoryTokens: tokens.instagramStoryTokens,
      telegramTokens: tokens.telegramTokens,
      reportLogger
    });

    // Save to publish history
    const contentToStore = post.content + (post.media_urls.length > 0 ? ` [${post.media_urls.length} media files attached]` : '');
    const publishStatus = determinePublishStatus(result.successful, result.failed);
    await savePublishReport(pool, String(post.user_id), contentToStore, reportLogger.getReport(), publishStatus);

    return {
      post_id: post.id,
      status: publishStatus,
      successful_count: result.successful.length,
      failed_count: result.failed.length
    };
  } catch (error) {
    reportLogger.add(`Error publishing post ${post.id}: ${(error as Error).message}`);
    logger.error(`Error publishing scheduled post ${post.id}`, error);

    // Save failed report to history
    const contentToStore = post.content + (post.media_urls.length > 0 ? ` [${post.media_urls.length} media files attached]` : '');
    await savePublishReport(pool, String(post.user_id), contentToStore, reportLogger.getReport(), 'failed');

    return {
      post_id: post.id,
      status: 'failed',
      successful_count: 0,
      failed_count: post.destinations.length
    };
  }
}

// POST: Process all pending scheduled posts
export async function POST(req: NextRequest) {
  // Verify webhook secret
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.info('Publish webhook triggered');

  const client = await pool.connect();
  try {
    // Fetch all pending posts
    const pendingResult = await client.query(
      `SELECT id, user_id, content, media_urls, destinations, status, created_at
       FROM scheduled_posts
       WHERE status = 'pending'
       ORDER BY created_at ASC`
    );

    const pendingPosts: ScheduledPost[] = pendingResult.rows;

    if (pendingPosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending posts to process',
        total: 0,
        succeeded: 0,
        failed: 0,
        results: []
      });
    }

    logger.info(`Processing ${pendingPosts.length} pending posts`);

    // Mark all as processing
    const postIds = pendingPosts.map(p => p.id);
    await client.query(
      `UPDATE scheduled_posts SET status = 'processing' WHERE id = ANY($1)`,
      [postIds]
    );

    // Release client before parallel processing
    client.release();

    // Process all posts in parallel
    const publishPromises = pendingPosts.map(post => publishScheduledPost(post));
    const results = await Promise.all(publishPromises);

    // Update post statuses based on results
    const updateClient = await pool.connect();
    try {
      for (const result of results) {
        const newStatus = result.status === 'success' ? 'completed' :
                          result.status === 'partial_success' ? 'completed' : 'failed';
        await updateClient.query(
          `UPDATE scheduled_posts SET status = $1 WHERE id = $2`,
          [newStatus, result.post_id]
        );
      }
    } finally {
      updateClient.release();
    }

    const succeeded = results.filter(r => r.status === 'success' || r.status === 'partial_success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    logger.info(`Publish webhook completed. Processed: ${pendingPosts.length}, Succeeded: ${succeeded}, Failed: ${failed}`);

    return NextResponse.json({
      success: true,
      message: `Processed ${pendingPosts.length} posts`,
      total: pendingPosts.length,
      succeeded,
      failed,
      results
    });
  } catch (error) {
    client.release();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Publish webhook failed', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
