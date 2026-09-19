import { generateText } from 'ai';
import { groq, PADHAI_MODEL, truncateSources } from '@/lib/groq';
import { retrieveChunks } from '@/lib/rag/retrieve';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { sources, userId, reportType = 'summary' } = await req.json();

  let contextText = '';

  if (userId) {
    try {
      const chunks = await retrieveChunks(
        `main topics, findings, and key information for a report`,
        userId,
        20
      );
      const relevant = chunks.filter((c) => c.similarity > 0.2);
      if (relevant.length > 0) {
        contextText = relevant.map((c) => c.content).join('\n\n---\n\n');
        console.log(`[report] retrieved ${relevant.length} chunks for user ${userId}`);
      }
    } catch (err) {
      console.error('[report] vector retrieval failed:', err);
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
    const { text } = await generateText({
      model: groq(PADHAI_MODEL),
      prompt: `Generate a structured ${reportType} report in Markdown from the material below.

Use this format:
# Title of the Report

A 2-3 sentence executive summary.

## Section Heading 1
Content...

## Section Heading 2
Content...

## Key Takeaways
- Point 1
- Point 2
- Point 3

## References
- Source 1
- Source 2

Only use facts from the source text. Be concise and professional.

--- SOURCE ---
${safeSources}
--- END SOURCE ---`,
    });

    return Response.json({ markdown: text });
  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    );
  }
}