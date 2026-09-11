import { timingSafeEqual } from 'crypto';
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';
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

const toMedia = (urls?: string[]): DraftMedia[] | null =>
  urls && urls.length > 0 ? urls.map((publicUrl) => ({ publicUrl })) : null;

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

    server.registerTool(
      'list_drafts',
      { description: 'List all saved post drafts, newest first.', inputSchema: z.object({}) },
      async (_args, extra) => {
        const drafts = await listDrafts(userIdFrom(extra));
        return json({ drafts });
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
        const input = { text, target_platforms, media: toMedia(media) };
        const validationError = validateDraftInput(input);
        if (validationError) return fail(validationError);

        const draft = await createDraft(userIdFrom(extra), input);
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

        const input = {
          text: text ?? existing.text,
          target_platforms: target_platforms ?? existing.target_platforms,
          media: media !== undefined ? toMedia(media) : existing.media,
        };
        const validationError = validateDraftInput(input);
        if (validationError) return fail(validationError);

        const draft = await updateDraft(userId, id, input);
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

// ponytail: single shared bearer token mapped to one user via env vars;
// move to a per-user token table when a second user needs MCP access.
const verifyToken = async (_req: Request, bearerToken?: string) => {
  const expected = process.env.MCP_API_KEY;
  const userId = parseInt(process.env.MCP_USER_ID ?? '', 10);

  if (!expected || !userId || !bearerToken) return undefined;

  const provided = Buffer.from(bearerToken);
  const secret = Buffer.from(expected);
  if (provided.length !== secret.length || !timingSafeEqual(provided, secret)) {
    logger.warn('Rejected MCP request with invalid token');
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
