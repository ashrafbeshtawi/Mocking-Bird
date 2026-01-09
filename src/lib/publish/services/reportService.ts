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
  status: PublishStatus
): Promise<void> {
  const client = await pool.connect();
  try {
    report.push(`Saving publish result to database`);

    await client.query(
      'INSERT INTO publish_history (user_id, content, publish_report, publish_status) VALUES ($1, $2, $3, $4)',
      [
        parseInt(userId),
        content,
        report.join('\n'),
        status
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

  await savePublishReport(pool, userId, contentToStore, report, publishStatus);

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
