import { generateObject } from 'ai';
import { z } from 'zod';
import { auth } from '@/lib/auth/server';
import { groq, PADHAI_FALLBACK_MODEL, truncateSources } from '@/lib/groq';
import { retrieveChunks } from '@/lib/rag/retrieve';
import { checkAndGetUsage, logUsage } from '@/lib/usage/db';

export const maxDuration = 60;

const BrainMapSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      importance: z.number().min(1).max(5),
    })
  ).min(5).max(20),
  edges: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      label: z.string(),
    })
  ),
});

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

  let contextText = '';

  if (notebookId) {
    try {
      const chunks = await retrieveChunks(
        `key concepts, main ideas, and their relationships`,
        notebookId,
        [],
        20
      );
      const relevant = chunks.filter((c) => c.similarity > 0.2);
      if (relevant.length > 0) {
        contextText = relevant.map((c) => c.content).join('\n\n---\n\n');
        console.log(`[brainmap] retrieved ${relevant.length} chunks from notebook ${notebookId}`);
      }
    } catch (err) {
      console.error('[brainmap] vector retrieval failed:', err);
    }
  }

  if (!contextText && sources) {
    contextText = truncateSources(sources, 6000);
  }

  if (!contextText || contextText.trim().length < 100) {
    return Response.json({ error: 'Not enough source material' }, { status: 400 });
  }

  const safeSources = truncateSources(contextText, 6000);

  try {
    const { object, usage: genUsage } = await generateObject({
      model: groq(PADHAI_FALLBACK_MODEL),
      schema: BrainMapSchema,
      prompt: `Extract the key concepts and their relationships from this material.
Create 5-20 nodes (concepts) and edges (relationships) between them.

--- SOURCE ---
${safeSources}
--- END SOURCE ---`,
    });

    try {
      await logUsage(userId, PADHAI_FALLBACK_MODEL, genUsage?.totalTokens ?? 500, 'brainmap');
    } catch (err) {
      console.error('[brainmap] usage log failed:', err);
    }

    return Response.json(object);
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