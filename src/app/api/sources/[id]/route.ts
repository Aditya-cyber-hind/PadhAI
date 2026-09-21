import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { getSource, deleteSource } from '@/lib/sources/db';

export const maxDuration = 30;

// GET: fetch one source WITH full text (for the citation drawer later)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const source = await getSource(id, userId);
    if (!source) {
      return Response.json({ error: 'Source not found' }, { status: 404 });
    }
    return Response.json({ source });
  } catch (err) {
    console.error('[sources/[id] GET]', err);
    return Response.json({ error: 'Failed to load source' }, { status: 500 });
  }
}

// DELETE: remove one source
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const ok = await deleteSource(id, userId);
    if (!ok) {
      return Response.json({ error: 'Source not found' }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (err) {
    console.error('[sources/[id] DELETE]', err);
    return Response.json({ error: 'Failed to delete source' }, { status: 500 });
  }
}