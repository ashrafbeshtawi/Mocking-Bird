import pool from '@/lib/db';
import { PLATFORMS, type Platform, type TargetAccount } from '@/types/accounts';

export interface DraftMedia {
  publicUrl: string;
  publicId?: string;
  resourceType?: 'image' | 'video';
  format?: string;
  width?: number;
  height?: number;
  originalFilename?: string;
}

export interface Draft {
  id: number;
  text: string;
  /** The accounts the draft is meant to be published to. */
  target_accounts: TargetAccount[];
  /** The platforms of target_accounts, in PLATFORMS order. */
  target_platforms: Platform[];
  media: DraftMedia[] | null;
  created_at: string;
  updated_at: string;
}

export interface DraftInput {
  text: string;
  target_accounts?: TargetAccount[];
  media?: DraftMedia[] | null;
}

const DRAFT_COLUMNS = 'id, text, target_accounts, media, created_at, updated_at';

export const platformsOf = (targets: TargetAccount[]): Platform[] =>
  PLATFORMS.filter((platform) => targets.some((target) => target.platform === platform));

const toDraft = (row: Omit<Draft, 'target_platforms'>): Draft => ({
  ...row,
  target_platforms: platformsOf(row.target_accounts),
});

/** The targets without duplicates, as stored. */
const targetsJson = (targets: TargetAccount[]): string =>
  JSON.stringify(
    targets.filter(
      (target, index) =>
        targets.findIndex((t) => t.platform === target.platform && t.account_id === target.account_id) === index
    )
  );

/**
 * Validate an untrusted draft payload. Returns an error message, or null if valid.
 */
export function validateDraftInput(input: Record<string, unknown>): string | null {
  const { text, target_accounts: targets, media } = input;

  if (typeof text !== 'string') {
    return 'Text is required.';
  }
  if (targets !== undefined) {
    if (
      !Array.isArray(targets) ||
      targets.some(
        (t) =>
          !PLATFORMS.includes((t as TargetAccount)?.platform) ||
          typeof (t as TargetAccount).account_id !== 'string' ||
          !(t as TargetAccount).account_id
      )
    ) {
      return `target_accounts must be an array of { platform, account_id } with platform one of: ${PLATFORMS.join(', ')}.`;
    }
  }
  if (media !== undefined && media !== null) {
    if (
      !Array.isArray(media) ||
      media.some((m) => typeof (m as DraftMedia)?.publicUrl !== 'string' || !(m as DraftMedia).publicUrl)
    ) {
      return 'media must be an array of objects with a publicUrl string.';
    }
  }
  if (!text.trim() && (!Array.isArray(media) || media.length === 0)) {
    return 'A draft needs text or at least one media item.';
  }
  return null;
}

export async function getDraft(userId: number, id: number): Promise<Draft | null> {
  const { rows } = await pool.query(
    `SELECT ${DRAFT_COLUMNS} FROM drafts WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rows[0] ? toDraft(rows[0]) : null;
}

export interface ListDraftsOptions {
  /** Case-insensitive substring match on the draft text. */
  query?: string;
  /** Only drafts that target an account on this platform. */
  platform?: Platform;
  /** Only drafts updated within the last N days (rolling, from now). */
  lastDays?: number;
  limit?: number;
  offset?: number;
}

export interface DraftPage {
  drafts: Draft[];
  total: number;
  limit: number;
  offset: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const escapeLike = (s: string): string => s.replace(/[\\%_]/g, (m) => `\\${m}`);

export async function listDrafts(
  userId: number,
  options: ListDraftsOptions = {}
): Promise<DraftPage> {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const offset = Math.max(options.offset ?? 0, 0);
  const pattern = options.query?.trim() ? `%${escapeLike(options.query.trim())}%` : null;

  const platform = options.platform ?? null;
  const lastDays = options.lastDays ?? null;

  const where = `user_id = $1 AND ($2::text IS NULL OR text ILIKE $2)
    AND ($3::text IS NULL OR target_accounts @> jsonb_build_array(jsonb_build_object('platform', $3::text)))
    AND ($4::int IS NULL OR updated_at >= NOW() - make_interval(days => $4::int))`;
  const [countResult, pageResult] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM drafts WHERE ${where}`, [userId, pattern, platform, lastDays]),
    pool.query(
      `SELECT ${DRAFT_COLUMNS} FROM drafts WHERE ${where}
       ORDER BY updated_at DESC, id DESC
       LIMIT $5 OFFSET $6`,
      [userId, pattern, platform, lastDays, limit, offset]
    ),
  ]);

  return {
    drafts: pageResult.rows.map(toDraft),
    total: parseInt(countResult.rows[0].count, 10),
    limit,
    offset,
  };
}

export async function createDraft(userId: number, input: DraftInput): Promise<Draft> {
  const { text, target_accounts = [], media = null } = input;
  const { rows } = await pool.query(
    `INSERT INTO drafts (user_id, text, target_accounts, media)
     VALUES ($1, $2, $3, $4)
     RETURNING ${DRAFT_COLUMNS}`,
    [userId, text, targetsJson(target_accounts), media === null ? null : JSON.stringify(media)]
  );
  return toDraft(rows[0]);
}

/** Full update of a draft. Returns the updated draft, or null if not found / not owned. */
export async function updateDraft(userId: number, id: number, input: DraftInput): Promise<Draft | null> {
  const { text, target_accounts = [], media = null } = input;
  const { rows } = await pool.query(
    `UPDATE drafts
     SET text = $1, target_accounts = $2, media = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $4 AND user_id = $5
     RETURNING ${DRAFT_COLUMNS}`,
    [text, targetsJson(target_accounts), media === null ? null : JSON.stringify(media), id, userId]
  );
  return rows[0] ? toDraft(rows[0]) : null;
}

/** Returns true if a draft was deleted, false if not found / not owned. */
export async function deleteDraft(userId: number, id: number): Promise<boolean> {
  return (await deleteDrafts(userId, [id])) > 0;
}

/** Deletes the given drafts of this user; ids of other users' drafts are ignored. Returns the count deleted. */
export async function deleteDrafts(userId: number, ids: number[]): Promise<number> {
  const result = await pool.query('DELETE FROM drafts WHERE id = ANY($1::int[]) AND user_id = $2', [ids, userId]);
  return result.rowCount ?? 0;
}
