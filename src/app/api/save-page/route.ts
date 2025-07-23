// app/api/save-page/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_STRING,
});

type RequestBody = {
  pageId: string;
  accessToken: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;

    if (!body.pageId || !body.accessToken) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM page WHERE page_id = $1', [
        body.pageId,
      ]);

      if (rows.length > 0) {
        await client.query(
          'UPDATE page SET access_token = $1, created_at = CURRENT_TIMESTAMP WHERE page_id = $2',
          [body.accessToken, body.pageId]
        );
      } else {
        await client.query(
          'INSERT INTO page (page_id, access_token) VALUES ($1, $2)',
          [body.pageId, body.accessToken]
        );
      }
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SavePage API Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
