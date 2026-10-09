import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { publicUrl } from '@/lib/publicUrl';
import { LINKEDIN_CALLBACK_PATH, LINKEDIN_STATE_COOKIE } from '@/lib/linkedinAuth';

/**
 * Starts the LinkedIn OAuth flow: redirects to LinkedIn's consent screen with a
 * state value that the callback checks against the cookie set here.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(publicUrl('/error?statusCode=500&message=LinkedIn is not configured', req));
  }

  const state = randomBytes(16).toString('hex');
  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: publicUrl(LINKEDIN_CALLBACK_PATH, req).toString(),
    state,
    scope: 'openid profile w_member_social',
  }).toString();

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(LINKEDIN_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: LINKEDIN_CALLBACK_PATH,
    maxAge: 600,
  });
  return response;
}
