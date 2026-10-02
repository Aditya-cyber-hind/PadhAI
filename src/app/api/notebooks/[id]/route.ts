import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import {
  getNotebook,
  updateNotebookSettings,
  deleteNotebook,
} from '@/lib/notebooks/db';
import { Index } from '@upstash/vector';

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const notebook = await getNotebook(id, session.user.id);
    if (!notebook) {
      return Response.json({ error: 'Notebook not found' }, { status: 404 });
    }

    return Response.json({ notebook });
  } catch (error) {
    console.error('[notebook GET]', error);
    return Response.json({ error: 'Failed to get notebook' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, custom_instructions } = body;

    const updates: { name?: string; custom_instructions?: string | null } = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return Response.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (custom_instructions !== undefined) {
      if (custom_instructions === null) {
        updates.custom_instructions = null;
      } else if (typeof custom_instructions === 'string') {
        // Cap at 2000 chars — prevents prompt-injection-by-essay
        updates.custom_instructions =
          custom_instructions.trim().slice(0, 2000) || null;
      } else {
        return Response.json(
          { error: 'custom_instructions must be a string or null' },
          { status: 400 }
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No updates provided' }, { status: 400 });
    }

    const notebook = await updateNotebookSettings(id, session.user.id, updates);
    if (!notebook) {
      return Response.json({ error: 'Notebook not found' }, { status: 404 });
    }

    return Response.json({ notebook });
  } catch (error) {
    console.error('[notebook PATCH]', error);
    return Response.json({ error: 'Failed to update notebook' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
      await index.namespace(id).reset();
    } catch (err) {
      console.warn(`[notebook DELETE] failed to reset namespace ${id}:`, err);
    }

    const deleted = await deleteNotebook(id, session.user.id);
    if (!deleted) {
      return Response.json({ error: 'Notebook not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[notebook DELETE]', error);
    return Response.json({ error: 'Failed to delete notebook' }, { status: 500 });
  }
}