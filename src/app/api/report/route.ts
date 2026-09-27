import { generateText } from 'ai';
import { auth } from '@/lib/auth/server';
import { groq, PADHAI_FALLBACK_MODEL, truncateSources } from '@/lib/groq';
import { retrieveChunks } from '@/lib/rag/retrieve';
import { checkAndGetUsage, logUsage } from '@/lib/usage/db';
import { getReport, saveReport, clearReport } from '@/lib/reports/db';

export const maxDuration = 60;

// GET — load existing report
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
    const report = await getReport(notebookId, userId);
    return Response.json({ report });
  } catch (err) {
    console.error('[report GET]', err);
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

  const { sources, notebookId, reportType = 'summary' } = await req.json();

  if (!notebookId) {
    return Response.json({ error: 'notebookId required' }, { status: 400 });
  }

  let contextText = '';

  try {
    const chunks = await retrieveChunks(
      `main topics, findings, and key information for a report`,
      notebookId,
      [],
      20
    );
    const relevant = chunks.filter((c) => c.similarity > 0.2);
    if (relevant.length > 0) {
      contextText = relevant.map((c) => c.content).join('\n\n---\n\n');
      console.log(`[report] retrieved ${relevant.length} chunks`);
    }
  } catch (err) {
    console.error('[report] vector retrieval failed:', err);
  }

  if (!contextText && sources) {
    contextText = truncateSources(sources, 6000);
  }

  if (!contextText || contextText.trim().length < 100) {
    return Response.json({ error: 'Not enough source material' }, { status: 400 });
  }

  const safeSources = truncateSources(contextText, 6000);

  try {
    const { text, usage: genUsage } = await generateText({
      model: groq(PADHAI_FALLBACK_MODEL),
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

## References
- Source 1
- Source 2

Only use facts from the source text.

--- SOURCE ---
${safeSources}
--- END SOURCE ---`,
    });

    try {
      await logUsage(userId, PADHAI_FALLBACK_MODEL, genUsage?.totalTokens ?? 500, 'report');
    } catch (err) {
      console.error('[report] usage log failed:', err);
    }

    // Extract title from first markdown line (e.g., "# Title")
    const titleMatch = text.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim().slice(0, 120) : 'Report';

    try {
      await saveReport(notebookId, userId, title, text);
      console.log(`[report] saved "${title}" for notebook ${notebookId}`);
    } catch (err) {
      console.error('[report] DB save failed:', err);
    }

    return Response.json({ markdown: text, title });
  } catch (error: any) {
    const status = error?.statusCode ?? error?.lastError?.statusCode;
    if (status === 429) {
      return Response.json(
        { error: 'Rate limit reached. Please try again in a few minutes.' },
        { status: 429 }
      );
    }
    console.error('Report generation error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    );
  }
}

// DELETE — clear report
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
    await clearReport(notebookId, userId);
    return Response.json({ success: true });
  } catch (err) {
    console.error('[report DELETE]', err);
    return Response.json({ error: 'Failed to clear' }, { status: 500 });
  }
}