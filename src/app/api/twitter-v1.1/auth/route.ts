import { NextRequest, NextResponse } from 'next/server';
import { oauth } from '@/lib/twitter-auth/twitter-client';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const callbackUrl = url.origin + `/api/twitter-v1.1/auth/callback`;

  const requestData = {
    url: 'https://api.twitter.com/oauth/request_token',
    method: 'POST',
    data: { oauth_callback: callbackUrl },
  };


  try {
    const response = await fetch(requestData.url, {
      method: requestData.method,
      headers: { ...oauth.toHeader(oauth.authorize(requestData)) },
    });

    const text = await response.text();
    const params = new URLSearchParams(text);
    const oauthToken = params.get('oauth_token');
    const oauthTokenSecret = params.get('oauth_token_secret');

    if (!oauthToken || !oauthTokenSecret) {
        return NextResponse.json({ error: 'Something went wrong with the Twitter authentication' }, { status: 401 });
    }

    // Store token secret temporarily (use Redis/DB in production)
    // For demo, we'll pass it as state parameter (NOT SECURE - use session storage)
    const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`;
    
    return NextResponse.json({ 
      authUrl,
      oauthTokenSecret // Store this securely in your session/database
    });
  } catch (error) {
    console.error('Twitter auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
