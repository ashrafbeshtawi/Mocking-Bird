import { NextRequest, NextResponse } from 'next/server';
import { publicUrl } from '@/lib/publicUrl';
import { getAuthUserId } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';
import pool from '@/lib/db';
import { GOOGLE_TOKEN_URL, YOUTUBE_CALLBACK_PATH, YOUTUBE_STATE_COOKIE } from '@/lib/youtubeAuth';

const logger = createLogger('YouTubeAuthCallback');

const errorRedirect = (req: NextRequest, statusCode: number, message: string) =>
  NextResponse.redirect(publicUrl(`/error?statusCode=${statusCode}&message=${encodeURIComponent(message)}`, req));

/**
 * Completes the YouTube OAuth flow: exchanges the code for tokens, reads the
 * channel the user granted access to, and stores it for the signed-in user.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get('code');
  const state = params.get('state');

  if (params.get('error')) {
    return errorRedirect(req, 400, `YouTube authorization was not granted: ${params.get('error')}`);
  }
  if (!code || !state || state !== req.cookies.get(YOUTUBE_STATE_COOKIE)?.value) {
    return errorRedirect(req, 400, 'Invalid YouTube authorization response');
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return errorRedirect(req, 401, 'Unauthorized');
  }

  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: publicUrl(YOUTUBE_CALLBACK_PATH, req).toString(),
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      }),
    });
    if (!tokenResponse.ok) {
      logger.error('YouTube token exchange failed', { status: tokenResponse.status, body: await tokenResponse.text() });
      return errorRedirect(req, 502, 'YouTube token exchange failed');
    }
    const { access_token, refresh_token, expires_in } = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
    if (!refresh_token) {
      return errorRedirect(req, 502, 'Google did not grant offline access to YouTube');
    }

    const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!channelResponse.ok) {
      logger.error('YouTube channels.list failed', { status: channelResponse.status });
      return errorRedirect(req, 502, 'Could not read the YouTube channel');
    }
    const { items = [] } = (await channelResponse.json()) as { items?: { id: string; snippet: { title: string } }[] };
    if (items.length === 0) {
      return errorRedirect(req, 400, 'This Google account has no YouTube channel');
    }

    for (const channel of items) {
      await pool.query(
        `INSERT INTO connected_youtube_channels (user_id, channel_id, title, access_token, refresh_token, expires_at)
         VALUES ($1, $2, $3, $4, $5, NOW() + make_interval(secs => $6))
         ON CONFLICT (user_id, channel_id) DO UPDATE SET
           title = EXCLUDED.title,
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           expires_at = EXCLUDED.expires_at`,
        [userId, channel.id, channel.snippet.title, access_token, refresh_token, expires_in]
      );
    }

    const response = NextResponse.redirect(publicUrl('/dashboard', req));
    response.cookies.delete({ name: YOUTUBE_STATE_COOKIE, path: YOUTUBE_CALLBACK_PATH });
    return response;
  } catch (error) {
    logger.error('YouTube connection failed', error);
    return errorRedirect(req, 500, 'Something went wrong connecting YouTube');
  }
}
