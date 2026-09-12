jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

import { listPublishHistory } from '@/lib/publishHistory';
import pool from '@/lib/db';

const mockQuery = pool.query as jest.Mock;

const entry = {
  id: 5,
  content: 'hello world',
  publish_status: 'success',
  publish_destinations: [{ platform: 'telegram', account_id: '1', success: true }],
  created_at: '2026-09-13T00:00:00Z',
};

describe('listPublishHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockImplementation((sql: string) =>
      Promise.resolve(sql.startsWith('SELECT COUNT') ? { rows: [{ count: '42' }] } : { rows: [entry] })
    );
  });

  it('pages newest-first with default limit 20 and offset 0', async () => {
    const page = await listPublishHistory(7);

    expect(page).toEqual({ entries: [entry], total: 42, limit: 20, offset: 0 });
    const listSql: string = mockQuery.mock.calls[1][0];
    expect(listSql).toContain('ORDER BY created_at DESC, id DESC');
    expect(mockQuery.mock.calls[1][1]).toEqual([7, 20, 0]);
  });

  it('clamps limit to 100 and offset to 0', async () => {
    await listPublishHistory(7, { limit: 500, offset: -3 });

    expect(mockQuery.mock.calls[1][1]).toEqual([7, 100, 0]);
  });

  it('excludes the heavy publish_report column from the page query', async () => {
    await listPublishHistory(7);

    expect(mockQuery.mock.calls[1][0]).not.toContain('publish_report');
  });
});
