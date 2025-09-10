// /pages/api/publish.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { FacebookPublisher, FacebookMediaFile } from '@/lib/publishers/facebook';
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
  const publishReport: string[] = [];
  const addReport = (message: string) => {
    publishReport.push(`[${new Date().toISOString()}] ${message}`);
    logger.info(message);
  };

  addReport(`Starting new publish request [${requestId}]`);

  const userId = req.headers.get('x-user-id');
  if (!userId) {
    addReport(`ERROR: User ID not found in headers `);
    return NextResponse.json({ error: 'User ID not found in headers' }, { status: 401 });
  }

  addReport(`Processing request for user: ${userId} `);

  try {
    const formData = await req.formData();
    const text = formData.get('text') as string || '';
    const facebookPages = formData.getAll('facebookPages').map(String);
    const xAccounts = formData.getAll('xAccounts').map(String);
    const media = formData.getAll('media').filter((f) => typeof f !== 'string') as File[];
    
    addReport(`Request payload parsed. Text length: ${text?.length || 0}, Facebook pages: ${facebookPages?.length || 0}, X accounts: ${xAccounts?.length || 0}, Media files: ${media?.length || 0}`);

    // Process media files for Facebook
    const facebookMediaFiles: FacebookMediaFile[] = [];
    const mediaProcessingErrors: string[] = [];

    if (media && media.length > 0) {
      addReport(`Processing ${media.length} media files for Facebook`);
      
      for (let i = 0; i < media.length; i++) {
        const file = media[i];
        try {
          // Validate file type (Facebook supports images and videos)
          if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            mediaProcessingErrors.push(`File ${file.name}: Unsupported file type ${file.type}. Facebook only supports images and videos.`);
            continue;
          }

          // Check file size (Facebook has limits: 4MB for photos, larger for videos)
          const maxSize = file.type.startsWith('image/') ? 4 * 1024 * 1024 : 1024 * 1024 * 1024; // 4MB for images, 1GB for videos
          if (file.size > maxSize) {
            mediaProcessingErrors.push(`File ${file.name}: File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is ${maxSize / 1024 / 1024}MB.`);
            continue;
          }

          // Convert File to Buffer
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          facebookMediaFiles.push({
            buffer,
            filename: file.name,
            mimetype: file.type,
          });

          addReport(`Successfully processed media file: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)}KB)`);
        } catch (error) {
          const errorMsg = `Failed to process media file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          mediaProcessingErrors.push(errorMsg);
          addReport(`ERROR: ${errorMsg}`);
        }
      }

      if (mediaProcessingErrors.length > 0) {
        addReport(`WARN: Media processing errors encountered: ${mediaProcessingErrors.join('; ')}`);
      }

      addReport(`Media processing complete. Successfully processed: ${facebookMediaFiles.length}, Errors: ${mediaProcessingErrors.length}`);
    }

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      // Allow empty text if we have media files for Facebook
      if (facebookMediaFiles.length === 0 || facebookPages.length === 0) {
        addReport(`WARN: Invalid text input and no media files for Facebook. Text: ${text?.substring(0, 100)}`);
        return NextResponse.json({ 
          error: 'Post text is required when no media files are provided, or media files are required when text is empty',
          mediaErrors: mediaProcessingErrors.length > 0 ? mediaProcessingErrors : undefined
        }, { status: 400 });
      }
    }

    if (!Array.isArray(facebookPages) || !Array.isArray(xAccounts)) {
      addReport(`WARN: Invalid array inputs. Facebook pages type: ${typeof facebookPages}, X accounts type: ${typeof xAccounts}`);
      return NextResponse.json({ error: 'facebookPages and xAccounts must be arrays' }, { status: 400 });
    }

    if (facebookPages.length === 0 && xAccounts.length === 0) {
      addReport(`WARN: No accounts selected for publishing`);
      return NextResponse.json({ error: 'At least one social media account must be selected' }, { status: 400 });
    }

    // If we have media processing errors and no valid media files, return error for Facebook pages
    if (facebookPages.length > 0 && media.length > 0 && facebookMediaFiles.length === 0 && mediaProcessingErrors.length > 0) {
      addReport(`ERROR: All media files failed processing and Facebook pages selected`);
      return NextResponse.json({
        error: 'All media files failed processing. Please check file types and sizes.',
        mediaErrors: mediaProcessingErrors
      }, { status: 400 });
    }

    // Initialize publishers
    addReport(`Initializing publishers`);
    const facebookPublisher = new FacebookPublisher(pool);
    const twitterPublisher = new TwitterPublisher(pool);

    // Fetch tokens from database
    addReport(`Fetching tokens from database for ${facebookPages.length} Facebook pages and ${xAccounts.length} X accounts`);
    const [fbTokens, xTokens] = await Promise.all([
      facebookPublisher.getPageTokens(userId, facebookPages),
      twitterPublisher.getAccountTokens(userId, xAccounts)
    ]);

    addReport(`Tokens retrieved. Facebook tokens: ${fbTokens.length}, Twitter tokens: ${xTokens.length}`);

    // Check for missing accounts
    const missingFbIds = facebookPublisher.validateMissingPages(facebookPages, fbTokens);
    const missingXIds = twitterPublisher.validateMissingAccounts(xAccounts, xTokens);

    if (missingFbIds.length > 0 || missingXIds.length > 0) {
      const missingAccounts = [
        ...missingFbIds.map(id => `Facebook Page ID: ${id}`),
        ...missingXIds.map(id => `X Account ID: ${id}`),
      ];

      addReport(`ERROR: Missing accounts detected. Details: ${missingAccounts.join(', ')}`);

      return NextResponse.json({
        error: 'One or more selected accounts could not be found for the user.',
        details: missingAccounts,
      }, { status: 404 });
    }

    // Publish to all platforms
    addReport(`Starting publishing process to ${fbTokens.length} Facebook pages and ${xTokens.length} X accounts`);
    
    // Prepare Facebook publishing options
    const facebookOptions = {
      text: text.trim() || undefined,
      files: facebookMediaFiles.length > 0 ? facebookMediaFiles : undefined
    };

    // Note: Twitter publisher doesn't support media files in this implementation
    if (xAccounts.length > 0 && media.length > 0) {
      addReport(`WARN: Media files provided but Twitter publisher doesn't support media uploads. Only text will be posted to X accounts.`);
    }

    const publishPromises: Promise<any>[] = [];

    // Add Facebook publishing if we have pages
    if (fbTokens.length > 0) {
      publishPromises.push(facebookPublisher.publishToPages(facebookOptions, fbTokens));
    } else {
      publishPromises.push(Promise.resolve({ successful: [], failed: [] }));
    }

    // Add Twitter publishing if we have accounts
    if (xTokens.length > 0) {
      publishPromises.push(twitterPublisher.publishToAccounts(text, xTokens, userId));
    } else {
      publishPromises.push(Promise.resolve({ successful: [], failed: [] }));
    }

    const [fbResults, xResults] = await Promise.all(publishPromises);

    // Combine results
    const allSuccessful = [...fbResults.successful, ...xResults.successful];
    const allFailed = [...fbResults.failed, ...xResults.failed];

    addReport(`Publishing complete. Successful posts: ${allSuccessful.length}, Failed posts: ${allFailed.length}`);

    // Save publish report to database
    addReport(`Saving publish result to database`);
    const client = await pool.connect();
    
    try {
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

      if (successfulFacebookNames.length > 0) {
        addReport(`Successfully published to Facebook pages: ${successfulFacebookNames.join(', ')}`);
      }
      if (successfulTwitterUsernames.length > 0) {
        addReport(`Successfully published to X accounts: ${successfulTwitterUsernames.join(', ')}`);
      }
      if (failedFacebookNames.length > 0) {
        addReport(`Failed to publish to Facebook pages: ${failedFacebookNames.join(', ')}`);
      }
      if (failedTwitterUsernames.length > 0) {
        addReport(`Failed to publish to X accounts: ${failedTwitterUsernames.join(', ')}`);
      }

      let publishStatus: 'success' | 'partial_success' | 'failed';
      if (allSuccessful.length > 0 && allFailed.length === 0) {
        publishStatus = 'success';
      } else if (allSuccessful.length > 0 && allFailed.length > 0) {
        publishStatus = 'partial_success';
      } else {
        publishStatus = 'failed';
      }
      addReport(`Overall publish status: ${publishStatus}`);

      // Include media file info in the content stored
      const contentToStore = text + (facebookMediaFiles.length > 0 ? ` [${facebookMediaFiles.length} media files attached]` : '');

      await client.query(
        'INSERT INTO publish_history (user_id, content, publish_report, publish_status) VALUES ($1, $2, $3, $4)',
        [
          parseInt(userId),
          contentToStore,
          publishReport.join('\n'),
          publishStatus
        ]
      );
      
      addReport(`Publish result saved to database successfully`);

    } catch (dbError) {
      addReport(`ERROR: Failed to save publish result to database. Error: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      // If saving to DB fails, we still want to return the appropriate HTTP response
      // based on the actual publishing results, but log the DB error.
    } finally {
      client.release();
    }
    
    // Prepare response data
    const responseData: any = {
      successful: allSuccessful,
      failed: allFailed,
      publishReport: publishReport.join('\n')
    };

    // Include media processing info if relevant
    if (media.length > 0) {
      responseData.mediaProcessing = {
        totalFiles: media.length,
        processedFiles: facebookMediaFiles.length,
        errors: mediaProcessingErrors
      };
    }

    // Return appropriate response
    if (allFailed.length > 0) {
      addReport(`Partial success - some posts failed`);

      return NextResponse.json({
        message: 'Some posts were published successfully, but others failed.',
        ...responseData
      }, { status: 207 });
    }

    addReport(`All posts published successfully`);
    return NextResponse.json({
      message: 'All posts published successfully.',
      results: allSuccessful,
      publishReport: publishReport.join('\n'),
      ...(responseData.mediaProcessing && { mediaProcessing: responseData.mediaProcessing })
    }, { status: 200 });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    addReport(`ERROR: Request processing failed. Error: ${errorMessage}`);
    return NextResponse.json({ error: errorMessage, publishReport: publishReport.join('\n') }, { status: 500 });
  }
}