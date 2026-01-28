import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';

// Utility to get and validate user ID from session
const getUserId = async (): Promise<number | null> => {
  const userId = await getAuthUserId();
  const parsedUserId = userId ? parseInt(userId, 10) : null;
  return parsedUserId && !isNaN(parsedUserId) ? parsedUserId : null;
};

// GET: Read all prompts for a user, or a single prompt by ID
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required: User ID not provided.' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const promptId = searchParams.get('id');

  try {
    const client = await pool.connect();
    let query, values;

    if (promptId) {
      // Read a single prompt
      query = `SELECT p.id, p.title, p.prompt, p.provider_id, p.created_at, pr.name as provider_name
               FROM ai_prompts p
               LEFT JOIN ai_providers pr ON p.provider_id = pr.id
               WHERE p.id = $1 AND p.user_id = $2`;
      values = [promptId, userId];
    } else {
      // Read all prompts for the user
      query = `SELECT p.id, p.title, p.prompt, p.provider_id, p.created_at, pr.name as provider_name
               FROM ai_prompts p
               LEFT JOIN ai_providers pr ON p.provider_id = pr.id
               WHERE p.user_id = $1
               ORDER BY p.created_at DESC`;
      values = [userId];
    }

    const { rows } = await client.query(query, values);
    client.release();

    if (promptId && rows.length === 0) {
      return NextResponse.json({ error: 'Prompt not found or access denied.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, prompts: rows });
  } catch (error) {
    console.error('API Error (GET /ai-prompts):', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}

// POST: Create a new prompt
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required: User ID not provided.' }, { status: 401 });
  }

  try {
    const { title, prompt, provider_id } = await req.json();
    if (!title || !prompt) {
      return NextResponse.json({ error: 'Title and prompt are required.' }, { status: 400 });
    }

    const client = await pool.connect();
    const result = await client.query(
      `INSERT INTO ai_prompts (user_id, title, prompt, provider_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, prompt, provider_id, created_at`,
      [userId, title, prompt, provider_id || null]
    );
    client.release();

    return NextResponse.json({ success: true, newPrompt: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('API Error (POST /ai-prompts):', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}

// PUT: Update an existing prompt
export async function PUT(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required: User ID not provided.' }, { status: 401 });
  }

  try {
    const { id, title, prompt, provider_id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Prompt ID is required.' }, { status: 400 });
    }

    const client = await pool.connect();
    const result = await client.query(
      `UPDATE ai_prompts
       SET title = COALESCE($1, title), prompt = COALESCE($2, prompt), provider_id = $3
       WHERE id = $4 AND user_id = $5
       RETURNING id`,
      [title, prompt, provider_id !== undefined ? provider_id : null, id, userId]
    );
    client.release();

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Prompt not found or access denied.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Prompt updated successfully.' });
  } catch (error) {
    console.error('API Error (PUT /ai-prompts):', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}

// DELETE: Delete a prompt
export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required: User ID not provided.' }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Prompt ID is required.' }, { status: 400 });
    }

    const client = await pool.connect();
    const result = await client.query(
      'DELETE FROM ai_prompts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    client.release();

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Prompt not found or access denied.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Prompt deleted successfully.' });
  } catch (error) {
    console.error('API Error (DELETE /ai-prompts):', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
