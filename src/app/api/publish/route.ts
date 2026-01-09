import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { validateUserId, validateTextContent, validateAccountArrays, parsePublishRequest } from '@/lib/publish/validators/requestValidator';
import { processMediaFiles, validateMediaMix } from '@/lib/publish/validators/mediaValidator';
import { fetchAllTokens, validateMissingAccounts, formatMissingAccounts, hasMissingAccounts } from '@/lib/publish/services/tokenService';
import { createReportLogger, buildAndSaveResponse, buildErrorResponse } from '@/lib/publish/services/reportService';
import { executePublish } from '@/lib/publish/orchestrator';

const logger = createLogger('PublishAPI');

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 11);
  const reportLogger = createReportLogger();

  reportLogger.add(`Starting new publish request [${requestId}]`);

  // 1. Validate user ID
  const userId = validateUserId(req.headers);
  if (!userId) {
    reportLogger.add(`ERROR: User ID not found in headers`);
    return NextResponse.json({ error: 'User ID not found in headers' }, { status: 401 });
  }

  reportLogger.add(`Processing request for user: ${userId}`);

  try {
    // 2. Parse request
    const formData = await req.formData();
    const parseResult = await parsePublishRequest(formData);

    if (!parseResult.success || !parseResult.data) {
      return buildErrorResponse(reportLogger.getReport(), 400, parseResult.error || 'Failed to parse request');
    }

    const { text, facebookPages, xAccounts, mediaFiles: rawMediaFiles } = parseResult.data;
    reportLogger.add(`Request payload parsed. Text length: ${text?.length || 0}, Facebook pages: ${facebookPages?.length || 0}, X accounts: ${xAccounts?.length || 0}, Media files: ${rawMediaFiles?.length || 0}`);

    // 3. Process media files
    const mediaResult = await processMediaFiles(rawMediaFiles, reportLogger);

    // Check for mixed media types
    if (mediaResult.files.length > 0) {
      const mixCheck = validateMediaMix(mediaResult.files);
      if (mixCheck.mixed) {
        reportLogger.add(`Error: Mixed media types detected. Images: ${mixCheck.imageCount}, Videos: ${mixCheck.videoCount}`);
        return await buildAndSaveResponse({
          pool,
          userId,
          report: reportLogger.getReport(),
          contentToStore: text + (mediaResult.files.length > 0 ? ` [${mediaResult.files.length} media files attached]` : ''),
          successful: [],
          failed: [],
          status: 400,
          error: 'We do not support mixing images and videos in a single post. Please upload either only images or only videos.'
        });
      }
    }

    // 4. Validate text content
    const textValidation = validateTextContent(text, mediaResult.files.length > 0, facebookPages.length > 0 || xAccounts.length > 0);
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
        mediaProcessing: rawMediaFiles.length > 0 ? {
          totalFiles: rawMediaFiles.length,
          processedFiles: mediaResult.files.length,
          errors: mediaResult.errors.map(error => ({ message: error }))
        } : undefined
      });
    }

    // 5. Validate account arrays
    const accountValidation = validateAccountArrays(facebookPages, xAccounts);
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

    // 6. Check if all media failed
    if (mediaResult.allFailed && rawMediaFiles.length > 0) {
      reportLogger.add(`ERROR: All media files failed processing`);
      return await buildAndSaveResponse({
        pool,
        userId,
        report: reportLogger.getReport(),
        contentToStore: text,
        successful: [],
        failed: [],
        status: 400,
        error: 'All media files failed processing. Please check file types and sizes.',
        mediaProcessing: {
          totalFiles: rawMediaFiles.length,
          processedFiles: 0,
          errors: mediaResult.errors.map(error => ({ message: error }))
        }
      });
    }

    // 7. Fetch tokens
    const { facebookTokens, twitterTokens } = await fetchAllTokens(pool, userId, facebookPages, xAccounts, reportLogger);

    // 8. Validate missing accounts
    const missing = validateMissingAccounts(facebookPages, xAccounts, facebookTokens, twitterTokens);
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
      facebookTokens,
      twitterTokens,
      reportLogger
    });

    const { successful, failed } = publishResult;
    const contentToStore = text + (mediaResult.files.length > 0 ? ` [${mediaResult.files.length} media files attached]` : '');

    // 10. Build response based on results
    const mediaProcessing = rawMediaFiles.length > 0 ? {
      totalFiles: rawMediaFiles.length,
      processedFiles: mediaResult.files.length,
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
      userId: req.headers.get('x-user-id') || 'unknown',
      report: reportLogger.getReport(),
      contentToStore: '',
      successful: [],
      failed: [],
      status: 500,
      error: errorMessage
    });
  }
}
