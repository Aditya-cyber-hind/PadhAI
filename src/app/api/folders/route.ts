import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { listFolders, createFolder } from '@/lib/folders/db';

export const maxDuration = 15;

export async function GET() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const folders = await listFolders(userId);
    return Response.json({ folders });
  } catch (err) {
    console.error('[folders GET]', err);
    return Response.json({ error: 'Failed to list folders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { name?: string; color?: string | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  if (!name || name.length > 60) {
    return Response.json({ error: 'Name required (1-60 chars)' }, { status: 400 });
  }

  try {
    const folder = await createFolder(userId, name, body.color ?? null);
    return Response.json({ folder });
  } catch (err: any) {
    if (String(err?.message ?? '').includes('duplicate key')) {
      return Response.json({ error: 'A folder with that name already exists' }, { status: 409 });
    }
    console.error('[folders POST]', err);
    return Response.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}