// /pages/api/publish.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import axios from 'axios';

const pool = new Pool({ connectionString: process.env.DATABASE_STRING });

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'User ID not found in headers' }, { status: 401 });
  }

  try {
    const { text, facebookPages, xAccounts } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Post text is required and cannot be empty' }, { status: 400 });
    }

    if (!Array.isArray(facebookPages) || !Array.isArray(xAccounts)) {
      return NextResponse.json({ error: 'facebookPages and xAccounts must be arrays' }, { status: 400 });
    }

    if (facebookPages.length === 0 && xAccounts.length === 0) {
      return NextResponse.json({ error: 'At least one social media account must be selected' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // Fetch Facebook page tokens
      const fbTokensResult = facebookPages.length > 0
        ? await client.query(
            'SELECT page_id, page_access_token FROM connected_facebook_pages WHERE user_id = $1 AND page_id = ANY($2)',
            [userId, facebookPages]
          )
        : { rows: [] };

      // Fetch Twitter OAuth2 access tokens
      const xTokensResult = xAccounts.length > 0
        ? await client.query(
            'SELECT x_user_id, username, oauth_token AS access_token FROM connected_x_accounts WHERE user_id = $1 AND x_user_id = ANY($2)',
            [userId, xAccounts]
          )
        : { rows: [] };

      const fbTokens = fbTokensResult.rows;
      const xTokens = xTokensResult.rows;


      // Check missing accounts
      if (fbTokens.length !== facebookPages.length || xTokens.length !== xAccounts.length) {
        const foundFbIds = new Set(fbTokens.map(t => t.page_id));
        const missingFbIds = facebookPages.filter(id => !foundFbIds.has(id));

        const foundXIds = new Set(xTokens.map(t => t.x_user_id));
        const missingXIds = xAccounts.filter(id => !foundXIds.has(id));

        const missingAccounts = [
          ...missingFbIds.map(id => `Facebook Page ID: ${id}`),
          ...missingXIds.map(id => `X Account ID: ${id}`),
        ];

        return NextResponse.json({
          error: 'One or more selected accounts could not be found for the user.',
          details: missingAccounts,
        }, { status: 404 });
      }

      const publishResults: any[] = [];
      const publishingErrors: any[] = [];

      // Publish to Facebook pages
      const fbPublishPromises = fbTokens.map(async (token) => {
        try {
          const fbResponse = await axios.post(
            `https://graph.facebook.com/v19.0/${token.page_id}/feed`,
            { message: text },
            { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.page_access_token}` } }
          );
          publishResults.push({ platform: 'facebook', page_id: token.page_id, result: fbResponse.data });
        } catch (fbError) {
          publishingErrors.push({
            platform: 'facebook',
            page_id: token.page_id,
            error: axios.isAxiosError(fbError) ? fbError.response?.data : 'Unknown error',
          });
        }
      });

      // Publish to X (Twitter) using OAuth2 Bearer tokens
      const xPublishPromises = xTokens.map(async (token) => {
        try {
          const twitterResponse = await axios.post(
            'https://api.twitter.com/2/tweets',
            { text: text.trim() },
            { headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' } }
          );
          publishResults.push({ platform: 'x', account_id: token.x_user_id, result: twitterResponse.data });
        } catch (xError) {
          publishingErrors.push({
            platform: 'x',
            account_id: token.x_user_id,
            error: axios.isAxiosError(xError) ? xError.response?.data : 'Unknown error',
          });
        }
      });

      await Promise.all([...fbPublishPromises, ...xPublishPromises]);

      if (publishingErrors.length > 0) {
        return NextResponse.json({
          message: 'Some posts were published successfully, but others failed.',
          successful: publishResults,
          failed: publishingErrors,
        }, { status: 207 });
      }

      return NextResponse.json({ message: 'All posts published successfully.', results: publishResults }, { status: 200 });

    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Failed to parse request body or process request:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
