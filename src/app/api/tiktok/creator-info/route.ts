import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';
import { TikTokPublisher } from '@/lib/publishers/tiktok';

const logger = createLogger('TikTokCreatorInfo');

/** The connected TikTok account's current posting options, read fresh from TikTok. */
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const openId = req.nextUrl.searchParams.get('open_id');
  if (!openId) {
    return NextResponse.json({ error: 'open_id is required' }, { status: 400 });
  }

  const publisher = new TikTokPublisher(pool);
  const [token] = await publisher.getAccountTokens(userId, [openId]);
  if (!token) {
    return NextResponse.json({ error: 'TikTok account not found' }, { status: 404 });
  }

  try {
    return NextResponse.json({ success: true, creator: await publisher.creatorInfo(token) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('TikTok creator info failed', { open_id: openId, error: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
