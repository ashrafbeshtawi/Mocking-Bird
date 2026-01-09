import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

// Validation constants
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 50;
const PASSWORD_MIN_LENGTH = 3;

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    // Input validation
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Invalid input types' }, { status: 400 });
    }

    const trimmedUsername = username.trim();

    if (trimmedUsername.length < USERNAME_MIN_LENGTH || trimmedUsername.length > USERNAME_MAX_LENGTH) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE username = $1', [trimmedUsername]);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not defined');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }

      // Create JWT valid for 30 days
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
      });

      // Create HTTP-only cookie (secure against XSS)
      const cookie = serialize('jwt', token, {
        httpOnly: true,  // FIXED: Prevents JavaScript access
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });

      const res = NextResponse.json({
        success: true,
        message: 'Login successful'
      });
      res.headers.set('Set-Cookie', cookie);
      return res;

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
