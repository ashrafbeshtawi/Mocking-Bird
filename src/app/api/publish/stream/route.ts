import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { validateUserId, validateTextContent, validateAccountArrays, parsePublishRequest } from '@/lib/publish/validators/requestValidator';
import { processCloudinaryMedia, validateMediaMix } from '@/lib/publish/validators/mediaValidator';
import { fetchAllTokens, validateMissingAccounts, formatMissingAccounts, hasMissingAccounts } from '@/lib/publish/services/tokenService';
import { createReportLogger, savePublishReport, determinePublishStatus } from '@/lib/publish/services/reportService';
import { executePublishWithProgress, type ProgressCallback, type AccountProgressCallback, type AccountProgress } from '@/lib/publish/orchestrator';
import { cleanupCloudinaryMedia } from '@/lib/services/cloudinaryService';

const logger = createLogger('PublishStreamAPI');

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 11);
  const reportLogger = createReportLogger();

  // Validate user ID first
  const userId = validateUserId(req.headers);
  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'User ID not found in headers' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  reportLogger.add(`Starting new streaming publish request [${requestId}]`);

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Helper to send SSE events
  const sendEvent = async (event: string, data: unknown) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(message));
  };

  // Step tracking for progress bar
  const STEPS = {
    VALIDATING: { index: 1, total: 5, message: 'Validating request...' },
    PREPARING_MEDIA: { index: 2, total: 5, message: 'Preparing media...' },
    AUTHENTICATING: { index: 3, total: 5, message: 'Verifying account access...' },
    PUBLISHING: { index: 4, total: 5, message: 'Publishing your post...' },
    FINALIZING: { index: 5, total: 5, message: 'Finalizing...' },
  };

  // Start processing in the background
  (async () => {
    try {
      await sendEvent('status', {
        step: 'validating',
        message: STEPS.VALIDATING.message,
        stepIndex: STEPS.VALIDATING.index,
        totalSteps: STEPS.VALIDATING.total
      });

      // Parse request
      const body = await req.json();
      const parseResult = await parsePublishRequest(body);

      if (!parseResult.success || !parseResult.data) {
        await sendEvent('error', { message: parseResult.error || 'Failed to parse request' });
        await writer.close();
        return;
      }

      const { text, facebookPages, xAccounts, instagramPublishAccounts, instagramStoryAccounts, telegramChannels, cloudinaryMedia } = parseResult.data;
      reportLogger.add(`Request payload parsed`);

      // Check for mixed media types
      if (cloudinaryMedia.length > 0) {
        const mixCheck = validateMediaMix(cloudinaryMedia);
        if (mixCheck.mixed) {
          await sendEvent('error', {
            message: 'Cannot mix images and videos in a single post'
          });
          await writer.close();
          return;
        }
      }

      // Validate text content
      const hasAnyAccount = facebookPages.length > 0 || xAccounts.length > 0 || instagramPublishAccounts.length > 0 || instagramStoryAccounts.length > 0 || telegramChannels.length > 0;
      const textValidation = validateTextContent(text, cloudinaryMedia.length > 0, hasAnyAccount);
      if (!textValidation.success) {
        await sendEvent('error', { message: textValidation.error });
        await writer.close();
        return;
      }

      // Validate account arrays
      const accountValidation = validateAccountArrays(facebookPages, xAccounts, instagramPublishAccounts, instagramStoryAccounts, telegramChannels);
      if (!accountValidation.success) {
        await sendEvent('error', { message: accountValidation.error });
        await writer.close();
        return;
      }

      await sendEvent('status', {
        step: 'preparing',
        message: STEPS.PREPARING_MEDIA.message,
        stepIndex: STEPS.PREPARING_MEDIA.index,
        totalSteps: STEPS.PREPARING_MEDIA.total
      });

      // Process Cloudinary media (download for Facebook/Twitter)
      const needsDownload = facebookPages.length > 0 || xAccounts.length > 0;
      const mediaResult = needsDownload
        ? await processCloudinaryMedia(cloudinaryMedia, reportLogger)
        : { files: [], errors: [], totalFiles: cloudinaryMedia.length, allFailed: false };

      if (needsDownload && mediaResult.allFailed && cloudinaryMedia.length > 0) {
        await sendEvent('error', { message: 'Failed to process media files' });
        await writer.close();
        return;
      }

      await sendEvent('status', {
        step: 'authenticating',
        message: STEPS.AUTHENTICATING.message,
        stepIndex: STEPS.AUTHENTICATING.index,
        totalSteps: STEPS.AUTHENTICATING.total
      });

      // Fetch tokens
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

      // Validate missing accounts
      const allInstagramAccountIds = [...new Set([...instagramPublishAccounts, ...instagramStoryAccounts])];
      const allInstagramTokens = [...instagramFeedTokens, ...instagramStoryTokens].filter(
        (token, index, self) => index === self.findIndex(t => t.instagram_account_id === token.instagram_account_id)
      );
      const missing = validateMissingAccounts(facebookPages, xAccounts, allInstagramAccountIds, telegramChannels, facebookTokens, twitterTokens, allInstagramTokens, telegramTokens);
      if (hasMissingAccounts(missing)) {
        const missingAccounts = formatMissingAccounts(missing);
        await sendEvent('error', {
          message: 'Some selected accounts could not be found',
          details: missingAccounts
        });
        await writer.close();
        return;
      }

      // Progress callback to send status updates
      const onProgress: ProgressCallback = async (progress) => {
        await sendEvent('progress', progress);
      };

      // Account progress callback to send per-account status
      const onAccountProgress: AccountProgressCallback = async (accounts: AccountProgress[]) => {
        await sendEvent('account_progress', accounts);
      };

      await sendEvent('status', {
        step: 'publishing',
        message: STEPS.PUBLISHING.message,
        stepIndex: STEPS.PUBLISHING.index,
        totalSteps: STEPS.PUBLISHING.total
      });

      // Execute publishing with progress updates
      const publishResult = await executePublishWithProgress({
        pool,
        text: text.trim(),
        mediaFiles: mediaResult.files,
        cloudinaryMedia,
        facebookTokens,
        twitterTokens,
        instagramFeedTokens,
        instagramStoryTokens,
        telegramTokens,
        reportLogger,
        onProgress,
        onAccountProgress
      });

      const { successful, failed } = publishResult;
      const contentToStore = text + (cloudinaryMedia.length > 0 ? ` [${cloudinaryMedia.length} media files attached]` : '');

      await sendEvent('status', {
        step: 'finalizing',
        message: STEPS.FINALIZING.message,
        stepIndex: STEPS.FINALIZING.index,
        totalSteps: STEPS.FINALIZING.total
      });

      // Clean up Cloudinary media after publishing completes
      // By this point, all platforms have already fetched the media:
      // - Instagram: container created and processed (waits for FINISHED status)
      // - Facebook/Twitter: media uploaded during publish call
      // - Telegram: URL sent and processed by Telegram servers
      if (cloudinaryMedia.length > 0 && successful.length > 0) {
        try {
          await cleanupCloudinaryMedia(cloudinaryMedia);
        } catch (err) {
          // Log but don't fail the publish - media will be cleaned up eventually
          logger.error('Failed to cleanup Cloudinary media', err);
        }
      }

      // Save to history
      const publishStatus = determinePublishStatus(successful, failed);
      await savePublishReport(pool, userId, contentToStore, reportLogger.getReport(), publishStatus);

      // Send final result
      await sendEvent('complete', {
        status: publishStatus,
        message: failed.length === 0
          ? 'All posts published successfully!'
          : (successful.length === 0
            ? 'All posts failed to publish'
            : 'Some posts were published successfully'),
        successful,
        failed
      });

      reportLogger.add(`Publishing complete. Successful: ${successful.length}, Failed: ${failed.length}`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      logger.error('Streaming publish error', err);
      await sendEvent('error', { message: errorMessage });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
