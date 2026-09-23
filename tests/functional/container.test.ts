import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { authedFetch, databaseString, db, fetchPage, repoRoot } from './helpers';

afterAll(() => db.end());

describe('container', () => {
  it('serves the landing page', async () => {
    expect((await fetchPage('/')).status).toBe(200);
  });

  it('redirects signed-out users from protected pages to /auth', async () => {
    const response = await fetchPage('/dashboard');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toMatch(/\/auth$/);
  });

  it('rejects MCP calls without a bearer token', async () => {
    expect((await fetchPage('/api/mcp', { method: 'POST' })).status).toBe(401);
  });

  it('serves the runtime Cloudinary config to signed-in users only', async () => {
    expect((await fetchPage('/api/cloudinary/config')).status).toBe(307);

    const response = await authedFetch(1, '/api/cloudinary/config');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cloudName: 'testcloud', uploadPreset: 'testpreset' });
  });
});

describe('migrations', () => {
  const files = fs
    .readdirSync(path.join(repoRoot, 'migrations'))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  it('applied every migration file on first boot', async () => {
    const { rows } = await db.query('SELECT filename FROM schema_migrations ORDER BY filename');
    expect(rows.map((row) => row.filename)).toEqual(files);
  });

  it('is a no-op when run again', () => {
    const output = execFileSync(process.execPath, ['scripts/migrate.js'], {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_STRING: databaseString },
      encoding: 'utf8',
    });
    expect(output).not.toContain('Running migration');
    expect(output).toContain('Migrations completed successfully');
  });
});
