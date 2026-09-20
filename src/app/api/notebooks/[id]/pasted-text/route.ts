import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export const maxDuration = 15;

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
    const rows = await sql`
      SELECT pasted_text FROM notebooks
      WHERE id = ${id} AND user_id = ${session.user.id}
    `;

    if (rows.length === 0) {
      return Response.json({ error: 'Notebook not found' }, { status: 404 });
    }

    return Response.json({ pasted_text: rows[0].pasted_text ?? '' });
  } catch (error) {
    console.error('[pasted-text GET]', error);
    return Response.json({ error: 'Failed to load' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { pasted_text } = await req.json();

    if (typeof pasted_text !== 'string') {
      return Response.json({ error: 'pasted_text must be a string' }, { status: 400 });
    }

    const result = await sql`
      UPDATE notebooks
      SET pasted_text = ${pasted_text}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${session.user.id}
      RETURNING id
    `;

    if (result.length === 0) {
      return Response.json({ error: 'Notebook not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[pasted-text PUT]', error);
    return Response.json({ error: 'Failed to save' }, { status: 500 });
  }
}