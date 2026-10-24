import pool from '@/lib/db';
import { PLATFORMS, type Platform, type TargetAccount } from '@/types/accounts';
import { youtubeTitleError } from '@/lib/youtube';
import { TIKTOK_PRIVACY_LEVELS, tiktokSettingsError, type TikTokPostSettings } from '@/lib/tiktok';
import type { MediaThumbnail } from '@/lib/publish/types';

export interface DraftMedia {
  publicUrl: string;
  publicId?: string;
  resourceType?: 'image' | 'video';
  format?: string;
  width?: number;
  height?: number;
  originalFilename?: string;
  /** Videos only: the custom thumbnail. */
  thumbnail?: MediaThumbnail;
}

/** Whether an untrusted media item's thumbnail is absent or well-formed. */
const isValidThumbnail = (thumbnail: unknown): boolean => {
  if (thumbnail === undefined) return true;
  const t = thumbnail as Partial<MediaThumbnail> | null;
  return typeof t?.publicId === 'string' && typeof t.publicUrl === 'string' && t.publicUrl !== '';
};

export interface Draft {
  id: number;
  text: string;
  /** The accounts the draft is meant to be published to. */
  target_accounts: TargetAccount[];
  /** The platforms of target_accounts, in PLATFORMS order. */
  target_platforms: Platform[];
  media: DraftMedia[] | null;
  /** Title for YouTube uploads; empty uses the video's file name. */
  youtube_title: string;
  /** TikTok settings suggested for the post; the user still makes every choice when publishing. */
  tiktok_settings: TikTokPostSettings | null;
  created_at: string;
  updated_at: string;
}

export interface DraftInput {
  text: string;
  target_accounts?: TargetAccount[];
  media?: DraftMedia[] | null;
  youtube_title?: string;
  /** Omitted keeps the stored suggestion; null removes it. */
  tiktok_settings?: TikTokPostSettings | null;
}

const DRAFT_COLUMNS = `d.id, d.text, d.target_accounts, d.media, d.youtube_title,
  CASE WHEN t.draft_id IS NULL THEN NULL ELSE json_build_object(
    'privacyLevel', t.privacy_level, 'allowComment', t.allow_comment, 'allowDuet', t.allow_duet,
    'allowStitch', t.allow_stitch, 'isYourBrand', t.is_your_brand, 'isBrandedContent', t.is_branded_content
  ) END AS tiktok_settings,
  d.created_at, d.updated_at`;
const DRAFT_FROM = 'drafts d LEFT JOIN drafts_tiktok t ON t.draft_id = d.id';

export const getPlatformsOf = (targets: TargetAccount[]): Platform[] =>
  PLATFORMS.filter((platform) => targets.some((target) => target.platform === platform));

const mapRowToDraft = (row: Omit<Draft, 'target_platforms'>): Draft => ({
  ...row,
  target_platforms: getPlatformsOf(row.target_accounts),
});

/** The targets without duplicates, as stored. */
const serializeTargets = (targets: TargetAccount[]): string =>
  JSON.stringify(
    targets.filter(
      (target, index) =>
        targets.findIndex((t) => t.platform === target.platform && t.account_id === target.account_id) === index
    )
  );

const TIKTOK_FLAGS = ['allowComment', 'allowDuet', 'allowStitch', 'isYourBrand', 'isBrandedContent'] as const;

/** Why untrusted TikTok settings cannot be stored, or null when they can. */
function tiktokSettingsInputError(value: unknown): string | null {
  const settings = value as Record<string, unknown>;
  if (
    typeof value !== 'object' || value === null ||
    !(TIKTOK_PRIVACY_LEVELS as readonly unknown[]).includes(settings.privacyLevel) ||
    TIKTOK_FLAGS.some((flag) => typeof settings[flag] !== 'boolean')
  ) {
    return `tiktok_settings needs privacyLevel (one of: ${TIKTOK_PRIVACY_LEVELS.join(', ')}) and the booleans ${TIKTOK_FLAGS.join(', ')}.`;
  }
  return tiktokSettingsError(value as TikTokPostSettings);
}

/**
 * Validate an untrusted draft payload. Returns an error message, or null if valid.
 */
