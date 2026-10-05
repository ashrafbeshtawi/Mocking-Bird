jest.mock('@/lib/publish/orchestrator', () => ({ executePublish: jest.fn() }));
jest.mock('@/lib/publish/services/tokenService', () => ({ fetchAllTokens: jest.fn() }));
jest.mock('@/lib/publish/validators/mediaValidator', () => ({ processCloudinaryMedia: jest.fn() }));

import type { Pool } from 'pg';
import { executePublish } from '@/lib/publish/orchestrator';
import { fetchAllTokens } from '@/lib/publish/services/tokenService';
import { processCloudinaryMedia } from '@/lib/publish/validators/mediaValidator';
import { retryFailedDestinations } from '@/lib/publish/services/retryService';

const mockExecute = executePublish as jest.Mock;
const mockTokens = fetchAllTokens as jest.Mock;
const mockMedia = processCloudinaryMedia as jest.Mock;

const image = { publicId: 'img1', publicUrl: 'https://res.cloudinary.com/x/img1.jpg', resourceType: 'image', format: 'jpg', originalFilename: 'a.jpg' };

const entry = (overrides: Record<string, unknown> = {}) => ({
  post_text: 'hello world',
  media: [image],
  publish_destinations: [
    { platform: 'facebook', account_id: 'fb1', success: true },
    { platform: 'twitter', account_id: 'x1', success: false, error: 'CreditsDepleted' },
    { platform: 'telegram', account_id: 'tg1', success: false, error: 'Bot was blocked' },
  ],
  ...overrides,
});

function fakePool(row: object | null, { isLocked = true } = {}) {
  const query = jest.fn((sql: string) => {
    if (sql.includes('pg_try_advisory_lock')) return Promise.resolve({ rows: [{ locked: isLocked }] });
    if (sql.startsWith('SELECT post_text')) return Promise.resolve({ rows: row ? [row] : [] });
    return Promise.resolve({ rows: [], rowCount: 1 });
  });
  const client = { query, release: jest.fn() };
  return { pool: { connect: jest.fn().mockResolvedValue(client) } as unknown as Pool, query, client };
}

const updateCall = (query: jest.Mock) => query.mock.calls.find(([sql]) => (sql as string).startsWith('UPDATE publish_history'))!;

describe('retryFailedDestinations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMedia.mockResolvedValue({ files: [{ buffer: Buffer.from('x') }] });
    mockTokens.mockResolvedValue({ facebookTokens: [], twitterTokens: [{}], instagramFeedTokens: [], instagramStoryTokens: [], telegramTokens: [{}] });
  });

  it('publishes the stored post again to every failed destination and records the outcome on the entry', async () => {
    mockExecute.mockResolvedValue({
      successful: [{ platform: 'x', account_id: 'x1' }, { platform: 'telegram', telegram_channel_id: 'tg1' }],
      failed: [],
    });
    const { pool, query, client } = fakePool(entry());

    const outcome = await retryFailedDestinations(pool, '7', 99);

    expect(outcome).toEqual(expect.objectContaining({ ok: true, publish_status: 'success', retried: 2, succeeded: 2 }));
    expect(mockTokens).toHaveBeenCalledWith(pool, '7', [], ['x1'], [], [], ['tg1'], expect.anything());
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'hello world', cloudinaryMedia: [image], mediaFiles: [{ buffer: Buffer.from('x') }] })
    );

    const [, params] = updateCall(query);
    expect(JSON.parse(params[0])).toEqual([
      { platform: 'facebook', account_id: 'fb1', success: true },
      { platform: 'twitter', account_id: 'x1', success: true },
      { platform: 'telegram', account_id: 'tg1', success: true },
    ]);
    expect(params[1]).toBe('success');
    expect(params[2]).toContain('--- Retry ---');
    expect(params[3]).toBe(99);
    expect(query).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1, $2)', [expect.any(Number), 99]);
    expect(client.release).toHaveBeenCalled();
  });

  it('retries only the requested failed destination', async () => {
    mockExecute.mockResolvedValue({ successful: [], failed: [{ platform: 'telegram', telegram_channel_id: 'tg1', error: { message: 'Still blocked' } }] });
    const { pool, query } = fakePool(entry());

    const outcome = await retryFailedDestinations(pool, '7', 99, [{ platform: 'telegram', account_id: 'tg1' }]);

    expect(outcome).toEqual(expect.objectContaining({ ok: true, publish_status: 'partial_success', retried: 1, succeeded: 0 }));
    expect(mockTokens).toHaveBeenCalledWith(pool, '7', [], [], [], [], ['tg1'], expect.anything());
    const destinations = JSON.parse(updateCall(query)[1][0]);
    expect(destinations[1]).toEqual({ platform: 'twitter', account_id: 'x1', success: false, error: 'CreditsDepleted' });
    expect(destinations[2]).toEqual({ platform: 'telegram', account_id: 'tg1', success: false, error: 'Still blocked' });
  });

  it('keeps a destination failed when its account is not connected', async () => {
    mockExecute.mockResolvedValue({ successful: [], failed: [] });
    const { pool, query } = fakePool(entry());

    await retryFailedDestinations(pool, '7', 99, [{ platform: 'twitter', account_id: 'x1' }]);

    expect(JSON.parse(updateCall(query)[1][0])[1]).toEqual({
      platform: 'twitter', account_id: 'x1', success: false, error: 'Account is not connected',
    });
  });

  it('skips downloading media when only URL-based platforms are retried', async () => {
    mockExecute.mockResolvedValue({ successful: [], failed: [] });
    const { pool } = fakePool(entry());

    await retryFailedDestinations(pool, '7', 99, [{ platform: 'telegram', account_id: 'tg1' }]);

    expect(mockMedia).not.toHaveBeenCalled();
    expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({ mediaFiles: [], cloudinaryMedia: [image] }));
  });

  it.each([
    ['another retry holds the lock', fakePool(entry(), { isLocked: false }), 409],
    ['the entry does not exist for this user', fakePool(null), 404],
    ['the entry has no stored post', fakePool(entry({ post_text: null })), 409],
    ['no destination failed', fakePool(entry({ publish_destinations: [{ platform: 'facebook', account_id: 'fb1', success: true }] })), 400],
  ])('refuses when %s', async (_case, { pool }, status) => {
    const outcome = await retryFailedDestinations(pool, '7', 99);

    expect(outcome).toEqual(expect.objectContaining({ ok: false, status }));
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
