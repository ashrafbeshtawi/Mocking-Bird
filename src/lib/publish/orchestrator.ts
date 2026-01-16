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
  accountId?: string;
  current: number;
  total: number;
}

export interface AccountProgress {
  accountId: string;
  accountName: string;
  platform: string;
  status: 'pending' | 'publishing' | 'completed' | 'failed';
  error?: string;
}

export type ProgressCallback = (progress: ProgressUpdate) => void | Promise<void>;
export type AccountProgressCallback = (accounts: AccountProgress[]) => void | Promise<void>;

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
  onAccountProgress?: AccountProgressCallback;
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
 * Executes publishing with progress updates (parallel publishing with per-account status)
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
    onProgress,
    onAccountProgress
  } = options;

  const totalAccounts = facebookTokens.length + twitterTokens.length +
    instagramFeedTokens.length + instagramStoryTokens.length + telegramTokens.length;

  const allSuccessful: SuccessfulPublishResult[] = [];
  const allFailed: FailedPublishResult[] = [];

  // Build account progress tracking
  const accountsProgress: AccountProgress[] = [];

  facebookTokens.forEach(token => {
    accountsProgress.push({
      accountId: token.page_id,
      accountName: token.page_name,
      platform: 'Facebook',
      status: 'pending'
    });
  });

  twitterTokens.forEach(token => {
    accountsProgress.push({
      accountId: token.x_user_id,
      accountName: token.username,
      platform: 'X',
      status: 'pending'
    });
  });

  instagramFeedTokens.forEach(token => {
    accountsProgress.push({
      accountId: `${token.instagram_account_id}-feed`,
      accountName: token.username,
      platform: 'Instagram',
      status: 'pending'
    });
  });

  instagramStoryTokens.forEach(token => {
    accountsProgress.push({
      accountId: `${token.instagram_account_id}-story`,
      accountName: token.username,
      platform: 'Instagram Story',
      status: 'pending'
    });
  });

  telegramTokens.forEach(token => {
    accountsProgress.push({
      accountId: token.channel_id,
      accountName: token.channel_title,
      platform: 'Telegram',
      status: 'pending'
    });
  });

  // Track completed count for progress updates
  let completedCount = 0;

  const updateAccountStatus = async (accountId: string, status: AccountProgress['status'], error?: string) => {
    const account = accountsProgress.find(a => a.accountId === accountId);
    if (account) {
      account.status = status;
      if (error) account.error = error;

      if (status === 'completed' || status === 'failed') {
        completedCount++;
      }

      // Emit account progress
      if (onAccountProgress) {
        await onAccountProgress([...accountsProgress]);
      }

      // Emit overall progress (only for starting/completed/failed, not pending)
      if (onProgress && status !== 'pending') {
        const action = status === 'publishing' ? 'starting' : status;
        await onProgress({
          platform: account.platform,
          action,
          accountName: account.accountName,
          accountId: account.accountId,
          current: completedCount,
          total: totalAccounts
        });
      }
    }
  };

  // Send initial account list
  if (onAccountProgress) {
    await onAccountProgress([...accountsProgress]);
  }

  const facebookPublisher = new FacebookPublisher(pool);
  const twitterPublisher = new TwitterPublisherV1(pool);
  const instagramPublisher = new InstagramPublisher(pool);
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

  // Create all publish promises (parallel execution)
  const publishPromises: Promise<void>[] = [];

  // Facebook publishing (parallel)
  for (const token of facebookTokens) {
    publishPromises.push((async () => {
      await updateAccountStatus(token.page_id, 'publishing');

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
          await updateAccountStatus(token.page_id, 'completed');
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
          await updateAccountStatus(token.page_id, 'failed', result.failed[0]?.error?.message);
        }
      } catch (err) {
        reportLogger.add(`Error publishing to Facebook ${token.page_name}: ${(err as Error).message}`);
        await updateAccountStatus(token.page_id, 'failed', (err as Error).message);
      }
    })());
  }

  // Twitter publishing (parallel)
  for (const token of twitterTokens) {
    publishPromises.push((async () => {
      await updateAccountStatus(token.x_user_id, 'publishing');

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
          await updateAccountStatus(token.x_user_id, 'completed');
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
          await updateAccountStatus(token.x_user_id, 'failed', result.failed[0]?.error?.message);
        }
      } catch (err) {
        reportLogger.add(`Error publishing to X ${token.username}: ${(err as Error).message}`);
        await updateAccountStatus(token.x_user_id, 'failed', (err as Error).message);
      }
    })());
  }

  // Instagram feed publishing (parallel)
  for (const token of instagramFeedTokens) {
    const accountId = `${token.instagram_account_id}-feed`;
    publishPromises.push((async () => {
      await updateAccountStatus(accountId, 'publishing');

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
          await updateAccountStatus(accountId, 'completed');
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
          await updateAccountStatus(accountId, 'failed', result.failed[0]?.error?.message);
        }
      } catch (err) {
        reportLogger.add(`Error publishing to Instagram feed ${token.username}: ${(err as Error).message}`);
        await updateAccountStatus(accountId, 'failed', (err as Error).message);
      }
    })());
  }

  // Instagram story publishing (parallel)
  for (const token of instagramStoryTokens) {
    const accountId = `${token.instagram_account_id}-story`;
    publishPromises.push((async () => {
      await updateAccountStatus(accountId, 'publishing');

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
          await updateAccountStatus(accountId, 'completed');
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
          await updateAccountStatus(accountId, 'failed', result.failed[0]?.error?.message);
        }
      } catch (err) {
        reportLogger.add(`Error publishing to Instagram story ${token.username}: ${(err as Error).message}`);
        await updateAccountStatus(accountId, 'failed', (err as Error).message);
      }
    })());
  }

  // Telegram publishing (parallel)
  if (telegramPublisher) {
    for (const token of telegramTokens) {
      publishPromises.push((async () => {
        await updateAccountStatus(token.channel_id, 'publishing');

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
            await updateAccountStatus(token.channel_id, 'completed');
          }
          if (result.failed.length > 0) {
            const mapped = mapTelegramFailed(
              result.failed.map(item => ({
                ...item,
                platform: 'telegram' as const
              }))
            );
            allFailed.push(...mapped);
            await updateAccountStatus(token.channel_id, 'failed', result.failed[0]?.error?.message);
          }
        } catch (err) {
          reportLogger.add(`Error publishing to Telegram channel ${token.channel_title}: ${(err as Error).message}`);
          await updateAccountStatus(token.channel_id, 'failed', (err as Error).message);
        }
      })());
    }
  }

  // Wait for all publishing to complete in parallel
  await Promise.all(publishPromises);

  reportLogger.add(`Publishing complete. Successful posts: ${allSuccessful.length}, Failed posts: ${allFailed.length}`);

  if (allFailed.length > 0) {
    reportLogger.add(`Failed posts details: ${formatFailedDetails(allFailed)}`);
  }

  return { successful: allSuccessful, failed: allFailed };
}
