import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { updateFolder, deleteFolder } from '@/lib/folders/db';

export const maxDuration = 15;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { folderId } = await params;
  let body: { name?: string; color?: string | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.name !== undefined) {
    const n = body.name.trim();
    if (!n || n.length > 60) {
      return Response.json({ error: 'Name required (1-60 chars)' }, { status: 400 });
    }
    body.name = n;
  }

  try {
    const folder = await updateFolder(folderId, userId, body);
    if (!folder) return Response.json({ error: 'Folder not found' }, { status: 404 });
    return Response.json({ folder });
  } catch (err: any) {
    if (String(err?.message ?? '').includes('duplicate key')) {
      return Response.json({ error: 'A folder with that name already exists' }, { status: 409 });
    }
    console.error('[folders/[folderId] PATCH]', err);
    return Response.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { folderId } = await params;
  try {
    const ok = await deleteFolder(folderId, userId);
    if (!ok) return Response.json({ error: 'Folder not found' }, { status: 404 });
    return Response.json({ success: true });
  } catch (err) {
    console.error('[folders/[folderId] DELETE]', err);
    return Response.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}