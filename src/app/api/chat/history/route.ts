import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { loadMessages, saveMessage, clearMessages } from '@/lib/chat/db';

export const maxDuration = 15;

export async function GET(req: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notebookId = req.nextUrl.searchParams.get('notebookId');
    if (!notebookId) {
      return Response.json({ error: 'notebookId required' }, { status: 400 });
    }

    const messages = await loadMessages(notebookId, session.user.id);
    return Response.json({ messages });
  } catch (error) {
    console.error('[chat history GET]', error);
    return Response.json({ error: 'Failed to load' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notebookId, role, content } = await req.json();
    if (!notebookId || !role || !content) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    await saveMessage(notebookId, session.user.id, role, content);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[chat history POST]', error);
    return Response.json({ error: 'Failed to save' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notebookId = req.nextUrl.searchParams.get('notebookId');
    if (!notebookId) {
      return Response.json({ error: 'notebookId required' }, { status: 400 });
    }

    await clearMessages(notebookId, session.user.id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[chat history DELETE]', error);
    return Response.json({ error: 'Failed to clear' }, { status: 500 });
  }
}