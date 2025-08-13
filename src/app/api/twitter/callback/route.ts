// app/api/twitter/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOAuth } from '@/lib/twitter-oauth';
import axios from 'axios';
import { Pool } from 'pg';
import { verifyAuthToken } from '@/lib/auth-utils'
import { cookies } from 'next/headers';
const pool = new Pool({
  connectionString: process.env.DATABASE_STRING,
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const oauth_token = searchParams.get('oauth_token');
  const oauth_verifier = searchParams.get('oauth_verifier');

  const oauth_token_secret = req.cookies.get('twitter_oauth_token_secret')?.value;
  const jwt = req.cookies.get('temp_jwt')?.value;
  console.log(req.cookies.getAll())
  if (!oauth_token || !oauth_verifier || !oauth_token_secret || !jwt) {
    return NextResponse.json({ error: 'Missing OAuth info or JWT' }, { status: 400 });
  }
  const userId = await verifyAuthToken(jwt);
  console.log('Received OAuth token and verifier:', oauth_token, oauth_verifier, userId);

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

  try {
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
    const { oauth_token: accessToken, oauth_token_secret: accessSecret, user_id: xUserId, screen_name: username } = result;

    if (!accessToken || !accessSecret || !xUserId || !username) {
      return NextResponse.json({ error: 'Failed to get access token or user info from Twitter' }, { status: 500 });
    }

    const client = await pool.connect();
    try {
      // Check if the X account is already connected to this user
      const existingAccount = await client.query(
        'SELECT * FROM connected_x_accounts WHERE user_id = $1 AND x_user_id = $2',
        [userId, xUserId]
      );

      if (existingAccount.rows.length > 0) {
        // Update existing account
        await client.query(
          'UPDATE connected_x_accounts SET oauth_token = $1, oauth_token_secret = $2, username = $3, oauth_verifier = $6 WHERE user_id = $4 AND x_user_id = $5',
          [accessToken, accessSecret, username, userId, xUserId, oauth_verifier]
        );
        console.log(`Updated X account for user ${userId}: ${username}`);
      } else {
        // Insert new account
        await client.query(
          'INSERT INTO connected_x_accounts (user_id, oauth_token, oauth_token_secret, x_user_id, username, oauth_verifier) VALUES ($1, $2, $3, $4, $5, $6)',
          [userId, accessToken, accessSecret, xUserId, username, oauth_verifier]
        );
        console.log(`Connected new X account for user ${userId}: ${username}`);
      }

      // Close the tab
      return new NextResponse(`
        <script>
          window.close();
        </script>
      `, {
        headers: {
          'Content-Type': 'text/html',
        },
      });

    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      return NextResponse.json({ error: 'Failed to save X account to database' }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Twitter OAuth access token exchange failed:', error);
    return NextResponse.json({ error: 'Failed to exchange OAuth token' }, { status: 500 });
  }
}
