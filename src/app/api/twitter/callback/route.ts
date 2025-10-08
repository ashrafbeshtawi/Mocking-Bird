// app/api/twitter/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import pool from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const jwt = req.cookies.get('temp_jwt')?.value;

    if (!code || !jwt) {
      return NextResponse.json({ error: 'Missing code or JWT' }, { status: 400 });
    }

    const userId = await verifyAuthToken(jwt);
    console.log('OAuth2 code received:', code, 'for user:', userId);

    const codeVerifier = req.cookies.get('twitter_pkce_verifier')?.value;
    if (!codeVerifier) {
      return NextResponse.json({ error: 'Missing PKCE code verifier' }, { status: 400 });
    }

    // Exchange code for access + refresh tokens
    const tokenResponse = await axios.post(
      'https://api.twitter.com/2/oauth2/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.X_CALLBACK_URL!,
        code_verifier: codeVerifier,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64')}`,
        },
      }
    );

    const { access_token, refresh_token, expires_in, scope, token_type } = tokenResponse.data;
    console.log('Token exchange successful:', {
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      expiresIn: expires_in,
      grantedScopes: scope,
      tokenType: token_type
    });

    if (!access_token) {
      return NextResponse.json({ error: 'Failed to get access token from Twitter' }, { status: 500 });
    }

    // Fetch authenticated user's info
    const userResponse = await axios.get('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { id: xUserId, username } = userResponse.data.data;
    if (!xUserId || !username) {
      return NextResponse.json({ error: 'Failed to get user info from Twitter' }, { status: 500 });
    }

    // Store or update the Twitter account in DB
    const client = await pool.connect();
    try {
      const existingAccount = await client.query(
        'SELECT id FROM connected_x_accounts WHERE user_id = $1 AND x_user_id = $2',
        [userId, xUserId]
      );

      const grantedScopesArray = scope?.split(' ') || [];

      if (existingAccount.rows.length > 0) {
        await client.query(
          `UPDATE connected_x_accounts
           SET oauth_token = $1,
               refresh_token = $2,
               username = $3,
               expires_in = $4,
               granted_scopes = $5
           WHERE user_id = $6 AND x_user_id = $7`,
          [access_token, refresh_token, username, expires_in, grantedScopesArray, userId, xUserId]
        );
        console.log(`Updated X account for user ${userId}: ${username}`);
      } else {
        await client.query(
          `INSERT INTO connected_x_accounts
             (user_id, oauth_token, refresh_token, x_user_id, username, expires_in, granted_scopes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, access_token, refresh_token, xUserId, username, expires_in, grantedScopesArray]
        );
        console.log(`Connected new X account for user ${userId}: ${username}`);
      }

      // Close the OAuth popup/tab
      return new NextResponse(`<script>window.close();</script>`, {
        headers: { 'Content-Type': 'text/html' }
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Twitter OAuth2 callback error:', err);
    return NextResponse.json({ error: 'Failed to process Twitter OAuth2 callback' }, { status: 500 });
  }
}
