import { createHash, randomBytes } from 'crypto';
import pool from '@/lib/db';
import type { McpAccountAccess } from '@/lib/mcpAccess';
import type { McpTokenInfo } from '@/types/mcpTokens';

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

const TOKEN_INFO_COLUMNS = 'id, title, account_access, created_at';

/**
 * Create a long-lived MCP token for the user; a user can hold several.
 * Returns the plaintext token — it is shown once; only its hash is stored.
 */
export async function createMcpToken(
  userId: number,
  title: string,
  accountAccess: McpAccountAccess
): Promise<{ token: string; tokenInfo: McpTokenInfo }> {
  const token = `mb_${randomBytes(32).toString('hex')}`;
  const { rows } = await pool.query(
    `INSERT INTO mcp_tokens (user_id, token_hash, title, account_access, created_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     RETURNING ${TOKEN_INFO_COLUMNS}`,
    [userId, hashToken(token), title, accountAccess]
  );
  return { token, tokenInfo: rows[0] };
}

export async function listMcpTokens(userId: number): Promise<McpTokenInfo[]> {
  const { rows } = await pool.query(
    `SELECT ${TOKEN_INFO_COLUMNS} FROM mcp_tokens WHERE user_id = $1 ORDER BY created_at DESC, id DESC`,
    [userId]
  );
  return rows;
}

/** Change a token's title and account access. Returns the updated token, or null if the user does not own it. */
export async function updateMcpToken(
  userId: number,
  tokenId: number,
  title: string,
  accountAccess: McpAccountAccess
): Promise<McpTokenInfo | null> {
  const { rows } = await pool.query(
    `UPDATE mcp_tokens SET title = $1, account_access = $2
     WHERE id = $3 AND user_id = $4
     RETURNING ${TOKEN_INFO_COLUMNS}`,
    [title, accountAccess, tokenId, userId]
  );
  return rows[0] ?? null;
}

/** Returns true if the user owned the token and it was revoked. */
export async function deleteMcpToken(userId: number, tokenId: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM mcp_tokens WHERE id = $1 AND user_id = $2', [
    tokenId,
    userId,
  ]);
  return (result.rowCount ?? 0) > 0;
}

/** Resolve a bearer token to its owner and account access; null if the token is unknown. */
export async function findMcpToken(
  token: string
): Promise<{ userId: number; accountAccess: McpAccountAccess } | null> {
  const { rows } = await pool.query('SELECT user_id, account_access FROM mcp_tokens WHERE token_hash = $1', [
    hashToken(token),
  ]);
  return rows[0] ? { userId: rows[0].user_id, accountAccess: rows[0].account_access } : null;
}
