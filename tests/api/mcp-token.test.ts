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

const request = (body?: unknown) =>
  new Request('http://localhost/api/mcp-token', { method: 'POST', body: JSON.stringify(body) });

describe('MCP Token API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue('42');
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('rejects unauthenticated requests', async () => {
    mockGetAuthUserId.mockResolvedValue(null);

    expect((await GET()).status).toBe(401);
    expect((await POST(request({ title: 'Claude' }))).status).toBe(401);
    expect((await DELETE(request({ id: 1 }))).status).toBe(401);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("lists the user's tokens without ever exposing them", async () => {
    const tokens = [
      { id: 2, title: 'Claude Desktop', created_at: '2026-10-01T00:00:00Z' },
      { id: 1, title: 'MCP token', created_at: '2026-09-11T00:00:00Z' },
    ];
    mockQuery.mockResolvedValue({ rows: tokens });

    const data = await (await GET()).json();

    expect(data.tokens).toEqual(tokens);
    expect(mockQuery.mock.calls[0][1]).toEqual([42]);
    expect(mockQuery.mock.calls[0][0]).not.toContain('token_hash');
  });

  it('creates a titled token and stores only its hash', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 3, title: 'Cursor', created_at: '2026-10-19T00:00:00Z' }] });

    const response = await POST(request({ title: '  Cursor  ' }));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.token).toMatch(/^mb_[0-9a-f]{64}$/);
    expect(data.tokenInfo).toEqual({ id: 3, title: 'Cursor', created_at: '2026-10-19T00:00:00Z' });

    const [, params] = mockQuery.mock.calls[0];
    expect(params).toEqual([42, createHash('sha256').update(data.token).digest('hex'), 'Cursor']);
  });

  it.each([{}, { title: '   ' }, { title: 'x'.repeat(101) }, { title: 7 }])(
    'rejects a token without a valid title: %j',
    async (body) => {
      expect((await POST(request(body))).status).toBe(400);
      expect(mockQuery).not.toHaveBeenCalled();
    }
  );

  it("revokes one of the user's tokens by id", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    expect((await DELETE(request({ id: 3 }))).status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toEqual([3, 42]);
  });

  it('returns 404 when the token does not belong to the user', async () => {
    expect((await DELETE(request({ id: 99 }))).status).toBe(404);
  });

  it('rejects revoking without a token id', async () => {
    expect((await DELETE(request({}))).status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
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
