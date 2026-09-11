import { createHash, randomBytes } from 'crypto';
import pool from '@/lib/db';

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

/**
 * Create (or rotate) the user's single long-lived MCP token.
 * Returns the plaintext token — it is shown once; only its hash is stored.
 */
export async function createMcpToken(userId: number): Promise<string> {
  const token = `mb_${randomBytes(32).toString('hex')}`;
  await pool.query(
    `INSERT INTO mcp_tokens (user_id, token_hash, created_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id) DO UPDATE SET token_hash = EXCLUDED.token_hash, created_at = CURRENT_TIMESTAMP`,
    [userId, hashToken(token)]
  );
  return token;
}

export async function getMcpTokenInfo(userId: number): Promise<{ created_at: string } | null> {
  const { rows } = await pool.query('SELECT created_at FROM mcp_tokens WHERE user_id = $1', [
    userId,
  ]);
  return rows[0] ?? null;
}

/** Returns true if a token existed and was revoked. */
export async function deleteMcpToken(userId: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM mcp_tokens WHERE user_id = $1', [userId]);
  return (result.rowCount ?? 0) > 0;
}

/** Resolve the owner of a bearer token; null if the token is unknown. */
export async function getUserIdByMcpToken(token: string): Promise<number | null> {
  const { rows } = await pool.query('SELECT user_id FROM mcp_tokens WHERE token_hash = $1', [
    hashToken(token),
  ]);
  return rows[0]?.user_id ?? null;
}
