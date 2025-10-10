import { POST } from '../../src/app/api/register/route';
import { NextRequest } from 'next/server';
import pool from '@/lib/db'; // Corrected import path
import bcrypt from 'bcrypt';

// Mock the database pool
jest.mock('../../src/lib/db', () => ({
  connect: jest.fn(() => ({
    query: jest.fn(),
    release: jest.fn(),
  })),
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('Register API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if username, email or password are missing', async () => {
    const request = {
      json: async () => ({}),
    } as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({ error: 'Missing fields' });
  });

  it('should return 200 on successful registration', async () => {
    const mockQuery = jest.fn();
    (pool.connect as jest.Mock).mockResolvedValue({
      query: mockQuery,
      release: jest.fn(),
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

    const request = {
      json: async () => ({ username: 'newuser', email: 'newuser@example.com', password: 'password123' }),
    } as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ success: true });
    expect(mockQuery).toHaveBeenCalledWith(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
      ['newuser', 'newuser@example.com', 'hashedpassword']
    );
  });

  it('should return 409 if username or email already exists', async () => {
        // hide console.error output for this test (because we expect an error)
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockQuery = jest.fn(() => {
      const error = new Error('Duplicate key');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error as any).code = '23505'; // PostgreSQL unique violation error code
      throw error;
    });
    (pool.connect as jest.Mock).mockResolvedValue({
      query: mockQuery,
      release: jest.fn(),
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

    const request = {
      json: async () => ({ username: 'existinguser', email: 'existing@example.com', password: 'password123' }),
    } as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data).toEqual({ error: 'Username or email already exists' });
  });

  it('should return 500 for internal server errors', async () => {
    // hide console.error output for this test (because we expect an error)
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (pool.connect as jest.Mock).mockImplementation(() => {
      throw new Error('Database connection error');
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

    const request = {
      json: async () => ({ username: 'testuser', email: 'test@example.com', password: 'password123' }),
    } as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({ error: 'Internal Server Error' });
  });
});
