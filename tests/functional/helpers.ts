import { execFileSync } from 'child_process';
import { createHash, randomBytes } from 'crypto';
import path from 'path';
import { Pool } from 'pg';

export const repoRoot = path.resolve(__dirname, '../..');

// Defaults match tests/functional/compose.yaml so `npm run test:functional` needs no setup.
export const baseUrl = process.env.FUNCTIONAL_BASE_URL ?? 'http://localhost:3000';
export const databaseString =
  process.env.FUNCTIONAL_DATABASE_STRING ?? 'postgresql://postgres:test@localhost:5433/mockingbird';
const authSecret = process.env.FUNCTIONAL_NEXTAUTH_SECRET ?? 'functional-test-secret';

export const db = new Pool({ connectionString: databaseString });

export const fetchPage = (pathname: string, init: RequestInit = {}) =>
  fetch(`${baseUrl}${pathname}`, { redirect: 'manual', ...init });

// The image runs with NODE_ENV=production and, behind Traefik, sees
// x-forwarded-proto=https. Both are mirrored here so the middleware and auth()
// look for the same secure cookie.
const cookieName = '__Secure-authjs.session-token';

/** A real Auth.js session cookie for the given user id. */
export function sessionCookieFor(userId: number | string): string {
  // ponytail: minted in a subprocess because next-auth is ESM-only and Jest runs CJS.
  const script = `
    import { encode } from 'next-auth/jwt';
    const id = process.argv[1];
    console.log(await encode({ token: { sub: id, userId: id }, secret: process.env.SECRET, salt: ${JSON.stringify(cookieName)} }));
  `;
  const jwt = execFileSync(process.execPath, ['--input-type=module', '-e', script, String(userId)], {
    cwd: repoRoot,
    env: { ...process.env, SECRET: authSecret },
    encoding: 'utf8',
  }).trim();
  return `${cookieName}=${jwt}`;
}

/** fetch as a signed-in user. */
export function authedFetch(userId: number | string, pathname: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('cookie', sessionCookieFor(userId));
  headers.set('x-forwarded-proto', 'https');
  return fetchPage(pathname, { ...init, headers });
}

/** A new user with an MCP bearer token. */
export async function createMcpUser(label: string): Promise<{ userId: number; token: string }> {
  const { rows } = await db.query(`INSERT INTO users (name, email) VALUES ('MCP Test', $1) RETURNING id`, [
    `${label}-${Date.now()}@example.com`,
  ]);
  const token = randomBytes(24).toString('hex');
  await db.query('INSERT INTO mcp_tokens (user_id, token_hash) VALUES ($1, $2)', [
    rows[0].id,
    createHash('sha256').update(token).digest('hex'),
  ]);
  return { userId: rows[0].id, token };
}

/** Calls an MCP tool over HTTP like a real client: bearer token, JSON-RPC tools/call. */
export async function mcpCall(token: string, name: string, args: Record<string, unknown>) {
  const response = await fetchPage('/api/mcp', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
  });
  const body = await response.text();
  // Streamable HTTP answers with one SSE `data:` line or plain JSON.
  const payload = JSON.parse(body.includes('data: ') ? body.split('data: ')[1].split('\n')[0] : body);
  return payload.result;
}

export const toolJson = (result: { content: { text: string }[] }) => JSON.parse(result.content[0].text);
