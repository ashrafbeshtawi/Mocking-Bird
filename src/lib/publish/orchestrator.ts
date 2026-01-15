import { Pool } from 'pg';
import { SuccessfulPublishResult, FailedPublishResult, MediaFile } from '@/types/interfaces';
import { FacebookPublisher, FacebookPageToken } from '@/lib/publishers/facebook';
import { TwitterPublisherV1, TwitterAccountTokenV1 } from '@/lib/publishers/twitterv1.1';
import { InstagramPublisher, InstagramAccountToken } from '@/lib/publishers/instagram';
import { TelegramPublisher, TelegramChannelToken } from '@/lib/publishers/telegram';
import { ReportLogger, CloudinaryMediaInfo } from './types';
import {
  mapFacebookSuccess,
  mapFacebookFailed,
  mapTwitterSuccess,
  mapTwitterFailed,
  mapInstagramSuccess,
  mapInstagramFailed,
  mapTelegramSuccess,
  mapTelegramFailed,
  formatFailedDetails
} from './mappers/resultMappers';

export interface ProgressUpdate {
  platform: string;
  action: 'starting' | 'completed' | 'failed';
  accountName?: string;
  current: number;
  total: number;
}

export type ProgressCallback = (progress: ProgressUpdate) => void | Promise<void>;

export interface ExecutePublishOptions {
  pool: Pool;
  text: string;
  mediaFiles: MediaFile[];
  cloudinaryMedia: CloudinaryMediaInfo[];
  facebookTokens: FacebookPageToken[];
  twitterTokens: TwitterAccountTokenV1[];
  instagramFeedTokens: InstagramAccountToken[];
  instagramStoryTokens: InstagramAccountToken[];
  telegramTokens: TelegramChannelToken[];
  reportLogger: ReportLogger;
  onProgress?: ProgressCallback;
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
    telegramTokens,
    reportLogger
  } = options;

  reportLogger.add(
    `Starting publishing process to ${facebookTokens.length} Facebook pages, ` +
    `${twitterTokens.length} X accounts, ${instagramFeedTokens.length} Instagram feed accounts, ` +
    `${instagramStoryTokens.length} Instagram story accounts, ${telegramTokens.length} Telegram channels`
  );

  const facebookPublisher = new FacebookPublisher(pool);
  const twitterPublisher = new TwitterPublisherV1(pool);
  const instagramPublisher = new InstagramPublisher(pool);

  // Only create Telegram publisher if bot token is configured
  const telegramPublisher = process.env.TELEGRAM_BOT_TOKEN
    ? new TelegramPublisher(pool)
    : null;

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

  // Telegram publishing (uses Cloudinary URLs directly)
  if (telegramTokens.length > 0 && telegramPublisher) {
    const telegramOptions = {
      text: text.trim() || '',
      cloudinaryMedia: cloudinaryMedia.length > 0 ? cloudinaryMedia : undefined
    };
    publishPromises.push(
      telegramPublisher.publishToChannels(telegramOptions, telegramTokens).then(res => ({
        successful: mapTelegramSuccess(
          res.successful.map(item => ({
            ...item,
            platform: 'telegram' as const
          }))
        ),
        failed: mapTelegramFailed(
          res.failed.map(item => ({
            ...item,
            platform: 'telegram' as const
          }))
        )
      }))
    );
  } else {
    publishPromises.push(Promise.resolve({ successful: [], failed: [] }));
  }

  const [fbResults, xResults, igFeedResults, igStoryResults, telegramResults] = await Promise.all(publishPromises);

  const allSuccessful = [
    ...fbResults.successful,
    ...xResults.successful,
    ...igFeedResults.successful,
    ...igStoryResults.successful,
    ...telegramResults.successful
  ];
  const allFailed = [
    ...fbResults.failed,
    ...xResults.failed,
    ...igFeedResults.failed,
    ...igStoryResults.failed,
    ...telegramResults.failed
  ];

  reportLogger.add(`Publishing complete. Successful posts: ${allSuccessful.length}, Failed posts: ${allFailed.length}`);

  if (allFailed.length > 0) {
    reportLogger.add(`Failed posts details: ${formatFailedDetails(allFailed)}`);
  }

  return { successful: allSuccessful, failed: allFailed };
}

/**
 * Executes publishing with progress updates (sequential for streaming feedback)
 */
