jest.mock('@/lib/api-auth', () => ({
  getAuthUserId: jest.fn(),
}));

jest.mock('@/lib/db', () => {
  const query = jest.fn();
  return { __esModule: true, default: { query, connect: jest.fn(async () => ({ query, release: jest.fn() })) } };
});

import { GET, POST, PUT, DELETE } from '@/app/api/drafts/route';
import { getAuthUserId } from '@/lib/api-auth';
import pool from '@/lib/db';

const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;
const mockQuery = pool.query as jest.Mock;

const draftRow = {
  id: 1,
  text: 'hello',
  target_accounts: [{ platform: 'facebook', account_id: 'p1' }],
  media: null,
  youtube_title: '',
  tiktok_settings: null,
  created_at: '2026-09-11T00:00:00Z',
  updated_at: '2026-09-11T00:00:00Z',
};

const tiktokSettings = {
  privacyLevel: 'SELF_ONLY',
  allowComment: true,
  allowDuet: false,
  allowStitch: false,
  isYourBrand: true,
  isBrandedContent: false,
};

const sqlCalls = (): string[] => mockQuery.mock.calls.map(([sql]) => (sql as string).trim());
const callTo = (prefix: string) => mockQuery.mock.calls.find(([sql]) => (sql as string).trim().startsWith(prefix))!;

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
    expect(mockQuery.mock.calls[0][1]).toEqual([42, null, null, null]);
    expect(mockQuery.mock.calls[1][1]).toEqual([42, null, null, null, 20, 0]);
  });

  it('fetches a single draft by id', async () => {
    mockQuery.mockResolvedValue({ rows: [draftRow] });

    const response = await GET(getRequest('?id=1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.draft).toEqual({ ...draftRow, target_platforms: ['facebook'] });
    expect(mockQuery.mock.calls[0][1]).toEqual([1, 42]);
  });

  it('returns 404 for a draft that is not owned', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    expect((await GET(getRequest('?id=99'))).status).toBe(404);
  });

  it('escapes ILIKE wildcards in search and clamps pagination', async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: '0' }] });

    await GET(getRequest('?q=100%25_done&limit=500&offset=-5'));

    const pattern = '%100\\%\\_done%';
    expect(mockQuery.mock.calls[0][1]).toEqual([42, pattern, null, null]);
    expect(mockQuery.mock.calls[1][1]).toEqual([42, pattern, null, null, 100, 0]);
  });

  it.each([[{ platform: 'myspace', account_id: 'a1' }], [{ platform: 'facebook' }], ['facebook']])(
    'rejects a draft with an invalid target account: %j',
    async (target) => {
      const response = await POST(request('POST', { text: 'hi', target_accounts: [target] }));

      expect(response.status).toBe(400);
      expect(mockQuery).not.toHaveBeenCalled();
    }
  );

  it('rejects a draft with neither text nor media', async () => {
    const response = await POST(request('POST', { text: '   ' }));

    expect(response.status).toBe(400);
  });

  it('creates a valid draft', async () => {
    mockQuery.mockResolvedValue({ rows: [draftRow] });

    const response = await POST(
      request('POST', {
        text: 'hello',
        target_accounts: [
          { platform: 'facebook', account_id: 'p1' },
          { platform: 'facebook', account_id: 'p1' },
        ],
      })
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.draft).toEqual({ ...draftRow, target_platforms: ['facebook'] });
    expect(callTo('INSERT INTO drafts ')[1]).toEqual([
      'hello',
      JSON.stringify([{ platform: 'facebook', account_id: 'p1' }]),
      null,
      '',
      42,
    ]);
    expect(sqlCalls()).toEqual(expect.arrayContaining(['BEGIN', 'COMMIT']));
    expect(sqlCalls().some((sql) => sql.includes('drafts_tiktok WHERE'))).toBe(false);
  });

  it('stores the YouTube title and the suggested TikTok settings with the draft', async () => {
    mockQuery.mockResolvedValue({ rows: [draftRow] });

    const response = await POST(request('POST', { text: 'hello', youtube_title: ' Launch ', tiktok_settings: tiktokSettings }));

    expect(response.status).toBe(201);
    expect(callTo('INSERT INTO drafts ')[1][3]).toBe('Launch');
    expect(callTo('INSERT INTO drafts_tiktok')[1]).toEqual([1, 'SELF_ONLY', true, false, false, true, false]);
  });

  it.each([
    ['without a visibility', { ...tiktokSettings, privacyLevel: '' }],
    ['with a missing toggle', { privacyLevel: 'SELF_ONLY' }],
    ['as private branded content', { ...tiktokSettings, isBrandedContent: true }],
  ])('rejects TikTok settings %s', async (_case, settings) => {
    const response = await POST(request('POST', { text: 'hello', tiktok_settings: settings }));

    expect(response.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects a YouTube title YouTube would refuse', async () => {
    const response = await POST(request('POST', { text: 'hello', youtube_title: 'a <b>' }));

    expect(response.status).toBe(400);
  });

  it('keeps the TikTok suggestion when an update leaves it out', async () => {
    mockQuery.mockResolvedValue({ rows: [draftRow] });

    const response = await PUT(request('PUT', { id: 1, text: 'hello' }));

    expect(response.status).toBe(200);
    expect(sqlCalls().some((sql) => sql.includes('drafts_tiktok WHERE'))).toBe(false);
  });

  it('removes the TikTok suggestion when an update sets it to null', async () => {
    mockQuery.mockResolvedValue({ rows: [draftRow] });

    await PUT(request('PUT', { id: 1, text: 'hello', tiktok_settings: null }));

    expect(callTo('DELETE FROM drafts_tiktok')[1]).toEqual([1]);
    expect(sqlCalls().some((sql) => sql.includes('INSERT INTO drafts_tiktok'))).toBe(false);
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
    expect(data).toEqual({ success: true, deletedCount: 1 });
    expect(mockQuery.mock.calls[0][1]).toEqual([[1], 42]);
  });

  it('deletes several owned drafts at once', async () => {
    mockQuery.mockResolvedValue({ rowCount: 3, rows: [] });

    const response = await DELETE(request('DELETE', { ids: [1, 2, 3] }));

    expect(response.status).toBe(200);
    expect((await response.json()).deletedCount).toBe(3);
    expect(mockQuery.mock.calls[0][0]).toContain('user_id = $2');
    expect(mockQuery.mock.calls[0][1]).toEqual([[1, 2, 3], 42]);
  });

  it.each([{}, { ids: [] }, { ids: [1, 'x'] }, { id: -1 }])('rejects invalid delete input %j', async (body) => {
    const response = await DELETE(request('DELETE', body));

    expect(response.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('filters the list by target platform', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] }).mockResolvedValueOnce({ rows: [draftRow] });

    await GET(getRequest('?platform=facebook'));

    expect(mockQuery.mock.calls[0][1]).toEqual([42, null, 'facebook', null]);
    expect(mockQuery.mock.calls[1][0]).toContain(
      "target_accounts @> jsonb_build_array(jsonb_build_object('platform', $3::text))"
    );
  });

  it('ignores an unknown platform filter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] }).mockResolvedValueOnce({ rows: [draftRow] });

    await GET(getRequest('?platform=myspace'));

    expect(mockQuery.mock.calls[0][1]).toEqual([42, null, null, null]);
  });
});
