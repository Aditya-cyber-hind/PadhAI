import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import {
  listNotebooks,
  createNotebook,
  countNotebooks,
} from '@/lib/notebooks/db';

export const maxDuration = 30;

const MAX_NOTEBOOKS = 15;

export async function GET() {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notebooks = await listNotebooks(session.user.id);
    return Response.json({ notebooks });
  } catch (error) {
    console.error('[notebooks GET]', error);
    return Response.json({ error: 'Failed to list notebooks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name || name.trim().length === 0) {
      return Response.json({ error: 'Name is required' }, { status: 400 });
    }

    const count = await countNotebooks(session.user.id);
    if (count >= MAX_NOTEBOOKS) {
      return Response.json(
        { error: `You've reached the limit of ${MAX_NOTEBOOKS} notebooks. Delete one to create more.` },
        { status: 400 }
      );
    }

    const notebook = await createNotebook(session.user.id, name.trim());
    return Response.json({ notebook }, { status: 201 });
  } catch (error) {
    console.error('[notebooks POST]', error);
    return Response.json({ error: 'Failed to create notebook' }, { status: 500 });
  }
}