jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

import { listConnectedAccounts } from '@/lib/connectedAccounts';
import pool from '@/lib/db';

const mockQuery = pool.query as jest.Mock;

describe('listConnectedAccounts', () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the user's accounts across platforms, grouped in platform order", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { platform: 'tiktok', id: 'tt1', name: 'Clips' },
        { platform: 'facebook', id: 'p1', name: 'My Page' },
        { platform: 'twitter', id: 'x1', name: 'handle' },
        { platform: 'facebook', id: 'p2', name: 'Other Page' },
      ],
    });

    const accounts = await listConnectedAccounts(42);

    expect(accounts).toEqual([
      { platform: 'facebook', id: 'p1', name: 'My Page' },
      { platform: 'facebook', id: 'p2', name: 'Other Page' },
      { platform: 'twitter', id: 'x1', name: 'handle' },
      { platform: 'tiktok', id: 'tt1', name: 'Clips' },
    ]);
    expect(mockQuery.mock.calls[0][1]).toEqual([42]);
  });

  it('returns an empty list when nothing is connected', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    expect(await listConnectedAccounts(42)).toEqual([]);
  });
});
