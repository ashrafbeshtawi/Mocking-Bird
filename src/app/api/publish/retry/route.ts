import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';
import { retryFailedDestinations, type DestinationKey } from '@/lib/publish/services/retryService';

const logger = createLogger('PublishRetryAPI');

const PLATFORMS = ['facebook', 'twitter', 'instagram', 'telegram', 'linkedin'];

const isDestinationKey = (value: unknown): value is DestinationKey => {
  const d = value as DestinationKey;
  return (
    typeof d === 'object' && d !== null &&
    PLATFORMS.includes(d.platform) &&
    typeof d.account_id === 'string' && d.account_id !== '' &&
    (d.post_type === undefined || d.post_type === 'feed' || d.post_type === 'story')
  );
};

/**
 * POST /api/publish/retry
 * Body: { historyId: number, destinations?: DestinationKey[] }
 * Publishes the entry again to its failed destinations (all, or the given ones).
 */
export async function POST(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const historyId = body?.historyId;
  const destinations = body?.destinations;
  if (!Number.isInteger(historyId) || historyId <= 0) {
    return NextResponse.json({ error: 'historyId must be a positive integer.' }, { status: 400 });
  }
  if (destinations !== undefined && (!Array.isArray(destinations) || destinations.length === 0 || !destinations.every(isDestinationKey))) {
    return NextResponse.json({ error: 'destinations must be a non-empty array of { platform, account_id, post_type? }.' }, { status: 400 });
  }

  try {
    const outcome = await retryFailedDestinations(pool, userId, historyId, destinations);
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }
    return NextResponse.json({ success: true, ...outcome });
  } catch (error) {
    logger.error('Retry failed', error);
    return NextResponse.json({ error: 'Retry failed.' }, { status: 500 });
  }
}
