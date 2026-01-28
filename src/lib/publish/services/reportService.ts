import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import {
  SuccessfulPublishResult,
  FailedPublishResult,
  PublishResponseData,
  ApiResponse,
  MediaProcessing
} from '@/types/interfaces';
import { PublishStatus, ReportLogger } from '../types';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ReportService');

/**
 * Represents a publish destination for storage
 */
export interface PublishDestination {
  platform: 'facebook' | 'twitter' | 'instagram' | 'telegram';
  account_id: string;
  account_name?: string;
  post_type?: 'feed' | 'story';
  success: boolean;
}

/**
 * Normalizes platform name to standard format
 */
function normalizePlatform(platform: string): PublishDestination['platform'] {
  const normalized = platform.toLowerCase();
  if (normalized === 'x' || normalized === 'twitter') {
    return 'twitter';
  }
  if (normalized === 'facebook' || normalized === 'instagram' || normalized === 'telegram') {
    return normalized as PublishDestination['platform'];
  }
  // Default fallback - log unknown platforms
  logger.warn(`Unknown platform: ${platform}`);
  return 'facebook'; // fallback, shouldn't happen
}

/**
 * Extracts account ID from a publish result based on platform
 */
function extractAccountId(result: SuccessfulPublishResult | FailedPublishResult): string {
  // Try all possible account ID fields
  return (
    result.page_id ||
    result.account_id ||
    result.instagram_account_id ||
    result.telegram_channel_id ||
    ''
  );
}

/**
 * Extracts publish destinations from successful and failed results
 */
export function extractPublishDestinations(
  successful: SuccessfulPublishResult[],
  failed: FailedPublishResult[]
): PublishDestination[] {
  const destinations: PublishDestination[] = [];

  logger.info(`Extracting destinations from ${successful.length} successful and ${failed.length} failed results`);

  // Process successful results
  for (const result of successful) {
    const platform = normalizePlatform(result.platform);
    const accountId = extractAccountId(result);

    logger.info(`Processing successful result: platform=${result.platform}, normalized=${platform}, accountId=${accountId}`);

    if (accountId) {
      const destination: PublishDestination = {
        platform,
        account_id: accountId,
        success: true
      };

      // Add post_type for Instagram
      if (platform === 'instagram' && result.post_type) {
        destination.post_type = result.post_type;
      }

      destinations.push(destination);
    }
  }

  // Process failed results
  for (const result of failed) {
    const platform = normalizePlatform(result.platform);
    const accountId = extractAccountId(result);

    logger.info(`Processing failed result: platform=${result.platform}, normalized=${platform}, accountId=${accountId}`);

    if (accountId) {
      const destination: PublishDestination = {
        platform,
        account_id: accountId,
        success: false
      };

      // Add post_type for Instagram
      if (platform === 'instagram' && result.post_type) {
        destination.post_type = result.post_type;
      }

      destinations.push(destination);
    }
  }

  logger.info(`Extracted ${destinations.length} destinations: ${JSON.stringify(destinations)}`);

  return destinations;
}

/**
 * Creates a report logger that accumulates messages
 */
export function createReportLogger(): ReportLogger {
  const report: string[] = [];

  return {
    add: (message: string) => {
      report.push(`[${new Date().toISOString()}] ${message}`);
      logger.info(message);
    },
    getReport: () => report
  };
}

/**
 * Determines the overall publish status
 */
export function determinePublishStatus(
  successful: SuccessfulPublishResult[],
  failed: FailedPublishResult[]
): PublishStatus {
  if (successful.length > 0 && failed.length === 0) {
    return 'success';
  } else if (successful.length > 0 && failed.length > 0) {
    return 'partial_success';
  } else {
    return 'failed';
  }
}

/**
 * Saves the publish report to the database
 */
export async function savePublishReport(
  pool: Pool,
  userId: string,
  content: string,
  report: string[],
  status: PublishStatus,
  destinations: PublishDestination[] = []
): Promise<void> {
  const client = await pool.connect();
  try {
    report.push(`Saving publish result to database with ${destinations.length} destinations`);
    logger.info(`Saving publish report: userId=${userId}, status=${status}, destinations=${JSON.stringify(destinations)}`);

    await client.query(
      'INSERT INTO publish_history (user_id, content, publish_report, publish_status, publish_destinations) VALUES ($1, $2, $3, $4, $5)',
      [
        parseInt(userId),
        content,
        report.join('\n'),
        status,
        JSON.stringify(destinations)
      ]
    );

    report.push(`Publish result saved to database successfully`);
  } catch (dbError) {
    const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
    report.push(`ERROR: Failed to save publish result to database. Error: ${errorMessage}`);
    logger.error(`Failed to save publish result to database.`, dbError);
  } finally {
    client.release();
  }
}

export interface BuildResponseOptions {
  pool: Pool;
  userId: string;
  report: string[];
  contentToStore: string;
  successful: SuccessfulPublishResult[];
  failed: FailedPublishResult[];
  status: number;
  message?: string;
  error?: string;
  details?: string[];
  mediaProcessing?: MediaProcessing;
}

/**
 * Builds the API response and saves the report
 */
export async function buildAndSaveResponse(
  options: BuildResponseOptions
): Promise<NextResponse> {
  const {
    pool,
    userId,
    report,
    contentToStore,
    successful,
    failed,
    status,
    message,
    error,
    details,
    mediaProcessing
  } = options;

  const publishStatus = determinePublishStatus(successful, failed);
  report.push(`Overall publish status: ${publishStatus}`);

  // Log successful and failed arrays for debugging
  logger.info(`buildAndSaveResponse: successful=${JSON.stringify(successful)}`);
  logger.info(`buildAndSaveResponse: failed=${JSON.stringify(failed)}`);

  // Extract destinations from successful and failed results
  const destinations = extractPublishDestinations(successful, failed);

  await savePublishReport(pool, userId, contentToStore, report, publishStatus, destinations);

  const responseData: PublishResponseData = {
    successful,
    failed,
    publishReport: report.join('\n')
  };

  if (mediaProcessing) {
    responseData.mediaProcessing = mediaProcessing;
  }

  const responseBody: ApiResponse = {
    ...responseData,
    results: successful
  };

  if (message) {
    responseBody.message = message;
  }
  if (error) {
    responseBody.error = error;
  }
  if (details) {
    responseBody.details = details;
  }

  return NextResponse.json(responseBody, { status });
}

/**
 * Builds an error response without saving to database
 */
export function buildErrorResponse(
  report: string[],
  status: number,
  error: string,
  mediaProcessing?: MediaProcessing
): NextResponse {
  const responseBody: ApiResponse = {
    publishReport: report.join('\n'),
    error,
    successful: [],
    failed: []
  };

  if (mediaProcessing) {
    responseBody.mediaProcessing = mediaProcessing;
  }

  return NextResponse.json(responseBody, { status });
}
