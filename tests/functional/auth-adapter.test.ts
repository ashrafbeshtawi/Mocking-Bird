import { execFileSync } from 'child_process';
import { databaseString, db, repoRoot } from './helpers';

afterAll(() => db.end());

// The OAuth login path Auth.js takes on a first sign-in, run with the real
// @auth/pg-adapter against the migrated schema. next-auth and the adapter are
// ESM-only, so it runs in a node subprocess (Jest is CJS).
const roundTrip = `
  import PostgresAdapter from '@auth/pg-adapter';
  import pg from 'pg';
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_STRING });
  const adapter = PostgresAdapter(pool);
  const stamp = Date.now();
  const email = 'adapter-' + stamp + '@example.com';
  const providerAccountId = 'google-' + stamp;

  const created = await adapter.createUser({ id: 'ignored', name: 'Adapter Test', email, emailVerified: null, image: null });
  await adapter.linkAccount({
    userId: created.id, provider: 'google', type: 'oidc', providerAccountId,
    access_token: 'access', expires_at: 1, refresh_token: null, id_token: null,
    scope: 'openid email', session_state: null, token_type: 'bearer',
  });
  const byAccount = await adapter.getUserByAccount({ provider: 'google', providerAccountId });
  const byEmail = await adapter.getUserByEmail(email);
  console.log(JSON.stringify({ created: created.id, byAccount: byAccount?.id ?? null, byEmail: byEmail?.id ?? null }));
  await pool.end();
`;

describe('Auth.js Postgres adapter against the migrated schema', () => {
  let createdId: number | null = null;

  afterEach(async () => {
    if (createdId !== null) await db.query('DELETE FROM users WHERE id = $1', [createdId]);
  });

  it('creates a user, links an OAuth account and finds the user by account and by e-mail', () => {
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', roundTrip], {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_STRING: databaseString },
      encoding: 'utf8',
    });
    const result = JSON.parse(output.trim().split('\n').pop()!);
    createdId = result.created;

    expect(result.created).toEqual(expect.any(Number));
    expect(result.byAccount).toBe(result.created);
    expect(result.byEmail).toBe(result.created);
  });
});
