// /pages/api/publish.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getOAuth } from '@/lib/twitter-oauth';
import axios from 'axios';

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_STRING,
});

// Define the API endpoint handler
export async function POST(req: NextRequest) {
  // 1. Get user ID from the custom header provided by middleware
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'User ID not found in headers' }, { status: 401 });
  }

  try {
    // 2. Parse request body
    const { text, facebookPages, xAccounts } = await req.json();

    // 3. Validate request data
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Post text is required and cannot be empty' }, { status: 400 });
    }

    if (!Array.isArray(facebookPages) || !Array.isArray(xAccounts)) {
      return NextResponse.json({ error: 'facebookPages and xAccounts must be arrays' }, { status: 400 });
    }

    if (facebookPages.length === 0 && xAccounts.length === 0) {
      return NextResponse.json({ error: 'At least one social media account must be selected' }, { status: 400 });
    }

    // Twitter-specific validation
    const twitterSelected = xAccounts.length > 0;
    const twitterCharLimit = 280;
    if (twitterSelected && text.length > twitterCharLimit) {
      return NextResponse.json(
        { error: `Post text exceeds the ${twitterCharLimit} character limit for X (Twitter).` },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // 4. Fetch necessary tokens from the database
      const [fbTokensResult, xTokensResult] = await Promise.all([
        facebookPages.length > 0
          ? client.query(
              'SELECT page_id, page_access_token FROM connected_facebook_pages WHERE user_id = $1 AND page_id = ANY($2)',
              [userId, facebookPages]
            )
          : { rows: [] },
        xAccounts.length > 0
          ? client.query(
              'SELECT oauth_token, oauth_token_secret FROM connected_x_accounts WHERE user_id = $1 AND account_id = ANY($2)',
              [userId, xAccounts]
            )
          : { rows: [] },
      ]);

      const fbTokens = fbTokensResult.rows;
      const xTokens = xTokensResult.rows;

      // 5. Check if all selected accounts were found
      if (fbTokens.length !== facebookPages.length || xTokens.length !== xAccounts.length) {
        const foundFbIds = new Set(fbTokens.map((t) => t.page_id));
        const missingFbIds = facebookPages.filter((id) => !foundFbIds.has(id));

        const foundXIds = new Set(xAccounts.map((t) => t.account_id));
        const missingXIds = xAccounts.filter((id) => !foundXIds.has(id));

        const missingAccounts = [...missingFbIds.map(id => `Facebook Page ID: ${id}`), ...missingXIds.map(id => `X Account ID: ${id}`)];

        return NextResponse.json({
          error: 'One or more selected accounts could not be found for the user.',
          details: missingAccounts,
        }, { status: 404 });
      }

      type PublishResult = 
        | { platform: 'facebook'; page_id: string; result: unknown }
        | { platform: 'x'; account_id: string; result: unknown };

      type PublishingError = 
        | { platform: 'facebook'; page_id: string; error: unknown }
        | { platform: 'x'; account_id: string; error: unknown };

      const publishResults: PublishResult[] = [];
      const publishingErrors: PublishingError[] = [];

      // 6. Publish to Facebook pages
      const fbPublishPromises = fbTokens.map(async (token) => {
        try {
          const fbResponse = await axios.post(
            `https://graph.facebook.com/v19.0/${token.page_id}/feed`,
            { message: text },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token.page_access_token}`,
              },
            }
          );
          publishResults.push({ platform: 'facebook', page_id: token.page_id, result: fbResponse.data });
        } catch (fbError) {
          console.error(`Error publishing to Facebook Page ${token.page_id}:`, fbError);
          publishingErrors.push({
            platform: 'facebook',
            page_id: token.page_id,
            error: axios.isAxiosError(fbError) ? fbError.response?.data : 'An unknown error occurred.',
          });
        }
      });

      // 7. Publish to X (Twitter) accounts
      const xPublishPromises = xTokens.map(async (token) => {
        try {
          const oauth = getOAuth();
          const requestData = {
            url: 'https://api.twitter.com/2/tweets',
            method: 'POST',
          };
          
          const authHeader = oauth.toHeader(
            oauth.authorize(requestData, {
              key: token.oauth_token,
              secret: token.oauth_token_secret,
            })
          );
          
          const twitterResponse = await axios.post(
            requestData.url,
            { text: text.trim() },
            {
              headers: {
                ...authHeader,
                'Content-Type': 'application/json',
              },
            }
          );
          publishResults.push({ platform: 'x', account_id: token.account_id, result: twitterResponse.data });
        } catch (xError) {
          console.error(`Error publishing to X Account:`, xError);
          publishingErrors.push({
            platform: 'x',
            account_id: token.account_id,
            error: axios.isAxiosError(xError) ? xError.response?.data : 'An unknown error occurred.',
          });
        }
      });

      // 8. Wait for all publishing promises to resolve
      await Promise.all([...fbPublishPromises, ...xPublishPromises]);

      // 9. Handle results
      if (publishingErrors.length > 0) {
        return NextResponse.json({
          message: 'Some posts were published successfully, but others failed.',
          successful: publishResults,
          failed: publishingErrors,
        }, { status: 207 });
      }

      return NextResponse.json({
        message: 'All posts published successfully.',
        results: publishResults,
      }, { status: 200 });

    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      return NextResponse.json({ error: 'Failed to retrieve account data from database' }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (parseError) {
    console.error('Failed to parse request body:', parseError);
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }
}