import { GET } from '../../src/app/api/health-check/route';
import { NextRequest } from 'next/server';

describe('Health Check API', () => {
  it('should return a 200 status, loggedIn: false, and null userId for an unauthenticated user', async () => {
    const request = {
      url: 'http://localhost:3000/api/health-check',
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ status: 'ok', loggedIn: false, userId: null });
  });

  it('should return a 200 status, loggedIn: true, and user ID for an authenticated user', async () => {
    const request = {
      url: 'http://localhost:3000/api/health-check',
      headers: new Headers({ 'x-user-id': 'test-user-id' }),
    } as unknown as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ status: 'ok', loggedIn: true, userId: 'test-user-id' });
  });
});
