import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { auth } from '@/lib/auth/server';
import { groq, PADHAI_FALLBACK_MODEL, truncateSources } from '@/lib/groq';
import { retrieveChunks } from '@/lib/rag/retrieve';
import { checkAndGetUsage, logUsage } from '@/lib/usage/db';
import {
  listFlashcards,
  replaceFlashcards,
  setCardKnown,
  clearFlashcards,
} from '@/lib/flashcards/db';

export const maxDuration = 60;

const FlashcardSchema = z.object({
  cards: z.array(
    z.object({
      term: z.string().describe('The prompt on the front of the card'),
      definition: z.string().describe('The answer on the back — may contain $math$'),
      category: z.enum(['concept', 'formula', 'term', 'person', 'event']),
      difficulty: z.number().min(1).max(5).describe('1 = easy, 5 = hard'),
    })
  ).min(5).max(40),
});

const COUNT_MAP: Record<string, number> = {
  less: 8,
  standard: 15,
  more: 25,
  alot: 40,
};

// ============================================================
// GET — load persisted cards for a notebook
// ============================================================
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

    const cards = await listFlashcards(notebookId, session.user.id);
    return Response.json({ cards });
  } catch (error) {
    console.error('[flashcards GET]', error);
    return Response.json({ error: 'Failed to load flashcards' }, { status: 500 });
  }
}

// ============================================================
// POST — generate new cards from sources
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usage = await checkAndGetUsage(userId);
    if (!usage.ok) {
      return Response.json(
        { error: `Daily limit reached. Resets in 24 hours.`, usage },
        { status: 429 }
      );
    }

    const { sources, notebookId, count = 'standard' } = await req.json();

    if (!notebookId) {
      return Response.json({ error: 'notebookId required' }, { status: 400 });
    }

    const numCards = COUNT_MAP[count] ?? COUNT_MAP.standard;

    let contextText = '';

    if (notebookId) {
      try {
        const chunks = await retrieveChunks(
          `key terms, definitions, formulas, and concepts`,
          notebookId,
          [],
          15
        );
        const relevant = chunks.filter((c) => c.similarity > 0.2);
        if (relevant.length > 0) {
          contextText = relevant.map((c) => c.content).join('\n\n---\n\n');
          console.log(`[flashcards] retrieved ${relevant.length} chunks`);
        }
      } catch (err) {
        console.error('[flashcards] vector retrieval failed:', err);
      }
    }

    if (!contextText && sources) {
      contextText = truncateSources(sources, 5000);
    }

    if (!contextText || contextText.trim().length < 100) {
      return Response.json({ error: 'Not enough source material' }, { status: 400 });
    }

    const safeSources = truncateSources(contextText, 5000);

    console.log(`[flashcards] generating ${numCards} cards`);

    const { object, usage: genUsage } = await generateObject({
      model: groq(PADHAI_FALLBACK_MODEL),
      schema: FlashcardSchema,
      maxOutputTokens: 3072,
      prompt: `Create exactly ${numCards} flashcards from the material below.

Each card:
- term: the prompt shown on the front (a concept, formula, term, person, or event)
- definition: the answer shown on the back. Concise. Use $...$ for math (e.g., $F = ma$)
- category: concept | formula | term | person | event
- difficulty: 1 (easy) to 5 (hard)

Rules:
- Only use facts from the source
- Cover the breadth of the material
- Definitions must be short — one sentence or formula
- Math must be wrapped in $...$

--- SOURCE ---
${safeSources}
--- END SOURCE ---`,
    });

    try {
      await logUsage(userId, PADHAI_FALLBACK_MODEL, genUsage?.totalTokens ?? 800, 'flashcards');
    } catch (err) {
      console.error('[flashcards] usage log failed:', err);
    }

    // Persist to server
    await replaceFlashcards(
      notebookId,
      userId,
      object.cards.map((c) => ({
        term: c.term,
        definition: c.definition,
        category: c.category,
        difficulty: c.difficulty,
      }))
    );

    const cards = await listFlashcards(notebookId, userId);
    return Response.json({ cards });
  } catch (error: any) {
    const status = error?.statusCode ?? error?.lastError?.statusCode;
    if (status === 429) {
      return Response.json(
        { error: 'Rate limit reached. Try again in a few minutes.' },
        { status: 429 }
      );
    }
    console.error('[flashcards POST] error:', error);
    return Response.json({ error: 'Failed to generate flashcards' }, { status: 500 });
  }
}

// ============================================================
// PATCH — mark a card known/unknown
// ============================================================
export async function PATCH(req: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cardId, known } = await req.json();
    if (!cardId || typeof known !== 'boolean') {
      return Response.json({ error: 'cardId and known required' }, { status: 400 });
    }

    const updated = await setCardKnown(cardId, session.user.id, known);
    if (!updated) {
      return Response.json({ error: 'Card not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[flashcards PATCH]', error);
    return Response.json({ error: 'Failed to update card' }, { status: 500 });
  }
}

// ============================================================
// DELETE — clear all cards for a notebook
// ============================================================
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

    await clearFlashcards(notebookId, session.user.id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[flashcards DELETE]', error);
    return Response.json({ error: 'Failed to clear flashcards' }, { status: 500 });
  }
}