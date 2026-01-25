import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { validateUserId, validateTextContent, validateAccountArrays, parsePublishRequest } from '@/lib/publish/validators/requestValidator';
import { validateMediaMix } from '@/lib/publish/validators/mediaValidator';
import { getPromptForDestination, transformContent } from '@/lib/ai/transformService';

const logger = createLogger('QueueAPI');

interface Destination {
  platform: string;
  account_id: string;
  account_name: string;
  transformed_content: string | null;
  post_type?: string; // For Instagram: 'feed' or 'story'
}

// Fetch account name from database
async function getAccountName(
  platform: 'facebook' | 'twitter' | 'instagram' | 'telegram',
  accountId: string,
  userId: number
): Promise<string> {
  const client = await pool.connect();
  try {
    let query: string;
    let params: (string | number)[];

    switch (platform) {
      case 'facebook':
        query = 'SELECT page_name FROM connected_facebook_pages WHERE page_id = $1 AND user_id = $2';
        params = [accountId, userId];
        break;
      case 'twitter':
        query = 'SELECT username FROM connected_x_accounts_v1_1 WHERE id = $1 AND user_id = $2';
        params = [accountId, userId];
        break;
      case 'instagram':
        query = 'SELECT username FROM connected_instagram_accounts WHERE id = $1 AND user_id = $2';
        params = [accountId, userId];
        break;
      case 'telegram':
        query = 'SELECT channel_title FROM connected_telegram_channels WHERE channel_id = $1 AND user_id = $2';
        params = [accountId, userId];
        break;
      default:
        return accountId;
    }

    const result = await client.query(query, params);
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return row.page_name || row.username || row.channel_title || accountId;
    }
    return accountId;
  } finally {
    client.release();
  }
}

// Transform content for a destination if AI prompt is configured
async function transformForDestination(
  content: string,
  platform: 'facebook' | 'twitter' | 'instagram' | 'telegram',
  accountId: string,
  userId: number
): Promise<string | null> {
  try {
    const promptConfig = await getPromptForDestination(userId, platform, accountId);
    if (!promptConfig) {
      return null; // No AI prompt configured for this destination
    }

    const result = await transformContent(content, promptConfig.prompt.prompt, promptConfig.provider);
    if (result.success && result.content) {
      return result.content;
    }
    logger.warn(`AI transformation failed for ${platform}/${accountId}: ${result.error}`);
    return null;
  } catch (error) {
    logger.error(`Error transforming content for ${platform}/${accountId}`, error);
    return null;
  }
}

// POST: Add a post to the queue
export async function POST(req: NextRequest) {
  const userIdStr = validateUserId(req.headers);
  if (!userIdStr) {
    return NextResponse.json({ error: 'User ID not found in headers' }, { status: 401 });
  }
  const userId = parseInt(userIdStr, 10);

  try {
    const body = await req.json();
    const parseResult = await parsePublishRequest(body);

    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json({ error: parseResult.error || 'Failed to parse request' }, { status: 400 });
    }

    const { text, facebookPages, xAccounts, instagramPublishAccounts, instagramStoryAccounts, telegramChannels, cloudinaryMedia } = parseResult.data;

    // Check for mixed media types
    if (cloudinaryMedia.length > 0) {
      const mixCheck = validateMediaMix(cloudinaryMedia);
      if (mixCheck.mixed) {
        return NextResponse.json({
          error: 'Cannot mix images and videos in a single post'
        }, { status: 400 });
      }
    }

    // Validate text content
    const hasAnyAccount = facebookPages.length > 0 || xAccounts.length > 0 || instagramPublishAccounts.length > 0 || instagramStoryAccounts.length > 0 || telegramChannels.length > 0;
    const textValidation = validateTextContent(text, cloudinaryMedia.length > 0, hasAnyAccount);
    if (!textValidation.success) {
      return NextResponse.json({ error: textValidation.error }, { status: 400 });
    }

    // Validate account arrays
    const accountValidation = validateAccountArrays(facebookPages, xAccounts, instagramPublishAccounts, instagramStoryAccounts, telegramChannels);
    if (!accountValidation.success) {
      return NextResponse.json({ error: accountValidation.error }, { status: 400 });
    }

    // Build destinations with AI-transformed content
    const destinations: Destination[] = [];

    // Process Facebook pages
    for (const pageId of facebookPages) {
      const [accountName, transformedContent] = await Promise.all([
        getAccountName('facebook', pageId, userId),
        transformForDestination(text, 'facebook', pageId, userId)
      ]);
      destinations.push({
        platform: 'facebook',
        account_id: pageId,
        account_name: accountName,
        transformed_content: transformedContent
      });
    }

    // Process X accounts
    for (const accountId of xAccounts) {
      const [accountName, transformedContent] = await Promise.all([
        getAccountName('twitter', accountId, userId),
        transformForDestination(text, 'twitter', accountId, userId)
      ]);
      destinations.push({
        platform: 'twitter',
        account_id: accountId,
        account_name: accountName,
        transformed_content: transformedContent
      });
    }

    // Process Instagram feed accounts
    for (const accountId of instagramPublishAccounts) {
      const [accountName, transformedContent] = await Promise.all([
        getAccountName('instagram', accountId, userId),
        transformForDestination(text, 'instagram', accountId, userId)
      ]);
      destinations.push({
        platform: 'instagram',
        account_id: accountId,
        account_name: accountName,
        transformed_content: transformedContent,
        post_type: 'feed'
      });
    }

    // Process Instagram story accounts
    for (const accountId of instagramStoryAccounts) {
      const [accountName, transformedContent] = await Promise.all([
        getAccountName('instagram', accountId, userId),
        transformForDestination(text, 'instagram', accountId, userId)
      ]);
      destinations.push({
        platform: 'instagram',
        account_id: accountId,
        account_name: accountName,
        transformed_content: transformedContent,
        post_type: 'story'
      });
    }

    // Process Telegram channels
    for (const channelId of telegramChannels) {
      const [accountName, transformedContent] = await Promise.all([
        getAccountName('telegram', channelId, userId),
        transformForDestination(text, 'telegram', channelId, userId)
      ]);
      destinations.push({
        platform: 'telegram',
        account_id: channelId,
        account_name: accountName,
        transformed_content: transformedContent
      });
    }

    // Store in database
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO scheduled_posts (user_id, content, media_urls, destinations, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING id, created_at`,
        [userId, text, JSON.stringify(cloudinaryMedia), JSON.stringify(destinations)]
      );

      const insertedRow = result.rows[0];
      logger.info(`Post queued successfully`, { id: insertedRow.id, userId, destinations: destinations.length });

      return NextResponse.json({
        success: true,
        id: insertedRow.id,
        message: 'Post added to queue',
        destinations_count: destinations.length,
        created_at: insertedRow.created_at
      });
    } finally {
      client.release();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to queue post', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// GET: List queued posts for the user
export async function GET(req: NextRequest) {
  const userIdStr = validateUserId(req.headers);
  if (!userIdStr) {
    return NextResponse.json({ error: 'User ID not found in headers' }, { status: 401 });
  }
  const userId = parseInt(userIdStr, 10);

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, content, media_urls, destinations, status, created_at
         FROM scheduled_posts
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      return NextResponse.json({
        success: true,
        posts: result.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to fetch queued posts', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
