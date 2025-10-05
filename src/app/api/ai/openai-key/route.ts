import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_STRING });

// Utility to get and validate user ID from headers
const getUserId = (req: NextRequest): number | null => {
  const userId = req.headers.get('x-user-id');
  const parsedUserId = userId ? parseInt(userId, 10) : null;
  return parsedUserId && !isNaN(parsedUserId) ? parsedUserId : null;
};

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required: User ID not provided.' }, { status: 401 });
  }

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT api_key FROM openai_api_keys WHERE user_id = $1', [userId]);
    client.release();

    if (result.rows.length > 0) {
      return NextResponse.json({ apiKey: result.rows[0].api_key }, { status: 200 });
    } else {
      return NextResponse.json({ apiKey: '' }, { status: 200 });
    }
  } catch (error) {
    console.error('Error fetching OpenAI API key:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required: User ID not provided.' }, { status: 401 });
  }

  try {
    const { apiKey } = await req.json();

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'Invalid API Key provided' }, { status: 400 });
    }

    const client = await pool.connect();
    // Check if an API key already exists for the user
    const existingKey = await client.query('SELECT id FROM openai_api_keys WHERE user_id = $1', [userId]);

    if (existingKey.rows.length > 0) {
      // Update existing key
      await client.query('UPDATE openai_api_keys SET api_key = $1, updated_at = NOW() WHERE user_id = $2', [apiKey, userId]);
    } else {
      // Insert new key
      await client.query('INSERT INTO openai_api_keys (user_id, api_key) VALUES ($1, $2)', [userId, apiKey]);
    }
    client.release();

    return NextResponse.json({ message: 'OpenAI API Key saved successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error saving OpenAI API key:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
