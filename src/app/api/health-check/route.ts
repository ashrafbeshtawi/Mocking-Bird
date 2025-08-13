// /app/api/me/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // Middleware will reject invalid JWT before this runs
  return NextResponse.json({ user: { id: req.headers.get('x-user-id') } });
}
