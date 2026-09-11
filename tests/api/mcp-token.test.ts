import { createHash } from 'crypto';

jest.mock('@/lib/api-auth', () => ({
  getAuthUserId: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

import { GET, POST, DELETE } from '@/app/api/mcp-token/route';
import { getUserIdByMcpToken } from '@/lib/mcpTokens';
import { getAuthUserId } from '@/lib/api-auth';
import pool from '@/lib/db';

const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;
const mockQuery = pool.query as jest.Mock;

describe('MCP Token API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue('42');
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('rejects unauthenticated requests', async () => {
    mockGetAuthUserId.mockResolvedValue(null);

    expect((await GET()).status).toBe(401);
    expect((await POST()).status).toBe(401);
    expect((await DELETE()).status).toBe(401);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('reports token status', async () => {
    mockQuery.mockResolvedValue({ rows: [{ created_at: '2026-09-11T00:00:00Z' }] });

    const data = await (await GET()).json();

    expect(data.token).toEqual({ created_at: '2026-09-11T00:00:00Z' });
  });

  it('creates a token and stores only its hash', async () => {
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.token).toMatch(/^mb_[0-9a-f]{64}$/);

    const [, params] = mockQuery.mock.calls[0];
    expect(params[0]).toBe(42);
    expect(params[1]).toBe(createHash('sha256').update(data.token).digest('hex'));
    expect(params[1]).not.toBe(data.token);
  });

  it('revokes an existing token', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    expect((await DELETE()).status).toBe(200);
  });

  it('returns 404 when revoking without a token', async () => {
    expect((await DELETE()).status).toBe(404);
  });
});

describe('getUserIdByMcpToken', () => {
  beforeEach(() => jest.clearAllMocks());

  it('looks up the owner by token hash, never the raw token', async () => {
    mockQuery.mockResolvedValue({ rows: [{ user_id: 7 }] });

    const userId = await getUserIdByMcpToken('mb_secret');

    expect(userId).toBe(7);
    expect(mockQuery.mock.calls[0][1]).toEqual([
      createHash('sha256').update('mb_secret').digest('hex'),
    ]);
  });

  it('returns null for unknown tokens', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    expect(await getUserIdByMcpToken('mb_wrong')).toBeNull();
  });
});
