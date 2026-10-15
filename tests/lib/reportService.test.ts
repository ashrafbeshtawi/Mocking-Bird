import type { Pool } from 'pg';
import { savePublishReport } from '@/lib/publish/services/reportService';

const tiktokSettings = {
  privacyLevel: 'PUBLIC_TO_EVERYONE' as const,
  allowComment: true,
  allowDuet: false,
  allowStitch: false,
  isYourBrand: false,
  isBrandedContent: true,
};

function fakePool(failOn?: string) {
  const query = jest.fn((sql: string) => {
    if (failOn && sql.includes(failOn)) return Promise.reject(new Error('constraint violated'));
    if (sql.includes('RETURNING id')) return Promise.resolve({ rows: [{ id: 5 }] });
    return Promise.resolve({ rows: [] });
  });
  return { pool: { connect: jest.fn().mockResolvedValue({ query, release: jest.fn() }) } as unknown as Pool, query };
}

const statements = (query: jest.Mock) => query.mock.calls.map(([sql]) => (sql as string).trim().split(/\s+/).slice(0, 3).join(' '));

describe('savePublishReport', () => {
  it('stores the TikTok settings for the new entry in the same transaction', async () => {
    const { pool, query } = fakePool();

    await savePublishReport(pool, '7', 'hi', [], 'success', [], { text: 'hi', media: [], youtubeTitle: '', tiktokSettings });

    expect(statements(query)).toEqual(['BEGIN', 'INSERT INTO publish_history', 'INSERT INTO publish_history_tiktok', 'COMMIT']);
    expect((query.mock.calls[2] as unknown[])[1]).toEqual([5, 'PUBLIC_TO_EVERYONE', true, false, false, false, true]);
  });

  it('stores no TikTok row when the post did not go to TikTok', async () => {
    const { pool, query } = fakePool();

    await savePublishReport(pool, '7', 'hi', [], 'success', [], { text: 'hi', media: [], youtubeTitle: '', tiktokSettings: null });

    expect(statements(query)).toEqual(['BEGIN', 'INSERT INTO publish_history', 'COMMIT']);
  });

  it('rolls the entry back when the TikTok settings cannot be stored', async () => {
    const { pool, query } = fakePool('publish_history_tiktok');
    const report: string[] = [];

    await savePublishReport(pool, '7', 'hi', report, 'success', [], { text: 'hi', media: [], youtubeTitle: '', tiktokSettings });

    expect(statements(query)).toContain('ROLLBACK');
    expect(statements(query)).not.toContain('COMMIT');
    expect(report.at(-1)).toMatch(/^ERROR: Failed to save publish result/);
  });
});
