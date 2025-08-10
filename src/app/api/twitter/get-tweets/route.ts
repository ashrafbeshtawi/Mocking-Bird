import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyAuthToken } from '@/lib/auth-utils';
import { getOAuth } from '@/lib/twitter-oauth';
import axios from 'axios';

const pool = new Pool({
  connectionString: process.env.DATABASE_STRING,
});

export async function GET(req: NextRequest) {
  const jwt = req.cookies.get('jwt')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const userId = await verifyAuthToken(jwt);

  if (!userId) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT oauth_token, oauth_token_secret, x_user_id FROM connected_x_accounts WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No connected X account found for this user' }, { status: 404 });
    }

    const { oauth_token, oauth_token_secret, x_user_id } = result.rows[0];

    const oauth = getOAuth();

    // Use Twitter API v2 instead of v1.1 - exclude replies to get only original tweets
    const requestData = {
      url: `https://api.twitter.com/2/users/${x_user_id}/tweets?max_results=10&exclude=replies&tweet.fields=created_at,public_metrics,text,author_id&expansions=author_id&user.fields=name,username,profile_image_url`,
      method: 'GET',
    };

    const headers = oauth.toHeader(
      oauth.authorize(requestData, {
        key: oauth_token,
        secret: oauth_token_secret,
      })
    );

    try {
      const twitterResponse = await axios.get(requestData.url, {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      });

      return NextResponse.json(twitterResponse.data);
    } catch (twitterError: unknown) {
      let errorMessage = 'An unknown error occurred';
      let statusCode = 500;
      
      if (axios.isAxiosError(twitterError)) {
        errorMessage = twitterError.response?.data || twitterError.message;
        statusCode = twitterError.response?.status || 500;
        
        // Handle rate limit specifically
        if (statusCode === 429) {
          const resetTime = twitterError.response?.headers['x-rate-limit-reset'];
          const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
          
          return NextResponse.json({ 
            error: 'Rate limit exceeded', 
            details: 'Too many requests to Twitter API. Please try again later.',
            resetTime: resetDate?.toISOString(),
            rateLimitInfo: {
              limit: twitterError.response?.headers['x-rate-limit-limit'],
              remaining: twitterError.response?.headers['x-rate-limit-remaining'],
              reset: resetTime
            }
          }, { status: 429 });
        }
      } else if (twitterError instanceof Error) {
        errorMessage = twitterError.message;
      }
      
      console.error('Error fetching tweets from Twitter API:', errorMessage);
      return NextResponse.json({ error: 'Failed to fetch tweets from Twitter API', details: errorMessage }, { status: statusCode });
    }

  } catch (dbError) {
    console.error('Database operation failed:', dbError);
    return NextResponse.json({ error: 'Failed to retrieve X account from database' }, { status: 500 });
  } finally {
    client.release();
  }
}