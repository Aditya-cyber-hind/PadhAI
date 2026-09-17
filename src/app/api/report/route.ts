import { generateText } from 'ai';
import { groq, PADHAI_MODEL, truncateSources } from '@/lib/groq';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { sources, reportType = 'summary' } = await req.json();

  if (!sources || sources.trim().length < 100) {
    return Response.json({ error: 'Not enough source material' }, { status: 400 });
  }

  const safeSources = truncateSources(sources, 6000);

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