import { NextRequest, NextResponse } from 'next/server';

// In-memory store for drafts (replace with database in production)
const drafts = new Map<string, {
  id: string;
  userId: string;
  content: string;
  platforms: string[];
  mediaUrls: string[];
  status: 'draft' | 'pending' | 'published' | 'failed';
  createdAt: string;
  updatedAt: string;
}>();

// GET /api/draft - List all drafts for the user
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userDrafts = Array.from(drafts.values())
    .filter(draft => draft.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ drafts: userDrafts });
}

// POST /api/draft - Create a new draft
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  if (!body.content || !body.platforms || body.platforms.length === 0) {
    return NextResponse.json({ error: 'Content and platforms are required' }, { status: 400 });
  }

  const draft = {
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    userId,
    content: body.content,
    platforms: body.platforms,
    mediaUrls: body.mediaUrls || [],
    status: 'draft' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  drafts.set(draft.id, draft);

  return NextResponse.json({ draft }, { status: 201 });
}

// PUT /api/draft - Update an existing draft
export async function PUT(request: NextRequest) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, content, platforms, mediaUrls } = body;

  if (!id) {
    return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 });
  }

  const existing = drafts.get(id);

  if (!existing) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  if (existing.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updated = {
    ...existing,
    content: content ?? existing.content,
    platforms: platforms ?? existing.platforms,
    mediaUrls: mediaUrls ?? existing.mediaUrls,
    updatedAt: new Date().toISOString(),
  };

  drafts.set(id, updated);

  return NextResponse.json({ draft: updated });
}

// DELETE /api/draft - Delete a draft
export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 });
  }

  const existing = drafts.get(id);

  if (!existing) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  if (existing.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  drafts.delete(id);

  return NextResponse.json({ message: 'Draft deleted successfully' });
}