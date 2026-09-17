import { generateObject } from 'ai';
import { z } from 'zod';
import { groq, PADHAI_MODEL, truncateSources } from '@/lib/groq';

export const maxDuration = 60;

const BrainMapSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string().describe('Unique short identifier, e.g. "n1"'),
      label: z.string().describe('The concept name, 1-5 words'),
      importance: z.number().min(1).max(5).describe('How central this concept is'),
    })
  ).min(5).max(20),
  edges: z.array(
    z.object({
      source: z.string().describe('Node id where edge starts'),
      target: z.string().describe('Node id where edge ends'),
      label: z.string().describe('Relationship, e.g. "causes", "part of"'),
    })
  ),
});

export async function POST(req: Request) {
  const { sources } = await req.json();

  if (!sources || sources.trim().length < 100) {
    return Response.json({ error: 'Not enough source material' }, { status: 400 });
  }

  const safeSources = truncateSources(sources, 6000);

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