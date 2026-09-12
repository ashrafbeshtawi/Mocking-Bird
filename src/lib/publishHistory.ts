import pool from '@/lib/db';

export interface PublishHistoryEntry {
  id: number;
  content: string;
  publish_status: 'success' | 'partial_success' | 'failed';
  /** Destination objects: platform, account_id, account_name?, post_type?, success */
  publish_destinations: unknown[];
  created_at: string;
}

export interface PublishHistoryPage {
  entries: PublishHistoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Paginated publish history, newest first. Deliberately excludes the large
 * publish_report text column — fetch a single report via the history API if needed.
 */
export async function listPublishHistory(
  userId: number,
  options: { limit?: number; offset?: number } = {}
): Promise<PublishHistoryPage> {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const offset = Math.max(options.offset ?? 0, 0);

  const [countResult, pageResult] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM publish_history WHERE user_id = $1', [userId]),
    pool.query(
      `SELECT id, content, publish_status, publish_destinations, created_at
       FROM publish_history
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
  ]);

  return {
    entries: pageResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
    limit,
    offset,
  };
}
