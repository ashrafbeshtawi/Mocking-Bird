import { Pool } from 'pg';
import { SuccessfulPublishResult, FailedPublishResult, MediaFile } from '@/types/interfaces';
import { FacebookPublisher, FacebookPageToken } from '@/lib/publishers/facebook';
import { TwitterPublisherV1, TwitterAccountTokenV1 } from '@/lib/publishers/twitterv1.1';
import { InstagramPublisher, InstagramAccountToken } from '@/lib/publishers/instagram';
import { ReportLogger, CloudinaryMediaInfo } from './types';
import {
  mapFacebookSuccess,
  mapFacebookFailed,
  mapTwitterSuccess,
  mapTwitterFailed,
  mapInstagramSuccess,
  mapInstagramFailed,
  formatFailedDetails
} from './mappers/resultMappers';

export interface ExecutePublishOptions {
  pool: Pool;
  text: string;
  mediaFiles: MediaFile[];
  cloudinaryMedia: CloudinaryMediaInfo[];
  facebookTokens: FacebookPageToken[];
  twitterTokens: TwitterAccountTokenV1[];
  instagramFeedTokens: InstagramAccountToken[];
  instagramStoryTokens: InstagramAccountToken[];
  reportLogger: ReportLogger;
}

export interface ExecutePublishResult {
  successful: SuccessfulPublishResult[];
  failed: FailedPublishResult[];
}

/**
 * Executes publishing to all platforms in parallel
 */
export async function executePublish(
  options: ExecutePublishOptions
): Promise<ExecutePublishResult> {
  const {
    pool,
    text,
    mediaFiles,
    cloudinaryMedia,
    facebookTokens,
    twitterTokens,
    instagramFeedTokens,
    instagramStoryTokens,
    reportLogger
  } = options;

  reportLogger.add(
    `Starting publishing process to ${facebookTokens.length} Facebook pages, ` +
    `${twitterTokens.length} X accounts, ${instagramFeedTokens.length} Instagram feed accounts, ` +
    `${instagramStoryTokens.length} Instagram story accounts`
  );

  const facebookPublisher = new FacebookPublisher(pool);
  const twitterPublisher = new TwitterPublisherV1(pool);
  const instagramPublisher = new InstagramPublisher(pool);

  // Facebook and Twitter use downloaded media files (buffers)
  const facebookOptions = {
    text: text.trim() || undefined,
    files: mediaFiles.length > 0 ? mediaFiles : undefined
  };

  // Instagram uses Cloudinary URLs directly (no need to download)
  const instagramOptions = {
    text: text.trim() || undefined,
    cloudinaryMedia: cloudinaryMedia.length > 0 ? cloudinaryMedia : undefined
  };

  const publishPromises: Promise<{ successful: SuccessfulPublishResult[]; failed: FailedPublishResult[] }>[] = [];

  // Facebook publishing
  if (facebookTokens.length > 0) {
    publishPromises.push(
      facebookPublisher.publishToPages(facebookOptions, facebookTokens).then(res => ({
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

  // Twitter publishing
  if (twitterTokens.length > 0) {
    publishPromises.push(
      twitterPublisher.publishToAccounts(text, twitterTokens, mediaFiles).then(res => ({
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
                  message: item.error.message,
                  code: item.error.code,
                  details: (() => {
                    if (item.error && item.error.details) {
                      const twitterDetails = item.error.details as { errors?: { message?: string; code?: number }[] };
                      return twitterDetails.errors && twitterDetails.errors.length > 0
                        ? { errors: twitterDetails.errors }
                        : undefined;
                    }
                    return undefined;
                  })()
                }
              : undefined
          }))
        )
      }))
    );
  } else {
    publishPromises.push(Promise.resolve({ successful: [], failed: [] }));
  }

  // Instagram feed publishing (uses Cloudinary URLs directly)
  if (instagramFeedTokens.length > 0) {
    publishPromises.push(
      instagramPublisher.publishToFeed(instagramOptions, instagramFeedTokens).then(res => ({
        successful: mapInstagramSuccess(
          res.successful.map(item => ({
            ...item,
            result: item.result as { id?: string }
          }))
        ),
        failed: mapInstagramFailed(
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

  // Instagram story publishing (uses Cloudinary URLs directly)
  if (instagramStoryTokens.length > 0) {
    publishPromises.push(
      instagramPublisher.publishToStories(instagramOptions, instagramStoryTokens).then(res => ({
        successful: mapInstagramSuccess(
          res.successful.map(item => ({
            ...item,
            result: item.result as { id?: string }
          }))
        ),
        failed: mapInstagramFailed(
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

  const [fbResults, xResults, igFeedResults, igStoryResults] = await Promise.all(publishPromises);

  const allSuccessful = [
    ...fbResults.successful,
    ...xResults.successful,
    ...igFeedResults.successful,
    ...igStoryResults.successful
  ];
  const allFailed = [
    ...fbResults.failed,
    ...xResults.failed,
    ...igFeedResults.failed,
    ...igStoryResults.failed
  ];

  reportLogger.add(`Publishing complete. Successful posts: ${allSuccessful.length}, Failed posts: ${allFailed.length}`);

  if (allFailed.length > 0) {
    reportLogger.add(`Failed posts details: ${formatFailedDetails(allFailed)}`);
  }

  return { successful: allSuccessful, failed: allFailed };
}
