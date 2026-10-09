import { NextRequest, NextResponse } from 'next/server';
import { publicUrl } from '@/lib/publicUrl';
import { getAuthUserId } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';
import pool from '@/lib/db';
import { LINKEDIN_CALLBACK_PATH, LINKEDIN_STATE_COOKIE } from '@/lib/linkedinAuth';

const logger = createLogger('LinkedInAuthCallback');

const errorRedirect = (req: NextRequest, statusCode: number, message: string) =>
  NextResponse.redirect(publicUrl(`/error?statusCode=${statusCode}&message=${encodeURIComponent(message)}`, req));

/**
 * Completes the LinkedIn OAuth flow: exchanges the code for an access token,
 * reads the member's id and name, and stores the account for the signed-in user.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get('code');
  const state = params.get('state');

  if (params.get('error')) {
    return errorRedirect(req, 400, `LinkedIn authorization was not granted: ${params.get('error_description') ?? params.get('error')}`);
  }
  if (!code || !state || state !== req.cookies.get(LINKEDIN_STATE_COOKIE)?.value) {
    return errorRedirect(req, 400, 'Invalid LinkedIn authorization response');
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return errorRedirect(req, 401, 'Unauthorized');
  }

  try {
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: publicUrl(LINKEDIN_CALLBACK_PATH, req).toString(),
        client_id: process.env.LINKEDIN_CLIENT_ID ?? '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? '',
      }),
    });
    if (!tokenResponse.ok) {
      logger.error('LinkedIn token exchange failed', { status: tokenResponse.status, body: await tokenResponse.text() });
      return errorRedirect(req, 502, 'LinkedIn token exchange failed');
    }
    const { access_token, expires_in } = (await tokenResponse.json()) as { access_token: string; expires_in: number };

    const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!userInfoResponse.ok) {
      logger.error('LinkedIn userinfo failed', { status: userInfoResponse.status });
      return errorRedirect(req, 502, 'Could not read the LinkedIn profile');
    }
    const { sub, name } = (await userInfoResponse.json()) as { sub: string; name?: string };

    await pool.query(
      `INSERT INTO connected_linkedin_accounts (user_id, linkedin_user_id, name, access_token, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + make_interval(secs => $5))
       ON CONFLICT (user_id, linkedin_user_id) DO UPDATE SET
         name = EXCLUDED.name,
         access_token = EXCLUDED.access_token,
         expires_at = EXCLUDED.expires_at`,
      [userId, sub, name ?? 'LinkedIn member', access_token, expires_in]
    );

    const response = NextResponse.redirect(publicUrl('/dashboard', req));
    response.cookies.delete({ name: LINKEDIN_STATE_COOKIE, path: LINKEDIN_CALLBACK_PATH });
    return response;
  } catch (error) {
    logger.error('LinkedIn connection failed', error);
    return errorRedirect(req, 500, 'Something went wrong connecting LinkedIn');
  }
}
