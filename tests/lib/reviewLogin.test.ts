jest.mock('next-auth/providers/credentials', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

import { authorizeReviewer } from '@/lib/reviewLogin';
import pool from '@/lib/db';

const mockQuery = pool.query as jest.Mock;

describe('authorizeReviewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REVIEW_LOGIN_USERNAME = 'tiktok-review';
    process.env.REVIEW_LOGIN_PASSWORD = 's3cret-pass';
    mockQuery.mockResolvedValue({ rows: [{ id: 9 }] });
  });

  afterAll(() => {
    delete process.env.REVIEW_LOGIN_USERNAME;
    delete process.env.REVIEW_LOGIN_PASSWORD;
  });

  it('signs in the review user with the configured username and password', async () => {
    const user = await authorizeReviewer({ username: 'tiktok-review', password: 's3cret-pass' });

    expect(user).toEqual({ id: '9', name: 'tiktok-review', email: 'tiktok-review@review.invalid' });
    expect(mockQuery.mock.calls[0][1]).toEqual(['tiktok-review', 'tiktok-review@review.invalid']);
  });

  it('rejects a wrong password', async () => {
    expect(await authorizeReviewer({ username: 'tiktok-review', password: 'guess' })).toBeNull();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects every login while the environment variables are unset', async () => {
    delete process.env.REVIEW_LOGIN_PASSWORD;

    expect(await authorizeReviewer({ username: 'tiktok-review', password: '' })).toBeNull();
  });
});
