import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';
import { createMcpToken, deleteMcpToken, listMcpTokens } from '@/lib/mcpTokens';
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

// GET: The user's MCP tokens (id, title, creation date).
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

// POST { title }: Create an MCP token. The plaintext is returned exactly once.
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { title } = await readBody(request);
  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  if (!trimmedTitle || trimmedTitle.length > MCP_TOKEN_TITLE_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Title is required and may have at most ${MCP_TOKEN_TITLE_MAX_LENGTH} characters.` },
      { status: 400 }
    );
  }

  try {
    const { token, tokenInfo } = await createMcpToken(userId, trimmedTitle);
    return NextResponse.json({ success: true, token, tokenInfo }, { status: 201 });
  } catch (error) {
    logger.error('POST failed', error);
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
