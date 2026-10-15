import { NextRequest, NextResponse } from 'next/server';
import { publicUrl } from '@/lib/publicUrl';
import { getAuthUserId } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';
import pool from '@/lib/db';
import { TIKTOK_API_URL, TIKTOK_CALLBACK_PATH, TIKTOK_STATE_COOKIE, TIKTOK_TOKEN_URL } from '@/lib/tiktok';

const logger = createLogger('TikTokAuthCallback');

const errorRedirect = (req: NextRequest, statusCode: number, message: string) =>
  NextResponse.redirect(publicUrl(`/error?statusCode=${statusCode}&message=${encodeURIComponent(message)}`, req));

/**
 * Completes the TikTok OAuth flow: exchanges the code for tokens, reads the
 * account's display name, and stores the account for the signed-in user.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get('code');
  const state = params.get('state');

  if (params.get('error')) {
    return errorRedirect(req, 400, `TikTok authorization was not granted: ${params.get('error')}`);
  }
  if (!code || !state || state !== req.cookies.get(TIKTOK_STATE_COOKIE)?.value) {
    return errorRedirect(req, 400, 'Invalid TikTok authorization response');
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return errorRedirect(req, 401, 'Unauthorized');
  }

  try {
    const tokenResponse = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY ?? '',
        client_secret: process.env.TIKTOK_CLIENT_SECRET ?? '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: publicUrl(TIKTOK_CALLBACK_PATH, req).toString(),
      }),
    });
    const token = (await tokenResponse.json().catch(() => null)) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      open_id?: string;
      scope?: string;
    } | null;
    if (!tokenResponse.ok || !token?.access_token || !token.refresh_token || !token.open_id || !token.expires_in) {
      logger.error('TikTok token exchange failed', { status: tokenResponse.status, body: token });
      return errorRedirect(req, 502, 'TikTok token exchange failed');
    }
    if (!token.scope?.split(',').includes('video.publish')) {
      return errorRedirect(req, 400, 'MockingBird needs permission to post videos to TikTok');
    }

    const userResponse = await fetch(`${TIKTOK_API_URL}/v2/user/info/?fields=open_id,display_name`, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const userBody = (await userResponse.json().catch(() => null)) as {
      data?: { user?: { display_name?: string } };
    } | null;
    if (!userResponse.ok) {
      logger.error('TikTok user info failed', { status: userResponse.status });
      return errorRedirect(req, 502, 'Could not read the TikTok account');
    }
    const displayName = userBody?.data?.user?.display_name || 'TikTok account';

    await pool.query(
      `INSERT INTO connected_tiktok_accounts (user_id, open_id, display_name, access_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + make_interval(secs => $6))
       ON CONFLICT (user_id, open_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         expires_at = EXCLUDED.expires_at`,
      [userId, token.open_id, displayName, token.access_token, token.refresh_token, token.expires_in]
    );

    const response = NextResponse.redirect(publicUrl('/dashboard', req));
    response.cookies.delete({ name: TIKTOK_STATE_COOKIE, path: TIKTOK_CALLBACK_PATH });
    return response;
  } catch (error) {
    logger.error('TikTok connection failed', error);
    return errorRedirect(req, 500, 'Something went wrong connecting TikTok');
  }
}
