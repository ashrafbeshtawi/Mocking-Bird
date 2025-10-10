import { POST } from '../../src/app/api/login/route';
import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { connect: jest.fn() },
}));

import pool from '@/lib/db';
const mockConnect = pool.connect as jest.Mock;
const mockQuery = jest.fn();
const mockRelease = jest.fn();

jest.mock('bcrypt', () => ({ compare: jest.fn() }));
jest.mock('jsonwebtoken', () => ({ sign: jest.fn() }));
jest.mock('cookie', () => ({ serialize: jest.fn() }));


// ---- TESTS ----
describe('Login API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test_jwt_secret';
  });

  it('should return 400 if username or password are missing', async () => {
    const request = { json: async () => ({}) } as NextRequest;
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({ error: 'Missing fields' });
  });

  it('should return 401 if user not found', async () => {
    mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease });
    mockQuery.mockResolvedValue({ rows: [] });

    const request = {
      json: async () => ({ username: 'testuser', password: 'password123' }),
    } as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toEqual({ error: 'Invalid credentials' });
  });

  it('should return 401 if password does not match', async () => {
    mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease });
    mockQuery.mockResolvedValue({ rows: [{ id: 1, username: 'testuser', password_hash: 'hashed' }] });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const request = {
      json: async () => ({ username: 'testuser', password: 'wrongpassword' }),
    } as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should return 200 and set cookie on successful login', async () => {
    mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease });
    mockQuery.mockResolvedValue({ rows: [{ id: 1, username: 'testuser', password_hash: 'hashed' }] });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('mock_jwt_token');
    (serialize as jest.Mock).mockReturnValue('jwt=mock_jwt_token; Path=/;');

    const request = {
      json: async () => ({ username: 'testuser', password: 'password123' }),
    } as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('Set-Cookie')).toContain('jwt=mock_jwt_token');
  });

});
