import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { moveNotebookToFolder } from '@/lib/folders/db';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { notebookId?: string; folderId?: string | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[folders/move POST] received', {
    notebookId: body.notebookId,
    folderId: body.folderId,
    userId,
  });

  if (!body.notebookId || typeof body.notebookId !== 'string') {
    return Response.json({ error: 'notebookId required' }, { status: 400 });
  }
  const folderId =
    body.folderId === null || body.folderId === undefined ? null : body.folderId;
  if (folderId !== null && typeof folderId !== 'string') {
    return Response.json({ error: 'folderId must be string or null' }, { status: 400 });
  }

  try {
    const result = await moveNotebookToFolder(body.notebookId, userId, folderId);
    console.log('[folders/move POST] result', result);
    if (!result.ok) {
      return Response.json(
        { error: `Move failed: ${result.reason ?? 'unknown'}` },
        { status: 404 }
      );
    }
    return Response.json({ success: true });
  } catch (err) {
    console.error('[folders/move POST] exception', err);
    return Response.json({ error: 'Failed to move notebook' }, { status: 500 });
  }
}