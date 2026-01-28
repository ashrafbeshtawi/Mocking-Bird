import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { validateTextContent, validateAccountArrays, parsePublishRequest } from '@/lib/publish/validators/requestValidator';
import { processCloudinaryMedia, validateMediaMix } from '@/lib/publish/validators/mediaValidator';
import { fetchAllTokens, validateMissingAccounts, formatMissingAccounts, hasMissingAccounts } from '@/lib/publish/services/tokenService';
import { createReportLogger, buildAndSaveResponse, buildErrorResponse } from '@/lib/publish/services/reportService';
import { executePublish } from '@/lib/publish/orchestrator';
import { getAuthUserId } from '@/lib/api-auth';

const logger = createLogger('PublishAPI');

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(2, 11);
  const reportLogger = createReportLogger();

  reportLogger.add(`Starting new publish request [${requestId}]`);

  // 1. Validate user ID
  const userId = await getAuthUserId();
  if (!userId) {
    reportLogger.add(`ERROR: User ID not found in session`);
    return NextResponse.json({ error: 'User ID not found in session' }, { status: 401 });
  }

  reportLogger.add(`Processing request for user: ${userId}`);

  try {
    // 2. Parse request (JSON body)
    const body = await req.json();
    const parseResult = await parsePublishRequest(body);

    if (!parseResult.success || !parseResult.data) {
      return buildErrorResponse(reportLogger.getReport(), 400, parseResult.error || 'Failed to parse request');
    }

    const { text, facebookPages, xAccounts, instagramPublishAccounts, instagramStoryAccounts, telegramChannels, cloudinaryMedia } = parseResult.data;
    reportLogger.add(`Request payload parsed. Text length: ${text?.length || 0}, Facebook pages: ${facebookPages?.length || 0}, X accounts: ${xAccounts?.length || 0}, Instagram feed: ${instagramPublishAccounts?.length || 0}, Instagram stories: ${instagramStoryAccounts?.length || 0}, Telegram channels: ${telegramChannels?.length || 0}, Cloudinary media: ${cloudinaryMedia?.length || 0}`);

    // 3. Check for mixed media types
    if (cloudinaryMedia.length > 0) {
      const mixCheck = validateMediaMix(cloudinaryMedia);
      if (mixCheck.mixed) {
        reportLogger.add(`Error: Mixed media types detected. Images: ${mixCheck.imageCount}, Videos: ${mixCheck.videoCount}`);
        return await buildAndSaveResponse({
          pool,
          userId,
          report: reportLogger.getReport(),
          contentToStore: text + (cloudinaryMedia.length > 0 ? ` [${cloudinaryMedia.length} media files attached]` : ''),
          successful: [],
          failed: [],
          status: 400,
          error: 'We do not support mixing images and videos in a single post. Please upload either only images or only videos.'
        });
      }
    }

    // 4. Validate text content
    const hasAnyAccount = facebookPages.length > 0 || xAccounts.length > 0 || instagramPublishAccounts.length > 0 || instagramStoryAccounts.length > 0 || telegramChannels.length > 0;
    const textValidation = validateTextContent(text, cloudinaryMedia.length > 0, hasAnyAccount);
    if (!textValidation.success) {
      reportLogger.add(`WARN: Invalid text input and no media files. Text: ${text?.substring(0, 100)}`);
      return await buildAndSaveResponse({
        pool,
        userId,
        report: reportLogger.getReport(),
        contentToStore: text,
        successful: [],
        failed: [],
        status: 400,
        error: textValidation.error,
        mediaProcessing: cloudinaryMedia.length > 0 ? {
          totalFiles: cloudinaryMedia.length,
          processedFiles: 0,
          errors: []
        } : undefined
      });
    }

    // 5. Validate account arrays
    const accountValidation = validateAccountArrays(facebookPages, xAccounts, instagramPublishAccounts, instagramStoryAccounts, telegramChannels);
    if (!accountValidation.success) {
      reportLogger.add(`WARN: ${accountValidation.error}`);
      return await buildAndSaveResponse({
        pool,
        userId,
        report: reportLogger.getReport(),
        contentToStore: text,
        successful: [],
        failed: [],
        status: 400,
        error: accountValidation.error
      });
    }

    // 6. Process Cloudinary media (download for Facebook/Twitter)
    // We only need to download if we have Facebook or Twitter accounts (Telegram and Instagram use Cloudinary URLs directly)
    const needsDownload = facebookPages.length > 0 || xAccounts.length > 0;
    const mediaResult = needsDownload
      ? await processCloudinaryMedia(cloudinaryMedia, reportLogger)
      : { files: [], errors: [], totalFiles: cloudinaryMedia.length, allFailed: false };

    // Check if all media failed (only for Facebook/Twitter)
    if (needsDownload && mediaResult.allFailed && cloudinaryMedia.length > 0) {
      reportLogger.add(`ERROR: All media files failed processing`);
      return await buildAndSaveResponse({
        pool,
        userId,
        report: reportLogger.getReport(),
        contentToStore: text,
        successful: [],
        failed: [],
        status: 400,
        error: 'All media files failed processing. Please try uploading again.',
        mediaProcessing: {
          totalFiles: cloudinaryMedia.length,
          processedFiles: 0,
          errors: mediaResult.errors.map(error => ({ message: error }))
        }
      });
    }

    // 7. Fetch tokens
    const { facebookTokens, twitterTokens, instagramFeedTokens, instagramStoryTokens, telegramTokens } = await fetchAllTokens(
      pool,
      userId,
      facebookPages,
      xAccounts,
      instagramPublishAccounts,
      instagramStoryAccounts,
      telegramChannels,
      reportLogger
    );

    // 8. Validate missing accounts
    const allInstagramAccountIds = [...new Set([...instagramPublishAccounts, ...instagramStoryAccounts])];
    const allInstagramTokens = [...instagramFeedTokens, ...instagramStoryTokens].filter(
      (token, index, self) => index === self.findIndex(t => t.instagram_account_id === token.instagram_account_id)
    );
    const missing = validateMissingAccounts(facebookPages, xAccounts, allInstagramAccountIds, telegramChannels, facebookTokens, twitterTokens, allInstagramTokens, telegramTokens);
    if (hasMissingAccounts(missing)) {
      const missingAccounts = formatMissingAccounts(missing);
      reportLogger.add(`ERROR: Missing accounts detected. Details: ${missingAccounts.join(', ')}`);
      return await buildAndSaveResponse({
        pool,
        userId,
        report: reportLogger.getReport(),
        contentToStore: text,
        successful: [],
        failed: [],
        status: 404,
        error: 'One or more selected accounts could not be found for the user.',
        details: missingAccounts
      });
    }

    // 9. Execute publishing
    const publishResult = await executePublish({
      pool,
      text: text.trim(),
      mediaFiles: mediaResult.files,
      cloudinaryMedia, // Pass Cloudinary info for Instagram and Telegram
      facebookTokens,
      twitterTokens,
      instagramFeedTokens,
      instagramStoryTokens,
      telegramTokens,
      reportLogger
    });

    const { successful, failed } = publishResult;
    const contentToStore = text + (cloudinaryMedia.length > 0 ? ` [${cloudinaryMedia.length} media files attached]` : '');

    // 10. Build response based on results
    const mediaProcessing = cloudinaryMedia.length > 0 ? {
      totalFiles: cloudinaryMedia.length,
      processedFiles: needsDownload ? mediaResult.files.length : cloudinaryMedia.length,
      errors: mediaResult.errors.map(error => ({ message: error }))
    } : undefined;

    if (failed.length === successful.length + failed.length && failed.length > 0) {
      reportLogger.add(`Total failure - all posts failed`);
      return await buildAndSaveResponse({
        pool,
        userId,
        report: reportLogger.getReport(),
        contentToStore,
        successful,
        failed,
        status: 500,
        message: 'All posts failed to publish.',
        mediaProcessing
      });
    }

    if (failed.length > 0) {
      reportLogger.add(`Partial success - some posts failed`);
      return await buildAndSaveResponse({
        pool,
        userId,
        report: reportLogger.getReport(),
        contentToStore,
        successful,
        failed,
        status: 207,
        message: 'Some posts were published successfully, but others failed.',
        mediaProcessing
      });
    }

    reportLogger.add(`All posts published successfully`);
    return await buildAndSaveResponse({
      pool,
      userId,
      report: reportLogger.getReport(),
      contentToStore,
      successful,
      failed,
      status: 200,
      message: 'All posts published successfully.',
      mediaProcessing
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    reportLogger.add(`ERROR: Request processing failed. Error: ${errorMessage}`);
    logger.error(`Request processing failed`, err);
    return await buildAndSaveResponse({
      pool,
      userId: userId || 'unknown',
      report: reportLogger.getReport(),
      contentToStore: '',
      successful: [],
      failed: [],
      status: 500,
      error: errorMessage
    });
  }
}
