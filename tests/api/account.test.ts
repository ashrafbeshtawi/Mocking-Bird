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

import { DELETE } from '@/app/api/account/route';
import { getAuthUserId } from '@/lib/api-auth';
import { cleanupCloudinaryMedia } from '@/lib/services/cloudinaryService';
import pool from '@/lib/db';
import { revokeYouTubeTokens } from '@/lib/publishers/youtube';

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
      .mockResolvedValueOnce({ rowCount: 1 });

    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(mockCleanup).toHaveBeenCalledWith([{ publicId: 'mocking-bird/uploads/a', resourceType: 'image' }]);
    expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining('DELETE FROM users WHERE id = $1'), ['42']);
  });

  it("revokes the user's YouTube access at Google before deleting the user row", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ refresh_token: 'r1' }, { refresh_token: 'r2' }] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(revokeYouTubeTokens).toHaveBeenCalledWith(['r1', 'r2']);
    expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining('DELETE FROM users WHERE id = $1'), ['42']);
  });

  it('returns 500 and keeps the account when the database fails', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection refused'));

    const response = await DELETE();

    expect(response.status).toBe(500);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
