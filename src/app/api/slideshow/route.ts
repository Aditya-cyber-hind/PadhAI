import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { auth } from '@/lib/auth/server';
import { groq, PADHAI_FALLBACK_MODEL, truncateSources } from '@/lib/groq';
import { retrieveChunks } from '@/lib/rag/retrieve';
import { checkAndGetUsage, logUsage } from '@/lib/usage/db';
import {
  getSlideshow,
  replaceSlideshow,
  clearSlideshow,
} from '@/lib/slideshow/db';

export const maxDuration = 60;

const SlideshowSchema = z.object({
  title: z.string().describe('Deck title — 3-8 words'),
  subtitle: z.string().describe('One-line subtitle or source description'),
  slides: z.array(
    z.object({
      heading: z.string().describe('Slide heading — 2-6 words'),
      bullets: z.array(z.string()).min(2).max(5).describe('2-5 concise bullet points'),
      notes: z.string().describe('1-2 sentences of speaker notes'),
      // Required by Groq — can be an empty string when no formula applies
      math: z.string().describe('Optional $...$ formula. Use empty string "" if none.'),
    })
  ).min(4).max(25),
});

const COUNT_MAP: Record<string, number> = {
  brief: 6,
  standard: 10,
  detailed: 15,
  full: 20,
};

// ============================================================
// GET — load existing slideshow
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

    const deck = await getSlideshow(notebookId, session.user.id);
    return Response.json({ slideshow: deck });
  } catch (error) {
    console.error('[slideshow GET]', error);
    return Response.json({ error: 'Failed to load slideshow' }, { status: 500 });
  }
}

// ============================================================
// POST — generate new slideshow
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

    const numSlides = COUNT_MAP[count] ?? COUNT_MAP.standard;

    let contextText = '';

    if (notebookId) {
      try {
        const chunks = await retrieveChunks(
          `main topics, sections, key ideas, and structure`,
          notebookId,
          [],
          15
        );
        const relevant = chunks.filter((c) => c.similarity > 0.2);
        if (relevant.length > 0) {
          contextText = relevant.map((c) => c.content).join('\n\n---\n\n');
          console.log(`[slideshow] retrieved ${relevant.length} chunks`);
        }
      } catch (err) {
        console.error('[slideshow] vector retrieval failed:', err);
      }
    }

    if (!contextText && sources) {
      contextText = truncateSources(sources, 5000);
    }

    if (!contextText || contextText.trim().length < 100) {
      return Response.json({ error: 'Not enough source material' }, { status: 400 });
    }

    const safeSources = truncateSources(contextText, 5000);

    console.log(`[slideshow] generating ${numSlides} slides`);

    const { object, usage: genUsage } = await generateObject({
      model: groq(PADHAI_FALLBACK_MODEL),
      schema: SlideshowSchema,
      maxOutputTokens: 3072,
      prompt: `Create a presentation deck with approximately ${numSlides} slides from the material below.

Structure:
- Title: a clear deck title (3-8 words)
- Subtitle: one line describing the source
- ${numSlides} content slides, each with:
  * heading: 2-6 words
  * bullets: 2-5 short points (each under 15 words)
  * notes: 1-2 sentences of what a presenter would say
  * math: a $...$ formula if this slide has one, otherwise an empty string ""

Rules:
- Only use facts from the source
- Keep bullets concise — they'll be projected on a screen
- Math formulas use $...$ syntax (e.g., $F = ma$)
- Order slides logically: intro → key concepts → examples → summary

--- SOURCE ---
${safeSources}
--- END SOURCE ---`,
    });

    try {
      await logUsage(userId, PADHAI_FALLBACK_MODEL, genUsage?.totalTokens ?? 1000, 'slideshow');
    } catch (err) {
      console.error('[slideshow] usage log failed:', err);
    }

    await replaceSlideshow(
      notebookId,
      userId,
      object.title,
      object.subtitle,
      object.slides
    );

    const deck = await getSlideshow(notebookId, userId);
    return Response.json({ slideshow: deck });
  } catch (error: any) {
    const status = error?.statusCode ?? error?.lastError?.statusCode;
    if (status === 429) {
      return Response.json(
        { error: 'Rate limit reached. Try again in a few minutes.' },
        { status: 429 }
      );
    }
    console.error('[slideshow POST] error:', error);
    return Response.json({ error: 'Failed to generate slideshow' }, { status: 500 });
  }
}

// ============================================================
// DELETE — clear slideshow for a notebook
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

    await clearSlideshow(notebookId, session.user.id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[slideshow DELETE]', error);
    return Response.json({ error: 'Failed to clear slideshow' }, { status: 500 });
  }
}