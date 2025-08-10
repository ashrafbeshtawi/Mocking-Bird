import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyAuthToken } from '@/lib/auth-utils';
import { getOAuth } from '@/lib/twitter-oauth';
import axios from 'axios';

const pool = new Pool({
  connectionString: process.env.DATABASE_STRING,
});

export async function POST(req: NextRequest) {
  const jwt = req.cookies.get('jwt')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const userId = await verifyAuthToken(jwt);

  if (!userId) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { text } = body;

    // Validate tweet text
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Tweet text is required and must be a string' }, { status: 400 });
    }

    if (text.length > 280) {
      return NextResponse.json({ error: 'Tweet text cannot exceed 280 characters' }, { status: 400 });
    }

    if (text.trim().length === 0) {
      return NextResponse.json({ error: 'Tweet text cannot be empty' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT oauth_token, oauth_token_secret FROM connected_x_accounts WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'No connected X account found for this user' }, { status: 404 });
      }

      const { oauth_token, oauth_token_secret } = result.rows[0];

      const oauth = getOAuth();

      // Prepare tweet data
      const tweetData = {
        text: text.trim()
      };

      // For OAuth 1.0a with POST requests, we need to handle the signature differently
      // The request data for OAuth signature should NOT include the POST body
      const requestData = {
        url: 'https://api.twitter.com/2/tweets',
        method: 'POST'
        // Don't include 'data' here for OAuth signature
      };

      // Debug: Log the request data (remove in production)
      console.log('Request data for OAuth:', requestData);
      console.log('Tweet data:', tweetData);

      const authHeader = oauth.toHeader(
        oauth.authorize(requestData, {
          key: oauth_token,
          secret: oauth_token_secret,
        })
      );

      // Debug: Log auth header (remove in production)
      console.log('Auth header:', authHeader);

      try {
        // Try JSON first, if it fails, we'll try form data approach
        const twitterResponse = await axios.post(
          requestData.url,
          tweetData,
          {
            headers: {
              ...authHeader,
              'Content-Type': 'application/json',
            },
          }
        );

        return NextResponse.json({
          success: true,
          tweet: twitterResponse.data
        });

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

          // Handle duplicate tweet error
          if (statusCode === 403 && errorMessage.toString().includes('duplicate')) {
            return NextResponse.json({ 
              error: 'Duplicate tweet', 
              details: 'This tweet appears to be a duplicate of a recent tweet.' 
            }, { status: 403 });
          }
        } else if (twitterError instanceof Error) {
          errorMessage = twitterError.message;
        }
        
        console.error('Error posting tweet to Twitter API:', errorMessage);
        return NextResponse.json({ 
          error: 'Failed to post tweet to Twitter API', 
          details: errorMessage 
        }, { status: statusCode });
      }

    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      return NextResponse.json({ error: 'Failed to retrieve X account from database' }, { status: 500 });
    } finally {
      client.release();
    }

  } catch (parseError) {
    console.error('Failed to parse request body:', parseError);
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }
}