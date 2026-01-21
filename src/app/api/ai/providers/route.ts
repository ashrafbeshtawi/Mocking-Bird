import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const getUserId = (req: NextRequest): number | null => {
  const userId = req.headers.get('x-user-id');
  const parsedUserId = userId ? parseInt(userId, 10) : null;
  return parsedUserId && !isNaN(parsedUserId) ? parsedUserId : null;
};

// GET: List all providers for user (without api_key)
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const client = await pool.connect();
    const { rows } = await client.query(
      `SELECT id, name, base_url, model, created_at, updated_at
       FROM ai_providers
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    client.release();

    return NextResponse.json({ success: true, providers: rows });
  } catch (error) {
    console.error('API Error (GET /ai/providers):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new provider
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { name, api_key, base_url, model } = await req.json();

    if (!name || !api_key || !base_url || !model) {
      return NextResponse.json({ error: 'All fields are required: name, api_key, base_url, model' }, { status: 400 });
    }

    const client = await pool.connect();
    const result = await client.query(
      `INSERT INTO ai_providers (user_id, name, api_key, base_url, model)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, base_url, model, created_at, updated_at`,
      [userId, name, api_key, base_url, model]
    );
    client.release();

    return NextResponse.json({ success: true, provider: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('API Error (POST /ai/providers):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update an existing provider
export async function PUT(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { id, name, api_key, base_url, model } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    const client = await pool.connect();

    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (api_key) {
      updates.push(`api_key = $${paramIndex++}`);
      values.push(api_key);
    }
    if (base_url) {
      updates.push(`base_url = $${paramIndex++}`);
      values.push(base_url);
    }
    if (model) {
      updates.push(`model = $${paramIndex++}`);
      values.push(model);
    }

    if (updates.length === 0) {
      client.release();
      return NextResponse.json({ error: 'At least one field to update is required' }, { status: 400 });
    }

    values.push(id, userId);
    const result = await client.query(
      `UPDATE ai_providers
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING id, name, base_url, model, created_at, updated_at`,
      values
    );
    client.release();

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Provider not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true, provider: result.rows[0] });
  } catch (error) {
    console.error('API Error (PUT /ai/providers):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Remove a provider
export async function DELETE(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    const client = await pool.connect();
    const result = await client.query(
      'DELETE FROM ai_providers WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    client.release();

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Provider not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Provider deleted successfully' });
  } catch (error) {
    console.error('API Error (DELETE /ai/providers):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
