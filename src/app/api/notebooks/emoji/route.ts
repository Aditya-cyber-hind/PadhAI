import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { getNotebook, setNotebookEmoji } from '@/lib/notebooks/db';
import { generateEmojiForContent } from '@/lib/notebooks/emoji';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notebookId, sampleText } = await req.json();
    if (!notebookId) {
      return Response.json({ error: 'notebookId required' }, { status: 400 });
    }

    const notebook = await getNotebook(notebookId, session.user.id);
    if (!notebook) {
      return Response.json({ error: 'Notebook not found' }, { status: 404 });
    }

    // If caller didn't pass sample text, we can't generate contextually.
    // Fall back to generating from the notebook name alone.
    const text = sampleText || `Notebook title: ${notebook.name}`;

    const emoji = await generateEmojiForContent(notebook.name, text);
    if (!emoji) {
      return Response.json({ error: 'Emoji generation failed' }, { status: 500 });
    }

    await setNotebookEmoji(notebookId, session.user.id, emoji);

    return Response.json({ emoji });
  } catch (error) {
    console.error('[notebooks/emoji]', error);
    return Response.json({ error: 'Failed to generate emoji' }, { status: 500 });
  }
}