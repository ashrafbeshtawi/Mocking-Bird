// /pages/api/publish.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { FacebookPublisher } from '@/lib/publishers/facebook';
import { TwitterPublisher } from '@/lib/publishers/twitter';

const pool = new Pool({ connectionString: process.env.DATABASE_STRING });

// Simple logger utility
const logger = {
  info: (message: string, data?: unknown) => {
    console.log(`[PublishAPI] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error?: unknown) => {
    console.error(`[PublishAPI] ERROR: ${message}`, error);
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`[PublishAPI] WARN: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  logger.info(`Starting new publish request [${requestId}]`);

  const userId = req.headers.get('x-user-id');
  if (!userId) {
    logger.error(`User ID not found in headers [${requestId}]`);
    return NextResponse.json({ error: 'User ID not found in headers' }, { status: 401 });
  }

  logger.info(`Processing request for user: ${userId} [${requestId}]`);

  try {
    const { text, facebookPages, xAccounts } = await req.json();
    
    logger.info(`Request payload parsed [${requestId}]`, {
      textLength: text?.length || 0,
      facebookPagesCount: facebookPages?.length || 0,
      xAccountsCount: xAccounts?.length || 0
    });

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      logger.warn(`Invalid text input [${requestId}]`, { text: text?.substring(0, 100) });
      return NextResponse.json({ error: 'Post text is required and cannot be empty' }, { status: 400 });
    }

    if (!Array.isArray(facebookPages) || !Array.isArray(xAccounts)) {
      logger.warn(`Invalid array inputs [${requestId}]`, { 
        facebookPagesType: typeof facebookPages, 
        xAccountsType: typeof xAccounts 
      });
      return NextResponse.json({ error: 'facebookPages and xAccounts must be arrays' }, { status: 400 });
    }

    if (facebookPages.length === 0 && xAccounts.length === 0) {
      logger.warn(`No accounts selected [${requestId}]`);
      return NextResponse.json({ error: 'At least one social media account must be selected' }, { status: 400 });
    }

    // Initialize publishers
    logger.info(`Initializing publishers [${requestId}]`);
    const facebookPublisher = new FacebookPublisher(pool);
    const twitterPublisher = new TwitterPublisher(pool);

    // Fetch tokens from database
    logger.info(`Fetching tokens from database [${requestId}]`);
    const [fbTokens, xTokens] = await Promise.all([
      facebookPublisher.getPageTokens(userId, facebookPages),
      twitterPublisher.getAccountTokens(userId, xAccounts)
    ]);

    logger.info(`Tokens retrieved [${requestId}]`, {
      facebookTokens: fbTokens.length,
      twitterTokens: xTokens.length
    });

    // Check for missing accounts
    const missingFbIds = facebookPublisher.validateMissingPages(facebookPages, fbTokens);
    const missingXIds = twitterPublisher.validateMissingAccounts(xAccounts, xTokens);

    if (missingFbIds.length > 0 || missingXIds.length > 0) {
      const missingAccounts = [
        ...missingFbIds.map(id => `Facebook Page ID: ${id}`),
        ...missingXIds.map(id => `X Account ID: ${id}`),
      ];

      logger.error(`Missing accounts detected [${requestId}]`, { missingAccounts });

      return NextResponse.json({
        error: 'One or more selected accounts could not be found for the user.',
        details: missingAccounts,
      }, { status: 404 });
    }

    // Publish to all platforms
    logger.info(`Starting publishing process [${requestId}]`);
    const [fbResults, xResults] = await Promise.all([
      facebookPublisher.publishToPages(text, fbTokens),
      twitterPublisher.publishToAccounts(text, xTokens, userId)
    ]);

    // Combine results
    const allSuccessful = [...fbResults.successful, ...xResults.successful];
    const allFailed = [...fbResults.failed, ...xResults.failed];

    // 💡 START of updated logic to save to database with names
    logger.info(`Saving publish result to database [${requestId}]`);
    const client = await pool.connect();
    
    try {
      // Look up names for successful posts
      const successfulFacebookNames = allSuccessful
        .filter(result => result.platform === 'facebook' && 'page_id' in result)
        .map(result => {
          const page = fbTokens.find(token => token.page_id === (result as { page_id: string }).page_id);
          return page ? page.page_name : (result as { page_id: string }).page_id;
        });
      
      const successfulTwitterUsernames = allSuccessful
        .filter(result => result.platform === 'x' && 'account_id' in result)
        .map(result => {
          const account = xTokens.find(token => token.x_user_id === (result as { account_id: string }).account_id);
          return account ? account.username : (result as { account_id: string }).account_id;
        });
        
      // Look up names for failed posts
      const failedFacebookNames = allFailed
        .filter(result => result.platform === 'facebook' && 'page_id' in result)
        .map(result => {
          const page = fbTokens.find(token => token.page_id === (result as { page_id: string }).page_id);
          return page ? page.page_name : (result as { page_id: string }).page_id;
        });
        
      const failedTwitterUsernames = allFailed
        .filter(result => result.platform === 'x' && 'account_id' in result)
        .map(result => {
          const account = xTokens.find(token => token.x_user_id === (result as { account_id: string }).account_id);
          return account ? account.username : (result as { account_id: string }).account_id;
        });

      await client.query(
        'INSERT INTO publish_history (user_id, content, successful_facebook, successful_twitter, failed_facebook, failed_twitter) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          parseInt(userId),
          text,
          successfulFacebookNames,
          successfulTwitterUsernames,
          failedFacebookNames,
          failedTwitterUsernames
        ]
      );
      
      logger.info(`Publish result saved to database successfully [${requestId}]`);

    } catch (dbError) {
      logger.error(`Failed to save publish result to database [${requestId}]`, dbError);
    } finally {
      client.release();
    }
    // 💡 END of updated logic
    
    // Return appropriate response
    if (allFailed.length > 0) {
      logger.warn(`Partial success - some posts failed [${requestId}]`, {
        successfulPlatforms: allSuccessful.map(s => `${s.platform}:${s.platform === 'facebook' ? s.page_id : s.account_id}`),
        failedPlatforms: allFailed.map(f => `${f.platform}:${f.platform === 'facebook' ? f.page_id : f.account_id}`)
      });

      return NextResponse.json({
        message: 'Some posts were published successfully, but others failed.',
        successful: allSuccessful,
        failed: allFailed,
      }, { status: 207 });
    }

    logger.info(`All posts published successfully [${requestId}]`);
    return NextResponse.json({
      message: 'All posts published successfully.',
      results: allSuccessful
    }, { status: 200 });

  } catch (err) {
    logger.error(`Request processing failed [${requestId}]`, err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}