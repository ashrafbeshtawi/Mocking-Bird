jest.mock('@/lib/api-auth', () => ({
  getAuthUserId: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

import { GET, POST, PUT, DELETE } from '@/app/api/drafts/route';
import { getAuthUserId } from '@/lib/api-auth';
import pool from '@/lib/db';

const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;
const mockQuery = pool.query as jest.Mock;

const draftRow = {
  id: 1,
  text: 'hello',
  target_platforms: ['facebook'],
  media: null,
  created_at: '2026-09-11T00:00:00Z',
  updated_at: '2026-09-11T00:00:00Z',
};

const request = (method: string, body: unknown) =>
  new Request('http://localhost/api/drafts', { method, body: JSON.stringify(body) });

describe('Drafts API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue('42');
  });

  const getRequest = (params = '') => new Request(`http://localhost/api/drafts${params}`);

  it('rejects unauthenticated requests', async () => {
    mockGetAuthUserId.mockResolvedValue(null);

    const response = await GET(getRequest());

    expect(response.status).toBe(401);
  });

  it('lists drafts for the current user with pagination info', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '7' }] })
      .mockResolvedValueOnce({ rows: [draftRow] });

    const response = await GET(getRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.drafts).toHaveLength(1);
    expect(data.total).toBe(7);
    expect(mockQuery.mock.calls[0][1]).toEqual([42, null]);
    expect(mockQuery.mock.calls[1][1]).toEqual([42, null, 20, 0]);
  });

  it('escapes ILIKE wildcards in search and clamps pagination', async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: '0' }] });

    await GET(getRequest('?q=100%25_done&limit=500&offset=-5'));

    const pattern = '%100\\%\\_done%';
    expect(mockQuery.mock.calls[0][1]).toEqual([42, pattern]);
    expect(mockQuery.mock.calls[1][1]).toEqual([42, pattern, 100, 0]);
  });

  it('rejects a draft with an unknown target platform', async () => {
    const response = await POST(request('POST', { text: 'hi', target_platforms: ['myspace'] }));

    expect(response.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects a draft with neither text nor media', async () => {
    const response = await POST(request('POST', { text: '   ' }));

    expect(response.status).toBe(400);
  });

  it('creates a valid draft', async () => {
    mockQuery.mockResolvedValue({ rows: [draftRow] });

    const response = await POST(
      request('POST', { text: 'hello', target_platforms: ['facebook'] })
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.draft).toEqual(draftRow);
    expect(mockQuery.mock.calls[0][1]).toEqual([42, 'hello', ['facebook'], null]);
  });

  it('returns 404 when updating a draft that is not owned', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const response = await PUT(request('PUT', { id: 99, text: 'hello' }));

    expect(response.status).toBe(404);
  });

  it('deletes an owned draft', async () => {
    mockQuery.mockResolvedValue({ rowCount: 1, rows: [] });

    const response = await DELETE(request('DELETE', { id: 1 }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockQuery.mock.calls[0][1]).toEqual([1, 42]);
  });
});
