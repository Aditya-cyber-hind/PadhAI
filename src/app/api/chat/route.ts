import { streamText, generateText, UIMessage } from 'ai';
import { auth } from '@/lib/auth/server';
import { groq, PADHAI_MODEL, PADHAI_FALLBACK_MODEL, truncateSources } from '@/lib/groq';
import { retrieveChunks } from '@/lib/rag/retrieve';
import { checkAndGetUsage, logUsage } from '@/lib/usage/db';

export const maxDuration = 60;

function toModelMessages(uiMessages: UIMessage[]) {
  return uiMessages.map((m) => {
    const text = m.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') ?? '';
    return {
      role: m.role as 'user' | 'assistant' | 'system',
      content: text,
    };
  });
}

async function doesModelWork(
  modelId: string,
  system: string,
  messages: UIMessage[],
  useWebSearch: boolean
): Promise<boolean> {
  try {
    await generateText({
      model: groq(modelId),
      system,
      messages: toModelMessages(messages),
      maxOutputTokens: 1,
      maxRetries: 0,
      ...(useWebSearch
        ? { tools: { browser_search: groq.tools.browserSearch({}) } }
        : {}),
    });
    return true;
  } catch (err: any) {
    console.log(`[chat] probe ${modelId} failed: ${err?.statusCode ?? err?.lastError?.statusCode}`);
    return false;
  }
}

export async function POST(req: Request) {
  // Auth check
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Usage check
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

  const {
    messages,
    sources,
    notebookId,
    sourceNames,
    useWebSearch,
  }: {
    messages: UIMessage[];
    sources?: string;
    notebookId?: string;
    sourceNames?: string[];
    useWebSearch?: boolean;
  } = await req.json();

  const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
  const query =
    lastUserMessage?.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') ?? '';

  let contextBlock = '';

  if (query.trim().length > 0 && notebookId) {
    try {
      const chunks = await retrieveChunks(query, notebookId, sourceNames ?? [], 5);
      const relevant = chunks.filter((c) => c.similarity > 0.3);
      if (relevant.length > 0) {
        contextBlock = relevant
          .map(
            (c) =>
              `[Source: ${c.sourceName} (chunk ${c.chunkIndex}, similarity ${c.similarity.toFixed(2)})]\n${c.content}`
          )
          .join('\n\n---\n\n');
        console.log(`[chat] retrieved ${relevant.length} chunks`);
      }
    } catch (err) {
      console.error('[chat] vector retrieval failed:', err);
    }
  }

  if (!contextBlock && sources) {
    contextBlock = truncateSources(sources, 6000);
  }

  const webSearchEnabled = useWebSearch === true;

  const systemPrompt = webSearchEnabled
    ? `You are PadhAI, a helpful research assistant with web access.
Use the browser search tool to find current, accurate information.

--- CONTEXT ---
${contextBlock || 'No context provided.'}
--- END CONTEXT ---`
    : `You are PadhAI, a helpful research assistant.
Answer questions based ONLY on the context provided below.
If the answer isn't in the context, say so clearly.

--- CONTEXT ---
${contextBlock || 'No context available yet.'}
--- END CONTEXT ---`;

  let chosenModel = PADHAI_MODEL;
  console.log(`[chat] probing ${PADHAI_MODEL}...`);

  const works = await doesModelWork(PADHAI_MODEL, systemPrompt, messages, webSearchEnabled);
  if (!works) {
    console.log(`[chat] ⚠️ falling back to ${PADHAI_FALLBACK_MODEL}`);
    chosenModel = PADHAI_FALLBACK_MODEL;
  } else {
    console.log(`[chat] ✅ using ${PADHAI_MODEL}`);
  }

  // Rough token estimate: input chars / 4 + expected output (500)
  const estimatedTokens = Math.ceil(
    (systemPrompt.length + query.length) / 4
  ) + 500;

  const result = streamText({
    model: groq(chosenModel),
    system: systemPrompt,
    messages: toModelMessages(messages),
    maxRetries: 0,
    onFinish: async ({ usage: finishUsage }) => {
      try {
        const total = finishUsage?.totalTokens ?? estimatedTokens;
        await logUsage(userId, chosenModel, total, 'chat');
        console.log(`[chat] logged ${total} tokens for user ${userId}`);
      } catch (err) {
        console.error('[chat] usage log failed:', err);
      }
    },
    ...(webSearchEnabled
      ? { tools: { browser_search: groq.tools.browserSearch({}) } }
      : {}),
    providerOptions: {
      groq: { reasoning_effort: 'low' },
    },
  });

  return result.toUIMessageStreamResponse();
}