import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { listSnippets, saveSnippet, deleteSnippet } from '@/lib/snippets/db';

export const maxDuration = 15;

export async function GET(req: NextRequest) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const notebookId = req.nextUrl.searchParams.get('notebookId');
  if (!notebookId) return Response.json({ error: 'notebookId required' }, { status: 400 });

  try {
    const snippets = await listSnippets(notebookId, userId);
    return Response.json({ snippets });
  } catch (err) {
    console.error('[snippets GET]', err);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { notebookId, language, filename, code, explanation } = await req.json();
  if (!notebookId || !code) {
    return Response.json({ error: 'notebookId and code required' }, { status: 400 });
  }

  try {
    const snippet = await saveSnippet(
      notebookId,
      userId,
      language ?? 'plaintext',
      filename ?? null,
      code,
      explanation ?? null
    );
    return Response.json({ snippet }, { status: 201 });
  } catch (err) {
    console.error('[snippets POST]', err);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  try {
    await deleteSnippet(id, userId);
    return Response.json({ success: true });
  } catch (err) {
    console.error('[snippets DELETE]', err);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}