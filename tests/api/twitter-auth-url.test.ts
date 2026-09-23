jest.mock('@/lib/twitter-auth/twitter-client', () => ({
  oauth: {
    authorize: jest.fn(() => ({})),
    toHeader: jest.fn(() => ({ Authorization: 'OAuth test' })),
  },
}));
jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db', () => ({ __esModule: true, default: { query: jest.fn() } }));

import { NextRequest } from 'next/server';
import { GET as startAuth } from '@/app/api/twitter-v1.1/auth/route';
import { GET as callback } from '@/app/api/twitter-v1.1/auth/callback/route';
import { oauth } from '@/lib/twitter-auth/twitter-client';

// Inside the container Next.js builds request.url from its bind address, not the public host.
const internalRequest = (path: string) => new NextRequest(`https://0.0.0.0:3000${path}`);

describe('X OAuth URLs behind a reverse proxy', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NEXTAUTH_URL: 'https://mockingbird.example' };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('sends X the public callback URL', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('oauth_token=t&oauth_token_secret=s'));

    const response = await startAuth(internalRequest('/api/twitter-v1.1/auth'));

    expect(response.status).toBe(200);
    expect(oauth.authorize).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { oauth_callback: 'https://mockingbird.example/api/twitter-v1.1/auth/callback' },
      })
    );
  });

  it('redirects to the public origin after the callback', async () => {
    // No oauth params → the route bails out with an error redirect before touching X or the DB.
    const response = await callback(internalRequest('/api/twitter-v1.1/auth/callback'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toMatch(/^https:\/\/mockingbird\.example\/error\?/);
  });

  it('falls back to the request origin when NEXTAUTH_URL is unset', async () => {
    process.env = { ...originalEnv, NEXTAUTH_URL: undefined };

    const response = await callback(new NextRequest('http://localhost:3000/api/twitter-v1.1/auth/callback'));

    expect(response.headers.get('location')).toMatch(/^http:\/\/localhost:3000\/error\?/);
  });
});
