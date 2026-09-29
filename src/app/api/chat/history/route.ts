import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { neon } from '@neondatabase/serverless';

export const maxDuration = 15;

const sql = neon(process.env.DATABASE_URL!);

function normalizeChannel(raw: string | null): string {
  if (raw === 'coder') return 'coder';
  return 'chat';
}

// GET — load history for a notebook, filtered by channel
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

    const channel = normalizeChannel(req.nextUrl.searchParams.get('channel'));

    // Verify the notebook belongs to this user
    const ownership = await sql`
      SELECT id FROM notebooks
      WHERE id = ${notebookId} AND user_id = ${session.user.id}
    `;
    if (ownership.length === 0) {
      return Response.json({ error: 'Notebook not found' }, { status: 404 });
    }

    const rows = await sql`
      SELECT id, role, content, channel, created_at
      FROM chat_messages
      WHERE notebook_id = ${notebookId} AND channel = ${channel}
      ORDER BY created_at ASC
    `;

    return Response.json({ messages: rows, channel });
  } catch (error) {
    console.error('[chat/history GET]', error);
    return Response.json({ error: 'Failed to load history' }, { status: 500 });
  }
}

// POST — append a message
export async function POST(req: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notebookId, role, content, channel: rawChannel } = await req.json();

    if (!notebookId || !role || !content) {
      return Response.json(
        { error: 'notebookId, role, and content required' },
        { status: 400 }
      );
    }

    if (role !== 'user' && role !== 'assistant') {
      return Response.json({ error: 'Invalid role' }, { status: 400 });
    }

    const channel = normalizeChannel(rawChannel ?? null);

    // Verify ownership
    const ownership = await sql`
      SELECT id FROM notebooks
      WHERE id = ${notebookId} AND user_id = ${session.user.id}
    `;
    if (ownership.length === 0) {
      return Response.json({ error: 'Notebook not found' }, { status: 404 });
    }

    const rows = await sql`
      INSERT INTO chat_messages (notebook_id, role, content, channel)
      VALUES (${notebookId}, ${role}, ${content}, ${channel})
      RETURNING id, role, content, channel, created_at
    `;

    return Response.json({ message: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[chat/history POST]', error);
    return Response.json({ error: 'Failed to save message' }, { status: 500 });
  }
}

// DELETE — clear history for a channel
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

    const channel = normalizeChannel(req.nextUrl.searchParams.get('channel'));

    const ownership = await sql`
      SELECT id FROM notebooks
      WHERE id = ${notebookId} AND user_id = ${session.user.id}
    `;
    if (ownership.length === 0) {
      return Response.json({ error: 'Notebook not found' }, { status: 404 });
    }

    await sql`
      DELETE FROM chat_messages
      WHERE notebook_id = ${notebookId} AND channel = ${channel}
    `;

    return Response.json({ success: true, channel });
  } catch (error) {
    console.error('[chat/history DELETE]', error);
    return Response.json({ error: 'Failed to clear history' }, { status: 500 });
  }
}