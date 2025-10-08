import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

export async function POST(req: Request) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
      }

      // Create JWT valid for 30 days
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
      });

      // Create HTTP-only cookie
      const cookie = serialize('jwt', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });

      const res = NextResponse.json({ message: 'Login successful' });
      res.headers.set('Set-Cookie', cookie);
      return res;

    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
