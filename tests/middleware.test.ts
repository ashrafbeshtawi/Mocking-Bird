jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }));

import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { middleware } from '@/middleware';

const mockGetToken = getToken as jest.Mock;
const run = (pathname: string) => middleware(new NextRequest(`http://localhost${pathname}`));

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue(null);
  });

  it.each(['/impressum', '/privacy', '/terms', '/delete-account'])('lets signed-out visitors open %s', async (pathname) => {
    const response = await run(pathname);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it('redirects signed-out visitors from protected pages to /auth', async () => {
    const response = await run('/dashboard');

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location')!).pathname).toBe('/auth');
  });

  it('forwards the user id to API routes for signed-in users', async () => {
    mockGetToken.mockResolvedValue({ sub: '42' });

    const response = await run('/api/account');

    expect(response.headers.get('x-middleware-request-x-user-id')).toBe('42');
  });
});
