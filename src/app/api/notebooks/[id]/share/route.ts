import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { neon } from '@neondatabase/serverless';
import { nanoid } from 'nanoid';

export const maxDuration = 15;

const sql = neon(process.env.DATABASE_URL!);

// POST: generate a share token (or return existing)
export async function POST(
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
    // Check the notebook belongs to this user
    const rows = await sql`
      SELECT id, name, share_token
      FROM notebooks
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (rows.length === 0) {
      return Response.json({ error: 'Notebook not found' }, { status: 404 });
    }

    const existing = rows[0] as { share_token: string | null };

    // If already shared, return the existing token
    if (existing.share_token) {
      return Response.json({
        token: existing.share_token,
        url: `/share/${existing.share_token}`,
        created: false,
      });
    }

    // Generate a short, URL-safe token. 10 chars = ~1 in 60 trillion collision
    const token = nanoid(10);

    const updated = await sql`
      UPDATE notebooks
      SET share_token = ${token}
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING share_token
    `;

    const finalToken = (updated[0] as { share_token: string }).share_token;

    return Response.json({
      token: finalToken,
      url: `/share/${finalToken}`,
      created: true,
    });
  } catch (err) {
    console.error('[share POST]', err);
    return Response.json({ error: 'Failed to create share link' }, { status: 500 });
  }
}

// DELETE: revoke the share link
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
    await sql`
      UPDATE notebooks
      SET share_token = NULL
      WHERE id = ${id} AND user_id = ${userId}
    `;
    return Response.json({ success: true });
  } catch (err) {
    console.error('[share DELETE]', err);
    return Response.json({ error: 'Failed to revoke share link' }, { status: 500 });
  }
}