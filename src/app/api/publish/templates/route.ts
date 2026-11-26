import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('PublishTemplatesAPI');

// publish_templates.id is a SERIAL (int4) column.
const MAX_TEMPLATE_ID = 2147483647;

const getUserId = async (): Promise<number | null> => {
  const userId = await getAuthUserId();
  const parsedUserId = userId ? parseInt(userId, 10) : null;
  return parsedUserId && !isNaN(parsedUserId) ? parsedUserId : null;
};

const isValidTemplateId = (id: unknown): id is number =>
  typeof id === 'number' && Number.isInteger(id) && id > 0 && id <= MAX_TEMPLATE_ID;

const invalidIdResponse = () =>
  NextResponse.json({ error: 'Template ID must be a positive integer.' }, { status: 400 });

// GET: List all templates for the current user
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, title, content, created_at, updated_at
       FROM publish_templates
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );

    return NextResponse.json({ success: true, templates: rows });
  } catch (error) {
    logger.error('GET failed', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}

// POST: Create a new template
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const { title, content } = await req.json();
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content is required.' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO publish_templates (user_id, title, content)
       VALUES ($1, $2, $3)
       RETURNING id, title, content, created_at, updated_at`,
      [userId, title.trim(), content]
    );

    return NextResponse.json({ success: true, template: result.rows[0] }, { status: 201 });
  } catch (error) {
    logger.error('POST failed', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}

// PUT: Update an existing template
export async function PUT(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const { id, title, content } = await req.json();
    if (id === undefined || id === null) {
      return NextResponse.json({ error: 'Template ID is required.' }, { status: 400 });
    }
    if (!isValidTemplateId(id)) {
      return invalidIdResponse();
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content is required.' }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE publish_templates
       SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4
       RETURNING id, title, content, created_at, updated_at`,
      [title.trim(), content, id, userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Template not found or access denied.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, template: result.rows[0] });
  } catch (error) {
    logger.error('PUT failed', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}

// DELETE: Delete a template
export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (id === undefined || id === null) {
      return NextResponse.json({ error: 'Template ID is required.' }, { status: 400 });
    }
    if (!isValidTemplateId(id)) {
      return invalidIdResponse();
    }

    const result = await pool.query(
      'DELETE FROM publish_templates WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Template not found or access denied.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('DELETE failed', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
