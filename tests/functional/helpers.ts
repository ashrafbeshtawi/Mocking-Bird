import { execFileSync } from 'child_process';
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
