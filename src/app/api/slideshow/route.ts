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

const SlideSchema = z.object({
  type: z.enum(['section', 'bullets', 'statement', 'takeaway']),
  heading: z.string().describe('Short heading — 2-6 words'),
  bullets: z.array(z.string()).min(0).max(5).describe('For "bullets" type: 2-5 points. Empty array for other types.'),
  statement: z.string().describe('For "statement" type: one sentence. Empty string for other types.'),
  sectionNumber: z.string().describe('For "section" type: a number or short word like "01", "02". Empty string for other types.'),
  sectionLabel: z.string().describe('For "section" type: the section name. Empty string for other types.'),
  takeaways: z.array(z.string()).min(0).max(3).describe('For "takeaway" type: 2-3 short lines. Empty array for other types.'),
  math: z.string().describe('Optional $...$ formula. Use empty string "" if none.'),
  notes: z.string().describe('1-2 sentences of speaker notes.'),
});

const SlideshowSchema = z.object({
  title: z.string().describe('Deck title — 3-8 words'),
  subtitle: z.string().describe('One-line subtitle'),
  slides: z.array(SlideSchema).min(4).max(25),
});

const COUNT_MAP: Record<string, number> = {
  brief: 6,
  standard: 10,
  detailed: 15,
  full: 20,
};

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
      prompt: `You are designing a presentation deck with approximately ${numSlides} content slides from the source material below.

Each slide has a "type". Use EXACTLY these rules:

- "section": Section divider. Use 1-2 times to break the deck into parts.
  Set sectionNumber to "01", "02", etc. Set sectionLabel to the section name.
  Leave bullets, statement, takeaways as EMPTY.
  Do NOT use this as the first or last slide.

- "bullets": The workhorse. Use for most content slides.
  Set bullets to 2-5 short points (each under 15 words).
  Leave statement, sectionNumber, sectionLabel, takeaways as EMPTY.

- "statement": One big idea. Use sparingly (0-2 times).
  Set statement to ONE complete sentence (under 20 words).
  Leave bullets, sectionNumber, sectionLabel, takeaways as EMPTY.

- "takeaway": The closing summary. Use EXACTLY ONCE as the second-to-last slide.
  Set takeaways to 2-3 short lines.
  Leave bullets, statement, sectionNumber, sectionLabel as EMPTY.

For ALL slides:
- heading is required (2-6 words)
- notes: 1-2 sentences of speaker notes
- math: optional $...$ formula, empty string if none

Slide order:
1. A "bullets" or "statement" slide opening the topic
2. Content slides (mostly "bullets", occasionally "section" or "statement")
3. One "takeaway" slide near the end
4. Final content slide

Rules:
- ONLY use facts from the source material
- Keep bullets concise — they'll be projected on a screen
- Do not invent statistics

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