import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';
import { ingestRemoteMedia } from '@/lib/services/cloudinaryService';
import { getUserIdByMcpToken } from '@/lib/mcpTokens';
import { getConnectedPlatformTypes } from '@/lib/connectedPlatforms';
import {
  createDraft,
  deleteDraft,
  getDraft,
  listDrafts,
  updateDraft,
  validateDraftInput,
  type DraftMedia,
} from '@/lib/drafts';
import { PLATFORMS, type Platform } from '@/types/accounts';

const logger = createLogger('McpAPI');

const platformEnum = z.enum(PLATFORMS as [Platform, ...Platform[]]);
const mediaUrls = z
  .array(z.string())
  .optional()
  .describe('Optional list of media URLs to attach to the draft');

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

/** The user the verified token belongs to (set by verifyToken below). */
const userIdFrom = (extra: { http?: { authInfo?: { extra?: Record<string, unknown> } } }): number => {
  const userId = extra.http?.authInfo?.extra?.userId;
  if (typeof userId !== 'number') {
    throw new Error('Unauthorized: no user bound to this token.');
  }
  return userId;
};

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'get_connected_social_media_types',
      {
        description:
          'List the social media platform types the user has connected accounts for (facebook, instagram, twitter, telegram).',
        inputSchema: z.object({}),
      },
      async (_args, extra) => {
        const connected = await getConnectedPlatformTypes(userIdFrom(extra));
        return json({ connected });
      }
    );

    const pageArgs = {
      limit: z.number().int().min(1).max(100).optional().describe('Page size, default 20, max 100'),
      offset: z.number().int().min(0).optional().describe('Number of drafts to skip'),
    };

    server.registerTool(
      'list_drafts',
      {
        description:
          'List saved post drafts, newest first. Paginated; the response includes `total`, so page with `offset` until you have them all.',
        inputSchema: z.object(pageArgs),
      },
      async ({ limit, offset }, extra) => {
        return json(await listDrafts(userIdFrom(extra), { limit, offset }));
      }
    );

    server.registerTool(
      'search_drafts',
      {
        description:
          'Search drafts by text (case-insensitive substring match), newest first. Paginated like list_drafts.',
        inputSchema: z.object({
          query: z.string().min(1).describe('Text to search for in the draft body'),
          ...pageArgs,
        }),
      },
      async ({ query, limit, offset }, extra) => {
        return json(await listDrafts(userIdFrom(extra), { query, limit, offset }));
      }
    );

    server.registerTool(
      'add_draft',
      {
        description: 'Save a new post draft. A draft needs text or at least one media URL.',
        inputSchema: z.object({
          text: z.string().describe('The post text'),
          target_platforms: z
            .array(platformEnum)
            .optional()
            .describe('Platforms this draft is intended for'),
          media: mediaUrls,
        }),
      },
      async ({ text, target_platforms, media }, extra) => {
        const userId = userIdFrom(extra);
        // Validate before ingesting so bad input doesn't trigger uploads
        const validationError = validateDraftInput({
          text,
          target_platforms,
          media: media?.map((publicUrl) => ({ publicUrl })) ?? null,
        });
        if (validationError) return fail(validationError);

        let storedMedia;
        try {
          storedMedia = await toMedia(media);
        } catch (error) {
          return fail((error as Error).message);
        }

        const draft = await createDraft(userId, { text, target_platforms, media: storedMedia });
        return json({ draft });
      }
    );

    server.registerTool(
      'edit_draft',
      {
        description:
          'Edit an existing draft. Only the provided fields change; omitted fields keep their current value.',
        inputSchema: z.object({
          id: z.number().int().describe('The draft id (from list_drafts)'),
          text: z.string().optional(),
          target_platforms: z.array(platformEnum).optional(),
          media: mediaUrls,
        }),
      },
      async ({ id, text, target_platforms, media }, extra) => {
        const userId = userIdFrom(extra);
        const existing = await getDraft(userId, id);
        if (!existing) return fail(`Draft ${id} not found.`);

        // Validate before ingesting so bad input doesn't trigger uploads
        const validationError = validateDraftInput({
          text: text ?? existing.text,
          target_platforms: target_platforms ?? existing.target_platforms,
          media:
            media !== undefined ? media.map((publicUrl) => ({ publicUrl })) : existing.media,
        });
        if (validationError) return fail(validationError);

        let storedMedia;
        try {
          storedMedia = media !== undefined ? await toMedia(media) : existing.media;
        } catch (error) {
          return fail((error as Error).message);
        }

        const draft = await updateDraft(userId, id, {
          text: text ?? existing.text,
          target_platforms: target_platforms ?? existing.target_platforms,
          media: storedMedia,
        });
        return json({ draft });
      }
    );

    server.registerTool(
      'delete_draft',
      {
        description: 'Delete a draft permanently.',
        inputSchema: z.object({
          id: z.number().int().describe('The draft id (from list_drafts)'),
        }),
      },
      async ({ id }, extra) => {
        const deleted = await deleteDraft(userIdFrom(extra), id);
        if (!deleted) return fail(`Draft ${id} not found.`);
        return json({ deleted: true, id });
      }
    );
  },
  { serverInfo: { name: 'mockingbird', version: '1.0.0' } }
);

// Per-user long-lived tokens, generated on the dashboard (MCP Access card).
const verifyToken = async (_req: Request, bearerToken?: string) => {
  if (!bearerToken) return undefined;

  let userId: number | null = null;
  try {
    userId = await getUserIdByMcpToken(bearerToken);
  } catch (error) {
    logger.error('Token lookup failed', error);
    return undefined;
  }

  if (!userId) {
    logger.warn('Rejected MCP request with unknown token');
    return undefined;
  }

  return {
    token: bearerToken,
    clientId: 'mockingbird-mcp',
    scopes: [],
    extra: { userId },
  };
};

const authedHandler = withMcpAuth(handler, verifyToken, { required: true });

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
