import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';
import { ingestRemoteMedia } from '@/lib/services/cloudinaryService';
import { findMcpToken } from '@/lib/mcpTokens';
import { listPublishHistory } from '@/lib/publishHistory';
import { listConnectedAccounts } from '@/lib/connectedAccounts';
import { formatAccountGrant, hasAccountAccess, type McpAccountAccess } from '@/lib/mcpAccess';
import {
  createDraft,
  deleteDraft,
  getDraft,
  listDrafts,
  updateDraft,
  validateDraftInput,
  type Draft,
  type DraftMedia,
} from '@/lib/drafts';
import { INSTAGRAM_POST_TYPES, PLATFORMS, type InstagramPostType, type Platform, type TargetAccount } from '@/types/accounts';

const logger = createLogger('McpAPI');

const platformEnum = z.enum(PLATFORMS as [Platform, ...Platform[]]);
const mediaUrls = z
  .array(z.string())
  .optional()
  .describe('Optional list of media URLs to attach to the draft');
const targetAccounts = z
  .array(
    z.object({
      platform: platformEnum,
      account_id: z.string().min(1),
      post_types: z
        .array(z.enum(INSTAGRAM_POST_TYPES as [InstagramPostType, ...InstagramPostType[]]))
        .optional()
        .describe('Instagram only: feed, story or both; feed when omitted'),
    })
  )
  .optional()
  .describe('Accounts this draft is meant to be published to: { platform, account_id } from list_connected_accounts');

// External URLs can expire, so drafts must not reference them directly.
// Ingest them into Cloudinary (same store the UI uploads to) at write time.
const toMedia = async (urls?: string[]): Promise<DraftMedia[] | null> =>
  urls && urls.length > 0 ? ingestRemoteMedia(urls) : null;

const json = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
});

const fail = (message: string) => ({
  content: [{ type: 'text' as const, text: message }],
  isError: true,
});

interface TokenAuth {
  userId: number;
  accountAccess: McpAccountAccess;
}

/** The user and account access of the verified token (set by verifyToken below). */
const getTokenAuth = (extra: { http?: { authInfo?: { extra?: Record<string, unknown> } } }): TokenAuth => {
  const { userId, accountAccess } = extra.http?.authInfo?.extra ?? {};
  if (typeof userId !== 'number' || !Array.isArray(accountAccess)) {
    throw new Error('Unauthorized: no user bound to this token.');
  }
  return { userId, accountAccess };
};

const isVisible = (auth: TokenAuth, target: TargetAccount): boolean =>
  hasAccountAccess(auth.accountAccess, target.platform, target.account_id);

/** A token may see, edit and delete a draft only when it may use every account the draft targets. */
const canAccessDraft = (auth: TokenAuth, draft: Draft): boolean =>
  draft.target_accounts.every((target) => isVisible(auth, target));

const listAccessibleAccounts = async (auth: TokenAuth) =>
  (await listConnectedAccounts(auth.userId)).filter((account) =>
    hasAccountAccess(auth.accountAccess, account.platform, account.id)
  );

const isSameAccount = (a: TargetAccount, b: TargetAccount) => a.platform === b.platform && a.account_id === b.account_id;

/**
 * Error message naming the targets the token may not use or that are not connected; null if there are none.
 * Targets in currentTargets may stay on disconnected accounts.
 */
