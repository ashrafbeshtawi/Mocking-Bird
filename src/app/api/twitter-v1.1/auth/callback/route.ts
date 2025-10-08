import { NextRequest, NextResponse } from 'next/server';
import { oauth } from '@/lib/twitter-auth/twitter-client';
import { verifyAuthToken } from '@/lib/auth-utils';
import pool from '@/lib/db';


export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const oauthToken = searchParams.get('oauth_token');
  const oauthVerifier = searchParams.get('oauth_verifier');

  
  // Retrieve the oauth_token_secret you stored earlier
  const oauthTokenSecret = req.cookies.get('twitter_oauth_secret')?.value;
  const tempJwt = req.cookies.get('temp_jwt')?.value;



  if (!oauthToken || !oauthVerifier || !oauthTokenSecret || !tempJwt) {
    return NextResponse.redirect(new URL('/error?statusCode=500&message=Missing parameters (oauth_token, oauth_verifier, oauth_token_secret, temp_jwt)', req.url));
  }
   const userId = await verifyAuthToken(tempJwt);

  const requestData = {
    url: 'https://api.twitter.com/oauth/access_token',
    method: 'POST',
  };

  const token = {
    key: oauthToken,
    secret: oauthTokenSecret,
  };

  try {
    const authHeader = oauth.toHeader(
      oauth.authorize(requestData, token)
    );

    const response = await fetch(
      `${requestData.url}?oauth_verifier=${oauthVerifier}`,
      {
        method: requestData.method,
        headers: { ...authHeader },
      }
    );

    const text = await response.text();
    const params = new URLSearchParams(text);
    
    const accessToken = params.get('oauth_token');
    const accessTokenSecret = params.get('oauth_token_secret');
    const xUserId = params.get('user_id'); // Renamed to avoid conflict with app userId
    const screenName = params.get('screen_name');

    if (!accessToken || !accessTokenSecret || !xUserId || !screenName) {
      return NextResponse.redirect(new URL('/error?statusCode=500&message=Failed to get access token or user details from Twitter', req.url));
    }

    // Insert into database
    await pool.query(
      `INSERT INTO connected_x_accounts_v1_1 (user_id, access_token, access_token_secret, x_user_id, screen_name)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, x_user_id) DO UPDATE SET
         access_token = EXCLUDED.access_token,
         access_token_secret = EXCLUDED.access_token_secret,
         screen_name = EXCLUDED.screen_name`,
      [userId, accessToken, accessTokenSecret, xUserId, screenName]
    );

    return NextResponse.redirect(
      new URL(`/dashboard`, req.url)
    );
  } catch (error) {
    console.error('Token exchange or database insertion error:', error);
    return NextResponse.redirect(new URL('/error?statusCode=500&message=Something went wrong with the Twitter authentication or saving credentials', req.url));
  }
}
