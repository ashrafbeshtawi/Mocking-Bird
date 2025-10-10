import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const userId = req.headers.get('x-user-id');

  if (userId) {
    return NextResponse.json({ status: 'ok', loggedIn: true, userId: userId }, { status: 200 });
  } else {
    return NextResponse.json({ status: 'ok', loggedIn: false, userId: null }, { status: 200 });
  }
}
