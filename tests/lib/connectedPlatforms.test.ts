jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

import { getConnectedPlatformTypes } from '@/lib/connectedPlatforms';
import pool from '@/lib/db';

const mockQuery = pool.query as jest.Mock;

describe('getConnectedPlatformTypes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns only platforms with at least one connected account', async () => {
    mockQuery.mockImplementation((sql: string) =>
      Promise.resolve({
        rows: [
          {
            connected:
              sql.includes('connected_x_accounts_v1_1') ||
              sql.includes('connected_telegram_channels'),
          },
        ],
      })
    );

    const result = await getConnectedPlatformTypes(42);

    expect(result).toEqual(['twitter', 'telegram']);
    expect(mockQuery).toHaveBeenCalledTimes(4);
    expect(mockQuery.mock.calls[0][1]).toEqual([42]);
  });

  it('returns an empty list when nothing is connected', async () => {
    mockQuery.mockResolvedValue({ rows: [{ connected: false }] });

    expect(await getConnectedPlatformTypes(42)).toEqual([]);
  });
});
