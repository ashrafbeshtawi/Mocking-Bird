import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { publicUrl } from '@/lib/publicUrl';
import { TIKTOK_CALLBACK_PATH, TIKTOK_STATE_COOKIE } from '@/lib/tiktok';

/**
 * Starts the TikTok OAuth flow: redirects to TikTok's consent screen asking for
 * the account's profile and post access, with a state value the callback checks
 * against the cookie set here.
 */
export async function GET(req: NextRequest) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    return NextResponse.redirect(publicUrl('/error?statusCode=500&message=TikTok is not configured', req));
  }

  const state = randomBytes(16).toString('hex');
  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
  authUrl.search = new URLSearchParams({
    client_key: clientKey,
    response_type: 'code',
    scope: 'user.info.basic,video.publish',
    redirect_uri: publicUrl(TIKTOK_CALLBACK_PATH, req).toString(),
    state,
  }).toString();

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(TIKTOK_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: TIKTOK_CALLBACK_PATH,
    maxAge: 600,
  });
  return response;
}
