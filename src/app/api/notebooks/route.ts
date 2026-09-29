import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { neon } from '@neondatabase/serverless';
import { generateEmojiForContent } from '@/lib/notebooks/emoji';
import { setNotebookEmoji } from '@/lib/notebooks/db';

export const maxDuration = 30;

const sql = neon(process.env.DATABASE_URL!);
const MAX_NOTEBOOKS = 15;

export async function GET() {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await sql`
      SELECT
        n.id, n.user_id, n.name, n.emoji,
        COALESCE(n.notebook_type, 'study') AS notebook_type,
        n.created_at, n.updated_at,
        COALESCE(m.msg_count, 0)::int AS message_count,
        COALESCE(u.req_count, 0)::int AS request_count
      FROM notebooks n
      LEFT JOIN (SELECT notebook_id, COUNT(*) AS msg_count FROM chat_messages GROUP BY notebook_id) m ON m.notebook_id = n.id
      LEFT JOIN (SELECT user_id, COUNT(*) AS req_count FROM usage_logs WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY user_id) u ON u.user_id = n.user_id
      WHERE n.user_id = ${session.user.id}
      ORDER BY n.updated_at DESC
    `;
    return Response.json({ notebooks: rows });
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

    const { name, notebookType = 'study' } = await req.json();
    if (!name || name.trim().length === 0) {
      return Response.json({ error: 'Name is required' }, { status: 400 });
    }
    if (notebookType !== 'study' && notebookType !== 'coding') {
      return Response.json({ error: 'Invalid notebook type' }, { status: 400 });
    }

    const countRows = await sql`
      SELECT COUNT(*)::int AS count FROM notebooks WHERE user_id = ${session.user.id}
    `;
    const count = (countRows[0] as { count: number }).count;
    if (count >= MAX_NOTEBOOKS) {
      return Response.json(
        { error: `You've reached the limit of ${MAX_NOTEBOOKS} notebooks.` },
        { status: 400 }
      );
    }

    const rows = await sql`
      INSERT INTO notebooks (user_id, name, notebook_type)
      VALUES (${session.user.id}, ${name.trim()}, ${notebookType})
      RETURNING id, user_id, name, emoji, COALESCE(notebook_type, 'study') AS notebook_type, created_at, updated_at
    `;

    const notebook = rows[0] as {
      id: string;
      name: string;
      notebook_type: 'study' | 'coding';
    };

    // Fire-and-forget emoji generation based on the notebook name.
    void generateEmojiForNewNotebook(
      notebook.id,
      session.user.id,
      notebook.name
    );

    return Response.json({ notebook: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[notebooks POST]', error);
    return Response.json({ error: 'Failed to create notebook' }, { status: 500 });
  }
}

async function generateEmojiForNewNotebook(
  notebookId: string,
  userId: string,
  notebookName: string
): Promise<void> {
  try {
    const emoji = await generateEmojiForContent(
      notebookName,
      `Notebook title: ${notebookName}`
    );
    if (!emoji) return;
    await setNotebookEmoji(notebookId, userId, emoji);
    console.log(`[notebooks] emoji set for new notebook: ${emoji}`);
  } catch (err) {
    console.error('[notebooks] emoji generation failed:', err);
  }
}