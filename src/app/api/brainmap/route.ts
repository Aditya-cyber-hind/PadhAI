import { generateObject } from 'ai';
import { z } from 'zod';
import { auth } from '@/lib/auth/server';
import { groq, PADHAI_FALLBACK_MODEL, truncateSources } from '@/lib/groq';
import { retrieveChunks } from '@/lib/rag/retrieve';
import { checkAndGetUsage, logUsage } from '@/lib/usage/db';
import { getBrainMap, saveBrainMap, clearBrainMap } from '@/lib/brainmaps/db';

export const maxDuration = 60;

const NODE_TYPES = ['concept', 'formula', 'process', 'term', 'person', 'event'] as const;

const BrainMapSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        type: z.enum(NODE_TYPES),
        importance: z.number().min(1).max(5),
        summary: z.string().max(220),
        sourceRefs: z.array(z.string()).max(3),
      })
    )
    .min(4)
    .max(18),
  edges: z
    .array(
      z.object({
        source: z.string(),
        target: z.string(),
        label: z.string().max(40),
        strength: z.number().min(0.1).max(1),
      })
    )
    .min(0)
    .max(40),
});

const PROMPT = `You extract a knowledge graph from study material.

Return 6-15 nodes and 8-25 edges that represent the KEY ideas and how they connect.

For each NODE:
- id: short snake_case string (e.g. "photosynthesis", "calvin_cycle")
- label: 1-4 words, title case (e.g. "Calvin Cycle")
- type: exactly one of: concept, formula, process, term, person, event
  · concept  — an idea or theory (e.g. "Natural selection")
  · formula  — a mathematical relationship (e.g. "E = mc²")
  · process  — something that happens over time (e.g. "Photosynthesis")
  · term     — a definition or vocabulary item (e.g. "Mitochondria")
  · person   — a named individual (e.g. "Charles Darwin")
  · event    — a historical or discrete event (e.g. "French Revolution")
- importance: integer 1-5 (5 = central to understanding, 1 = supporting detail)
- summary: ONE sentence explaining what this is, using ONLY the source
- sourceRefs: up to 3 short source names this concept came from

For each EDGE:
- source / target: node ids that exist in your nodes array
- label: 1-3 word relation (e.g. "uses", "produces", "part of", "opposite of", "causes")
- strength: 0.1-1.0 (1.0 = strong direct relationship, 0.3 = loose association)

RULES:
- Every edge's source and target MUST exist in your nodes array
- Only facts stated in or directly inferable from the source
- Prefer fewer, well-connected nodes over many scattered ones
- node id must be unique
- Prefer strength > 0.7 for the clearest relationships — those will be shown as labeled lines`;

export async function GET(req: Request) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const notebookId = url.searchParams.get('notebookId');
  if (!notebookId) {
    return Response.json({ error: 'notebookId required' }, { status: 400 });
  }

  try {
    const brainmap = await getBrainMap(notebookId, userId);
    return Response.json({ brainmap });
  } catch (err) {
    console.error('[brainmap GET]', err);
    return Response.json({ error: 'Failed to load' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const usage = await checkAndGetUsage(userId);
  if (!usage.ok) {
    return Response.json(
      {
        error: `Daily limit reached (${usage.limit.toLocaleString()} tokens). Resets in 24 hours.`,
        usage,
      },
      { status: 429 }
    );
  }

  const { sources, notebookId } = await req.json();
  if (!notebookId) {
    return Response.json({ error: 'notebookId required' }, { status: 400 });
  }

  let contextText = '';

  try {
    const chunks = await retrieveChunks(
      `key concepts, definitions, processes, formulas, and how they relate`,
      notebookId,
      [],
      20
    );
    const relevant = chunks.filter((c) => c.similarity > 0.2);
    if (relevant.length > 0) {
      contextText = relevant.map((c) => c.content).join('\n\n---\n\n');
      console.log(`[brainmap] retrieved ${relevant.length} chunks`);
    }
  } catch (err) {
    console.error('[brainmap] vector retrieval failed:', err);
  }

  if (!contextText && sources) {
    contextText = truncateSources(sources, 5000);
  }

  if (!contextText || contextText.trim().length < 100) {
    return Response.json({ error: 'Not enough source material' }, { status: 400 });
  }

  const safeSources = truncateSources(contextText, 6000);

  try {
    const { object, usage: genUsage } = await generateObject({
      model: groq(PADHAI_FALLBACK_MODEL),
      schema: BrainMapSchema,
      maxOutputTokens: 4096,
      prompt: `${PROMPT}

--- SOURCE ---
${safeSources}
--- END SOURCE ---`,
    });

    // Sanitize: drop edges that reference non-existent nodes, drop dup node ids
    const seenIds = new Set<string>();
    const uniqueNodes = object.nodes.filter((n) => {
      if (seenIds.has(n.id)) return false;
      seenIds.add(n.id);
      return true;
    });
    const validIds = new Set(uniqueNodes.map((n) => n.id));
    const sanitizedEdges = object.edges.filter(
      (e) =>
        validIds.has(e.source) &&
        validIds.has(e.target) &&
        e.source !== e.target
    );

    try {
      await logUsage(
        userId,
        PADHAI_FALLBACK_MODEL,
        genUsage?.totalTokens ?? 800,
        'brainmap'
      );
    } catch (err) {
      console.error('[brainmap] usage log failed:', err);
    }

    try {
      await saveBrainMap(notebookId, userId, uniqueNodes, sanitizedEdges);
      console.log(
        `[brainmap] saved ${uniqueNodes.length} nodes, ${sanitizedEdges.length} edges`
      );
    } catch (err) {
      console.error('[brainmap] DB save failed:', err);
    }

    return Response.json({
      nodes: uniqueNodes,
      edges: sanitizedEdges,
    });
  } catch (error: any) {
    const status = error?.statusCode ?? error?.lastError?.statusCode;
    if (status === 429) {
      return Response.json(
        { error: 'Rate limit reached. Please try again in a few minutes.' },
        { status: 429 }
      );
    }
    console.error('Brain map generation error:', error);
    return Response.json({ error: 'Failed to generate brain map' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const notebookId = url.searchParams.get('notebookId');
  if (!notebookId) {
    return Response.json({ error: 'notebookId required' }, { status: 400 });
  }

  try {
    await clearBrainMap(notebookId, userId);
    return Response.json({ success: true });
  } catch (err) {
    console.error('[brainmap DELETE]', err);
    return Response.json({ error: 'Failed to clear' }, { status: 500 });
  }
}