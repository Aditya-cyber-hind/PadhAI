import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { createSingleFlashcard } from '@/lib/flashcards/db';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { notebookId, term, definition, category, difficulty } = body;

    if (!notebookId || typeof notebookId !== 'string') {
      return Response.json({ error: 'notebookId required' }, { status: 400 });
    }
    if (!term || typeof term !== 'string' || term.trim().length === 0) {
      return Response.json({ error: 'term required' }, { status: 400 });
    }
    if (!definition || typeof definition !== 'string') {
      return Response.json({ error: 'definition required' }, { status: 400 });
    }

    const safeCategory = ['concept', 'formula', 'term', 'person', 'event'].includes(category)
      ? category
      : 'concept';

    const diffNum =
      typeof difficulty === 'number' && difficulty >= 1 && difficulty <= 5
        ? Math.round(difficulty)
        : 3;

    const card = await createSingleFlashcard(notebookId, userId, {
      term: term.trim().slice(0, 500),
      definition: definition.trim().slice(0, 2000),
      category: safeCategory,
      difficulty: diffNum,
    });

    return Response.json({ card });
  } catch (err) {
    console.error('[flashcards/single POST]', err);
    return Response.json({ error: 'Failed to add flashcard' }, { status: 500 });
  }
}