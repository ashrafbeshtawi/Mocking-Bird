// app/api/save-page/route.ts

import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';

// Define the expected structure of the request body
type RequestBody = {
  // Renamed from user_access_token for clarity
  shortLivedUserToken: string;
};

interface Page {
  id: string;
  name: string;
  access_token: string;
}

interface PagesResponse {
  data: Page[];
}

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId();

    if (!userId) {
      console.error('[SavePage API Error] User ID not found in session.');
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = (await req.json()) as RequestBody;

    if (!body.shortLivedUserToken) {
      return NextResponse.json({ error: 'Missing shortLivedUserToken in request body.' }, { status: 400 });
    }

    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      console.error(`[SavePage API Error] Invalid user ID format in header: ${userId}`);
      return NextResponse.json({ error: 'Invalid user ID format.' }, { status: 400 });
    }

    const APP_ID = process.env.FB_APP_ID;
    const APP_SECRET = process.env.FB_APP_SECRET;

    if (!APP_ID || !APP_SECRET) {
      throw new Error("Missing Facebook APP_ID or APP_SECRET environment variables.");
    }

    // Step 1: Exchange the short-lived user token for a long-lived one
    const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
        `grant_type=fb_exchange_token&` +
        `client_id=${APP_ID}&` +
        `client_secret=${APP_SECRET}&` +
        `fb_exchange_token=${body.shortLivedUserToken}`;
    const exchangeResponse = await fetch(exchangeUrl);
    const exchangeData = await exchangeResponse.json();
    if (exchangeData.error) {
      throw new Error(`Facebook API Error during token exchange: ${exchangeData.error.message}`);
    }

    const longLivedUserToken = exchangeData.access_token;
    if (!longLivedUserToken) {
      throw new Error('Failed to obtain long-lived user token from exchange.');
    }

    // Step 2: Use the long-lived user token to get the pages
    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedUserToken}`;
    const pagesResponse = await fetch(pagesUrl);
    const pagesData: PagesResponse = await pagesResponse.json();

    if (!pagesData.data) {
        throw new Error('Failed to fetch pages from Facebook.');
    }

    // 3. Connect to the database
    const client = await pool.connect();
    
    try {
      // Step 3a: Begin a database transaction for atomicity
      await client.query('BEGIN');

      // Step 4: Loop through all pages and save/update them in the database
      for (const page of pagesData.data) {
        const longLivedPageToken = page.access_token;
        
        let facebookPageDbId: number;

        const { rows } = await client.query(
          'SELECT id FROM connected_facebook_pages WHERE user_id = $1 AND page_id = $2',
          [parsedUserId, page.id]
        );

        if (rows.length > 0) {
          // 5. If the page exists for this user, update its token
          await client.query(
            'UPDATE connected_facebook_pages SET page_access_token = $1, created_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND page_id = $3 RETURNING id',
            [longLivedPageToken, parsedUserId, page.id]
          );
          facebookPageDbId = rows[0].id;
          console.log(`Page ${page.id} updated for user ${parsedUserId}.`);
        } else {
          // 6. If the page does not exist, insert a new record
          const insertResult = await client.query(
            'INSERT INTO connected_facebook_pages (user_id, page_id, page_name, page_access_token) VALUES ($1, $2, $3, $4) RETURNING id',
            [parsedUserId, page.id, page.name, longLivedPageToken]
          );
          facebookPageDbId = insertResult.rows[0].id;
          console.log(`Page ${page.id} inserted for user ${parsedUserId}.`);
        }

        // Fetch Instagram accounts for this Facebook page
        try {
          const instagramResponse = await fetch(
            `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
          );
          const instagramData = await instagramResponse.json();

          if (instagramData.instagram_business_account) {
            const igAccountResponse = await fetch(
              `https://graph.facebook.com/v19.0/${instagramData.instagram_business_account.id}?fields=username,name&access_token=${page.access_token}`
            );
            const igAccountData = await igAccountResponse.json();

            if (igAccountData.username) {
              const instagramAccountId = instagramData.instagram_business_account.id;
              const instagramUsername = igAccountData.username;
              const instagramDisplayName = igAccountData.name;

              const { rows: igRows } = await client.query(
                'SELECT * FROM connected_instagram_accounts WHERE instagram_account_id = $1 AND facebook_page_id = $2',
                [instagramAccountId, facebookPageDbId]
              );

              if (igRows.length > 0) {
                // Update existing Instagram account
                await client.query(
                  'UPDATE connected_instagram_accounts SET username = $1, display_name = $2 WHERE instagram_account_id = $3 AND facebook_page_id = $4',
                  [instagramUsername, instagramDisplayName, instagramAccountId, facebookPageDbId]
                );
                console.log(`Instagram account ${instagramAccountId} updated for Facebook page DB ID ${facebookPageDbId}.`);
              } else {
                // Insert new Instagram account
                await client.query(
                  'INSERT INTO connected_instagram_accounts (instagram_account_id, username, display_name, facebook_page_id) VALUES ($1, $2, $3, $4)',
                  [instagramAccountId, instagramUsername, instagramDisplayName, facebookPageDbId]
                );
                console.log(`Instagram account ${instagramAccountId} inserted for Facebook page DB ID ${facebookPageDbId}.`);
              }
            }
          }
        } catch (igError) {
          console.error(`[SavePage API Error] Error fetching or saving Instagram for page ${page.name}:`, igError);
        }
      }

      // Step 7: Commit the transaction
      await client.query('COMMIT');
    } catch (dbError) {
      // If any error occurs, rollback the transaction
      await client.query('ROLLBACK');
      console.error('[SavePage API DB Error]', dbError);
      throw dbError; // Re-throw to be caught by the outer try-catch
    } finally {
      client.release(); // Always release the client back to the pool
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Facebook pages and linked Instagram accounts saved successfully!'
    });
  } catch (error) {
    console.error('[SavePage API Error]', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
