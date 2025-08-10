// app/api/twitter/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOAuth } from '@/lib/twitter-oauth';
import axios from 'axios';

export async function GET(req: NextRequest) {
  try {
    const oauth = getOAuth();
    console.log('OAuth instance created');

    const requestData = {
      url: 'https://api.twitter.com/oauth/request_token',
      method: 'POST',
      data: {
        oauth_callback: process.env.X_CALLBACK_URL!,
      },
    };

    // Generate OAuth headers
    const oauthHeaders = oauth.toHeader(oauth.authorize(requestData));
    
    const headers = {
      ...oauthHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    console.log('Making request to Twitter API...');
    
    // Make the request with proper data formatting
    const response = await axios.post(
      requestData.url, 
      new URLSearchParams(requestData.data).toString(), 
      { headers }
    );

    console.log('Twitter API response received');

    // Parse the response
    const params = new URLSearchParams(response.data);
    const oauth_token = params.get('oauth_token');
    const oauth_token_secret = params.get('oauth_token_secret');

    if (!oauth_token || !oauth_token_secret) {
      console.error('Missing oauth tokens in response:', response.data);
      return NextResponse.json(
        { error: 'Failed to get OAuth tokens from Twitter' },
        { status: 500 }
      );
    }

    console.log('OAuth tokens received, redirecting to Twitter...');

    // Redirect to Twitter for authentication
    const res = NextResponse.redirect(
      `https://api.twitter.com/oauth/authenticate?oauth_token=${oauth_token}`
    );

    // Store the token secret securely in httpOnly cookie
    res.cookies.set('twitter_oauth_token_secret', oauth_token_secret, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60, // 15 minutes
    });

    const jwt = req.nextUrl.searchParams.get('jwt');
    console.log('JWT from URL parameter:', jwt);

    if (jwt) {
      res.cookies.set('jwt', jwt, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15 * 60, // 15 minutes
      });
    }

    return res;
  } catch (error) {
    console.error('Twitter OAuth error:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      console.error('Response headers:', error.response?.headers);
    }

    return NextResponse.json(
      { error: 'Twitter authentication failed' },
      { status: 500 }
    );
  }
}
