// app/api/tweet/route.ts
import { tweet } from '@/lib/twitter';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { text } = await req.json();

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Invalid tweet text' }, { status: 400 });
  }

  try {
    const response = await tweet(text);
    return NextResponse.json({ success: true, tweet: response });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}
