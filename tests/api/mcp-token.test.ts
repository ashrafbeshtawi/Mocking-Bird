import { createHash } from 'crypto';

jest.mock('@/lib/api-auth', () => ({
  getAuthUserId: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

import { GET, POST, PUT, DELETE } from '@/app/api/mcp-token/route';
import { findMcpToken } from '@/lib/mcpTokens';
import { getAuthUserId } from '@/lib/api-auth';
import pool from '@/lib/db';

const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;
const mockQuery = pool.query as jest.Mock;

const request = (body?: unknown, method = 'POST') =>
  new Request('http://localhost/api/mcp-token', { method, body: JSON.stringify(body) });

const connectedAccounts = [
  { platform: 'facebook', id: 'p1', name: 'My Page' },
  { platform: 'twitter', id: 'x1', name: 'handle' },
];

/** The connected-accounts lookup answers with connectedAccounts; the token query with tokenRows. */
const mockDb = (tokenRows: unknown[], rowCount = tokenRows.length) =>
  mockQuery.mockImplementation((sql: string) =>
    Promise.resolve(
      sql.includes('connected_facebook_pages') ? { rows: connectedAccounts } : { rows: tokenRows, rowCount }
    )
  );

const tokenQueries = () => mockQuery.mock.calls.filter(([sql]) => (sql as string).includes('mcp_tokens'));

describe('MCP Token API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue('42');
    mockDb([]);
  });

  it('rejects unauthenticated requests', async () => {
    mockGetAuthUserId.mockResolvedValue(null);

    expect((await GET()).status).toBe(401);
    expect((await POST(request({ title: 'Claude', account_access: ['all'] }))).status).toBe(401);
    expect((await PUT(request({ id: 1, title: 'Claude', account_access: ['all'] }, 'PUT'))).status).toBe(401);
    expect((await DELETE(request({ id: 1 }))).status).toBe(401);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("lists the user's tokens with their account access, without ever exposing them", async () => {
    const tokens = [
      { id: 2, title: 'Claude Desktop', account_access: ['facebook', 'twitter:x1'], created_at: '2026-10-01T00:00:00Z' },
      { id: 1, title: 'MCP token', account_access: ['all'], created_at: '2026-09-11T00:00:00Z' },
    ];
    mockDb(tokens);

    const data = await (await GET()).json();

    expect(data.tokens).toEqual(tokens);
    expect(mockQuery.mock.calls[0][1]).toEqual([42]);
    expect(mockQuery.mock.calls[0][0]).not.toContain('token_hash');
  });

  it('creates a titled token with its account access and stores only its hash', async () => {
    const tokenInfo = { id: 3, title: 'Cursor', account_access: ['facebook', 'twitter:x1'], created_at: '2026-10-19T00:00:00Z' };
    mockDb([tokenInfo]);

    const response = await POST(request({ title: '  Cursor  ', account_access: ['facebook', 'twitter:x1'] }));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.token).toMatch(/^mb_[0-9a-f]{64}$/);
    expect(data.tokenInfo).toEqual(tokenInfo);

    const [, params] = tokenQueries()[0];
    expect(params).toEqual([
      42,
      createHash('sha256').update(data.token).digest('hex'),
      'Cursor',
      ['facebook', 'twitter:x1'],
    ]);
  });

  it.each([{}, { title: '   ' }, { title: 'x'.repeat(101) }, { title: 7 }])(
    'rejects a token without a valid title: %j',
    async (body) => {
      expect((await POST(request({ ...body, account_access: ['all'] }))).status).toBe(400);
      expect(tokenQueries()).toHaveLength(0);
    }
  );

  it.each([[undefined], [[]], [['all', 'facebook']], [['facebook', 'facebook:p1']], [['twitter:x9']]])(
    'rejects a token with invalid account access: %j',
    async (accountAccess) => {
      const response = await POST(request({ title: 'Cursor', account_access: accountAccess }));

      expect(response.status).toBe(400);
      expect(tokenQueries()).toHaveLength(0);
    }
  );

  it("edits the title and account access of one of the user's tokens", async () => {
    const tokenInfo = { id: 3, title: 'Cursor', account_access: ['all'], created_at: '2026-10-19T00:00:00Z' };
    mockDb([tokenInfo]);

    const response = await PUT(request({ id: 3, title: 'Cursor', account_access: ['all'] }, 'PUT'));

    expect(response.status).toBe(200);
    expect((await response.json()).tokenInfo).toEqual(tokenInfo);
    expect(tokenQueries()[0][1]).toEqual(['Cursor', ['all'], 3, 42]);
  });

  it('returns 404 when editing a token that does not belong to the user', async () => {
    expect((await PUT(request({ id: 99, title: 'Cursor', account_access: ['all'] }, 'PUT'))).status).toBe(404);
  });

  it('rejects editing without a token id or with invalid account access', async () => {
    expect((await PUT(request({ title: 'Cursor', account_access: ['all'] }, 'PUT'))).status).toBe(400);
    expect((await PUT(request({ id: 3, title: 'Cursor', account_access: ['myspace'] }, 'PUT'))).status).toBe(400);
    expect(tokenQueries()).toHaveLength(0);
  });

  it("revokes one of the user's tokens by id", async () => {
    mockDb([], 1);

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

describe('findMcpToken', () => {
  beforeEach(() => jest.clearAllMocks());

  it('looks up the owner and account access by token hash, never the raw token', async () => {
    mockQuery.mockResolvedValue({ rows: [{ user_id: 7, account_access: ['facebook'] }] });

    expect(await findMcpToken('mb_secret')).toEqual({ userId: 7, accountAccess: ['facebook'] });
    expect(mockQuery.mock.calls[0][1]).toEqual([createHash('sha256').update('mb_secret').digest('hex')]);
  });

  it('returns null for unknown tokens', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    expect(await findMcpToken('mb_wrong')).toBeNull();
  });
});
