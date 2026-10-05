import { authedFetch, db } from './helpers';

// Retry against the real schema. The failed destination's account is not
// connected for this user, so the retry runs end to end without reaching a
// social platform and records the outcome on the entry.

let userId: number;
let historyId: number;

const retry = (body: object) =>
  authedFetch(userId, '/api/publish/retry', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeAll(async () => {
  userId = (await db.query(`INSERT INTO users (name, email) VALUES ('Retry Test', $1) RETURNING id`, [`retry-${Date.now()}@example.com`]))
    .rows[0].id;
});

beforeEach(async () => {
  historyId = (
    await db.query(
      `INSERT INTO publish_history (user_id, content, publish_report, publish_status, publish_destinations, post_text, media)
       VALUES ($1, 'hello', 'original report', 'partial_success', $2, 'hello', '[]') RETURNING id`,
      [
        userId,
        JSON.stringify([
          { platform: 'facebook', account_id: 'fb1', success: true },
          { platform: 'telegram', account_id: 'tg-missing', success: false, error: 'Bot was blocked' },
        ]),
      ]
    )
  ).rows[0].id;
});

afterAll(async () => {
  await db.query('DELETE FROM users WHERE id = $1', [userId]);
  await db.end();
});

describe('POST /api/publish/retry', () => {
  it('runs the retry and records the outcome and report on the history entry', async () => {
    const response = await retry({ historyId });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({ publish_status: 'partial_success', retried: 1, succeeded: 0 })
    );
    const { rows } = await db.query('SELECT publish_destinations, publish_report FROM publish_history WHERE id = $1', [historyId]);
    expect(rows[0].publish_destinations[1]).toEqual({
      platform: 'telegram', account_id: 'tg-missing', success: false, error: 'Account is not connected',
    });
    expect(rows[0].publish_report).toMatch(/^original report\n\n--- Retry ---\n/);
  });

  it('only acts on the caller’s own entries', async () => {
    const otherId = (await db.query(`INSERT INTO users (name, email) VALUES ('Other', $1) RETURNING id`, [`other-${Date.now()}@example.com`])).rows[0].id;
    try {
      const response = await authedFetch(otherId, '/api/publish/retry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ historyId }),
      });
      expect(response.status).toBe(404);
    } finally {
      await db.query('DELETE FROM users WHERE id = $1', [otherId]);
    }
  });

  it('validates the request', async () => {
    expect((await retry({ historyId: 'abc' })).status).toBe(400);
    expect((await retry({ historyId, destinations: [{ platform: 'myspace', account_id: '1' }] })).status).toBe(400);
  });

  it('marks entries with a stored post as retryable in the history list', async () => {
    const page = await (await authedFetch(userId, '/api/publish/publish-history?page=1&limit=50')).json();

    expect(page.history.find((h: { id: number }) => h.id === historyId).retryable).toBe(true);
  });
});
