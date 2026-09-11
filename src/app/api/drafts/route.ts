import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { createLogger } from '@/lib/logger';
import {
  createDraft,
  deleteDraft,
  listDrafts,
  updateDraft,
  validateDraftInput,
  type DraftInput,
} from '@/lib/drafts';

const logger = createLogger('DraftsAPI');

const getUserId = async (): Promise<number | null> => {
  const userId = await getAuthUserId();
  const parsedUserId = userId ? parseInt(userId, 10) : null;
  return parsedUserId && !isNaN(parsedUserId) ? parsedUserId : null;
};

// GET: List all drafts for the current user
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const drafts = await listDrafts(userId);
    return NextResponse.json({ success: true, drafts });
  } catch (error) {
    logger.error('GET failed', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}

// POST: Create a new draft
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validationError = validateDraftInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const draft = await createDraft(userId, body as DraftInput);
    return NextResponse.json({ success: true, draft }, { status: 201 });
  } catch (error) {
    logger.error('POST failed', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}

// PUT: Update an existing draft (full update)
export async function PUT(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Draft ID is required.' }, { status: 400 });
    }
    const validationError = validateDraftInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const draft = await updateDraft(userId, body.id, body as DraftInput);
    if (!draft) {
      return NextResponse.json({ error: 'Draft not found or access denied.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, draft });
  } catch (error) {
    logger.error('PUT failed', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}

// DELETE: Delete a draft
export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Draft ID is required.' }, { status: 400 });
    }

    const deleted = await deleteDraft(userId, id);
    if (!deleted) {
      return NextResponse.json({ error: 'Draft not found or access denied.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('DELETE failed', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
