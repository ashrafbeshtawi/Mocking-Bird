import { NextRequest, NextResponse } from 'next/server';

// This route is deprecated - use /api/telegram/verify-channel instead
// Kept for backwards compatibility but will redirect to verification flow

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: 'Please use the verification flow to connect channels',
      redirect: '/api/telegram/verify-channel'
    },
    { status: 400 }
  );
}
