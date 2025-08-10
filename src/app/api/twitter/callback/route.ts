// app/api/twitter/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOAuth } from '@/lib/twitter-oauth';
import axios from 'axios';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const oauth_token = searchParams.get('oauth_token');
  const oauth_verifier = searchParams.get('oauth_verifier');

  const oauth_token_secret = req.cookies.get('twitter_oauth_token_secret')?.value;

  if (!oauth_token || !oauth_verifier || !oauth_token_secret) {
    return NextResponse.json({ error: 'Missing OAuth info' }, { status: 400 });
  }
  console.log('Received OAuth token and verifier:', oauth_token, oauth_verifier);

  const oauth = getOAuth();

  const requestData = {
    url: 'https://api.twitter.com/oauth/access_token',
    method: 'POST',
    data: {
      oauth_token,
      oauth_verifier,
    },
  };

  const headers = oauth.toHeader(
    oauth.authorize(requestData, {
      key: oauth_token,
      secret: oauth_token_secret,
    })
  );

  const response = await axios.post(
    requestData.url,
    new URLSearchParams({ oauth_verifier }),
    {
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const result = Object.fromEntries(new URLSearchParams(response.data));

  // Example: { oauth_token, oauth_token_secret, user_id, screen_name }
  // You can store these in DB or session
  return NextResponse.json(result);
}
