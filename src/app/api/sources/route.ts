import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { listSources, addSource, clearSources } from '@/lib/sources/db';

export const maxDuration = 30;

// GET: list all sources for a notebook (metadata only, no text)
export async function GET(req: NextRequest) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notebookId = req.nextUrl.searchParams.get('notebookId');
  if (!notebookId) {
    return Response.json({ error: 'notebookId required' }, { status: 400 });
  }

  try {
    const sources = await listSources(notebookId, userId);
    return Response.json({ sources });
  } catch (err) {
    console.error('[sources GET]', err);
    return Response.json({ error: 'Failed to list sources' }, { status: 500 });
  }
}

// POST: add a source
export async function POST(req: NextRequest) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { notebookId, sourceName, sourceType, text, pageCount, method } =
    await req.json();

  if (!notebookId || !sourceName || !sourceType || !text) {
    return Response.json(
      { error: 'notebookId, sourceName, sourceType, and text are required' },
      { status: 400 }
    );
  }

  if (typeof text !== 'string' || text.trim().length < 20) {
    return Response.json({ error: 'Text too short' }, { status: 400 });
  }

  try {
    const source = await addSource(
      notebookId,
      userId,
      sourceName,
      sourceType,
      text,
      pageCount ?? 0,
      method ?? null
    );
    return Response.json({ source }, { status: 201 });
  } catch (err) {
    console.error('[sources POST]', err);
    return Response.json({ error: 'Failed to save source' }, { status: 500 });
  }
}

// DELETE: clear all sources for a notebook
export async function DELETE(req: NextRequest) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notebookId = req.nextUrl.searchParams.get('notebookId');
  if (!notebookId) {
    return Response.json({ error: 'notebookId required' }, { status: 400 });
  }

  try {
    const deleted = await clearSources(notebookId, userId);
    return Response.json({ deleted });
  } catch (err) {
    console.error('[sources DELETE]', err);
    return Response.json({ error: 'Failed to clear sources' }, { status: 500 });
  }
}