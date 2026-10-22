import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';
import { createMcpToken, deleteMcpToken, listMcpTokens, updateMcpToken } from '@/lib/mcpTokens';
import { listConnectedAccounts } from '@/lib/connectedAccounts';
import { validateAccountAccess, type McpAccountAccess } from '@/lib/mcpAccess';
import { MCP_TOKEN_TITLE_MAX_LENGTH } from '@/types/mcpTokens';

const logger = createLogger('McpTokenAPI');

const getUserId = async (): Promise<number | null> => {
  const userId = await getAuthUserId();
  const parsedUserId = userId ? parseInt(userId, 10) : null;
  return parsedUserId && !isNaN(parsedUserId) ? parsedUserId : null;
};

const readBody = async (request: Request): Promise<Record<string, unknown>> => {
  const body = await request.json().catch(() => null);
  return body && typeof body === 'object' ? body : {};
};

/** Validate the title and account access a token is created or edited with. */
const readTokenFields = async (
  userId: number,
  body: Record<string, unknown>
): Promise<{ error: string } | { title: string; accountAccess: McpAccountAccess }> => {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title || title.length > MCP_TOKEN_TITLE_MAX_LENGTH) {
    return { error: `Title is required and may have at most ${MCP_TOKEN_TITLE_MAX_LENGTH} characters.` };
  }
  const accessError = validateAccountAccess(body.account_access, await listConnectedAccounts(userId));
  if (accessError) return { error: accessError };
  return { title, accountAccess: body.account_access as McpAccountAccess };
};

// GET: The user's MCP tokens (id, title, account access, creation date).
// Never returns the tokens themselves — only their hashes are stored, so they cannot be retrieved again.
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const tokens = await listMcpTokens(userId);
    return NextResponse.json({ success: true, tokens });
  } catch (error) {
    logger.error('GET failed', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}

// POST { title, account_access }: Create an MCP token. The plaintext is returned exactly once.
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const fields = await readTokenFields(userId, await readBody(request));
    if ('error' in fields) {
      return NextResponse.json({ error: fields.error }, { status: 400 });
    }
    const { token, tokenInfo } = await createMcpToken(userId, fields.title, fields.accountAccess);
    return NextResponse.json({ success: true, token, tokenInfo }, { status: 201 });
  } catch (error) {
    logger.error('POST failed', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}

// PUT { id, title, account_access }: Edit one of the user's MCP tokens; the token itself stays the same
export async function PUT(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const body = await readBody(request);
  if (!Number.isInteger(body.id)) {
    return NextResponse.json({ error: 'Token id is required.' }, { status: 400 });
  }

  try {
    const fields = await readTokenFields(userId, body);
    if ('error' in fields) {
      return NextResponse.json({ error: fields.error }, { status: 400 });
    }
    const tokenInfo = await updateMcpToken(userId, body.id as number, fields.title, fields.accountAccess);
    if (!tokenInfo) {
      return NextResponse.json({ error: 'Token not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, tokenInfo });
  } catch (error) {
    logger.error('PUT failed', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}

// DELETE { id }: Revoke one of the user's MCP tokens
export async function DELETE(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { id } = await readBody(request);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Token id is required.' }, { status: 400 });
  }

  try {
    const deleted = await deleteMcpToken(userId, id as number);
    if (!deleted) {
      return NextResponse.json({ error: 'Token not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('DELETE failed', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
