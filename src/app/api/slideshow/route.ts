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
import { DEFAULT_THEME, THEMES, type ThemeId } from '@/lib/slideshow/themes';

export const maxDuration = 60;

const SlideSchema = z.object({
  type: z.enum(['section', 'bullets', 'statement', 'takeaway']),
  layout: z.string().describe('Layout variant for this slide type. See rules below.'),
  heading: z.string().describe('Short heading — 2-6 words'),
  bullets: z.array(z.string()).min(0).max(6).describe('For "bullets" type: 2-6 points. Empty array for other types.'),
  statement: z.string().describe('For "statement" type: one sentence. Empty string for other types.'),
  sectionNumber: z.string().describe('For "section" type: a number or short word like "01", "02". Empty string for other types.'),
  sectionLabel: z.string().describe('For "section" type: the section name. Empty string for other types.'),
  takeaways: z.array(z.string()).min(0).max(4).describe('For "takeaway" type: 2-4 short lines. Empty array for other types.'),
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

    const {
      sources,
      notebookId,
      count = 'standard',
      theme = DEFAULT_THEME,
    }: {
      sources?: string;
      notebookId?: string;
      count?: string;
      theme?: string;
    } = await req.json();

    if (!notebookId) {
      return Response.json({ error: 'notebookId required' }, { status: 400 });
    }

    // Validate theme
    const safeTheme: ThemeId = (THEMES.some((t) => t.id === theme)
      ? theme
      : DEFAULT_THEME) as ThemeId;

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

    if (!contextText || contextText.trim().length < 800) {
      return Response.json(
        {
          error:
            'Your sources are too short to build a slideshow. Add a longer document, upload another PDF, or paste more text — then try again.',
        },
        { status: 400 }
      );
    }

    const safeSources = truncateSources(contextText, 5000);

    console.log(`[slideshow] generating ${numSlides} slides (theme: ${safeTheme})`);

    const { object, usage: genUsage } = await generateObject({
      model: groq(PADHAI_FALLBACK_MODEL),
      schema: SlideshowSchema,
      maxOutputTokens: 3072,
      providerOptions: {
        groq: { reasoning_effort: 'low' },
      },
      prompt: `You are designing a presentation deck with approximately ${numSlides} content slides from the source material below.

For each slide you MUST pick:
  · a "type"   — what kind of slide it is
  · a "layout" — how the content is arranged inside the slide

TYPE = "section":
  Use 1-2 times to break the deck into parts.
  Layout options:
    · "number-hero" — giant number + label (default)
    · "split"       — number on left, label on right
    · "badge"       — centered pill badge + headline
  Set sectionNumber to "01", "02", etc. Set sectionLabel to the section name.
  Leave bullets, statement, takeaways as EMPTY.
  Do NOT use as the first or last slide.

TYPE = "bullets": The workhorse. Use for most content slides.
  Layout options (CHOOSE BASED ON CONTENT):
    · "list"        — 2-4 longer items (each 8-20 words). Use when ideas are detailed.
    · "two-column"  — 4-6 items (each 6-15 words). Use for parallel concepts.
    · "icon-grid"   — 3-6 SHORT items (each UNDER 8 words). Use for punchy takeaways or quick facts.
    · "flow"        — 3-4 SEQUENTIAL steps (each 6-12 words). Use only when content has a clear order (first/then/finally, steps, stages).
  Set bullets to 2-6 items. Leave statement, sectionNumber, sectionLabel, takeaways as EMPTY.

TYPE = "statement": One big idea.
  Layout options:
    · "hero"       — centered, full-screen feel (default)
    · "left"       — left-aligned with accent border
    · "underlined" — centered with an underline accent (BEST for statements UNDER 14 words)
  Use 0-2 times. Set statement to ONE complete sentence. Leave others EMPTY.

TYPE = "takeaway": The closing summary. Use EXACTLY ONCE as the second-to-last slide.
  Layout options:
    · "numbered"  — numbered circles (default)
    · "checklist" — checkmark boxes
    · "icons"     — emoji + text cards (BEST for 2-4 SHORT items under 10 words each)
  Set takeaways to 2-4 short lines. Leave others EMPTY.

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
- CHOOSE THE LAYOUT CAREFULLY. If bullets are all short (<8 words) and you have 4+, use "icon-grid". If they describe a sequence, use "flow". If they're detailed explanations, use "list".

--- SOURCE ---
${safeSources}
--- END SOURCE ---`,
    });

    try {
      await logUsage(
        userId,
        PADHAI_FALLBACK_MODEL,
        genUsage?.totalTokens ?? 1000,
        'slideshow'
      );
    } catch (err) {
      console.error('[slideshow] usage log failed:', err);
    }

    await replaceSlideshow(
      notebookId,
      userId,
      object.title,
      object.subtitle,
      object.slides,
      safeTheme
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