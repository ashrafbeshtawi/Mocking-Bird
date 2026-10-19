import { createHash, randomBytes } from 'crypto';
import pool from '@/lib/db';
import type { McpTokenInfo } from '@/types/mcpTokens';

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

/**
 * Create a long-lived MCP token for the user; a user can hold several.
 * Returns the plaintext token — it is shown once; only its hash is stored.
 */
export async function createMcpToken(
  userId: number,
  title: string
): Promise<{ token: string; tokenInfo: McpTokenInfo }> {
  const token = `mb_${randomBytes(32).toString('hex')}`;
  const { rows } = await pool.query(
    `INSERT INTO mcp_tokens (user_id, token_hash, title, created_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     RETURNING id, title, created_at`,
    [userId, hashToken(token), title]
  );
  return { token, tokenInfo: rows[0] };
}

export async function listMcpTokens(userId: number): Promise<McpTokenInfo[]> {
  const { rows } = await pool.query(
    'SELECT id, title, created_at FROM mcp_tokens WHERE user_id = $1 ORDER BY created_at DESC, id DESC',
    [userId]
  );
  return rows;
}

/** Returns true if the user owned the token and it was revoked. */
export async function deleteMcpToken(userId: number, tokenId: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM mcp_tokens WHERE id = $1 AND user_id = $2', [
    tokenId,
    userId,
  ]);
  return (result.rowCount ?? 0) > 0;
}

/** Resolve the owner of a bearer token; null if the token is unknown. */
export async function getUserIdByMcpToken(token: string): Promise<number | null> {
  const { rows } = await pool.query('SELECT user_id FROM mcp_tokens WHERE token_hash = $1', [
    hashToken(token),
  ]);
  return rows[0]?.user_id ?? null;
}
