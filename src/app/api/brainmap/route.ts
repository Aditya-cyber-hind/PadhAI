import { generateObject } from 'ai';
import { z } from 'zod';
import { groq, PADHAI_MODEL, truncateSources } from '@/lib/groq';
import { retrieveChunks } from '@/lib/rag/retrieve';

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
  const { sources, userId } = await req.json();

  let contextText = '';

  if (userId) {
    try {
      const chunks = await retrieveChunks(
        `key concepts, main ideas, and their relationships`,
        userId,
        20
      );
      const relevant = chunks.filter((c) => c.similarity > 0.2);
      if (relevant.length > 0) {
        contextText = relevant.map((c) => c.content).join('\n\n---\n\n');
        console.log(`[brainmap] retrieved ${relevant.length} chunks for user ${userId}`);
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
    const { object } = await generateObject({
      model: groq(PADHAI_MODEL),
      schema: BrainMapSchema,
      prompt: `Extract the key concepts and their relationships from this material.
Create 5-20 nodes (concepts) and edges (relationships) between them.

--- SOURCE ---
${safeSources}
--- END SOURCE ---`,
    });

    return Response.json(object);
  } catch (error) {
    console.error('Brain map generation error:', error);
    return Response.json({ error: 'Failed to generate brain map' }, { status: 500 });
  }
}