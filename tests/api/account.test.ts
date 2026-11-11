jest.mock('@/lib/api-auth', () => ({
  getAuthUserId: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

jest.mock('@/lib/services/cloudinaryService', () => ({
  cleanupCloudinaryMedia: jest.fn(),
}));

jest.mock('@/lib/publishers/youtube', () => ({
  revokeYouTubeTokens: jest.fn(),
}));

jest.mock('@/lib/publishers/tiktok', () => ({
  revokeTikTokTokens: jest.fn(),
}));

import { DELETE } from '@/app/api/account/route';
import { getAuthUserId } from '@/lib/api-auth';
import { cleanupCloudinaryMedia } from '@/lib/services/cloudinaryService';
import pool from '@/lib/db';
import { revokeYouTubeTokens } from '@/lib/publishers/youtube';
import { revokeTikTokTokens } from '@/lib/publishers/tiktok';

const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;
const mockQuery = pool.query as jest.Mock;
const mockCleanup = cleanupCloudinaryMedia as jest.Mock;

describe('DELETE /api/account', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue('42');
  });

  it('rejects unauthenticated requests', async () => {
    mockGetAuthUserId.mockResolvedValue(null);

    const response = await DELETE();

    expect(response.status).toBe(401);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("removes the user's unpublished Cloudinary media, then the user row", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { media: { publicId: 'mocking-bird/uploads/a', resourceType: 'image' } },
          { media: { publicUrl: 'https://example.com/external.jpg' } }, // no publicId → nothing to delete
          { media: null },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(mockCleanup).toHaveBeenCalledWith([{ publicId: 'mocking-bird/uploads/a', resourceType: 'image' }]);
    expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining('DELETE FROM users WHERE id = $1'), ['42']);
  });

  it("removes a video's custom thumbnail together with the video", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ media: { publicId: 'v1', resourceType: 'video', thumbnail: { publicId: 't1', publicUrl: 'https://x/t1.jpg' } } }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 1 });

    await DELETE();

    expect(mockCleanup).toHaveBeenCalledWith([
      { publicId: 'v1', resourceType: 'video' },
      { publicId: 't1', resourceType: 'image' },
    ]);
  });

  it("revokes the user's YouTube access at Google before deleting the user row", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ refresh_token: 'r1' }, { refresh_token: 'r2' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(revokeYouTubeTokens).toHaveBeenCalledWith(['r1', 'r2']);
    expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining('DELETE FROM users WHERE id = $1'), ['42']);
  });

  it("revokes the user's TikTok access before deleting the user row", async () => {
    const tiktokAccount = { access_token: 'a1', refresh_token: 'r1', expires_at: new Date() };
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [tiktokAccount] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(revokeTikTokTokens).toHaveBeenCalledWith([tiktokAccount]);
    expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining('DELETE FROM users WHERE id = $1'), ['42']);
  });

  it('returns 500 and keeps the account when the database fails', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection refused'));

    const response = await DELETE();

    expect(response.status).toBe(500);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
