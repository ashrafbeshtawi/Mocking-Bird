// /pages/api/publish.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { FacebookPublisher } from '@/lib/publishers/facebook';
import { TwitterPublisher } from '@/lib/publishers/twitter';
import { FailedPublishResult, SuccessfulPublishResult, PublishResults, MediaProcessingError, MediaProcessing, PublishResponseData, FacebookFailedItem, TwitterFailedItem, FacebookSuccessItem, TwitterSuccessItem, ApiResponse, MediaFile } from '@/types/interfaces';

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

/**
 * Saves a publish report to the database and returns a NextResponse.
 */
async function returnAndCreateReport({
  userId,
  publishReport,
  contentToStore,
  allSuccessful,
  allFailed,
  responseData,
  status,
  message,
  error,
  details
}: {
  userId: string;
  publishReport: string[];
  contentToStore: string;
  allSuccessful?: SuccessfulPublishResult[];
  allFailed?: FailedPublishResult[];
  responseData?: PublishResponseData;
  status: number;
  message?: string;
  error?: string;
  details?: string[];
}): Promise<NextResponse> {
  let publishStatus: 'success' | 'partial_success' | 'failed';
  if (allSuccessful && allSuccessful.length > 0 && allFailed && allFailed.length === 0) {
    publishStatus = 'success';
  } else if (allSuccessful && allSuccessful.length > 0 && allFailed && allFailed.length > 0) {
    publishStatus = 'partial_success';
  } else {
    publishStatus = 'failed';
  }

  // Add the final status to the report
  publishReport.push(`Overall publish status: ${publishStatus}`);

  const client = await pool.connect();
  try {
    publishReport.push(`Saving publish result to database`);
    
    await client.query(
      'INSERT INTO publish_history (user_id, content, publish_report, publish_status) VALUES ($1, $2, $3, $4)',
      [
        parseInt(userId),
        contentToStore,
        publishReport.join('\n'),
        publishStatus
      ]
    );

    publishReport.push(`Publish result saved to database successfully`);

  } catch (dbError) {
    const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
    publishReport.push(`ERROR: Failed to save publish result to database. Error: ${errorMessage}`);
    logger.error(`Failed to save publish result to database.`, dbError);
  } finally {
    client.release();
  }

  const responseBody: ApiResponse = { publishReport: publishReport.join('\n') };

  if (message) {
    responseBody.message = message;
  }
  if (error) {
    responseBody.error = error;
  }
  if (details) {
    responseBody.details = details;
  }
  if (responseData) {
    Object.assign(responseBody, responseData);
  }
  if (allSuccessful) {
    responseBody.results = allSuccessful;
  }

  return NextResponse.json(responseBody, { status });
}

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

    const mediaFiles: MediaFile[] = [];
    const mediaProcessingErrors: string[] = [];

    if (media && media.length > 0) {
      addReport(`Processing ${media.length} media files for Facebook`);
      
      for (let i = 0; i < media.length; i++) {
        const file = media[i];
        try {
          if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            mediaProcessingErrors.push(`File ${file.name}: Unsupported file type ${file.type}. Facebook only supports images and videos.`);
            continue;
          }

          const maxSize = file.type.startsWith('image/') ? 4 * 1024 * 1024 : 1024 * 1024 * 1024;
          if (file.size > maxSize) {
            mediaProcessingErrors.push(`File ${file.name}: File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is ${maxSize / 1024 / 1024}MB.`);
            continue;
          }

          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          mediaFiles.push({
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

      let countImages = 0;
      let countVideos = 0;
      for (const file of mediaFiles) {
        if (file.mimetype.startsWith('image/')) {
          countImages++;
        } else if (file.mimetype.startsWith('video/')) {
          countVideos++;
        }
      }
      if (countImages > 0 && countVideos > 0) {
        addReport(`Error: Mixed media types detected. Images: ${countImages}, Videos: ${countVideos}`);
        return await returnAndCreateReport({
          userId,
          publishReport,
          contentToStore: text + (mediaFiles.length > 0 ? ` [${mediaFiles.length} media files attached]` : ''),
          status: 400,
          error: 'We do not support mixing images and videos in a single post. Please upload either only images or only videos.',
        });
      }

      addReport(`Media processing complete. Successfully processed: ${mediaFiles.length}, Errors: ${mediaProcessingErrors.length}`);
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      if (mediaFiles.length === 0 || facebookPages.length === 0) {
        addReport(`WARN: Invalid text input and no media files for Facebook. Text: ${text?.substring(0, 100)}`);
        return await returnAndCreateReport({
          userId,
          publishReport,
          contentToStore: text,
          status: 400,
          error: 'Post text is required when no media files are provided, or media files are required when text is empty',
          responseData: {
            successful: [],
            failed: [],
            publishReport: '',
            mediaProcessing: mediaProcessingErrors.length > 0 ? {
              totalFiles: media.length,
              processedFiles: mediaFiles.length,
              errors: mediaProcessingErrors.map(error => ({ message: error }))
            } : undefined
          }
        });
      }
    }

    if (!Array.isArray(facebookPages) || !Array.isArray(xAccounts)) {
      addReport(`WARN: Invalid array inputs. Facebook pages type: ${typeof facebookPages}, X accounts type: ${typeof xAccounts}`);
      return await returnAndCreateReport({
        userId,
        publishReport,
        contentToStore: text,
        status: 400,
        error: 'facebookPages and xAccounts must be arrays',
      });
    }

    if (facebookPages.length === 0 && xAccounts.length === 0) {
      addReport(`WARN: No accounts selected for publishing`);
      return await returnAndCreateReport({
        userId,
        publishReport,
        contentToStore: text,
        status: 400,
        error: 'At least one social media account must be selected',
      });
    }

    if (facebookPages.length > 0 && media.length > 0 && mediaFiles.length === 0 && mediaProcessingErrors.length > 0) {
      addReport(`ERROR: All media files failed processing and Facebook pages selected`);
      return await returnAndCreateReport({
        userId,
        publishReport,
        contentToStore: text,
        status: 400,
        error: 'All media files failed processing. Please check file types and sizes.',
        responseData: {
          successful: [],
          failed: [],
          publishReport: '',
          mediaProcessing: {
            totalFiles: media.length,
            processedFiles: mediaFiles.length,
            errors: mediaProcessingErrors.map(error => ({ message: error }))
          }
        }
      });
    }

    addReport(`Initializing publishers`);
    const facebookPublisher = new FacebookPublisher(pool);
    const twitterPublisher = new TwitterPublisher(pool);

    addReport(`Fetching tokens from database for ${facebookPages.length} Facebook pages and ${xAccounts.length} X accounts`);
    const [fbTokens, xTokens] = await Promise.all([
      facebookPublisher.getPageTokens(userId, facebookPages),
      twitterPublisher.getAccountTokens(userId, xAccounts)
    ]);

    addReport(`Tokens retrieved. Facebook tokens: ${fbTokens.length}, Twitter tokens: ${xTokens.length}`);

    const missingFbIds = facebookPublisher.validateMissingPages(facebookPages, fbTokens);
    const missingXIds = twitterPublisher.validateMissingAccounts(xAccounts, xTokens);

    if (missingFbIds.length > 0 || missingXIds.length > 0) {
      const missingAccounts = [
        ...missingFbIds.map(id => `Facebook Page ID: ${id}`),
        ...missingXIds.map(id => `X Account ID: ${id}`),
      ];
      addReport(`ERROR: Missing accounts detected. Details: ${missingAccounts.join(', ')}`);
      return await returnAndCreateReport({
        userId,
        publishReport,
        contentToStore: text,
        status: 404,
        error: 'One or more selected accounts could not be found for the user.',
        details: missingAccounts,
      });
    }

    addReport(`Starting publishing process to ${fbTokens.length} Facebook pages and ${xTokens.length} X accounts`);
    
    const facebookOptions = {
      text: text.trim() || undefined,
      files: mediaFiles.length > 0 ? mediaFiles : undefined
    };

    function mapFacebookFailed(failed: FacebookFailedItem[]): FailedPublishResult[] {
      return failed.map(item => ({
        platform: item.platform,
        page_id: item.page_id,
        error: item.error
          ? {
              message: item.error.message,
              code: item.error.code,
              details: typeof item.error.details === 'object'
                ? (
                    item.error.details && item.error.details.error
                      ? { error: item.error.details.error }
                      : undefined
                  )
                : undefined
            }
          : undefined
      }));
    }

    function mapTwitterFailed(failed: TwitterFailedItem[]): FailedPublishResult[] {
      return failed.map(item => ({
        platform: item.platform,
        account_id: item.account_id,
        error: item.error
          ? {
              message: item.error.message,
              code: item.error.code,
              details: typeof item.error.details === 'object'
                ? (
                    item.error.details && item.error.details.detail
                      ? { error: { message: item.error.details.detail } }
                      : undefined
                  )
                : undefined
            }
          : undefined
      }));
    }

    function mapFacebookSuccess(successful: FacebookSuccessItem[]): SuccessfulPublishResult[] {
      return successful.map(item => ({
        platform: item.platform,
        page_id: item.page_id,
        post_id: item.result?.id
      }));
    }

    function mapTwitterSuccess(successful: TwitterSuccessItem[]): SuccessfulPublishResult[] {
      return successful.map(item => ({
        platform: item.platform,
        account_id: item.account_id,
        tweet_id: item.result?.data?.id
      }));
    }

    const publishPromises: Promise<{ successful: SuccessfulPublishResult[]; failed: FailedPublishResult[] }>[] = [];

    if (fbTokens.length > 0) {
      publishPromises.push(
        facebookPublisher.publishToPages(facebookOptions, fbTokens).then(res => ({
          successful: mapFacebookSuccess(
            res.successful.map(item => ({
              ...item,
              result: item.result as { id?: string }
            }))
          ),
          failed: mapFacebookFailed(
            res.failed.map(item => ({
              ...item,
              error: item.error
                ? {
                    ...item.error,
                    details: typeof item.error.details === 'object'
                      ? item.error.details as {
                          error?: {
                            message?: string;
                            type?: string;
                            code?: number;
                            error_subcode?: number;
                            is_transient?: boolean;
                            error_user_title?: string;
                            error_user_msg?: string;
                            fbtrace_id?: string;
                          };
                        }
                      : undefined
                  }
                : undefined
            }))
          )
        }))
      );
    } else {
      publishPromises.push(Promise.resolve({ successful: [], failed: [] }));
    }

    if (xTokens.length > 0) {
      publishPromises.push(
        twitterPublisher.publishToAccounts(text, xTokens, userId, mediaFiles).then(res => ({
          successful: mapTwitterSuccess(
            res.successful.map(item => ({
              ...item,
              result: item.result as { data?: { id?: string } }
            }))
          ),
          failed: mapTwitterFailed(
            res.failed.map(item => ({
              ...item,
              error: item.error
                ? {
                    ...item.error,
                    details: typeof item.error.details === 'object'
                      ? item.error.details as { detail?: string }
                      : undefined
                  }
                : undefined
            }))
          )
        }))
      );
    } else {
      publishPromises.push(Promise.resolve({ successful: [], failed: [] }));
    }

    const [fbResults, xResults] = await Promise.all(publishPromises);

    const allSuccessful = [...fbResults.successful, ...xResults.successful];
    const allFailed = [...fbResults.failed, ...xResults.failed];

    addReport(`Publishing complete. Successful posts: ${allSuccessful.length}, Failed posts: ${allFailed.length}`);
    if (allFailed.length > 0) {
      const formattedFailedDetails = allFailed.map(item => {
        let detailMessage = `${item.platform}: `;
        if (item.page_id) {
          detailMessage += `Page ID ${item.page_id}`;
        } else if (item.account_id) {
          detailMessage += `Account ID ${item.account_id}`;
        }
        detailMessage += ` - Error: ${item.error?.message || 'Unknown error'}`;

        if (item.platform === 'facebook' && item.error?.details?.error?.error_user_msg) {
          detailMessage += ` (${item.error.details.error.error_user_msg})`;
        }
        if (item.platform === 'x' && item.error?.details?.error?.message) {
          detailMessage += ` (${item.error.details.error.message})`;
        }

        if (item.error?.code) {
          detailMessage += ` (Code: ${item.error.code})`;
        }
        return detailMessage;
      }).join('; ');
      addReport(`Failed posts details: ${formattedFailedDetails}`);
    }

    const contentToStore = text + (mediaFiles.length > 0 ? ` [${mediaFiles.length} media files attached]` : '');

    const responseData: PublishResponseData = {
      successful: allSuccessful,
      failed: allFailed,
      publishReport: publishReport.join('\n')
    };

    if (media.length > 0) {
      responseData.mediaProcessing = {
        totalFiles: media.length,
        processedFiles: mediaFiles.length,
        errors: mediaProcessingErrors.map(error => ({ message: error }))
      };
    }

    if (allFailed.length === allSuccessful.length + allFailed.length && allFailed.length > 0) {
      addReport(`Total failure - all posts failed`);
      return await returnAndCreateReport({
        userId,
        publishReport,
        contentToStore,
        allSuccessful,
        allFailed,
        responseData,
        status: 500,
        message: 'All posts failed to publish.',
      });
    }

    if (allFailed.length > 0) {
      addReport(`Partial success - some posts failed`);
      return await returnAndCreateReport({
        userId,
        publishReport,
        contentToStore,
        allSuccessful,
        allFailed,
        responseData,
        status: 207,
        message: 'Some posts were published successfully, but others failed.',
      });
    }

    addReport(`All posts published successfully`);
    return await returnAndCreateReport({
      userId,
      publishReport,
      contentToStore,
      allSuccessful,
      allFailed,
      responseData,
      status: 200,
      message: 'All posts published successfully.',
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    addReport(`ERROR: Request processing failed. Error: ${errorMessage}`);
    return await returnAndCreateReport({
      userId: req.headers.get('x-user-id') || 'unknown',
      publishReport,
      contentToStore: '',
      status: 500,
      error: errorMessage,
    });
  }
}
