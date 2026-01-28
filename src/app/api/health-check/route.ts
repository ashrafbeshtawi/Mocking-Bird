import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';

export async function GET() {
  const userId = await getAuthUserId();

  if (userId) {
    return NextResponse.json({ status: 'ok', loggedIn: true, userId: userId }, { status: 200 });
  } else {
    return NextResponse.json({ status: 'ok', loggedIn: false, userId: null }, { status: 200 });
  }
}