const checkTargets = async (
  auth: TokenAuth,
  targets: TargetAccount[],
  currentTargets: TargetAccount[] = []
): Promise<string | null> => {
  const newTargets = targets.filter((target) => !currentTargets.some((current) => isSameAccount(current, target)));
  if (newTargets.length === 0) return null;
  const accounts = await listAccessibleAccounts(auth);
  const denied = newTargets.filter(
    (target) => !accounts.some((account) => account.platform === target.platform && account.id === target.account_id)
  );
  return denied.length === 0
    ? null
    : `Not a connected account this token may use: ${denied
        .map((target) => formatAccountGrant(target.platform, target.account_id))
        .join(', ')}. See list_connected_accounts.`;
};

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'list_connected_accounts',
      {
        description:
          `List the connected social media accounts this token may use. Each has \`platform\` (${PLATFORMS.join(', ')}), \`id\` and \`name\`. Target a draft at one with \`{ platform, account_id: id }\` in \`target_accounts\`.`,
        inputSchema: z.object({}),
      },
      async (_args, extra) => {
        return json({ accounts: await listAccessibleAccounts(getTokenAuth(extra)) });
      }
    );

    const pageArgs = {
      limit: z.number().int().min(1).max(100).optional().describe('Page size, default 20, max 100'),
      offset: z.number().int().min(0).optional().describe('Number of items to skip'),
    };
    const lastDays = z
      .number()
      .int()
      .min(1)
      .max(3650)
      .optional()
      .describe('Only items from the last N days, counted back from now (e.g. 7 for the past week)');

    server.registerTool(
      'list_drafts',
      {
        description:
          'List saved post drafts whose target accounts this token may all use, most recently updated first. Each draft has `target_accounts`, `created_at` and `updated_at` (ISO 8601, UTC); `last_days` filters on `updated_at`. Paginated; the response includes `total`, so page with `offset` until you have them all.',
        inputSchema: z.object({ ...pageArgs, last_days: lastDays }),
      },
      async ({ limit, offset, last_days }, extra) => {
        const auth = getTokenAuth(extra);
        return json(await listDrafts(auth.userId, { limit, offset, lastDays: last_days, accountAccess: auth.accountAccess }));
      }
    );

    server.registerTool(
      'search_drafts',
      {
        description:
          'Search the drafts list_drafts returns by text (case-insensitive substring match), most recently updated first. `last_days` filters on `updated_at`. Paginated like list_drafts.',
        inputSchema: z.object({
          query: z.string().min(1).describe('Text to search for in the draft body'),
          ...pageArgs,
          last_days: lastDays,
        }),
      },
      async ({ query, limit, offset, last_days }, extra) => {
        const auth = getTokenAuth(extra);
        return json(
          await listDrafts(auth.userId, { query, limit, offset, lastDays: last_days, accountAccess: auth.accountAccess })
        );
      }
    );

    server.registerTool(
      'get_publish_history',
      {
        description:
          'Publish history (what was posted where and whether it succeeded), newest first. Each entry has `created_at` (ISO 8601, UTC), the time the publish completed; `last_days` filters on it. Paginated: limit default 20 / max 100, offset default 0; the response includes `total`. Per-account report texts are omitted for efficiency. Lists only entries published to at least one account this token may use, and `publish_destinations` lists only those accounts.',
        inputSchema: z.object({ ...pageArgs, last_days: lastDays }),
      },
      async ({ limit, offset, last_days }, extra) => {
        const auth = getTokenAuth(extra);
        const page = await listPublishHistory(auth.userId, {
          limit,
          offset,
          lastDays: last_days,
          accountAccess: auth.accountAccess,
        });
        return json({
          ...page,
          entries: page.entries.map((entry) => ({
            ...entry,
            publish_destinations: ((entry.publish_destinations ?? []) as TargetAccount[]).filter((destination) =>
              isVisible(auth, destination)
            ),
          })),
        });
      }
    );

    server.registerTool(
      'add_draft',
      {
        description: 'Save a new post draft. A draft needs text or at least one media URL.',
        inputSchema: z.object({
          text: z.string().describe('The post text'),
          target_accounts: targetAccounts,
          media: mediaUrls,
        }),
      },
      async ({ text, target_accounts, media }, extra) => {
        const auth = getTokenAuth(extra);
        // Validate before ingesting so bad input doesn't trigger uploads
        const validationError =
          validateDraftInput({
            text,
            target_accounts,
            media: media?.map((publicUrl) => ({ publicUrl })) ?? null,
          }) ?? (await checkTargets(auth, target_accounts ?? []));
        if (validationError) return fail(validationError);

        let storedMedia;
        try {
          storedMedia = await toMedia(media);
        } catch (error) {
          return fail((error as Error).message);
        }

        const draft = await createDraft(auth.userId, { text, target_accounts, media: storedMedia });
        return json({ draft });
      }
    );

    server.registerTool(
      'edit_draft',
      {
        description:
          'Edit an existing draft. Only the provided fields change; omitted fields keep their current value; `target_accounts` replaces all targets. Only drafts whose target accounts this token may all use can be edited.',
        inputSchema: z.object({
          id: z.number().int().describe('The draft id (from list_drafts)'),
          text: z.string().optional(),
          target_accounts: targetAccounts,
          media: mediaUrls,
        }),
      },
      async ({ id, text, target_accounts, media }, extra) => {
        const auth = getTokenAuth(extra);
        const existing = await getDraft(auth.userId, id);
        if (!existing || !canAccessDraft(auth, existing)) return fail(`Draft ${id} not found.`);

        const targets = target_accounts ?? existing.target_accounts;

        // Validate before ingesting so bad input doesn't trigger uploads
        const validationError =
          validateDraftInput({
            text: text ?? existing.text,
            target_accounts: targets,
            media:
              media !== undefined ? media.map((publicUrl) => ({ publicUrl })) : existing.media,
          }) ?? (await checkTargets(auth, targets, existing.target_accounts));
        if (validationError) return fail(validationError);

        let storedMedia;
        try {
          storedMedia = media !== undefined ? await toMedia(media) : existing.media;
        } catch (error) {
          return fail((error as Error).message);
        }

        const draft = await updateDraft(auth.userId, id, {
          text: text ?? existing.text,
          target_accounts: targets,
          media: storedMedia,
        });
        return json({ draft });
      }
    );

    server.registerTool(
      'delete_draft',
      {
        description: 'Delete a draft permanently. Only drafts whose target accounts this token may all use can be deleted.',
        inputSchema: z.object({
          id: z.number().int().describe('The draft id (from list_drafts)'),
        }),
      },
      async ({ id }, extra) => {
        const auth = getTokenAuth(extra);
        const existing = await getDraft(auth.userId, id);
        if (!existing || !canAccessDraft(auth, existing) || !(await deleteDraft(auth.userId, id))) {
          return fail(`Draft ${id} not found.`);
        }
        return json({ deleted: true, id });
      }
    );
  },
  { serverInfo: { name: 'mockingbird', version: '1.0.0' } }
);

// Per-user long-lived tokens, generated on the MCP page; each carries its own account access.
const verifyToken = async (_req: Request, bearerToken?: string) => {
  if (!bearerToken) return undefined;

  let token: Awaited<ReturnType<typeof findMcpToken>> = null;
  try {
    token = await findMcpToken(bearerToken);
  } catch (error) {
    logger.error('Token lookup failed', error);
    return undefined;
  }

  if (!token) {
    logger.warn('Rejected MCP request with unknown token');
    return undefined;
  }

  return {
    token: bearerToken,
    clientId: 'mockingbird-mcp',
    scopes: [],
    extra: { userId: token.userId, accountAccess: token.accountAccess },
  };
};

const authedHandler = withMcpAuth(handler, verifyToken, { required: true });

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
