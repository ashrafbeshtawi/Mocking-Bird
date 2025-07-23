// app/api/page-posts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_STRING,
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pageId = searchParams.get('pageId');

  if (!pageId) {
    return NextResponse.json({ error: 'Missing pageId' }, { status: 400 });
  }

  try {
    const client = await pool.connect();
    let token: string | null = null;

    try {
      const result = await client.query(
        'SELECT access_token FROM page WHERE page_id = $1',
        [pageId]
      );
      token = result.rows[0]?.access_token || null;
    } finally {
      client.release();
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Token not found for given pageId' },
        { status: 404 }
      );
    }

    const fbResponse = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/posts?access_token=${token}`
    );

    if (!fbResponse.ok) {
      const error = await fbResponse.json();
      return NextResponse.json(
        { error: 'Facebook API error', details: error },
        { status: 502 }
      );
    }

    const posts = await fbResponse.json();
    return NextResponse.json({ posts });
  } catch (err) {
    console.error('[PagePosts API Error]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
