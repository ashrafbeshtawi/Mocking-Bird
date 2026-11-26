jest.mock('@/lib/api-auth', () => ({
  getAuthUserId: jest.fn(),
}));

// A real pg Pool (small, fail-fast) backed by an in-memory client, so the test
// exercises actual checkout/release behaviour instead of a mocked pool.
jest.mock('@/lib/db', () => {
  const { EventEmitter } = jest.requireActual('events');
  const { Pool } = jest.requireActual('pg');
  const runQuery = jest.fn();

  class FakeClient extends EventEmitter {
    _queryable = true;
    connect(cb: (err?: Error) => void) {
      setImmediate(() => cb());
    }
    query(text: string, values?: unknown[], cb?: (err?: Error, res?: unknown) => void) {
      const result = Promise.resolve().then(() => runQuery(text, values));
      if (!cb) return result;
      result.then((res) => cb(undefined, res), (err) => cb(err));
    }
    end(cb?: () => void) {
      this._queryable = false;
      this.emit('end');
      if (cb) setImmediate(cb);
    }
  }

  const pool = new Pool({ Client: FakeClient, max: 2, connectionTimeoutMillis: 200 });
  return { __esModule: true, default: pool, runQuery };
});

import { GET, POST, PUT, DELETE } from '@/app/api/publish/templates/route';
import { getAuthUserId } from '@/lib/api-auth';
import pool from '@/lib/db';
import * as db from '@/lib/db';

const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;
const runQuery = (db as unknown as { runQuery: jest.Mock }).runQuery;

const template = { id: 1, title: 'T', content: 'C', created_at: 'x', updated_at: 'x' };

const request = (method: string, body: unknown) =>
  new Request('http://localhost/api/publish/templates', { method, body: JSON.stringify(body) });

describe('Publish templates API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue('42');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('rejects unauthenticated requests', async () => {
    mockGetAuthUserId.mockResolvedValue(null);

    expect((await GET()).status).toBe(401);
  });

  it('lists templates for the current user', async () => {
    runQuery.mockResolvedValue({ rows: [template], rowCount: 1 });

    const response = await GET();

    expect(response.status).toBe(200);
    expect((await response.json()).templates).toEqual([template]);
    expect(runQuery.mock.calls[0][1]).toEqual([42]);
  });

  it('creates a template', async () => {
    runQuery.mockResolvedValue({ rows: [template], rowCount: 1 });

    const response = await POST(request('POST', { title: ' T ', content: 'C' }));

    expect(response.status).toBe(201);
    expect(runQuery.mock.calls[0][1]).toEqual([42, 'T', 'C']);
  });

  it('updates an owned template and 404s on a missing one', async () => {
    runQuery.mockResolvedValueOnce({ rows: [template], rowCount: 1 });
    expect((await PUT(request('PUT', { id: 1, title: 'T', content: 'C' }))).status).toBe(200);

    runQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect((await PUT(request('PUT', { id: 2, title: 'T', content: 'C' }))).status).toBe(404);
  });

  it('deletes an owned template', async () => {
    runQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    const response = await DELETE(request('DELETE', { id: 1 }));

    expect(response.status).toBe(200);
    expect(runQuery.mock.calls[0][1]).toEqual([1, 42]);
  });

  it.each(['abc', '1', 0, -1, 1.5, 99999999999, true, {}])('rejects invalid id %p with 400', async (id) => {
    const put = await PUT(request('PUT', { id, title: 'T', content: 'C' }));
    const del = await DELETE(request('DELETE', { id }));

    expect(put.status).toBe(400);
    expect(del.status).toBe(400);
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('requires an id for update and delete', async () => {
    expect((await PUT(request('PUT', { title: 'T', content: 'C' }))).status).toBe(400);
    expect((await DELETE(request('DELETE', {}))).status).toBe(400);
  });

  it('does not exhaust the pool when queries fail', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    runQuery.mockRejectedValue(new Error('boom'));
    const failing = [
      () => GET(),
      () => POST(request('POST', { title: 'T', content: 'C' })),
      () => PUT(request('PUT', { id: 1, title: 'T', content: 'C' })),
      () => DELETE(request('DELETE', { id: 1 })),
    ];

    // Several times the pool size (max 2) worth of failing queries.
    for (let round = 0; round < 3; round++) {
      for (const call of failing) {
        expect((await call()).status).toBe(500);
      }
    }

    runQuery.mockReset();
    runQuery.mockResolvedValue({ rows: [template], rowCount: 1 });
    const response = await GET();

    expect(response.status).toBe(200);
    expect(pool.totalCount).toBeLessThanOrEqual(2);
    expect(pool.waitingCount).toBe(0);
    jest.restoreAllMocks();
  });
});
