import { authedFetch, db } from './helpers';

const newUser = async (label: string): Promise<number> =>
  (await db.query(`INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id`, [label, `${label}-${Date.now()}@example.com`]))
    .rows[0].id;

const insertDraft = async (userId: number, text: string, platforms: string[]): Promise<number> =>
  (await db.query(`INSERT INTO drafts (user_id, text, target_platforms) VALUES ($1, $2, $3) RETURNING id`, [userId, text, platforms]))
    .rows[0].id;

let owner: number;
let other: number;

beforeAll(async () => {
  owner = await newUser('drafts-owner');
  other = await newUser('drafts-other');
});

afterAll(async () => {
  await db.query('DELETE FROM users WHERE id = ANY($1)', [[owner, other]]);
  await db.end();
});

describe('drafts API', () => {
  it('bulk-deletes the caller’s drafts and leaves other users’ drafts alone', async () => {
    const mine = [await insertDraft(owner, 'a', ['facebook']), await insertDraft(owner, 'b', ['telegram'])];
    const theirs = await insertDraft(other, 'c', ['facebook']);

    const response = await authedFetch(owner, '/api/drafts', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: [...mine, theirs] }),
    });

    expect(response.status).toBe(200);
    expect((await response.json()).deletedCount).toBe(2);
    const { rows } = await db.query('SELECT id FROM drafts WHERE id = ANY($1)', [[...mine, theirs]]);
    expect(rows.map((r) => r.id)).toEqual([theirs]);
  });

  it('filters the list by target platform and text together', async () => {
    await insertDraft(owner, 'launch on facebook', ['facebook', 'twitter']);
    await insertDraft(owner, 'launch on telegram', ['telegram']);
    await insertDraft(owner, 'unrelated', ['facebook']);

    const response = await authedFetch(owner, '/api/drafts?q=launch&platform=facebook');
    const page = await response.json();

    expect(page.total).toBe(1);
    expect(page.drafts.map((d: { text: string }) => d.text)).toEqual(['launch on facebook']);
  });
});
