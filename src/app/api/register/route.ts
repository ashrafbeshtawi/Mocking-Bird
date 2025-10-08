import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcrypt';

export async function POST(req: Request) {
  const { username, email, password } = await req.json();

  if (!username || !email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
        [username, email, hashedPassword]
      );
    } finally {
      client.release();
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
