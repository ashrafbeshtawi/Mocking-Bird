import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';
import { createMcpToken, deleteMcpToken, getMcpTokenInfo } from '@/lib/mcpTokens';

const logger = createLogger('McpTokenAPI');

const getUserId = async (): Promise<number | null> => {
  const userId = await getAuthUserId();
  const parsedUserId = userId ? parseInt(userId, 10) : null;
  return parsedUserId && !isNaN(parsedUserId) ? parsedUserId : null;
};

// GET: Whether the user has an MCP token, and when it was created
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const token = await getMcpTokenInfo(userId);
    return NextResponse.json({ success: true, token });
  } catch (error) {
    logger.error('GET failed', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}

// POST: Create (or rotate) the user's MCP token. The plaintext is returned exactly once.
export async function POST() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const token = await createMcpToken(userId);
    return NextResponse.json({ success: true, token }, { status: 201 });
  } catch (error) {
    logger.error('POST failed', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}

// DELETE: Revoke the user's MCP token
export async function DELETE() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const deleted = await deleteMcpToken(userId);
    if (!deleted) {
      return NextResponse.json({ error: 'No token to revoke.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('DELETE failed', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
