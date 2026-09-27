import { generateObject } from 'ai';
import { z } from 'zod';
import { auth } from '@/lib/auth/server';
import { groq, PADHAI_FALLBACK_MODEL, truncateSources } from '@/lib/groq';
import { retrieveChunks } from '@/lib/rag/retrieve';
import { checkAndGetUsage, logUsage } from '@/lib/usage/db';
import { getBrainMap, saveBrainMap, clearBrainMap } from '@/lib/brainmaps/db';

export const maxDuration = 60;

const BrainMapSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      importance: z.number().min(1).max(5),
    })
  ).min(3).max(8),
  edges: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      label: z.string(),
    })
  ).min(0).max(15),
});

// GET — load existing brainmap for a notebook
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

// POST — generate and save
export async function POST(req: Request) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const usage = await checkAndGetUsage(userId);
  if (!usage.ok) {
    return Response.json(
      { error: `Daily limit reached (${usage.limit.toLocaleString()} tokens). Resets in 24 hours.`, usage },
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
      `key concepts, main ideas, and their relationships`,
      notebookId,
      [],
      15
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

  const safeSources = truncateSources(contextText, 5000);

  try {
    const { object, usage: genUsage } = await generateObject({
      model: groq(PADHAI_FALLBACK_MODEL),
      schema: BrainMapSchema,
      maxOutputTokens: 3072,
      prompt: `Extract a small knowledge graph from the material below.

Create 3-8 nodes. Each node needs:
- id: short string like "n1"
- label: 2-5 words
- importance: integer 1-5

Create edges between related nodes. Each edge needs:
- source: source node id (must be an existing node id)
- target: target node id (must be an existing node id)
- label: short relationship like "related-to"

Rules:
- Every edge's source and target must be one of the node ids you created
- Use only facts from the source
- Keep it concise

--- SOURCE ---
${safeSources}
--- END SOURCE ---`,
    });

    const validIds = new Set(object.nodes.map((n) => n.id));
    const sanitizedEdges = object.edges.filter(
      (e) => validIds.has(e.source) && validIds.has(e.target)
    );

    try {
      await logUsage(userId, PADHAI_FALLBACK_MODEL, genUsage?.totalTokens ?? 500, 'brainmap');
    } catch (err) {
      console.error('[brainmap] usage log failed:', err);
    }

    // Save to DB
    try {
      await saveBrainMap(notebookId, userId, object.nodes, sanitizedEdges);
      console.log(`[brainmap] saved ${object.nodes.length} nodes for notebook ${notebookId}`);
    } catch (err) {
      console.error('[brainmap] DB save failed:', err);
      // Don't fail the request — still return the generated map
    }

    return Response.json({
      nodes: object.nodes,
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

// DELETE — clear brainmap
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