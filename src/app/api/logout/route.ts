// /app/api/logout/route.ts
import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

export async function POST() {
  // Expire the cookie immediately
  const cookie = serialize('jwt', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0), // Expire now
    path: '/',
  });

  const res = NextResponse.json({ message: 'Logged out successfully' });
  res.headers.set('Set-Cookie', cookie);
  return res;
}
