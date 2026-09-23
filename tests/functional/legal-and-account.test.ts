import { authedFetch, db, fetchPage } from './helpers';

afterAll(() => db.end());

describe('legal pages', () => {
  it.each([
    ['/impressum', 'Impressum'],
    ['/privacy', 'Datenschutzerklärung'],
    ['/terms', 'Nutzungsbedingungen'],
    ['/delete-account', 'Account löschen'],
  ])('%s is public and renders', async (pathname, heading) => {
    const response = await fetchPage(pathname);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain(heading);
  });
});

describe('account deletion', () => {
  let userId: number;

  const ownedRows = async () => {
    const { rows } = await db.query(
      `SELECT (SELECT count(*) FROM users WHERE id = $1)::int AS users,
              (SELECT count(*) FROM connected_facebook_pages WHERE user_id = $1)::int AS pages,
              (SELECT count(*) FROM publish_history WHERE user_id = $1)::int AS history,
              (SELECT count(*) FROM scheduled_posts WHERE user_id = $1)::int AS scheduled,
              (SELECT count(*) FROM drafts WHERE user_id = $1)::int AS drafts`,
      [userId]
    );
    return rows[0];
  };

  beforeEach(async () => {
    const { rows } = await db.query(
      `INSERT INTO users (name, email) VALUES ('Functional Test', $1) RETURNING id`,
      [`delete-me-${Date.now()}-${Math.random()}@example.com`]
    );
    userId = rows[0].id;
    // Tables created before migration 018 lost their FK to users; 023 restores it.
    await db.query(
      `INSERT INTO connected_facebook_pages (user_id, page_name, page_id, page_access_token) VALUES ($1, 'Page', 'p1', 'tok')`,
      [userId]
    );
    await db.query(`INSERT INTO publish_history (user_id, content, publish_status) VALUES ($1, 'hello', 'success')`, [userId]);
    await db.query(`INSERT INTO scheduled_posts (user_id, content, destinations) VALUES ($1, 'later', '[]')`, [userId]);
    await db.query(`INSERT INTO drafts (user_id, text) VALUES ($1, 'draft')`, [userId]);
    expect(await ownedRows()).toEqual({ users: 1, pages: 1, history: 1, scheduled: 1, drafts: 1 });
  });

  afterEach(() => db.query('DELETE FROM users WHERE id = $1', [userId]));

  it('requires a session', async () => {
    const response = await fetchPage('/api/account', { method: 'DELETE' });

    expect(response.status).toBe(307);
    expect((await ownedRows()).users).toBe(1);
  });

  it('removes the user and everything that belongs to them', async () => {
    const response = await authedFetch(userId, '/api/account', { method: 'DELETE' });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(await ownedRows()).toEqual({ users: 0, pages: 0, history: 0, scheduled: 0, drafts: 0 });
  });
});
