import type { Pool } from 'pg';
import { executePublish } from '@/lib/publish/orchestrator';
import { processCloudinaryMedia } from '@/lib/publish/validators/mediaValidator';
import { fetchAllTokens } from '@/lib/publish/services/tokenService';
import {
  createReportLogger,
  extractPublishDestinations,
  type PublishDestination,
} from '@/lib/publish/services/reportService';
import type { CloudinaryMediaInfo, PublishStatus } from '@/lib/publish/types';

/** Identifies one destination of a history entry. */
export interface DestinationKey {
  platform: PublishDestination['platform'];
  account_id: string;
  post_type?: 'feed' | 'story';
}

export type RetryOutcome =
  | {
      ok: true;
      publish_status: PublishStatus;
      publish_destinations: PublishDestination[];
      retried: number;
      succeeded: number;
    }
  | { ok: false; status: 400 | 404 | 409; error: string };

// Advisory-lock namespace for retries, so a lock on history id N cannot collide
// with other advisory locks keyed on the same number.
const RETRY_LOCK_NAMESPACE = 7311;

export const sameDestination = (a: DestinationKey, b: DestinationKey): boolean =>
  a.platform === b.platform && a.account_id === b.account_id && (a.post_type ?? null) === (b.post_type ?? null);

export function overallStatus(destinations: PublishDestination[]): PublishStatus {
  const succeeded = destinations.filter((d) => d.success).length;
  if (succeeded === destinations.length) return 'success';
  return succeeded > 0 ? 'partial_success' : 'failed';
}

/**
 * Publishes a history entry again to its failed destinations (all of them, or the
 * requested subset) and records the outcome on the same entry: destination
 * results, overall status, and the retry's report appended to the existing one.
 * One retry per entry runs at a time.
 */
export async function retryFailedDestinations(
  pool: Pool,
  userId: string,
  historyId: number,
  requested?: DestinationKey[]
): Promise<RetryOutcome> {
  const client = await pool.connect();
  let isLocked = false;
  try {
    const lock = await client.query('SELECT pg_try_advisory_lock($1, $2) AS locked', [RETRY_LOCK_NAMESPACE, historyId]);
    isLocked = lock.rows[0].locked;
    if (!isLocked) {
      return { ok: false, status: 409, error: 'A retry for this post is already running.' };
    }

    const { rows } = await client.query(
      `SELECT post_text, media, publish_destinations
       FROM publish_history WHERE id = $1 AND user_id = $2`,
      [historyId, parseInt(userId, 10)]
    );
    if (rows.length === 0) {
      return { ok: false, status: 404, error: 'History entry not found.' };
    }
    const entry = rows[0] as {
      post_text: string | null;
      media: CloudinaryMediaInfo[] | null;
      publish_destinations: PublishDestination[] | null;
    };
    if (entry.post_text === null) {
      return { ok: false, status: 409, error: 'This entry has no stored post to publish again.' };
    }

    const destinations = entry.publish_destinations ?? [];
    const targets = destinations.filter(
      (d) => !d.success && (!requested || requested.some((r) => sameDestination(r, d)))
    );
    if (targets.length === 0) {
      return { ok: false, status: 400, error: 'No failed destinations to retry.' };
    }

    const media = entry.media ?? [];
    const reportLogger = createReportLogger();
    reportLogger.add(`Retrying ${targets.length} failed destination(s)`);

    const accountsOf = (platform: DestinationKey['platform'], postType?: 'feed' | 'story') =>
      targets
        .filter((d) => d.platform === platform && (postType === undefined || (d.post_type ?? 'feed') === postType))
        .map((d) => d.account_id);
    const facebookPages = accountsOf('facebook');
    const xAccounts = accountsOf('twitter');
    const instagramFeed = accountsOf('instagram', 'feed');
    const instagramStory = accountsOf('instagram', 'story');
    const telegramChannels = accountsOf('telegram');

    // Facebook and X upload the files themselves; the other platforms take the URLs.
    const needsDownload = facebookPages.length > 0 || xAccounts.length > 0;
    const mediaResult = needsDownload && media.length > 0
      ? await processCloudinaryMedia(media, reportLogger)
      : { files: [] };

    const tokens = await fetchAllTokens(
      pool, userId, facebookPages, xAccounts, instagramFeed, instagramStory, telegramChannels, reportLogger
    );
    const { successful, failed } = await executePublish({
      pool,
      text: entry.post_text,
      mediaFiles: mediaResult.files,
      cloudinaryMedia: media,
      ...tokens,
      reportLogger,
    });

    // A target without a connected account produces no result; it stays failed.
    const results = extractPublishDestinations(successful, failed);
    const merged = destinations.map((d) => {
      if (!targets.some((t) => sameDestination(t, d))) return d;
      const result = results.find((r) => sameDestination(r, d));
      return result
        ? { ...d, success: result.success, error: result.error }
        : { ...d, success: false, error: 'Account is not connected' };
    });
    const status = overallStatus(merged);
    const succeeded = merged.filter((d) => d.success).length - destinations.filter((d) => d.success).length;
    reportLogger.add(`Retry finished: ${succeeded} of ${targets.length} succeeded`);

    await client.query(
      `UPDATE publish_history
       SET publish_destinations = $1,
           publish_status = $2,
           publish_report = COALESCE(publish_report || E'\\n\\n', '') || $3
       WHERE id = $4`,
      [JSON.stringify(merged), status, `--- Retry ---\n${reportLogger.getReport().join('\n')}`, historyId]
    );

    return { ok: true, publish_status: status, publish_destinations: merged, retried: targets.length, succeeded };
  } finally {
    if (isLocked) await client.query('SELECT pg_advisory_unlock($1, $2)', [RETRY_LOCK_NAMESPACE, historyId]);
    client.release();
  }
}
