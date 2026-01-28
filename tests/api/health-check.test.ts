import { GET } from '../../src/app/api/health-check/route';

// Mock the auth module
jest.mock('../../src/lib/api-auth', () => ({
  getAuthUserId: jest.fn(),
}));

import { getAuthUserId } from '../../src/lib/api-auth';

const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;

describe('Health Check API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a 200 status, loggedIn: false, and null userId for an unauthenticated user', async () => {
    mockGetAuthUserId.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ status: 'ok', loggedIn: false, userId: null });
  });

  it('should return a 200 status, loggedIn: true, and user ID for an authenticated user', async () => {
    mockGetAuthUserId.mockResolvedValue('test-user-id');

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ status: 'ok', loggedIn: true, userId: 'test-user-id' });
  });
});