export async function executePublishWithProgress(
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
    telegramTokens,
    reportLogger,
    onProgress
  } = options;

  const totalAccounts = facebookTokens.length + twitterTokens.length +
    instagramFeedTokens.length + instagramStoryTokens.length + telegramTokens.length;
  let currentIndex = 0;

  const allSuccessful: SuccessfulPublishResult[] = [];
  const allFailed: FailedPublishResult[] = [];

  const facebookPublisher = new FacebookPublisher(pool);
  const twitterPublisher = new TwitterPublisherV1(pool);
  const instagramPublisher = new InstagramPublisher(pool);

  // Only create Telegram publisher if bot token is configured
  const telegramPublisher = process.env.TELEGRAM_BOT_TOKEN
    ? new TelegramPublisher(pool)
    : null;

  const facebookOptions = {
    text: text.trim() || undefined,
    files: mediaFiles.length > 0 ? mediaFiles : undefined
  };

  const instagramOptions = {
    text: text.trim() || undefined,
    cloudinaryMedia: cloudinaryMedia.length > 0 ? cloudinaryMedia : undefined
  };

  const telegramOptions = {
    text: text.trim() || '',
    cloudinaryMedia: cloudinaryMedia.length > 0 ? cloudinaryMedia : undefined
  };

  // Facebook publishing (sequential for progress)
  for (const token of facebookTokens) {
    currentIndex++;
    if (onProgress) {
      await onProgress({
        platform: 'Facebook',
        action: 'starting',
        accountName: token.page_name,
        current: currentIndex,
        total: totalAccounts
      });
    }

    try {
      const result = await facebookPublisher.publishToPages(facebookOptions, [token]);
      if (result.successful.length > 0) {
        const mapped = mapFacebookSuccess(
          result.successful.map(item => ({
            ...item,
            result: item.result as { id?: string }
          }))
        );
        allSuccessful.push(...mapped);
        if (onProgress) {
          await onProgress({
            platform: 'Facebook',
            action: 'completed',
            accountName: token.page_name,
            current: currentIndex,
            total: totalAccounts
          });
        }
      }
      if (result.failed.length > 0) {
        const mapped = mapFacebookFailed(
          result.failed.map(item => ({
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
        );
        allFailed.push(...mapped);
        if (onProgress) {
          await onProgress({
            platform: 'Facebook',
            action: 'failed',
            accountName: token.page_name,
            current: currentIndex,
            total: totalAccounts
          });
        }
      }
    } catch (err) {
      reportLogger.add(`Error publishing to Facebook ${token.page_name}: ${(err as Error).message}`);
      if (onProgress) {
        await onProgress({
          platform: 'Facebook',
          action: 'failed',
          accountName: token.page_name,
          current: currentIndex,
          total: totalAccounts
        });
      }
    }
  }

  // Twitter publishing (sequential for progress)
  for (const token of twitterTokens) {
    currentIndex++;
    if (onProgress) {
      await onProgress({
        platform: 'X',
        action: 'starting',
        accountName: token.username,
        current: currentIndex,
        total: totalAccounts
      });
    }

    try {
      const result = await twitterPublisher.publishToAccounts(text, [token], mediaFiles);
      if (result.successful.length > 0) {
        const mapped = mapTwitterSuccess(
          result.successful.map(item => ({
            ...item,
            result: item.result as { data?: { id?: string } }
          }))
        );
        allSuccessful.push(...mapped);
        if (onProgress) {
          await onProgress({
            platform: 'X',
            action: 'completed',
            accountName: token.username,
            current: currentIndex,
            total: totalAccounts
          });
        }
      }
      if (result.failed.length > 0) {
        const mapped = mapTwitterFailed(
          result.failed.map(item => ({
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
        );
        allFailed.push(...mapped);
        if (onProgress) {
          await onProgress({
            platform: 'X',
            action: 'failed',
            accountName: token.username,
            current: currentIndex,
            total: totalAccounts
          });
        }
      }
    } catch (err) {
      reportLogger.add(`Error publishing to X ${token.username}: ${(err as Error).message}`);
      if (onProgress) {
        await onProgress({
          platform: 'X',
          action: 'failed',
          accountName: token.username,
          current: currentIndex,
          total: totalAccounts
        });
      }
    }
  }

  // Instagram feed publishing (sequential for progress)
  for (const token of instagramFeedTokens) {
    currentIndex++;
    if (onProgress) {
      await onProgress({
        platform: 'Instagram',
        action: 'starting',
        accountName: token.username,
        current: currentIndex,
        total: totalAccounts
      });
    }

    try {
      const result = await instagramPublisher.publishToFeed(instagramOptions, [token]);
      if (result.successful.length > 0) {
        const mapped = mapInstagramSuccess(
          result.successful.map(item => ({
            ...item,
            result: item.result as { id?: string }
          }))
        );
        allSuccessful.push(...mapped);
        if (onProgress) {
          await onProgress({
            platform: 'Instagram',
            action: 'completed',
            accountName: token.username,
            current: currentIndex,
            total: totalAccounts
          });
        }
      }
      if (result.failed.length > 0) {
        const mapped = mapInstagramFailed(
          result.failed.map(item => ({
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
        );
        allFailed.push(...mapped);
        if (onProgress) {
          await onProgress({
            platform: 'Instagram',
            action: 'failed',
            accountName: token.username,
            current: currentIndex,
            total: totalAccounts
          });
        }
      }
    } catch (err) {
      reportLogger.add(`Error publishing to Instagram feed ${token.username}: ${(err as Error).message}`);
      if (onProgress) {
        await onProgress({
          platform: 'Instagram',
          action: 'failed',
          accountName: token.username,
          current: currentIndex,
          total: totalAccounts
        });
      }
    }
  }

  // Instagram story publishing (sequential for progress)
  for (const token of instagramStoryTokens) {
    currentIndex++;
    if (onProgress) {
      await onProgress({
        platform: 'Instagram Story',
        action: 'starting',
        accountName: token.username,
        current: currentIndex,
        total: totalAccounts
      });
    }

    try {
      const result = await instagramPublisher.publishToStories(instagramOptions, [token]);
      if (result.successful.length > 0) {
        const mapped = mapInstagramSuccess(
          result.successful.map(item => ({
            ...item,
            result: item.result as { id?: string }
          }))
        );
        allSuccessful.push(...mapped);
        if (onProgress) {
          await onProgress({
            platform: 'Instagram Story',
            action: 'completed',
            accountName: token.username,
            current: currentIndex,
            total: totalAccounts
          });
        }
      }
      if (result.failed.length > 0) {
        const mapped = mapInstagramFailed(
          result.failed.map(item => ({
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
        );
        allFailed.push(...mapped);
        if (onProgress) {
          await onProgress({
            platform: 'Instagram Story',
            action: 'failed',
            accountName: token.username,
            current: currentIndex,
            total: totalAccounts
          });
        }
      }
    } catch (err) {
      reportLogger.add(`Error publishing to Instagram story ${token.username}: ${(err as Error).message}`);
      if (onProgress) {
        await onProgress({
          platform: 'Instagram Story',
          action: 'failed',
          accountName: token.username,
          current: currentIndex,
          total: totalAccounts
        });
      }
    }
  }

  // Telegram publishing (sequential for progress)
  if (telegramPublisher) {
    for (const token of telegramTokens) {
      currentIndex++;
      if (onProgress) {
        await onProgress({
          platform: 'Telegram',
          action: 'starting',
          accountName: token.channel_title,
          current: currentIndex,
          total: totalAccounts
        });
      }

      try {
        const result = await telegramPublisher.publishToChannels(telegramOptions, [token]);
        if (result.successful.length > 0) {
          const mapped = mapTelegramSuccess(
            result.successful.map(item => ({
              ...item,
              platform: 'telegram' as const
            }))
          );
          allSuccessful.push(...mapped);
          if (onProgress) {
            await onProgress({
              platform: 'Telegram',
              action: 'completed',
              accountName: token.channel_title,
              current: currentIndex,
              total: totalAccounts
            });
          }
        }
        if (result.failed.length > 0) {
          const mapped = mapTelegramFailed(
            result.failed.map(item => ({
              ...item,
              platform: 'telegram' as const
            }))
          );
          allFailed.push(...mapped);
          if (onProgress) {
            await onProgress({
              platform: 'Telegram',
              action: 'failed',
              accountName: token.channel_title,
              current: currentIndex,
              total: totalAccounts
            });
          }
        }
      } catch (err) {
        reportLogger.add(`Error publishing to Telegram channel ${token.channel_title}: ${(err as Error).message}`);
        if (onProgress) {
          await onProgress({
            platform: 'Telegram',
            action: 'failed',
            accountName: token.channel_title,
            current: currentIndex,
            total: totalAccounts
          });
        }
      }
    }
  }

  reportLogger.add(`Publishing complete. Successful posts: ${allSuccessful.length}, Failed posts: ${allFailed.length}`);

  if (allFailed.length > 0) {
    reportLogger.add(`Failed posts details: ${formatFailedDetails(allFailed)}`);
  }

  return { successful: allSuccessful, failed: allFailed };
}
