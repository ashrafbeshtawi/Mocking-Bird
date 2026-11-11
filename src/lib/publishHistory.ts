import pool from '@/lib/db';
import { ALL_ACCOUNTS, buildGrantCoverageSql, type McpAccountAccess } from '@/lib/mcpAccess';

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
  /**
   * lastDays: only entries published within the last N days (rolling, from now).
   * accountAccess: only entries with at least one destination these grants cover.
   */
  options: { lastDays?: number; accountAccess?: McpAccountAccess; limit?: number; offset?: number } = {}
): Promise<PublishHistoryPage> {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const offset = Math.max(options.offset ?? 0, 0);

  const lastDays = options.lastDays ?? null;
  const accountAccess = options.accountAccess ?? null;

  const where = `user_id = $1 AND ($2::int IS NULL OR created_at >= NOW() - make_interval(days => $2::int))
    AND ($3::text[] IS NULL OR $3::text[] @> ARRAY['${ALL_ACCOUNTS}'] OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(publish_destinations, '[]'::jsonb)) destination
      WHERE ${buildGrantCoverageSql('destination', '$3::text[]')}))`;
  const [countResult, pageResult] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM publish_history WHERE ${where}`, [userId, lastDays, accountAccess]),
    pool.query(
      `SELECT id, content, publish_status, publish_destinations, created_at
       FROM publish_history
       WHERE ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $4 OFFSET $5`,
      [userId, lastDays, accountAccess, limit, offset]
    ),
  ]);

  return {
    entries: pageResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
    limit,
    offset,
  };
}