export function validateDraftInput(input: Record<string, unknown>): string | null {
  const { text, target_accounts: targets, media, youtube_title: youtubeTitle, tiktok_settings: tiktokSettings } = input;

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
    if (media.some((m) => !isValidThumbnail((m as DraftMedia).thumbnail))) {
      return 'A media thumbnail must be an object with publicId and publicUrl strings.';
    }
  }
  if (youtubeTitle !== undefined) {
    if (typeof youtubeTitle !== 'string') return 'youtube_title must be a string.';
    const titleError = youtubeTitleError(youtubeTitle.trim());
    if (titleError) return titleError;
  }
  if (tiktokSettings !== undefined && tiktokSettings !== null) {
    const settingsError = tiktokSettingsInputError(tiktokSettings);
    if (settingsError) return settingsError;
  }
  if (!text.trim() && (!Array.isArray(media) || media.length === 0)) {
    return 'A draft needs text or at least one media item.';
  }
  return null;
}

export async function getDraft(userId: number, id: number): Promise<Draft | null> {
  const { rows } = await pool.query(
    `SELECT ${DRAFT_COLUMNS} FROM ${DRAFT_FROM} WHERE d.id = $1 AND d.user_id = $2`,
    [id, userId]
  );
  return rows[0] ? mapRowToDraft(rows[0]) : null;
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

  const where = `d.user_id = $1 AND ($2::text IS NULL OR d.text ILIKE $2)
    AND ($3::text IS NULL OR d.target_accounts @> jsonb_build_array(jsonb_build_object('platform', $3::text)))
    AND ($4::int IS NULL OR d.updated_at >= NOW() - make_interval(days => $4::int))`;
  const [countResult, pageResult] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM drafts d WHERE ${where}`, [userId, pattern, platform, lastDays]),
    pool.query(
      `SELECT ${DRAFT_COLUMNS} FROM ${DRAFT_FROM} WHERE ${where}
       ORDER BY d.updated_at DESC, d.id DESC
       LIMIT $5 OFFSET $6`,
      [userId, pattern, platform, lastDays, limit, offset]
    ),
  ]);

  return {
    drafts: pageResult.rows.map(mapRowToDraft),
    total: parseInt(countResult.rows[0].count, 10),
    limit,
    offset,
  };
}

export async function createDraft(userId: number, input: DraftInput): Promise<Draft> {
  return (await writeDraft(userId, input)) as Draft;
}

/** Full update of a draft. Returns the updated draft, or null if not found / not owned. */
export async function updateDraft(userId: number, id: number, input: DraftInput): Promise<Draft | null> {
  return writeDraft(userId, input, id);
}

/** Inserts the draft (no id) or updates it, together with its TikTok suggestion, in one transaction. */
async function writeDraft(userId: number, input: DraftInput, id?: number): Promise<Draft | null> {
  const { text, target_accounts = [], media = null, youtube_title = '', tiktok_settings } = input;
  const values = [text, serializeTargets(target_accounts), media === null ? null : JSON.stringify(media), youtube_title.trim()];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = id === undefined
      ? await client.query(
          `INSERT INTO drafts (text, target_accounts, media, youtube_title, user_id)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [...values, userId]
        )
      : await client.query(
          `UPDATE drafts
           SET text = $1, target_accounts = $2, media = $3, youtube_title = $4, updated_at = CURRENT_TIMESTAMP
           WHERE id = $5 AND user_id = $6
           RETURNING id`,
          [...values, id, userId]
        );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const draftId = rows[0].id;

    if (tiktok_settings !== undefined) {
      await client.query('DELETE FROM drafts_tiktok WHERE draft_id = $1', [draftId]);
      if (tiktok_settings) {
        const t = tiktok_settings;
        await client.query(
          `INSERT INTO drafts_tiktok
             (draft_id, privacy_level, allow_comment, allow_duet, allow_stitch, is_your_brand, is_branded_content)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [draftId, t.privacyLevel, t.allowComment, t.allowDuet, t.allowStitch, t.isYourBrand, t.isBrandedContent]
        );
      }
    }

    const draft = await client.query(`SELECT ${DRAFT_COLUMNS} FROM ${DRAFT_FROM} WHERE d.id = $1`, [draftId]);
    await client.query('COMMIT');
    return mapRowToDraft(draft.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
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
