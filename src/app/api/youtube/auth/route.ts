import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { publicUrl } from '@/lib/publicUrl';
import { YOUTUBE_CALLBACK_PATH, YOUTUBE_STATE_COOKIE } from '@/lib/youtubeAuth';

/**
 * Starts the YouTube OAuth flow: redirects to Google's consent screen asking for
 * upload access and a refresh token, with a state value the callback checks
 * against the cookie set here.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(publicUrl('/error?statusCode=500&message=YouTube is not configured', req));
  }

  const state = randomBytes(16).toString('hex');
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: publicUrl(YOUTUBE_CALLBACK_PATH, req).toString(),
    state,
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
    // offline + consent: Google returns a refresh token on every connect
    access_type: 'offline',
    prompt: 'consent',
  }).toString();

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(YOUTUBE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: YOUTUBE_CALLBACK_PATH,
    maxAge: 600,
  });
  return response;
}
