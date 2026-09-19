import { streamText, generateText, UIMessage } from 'ai';
import { groq, PADHAI_MODEL, PADHAI_FALLBACK_MODEL, truncateSources } from '@/lib/groq';
import { retrieveChunks } from '@/lib/rag/retrieve';

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
    const status = err?.statusCode ?? err?.lastError?.statusCode;
    console.log(`[chat] probe ${modelId} failed with status ${status}`);
    return false;
  }
}

export async function POST(req: Request) {
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
You may also reference the user's provided context if relevant.

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

  const result = streamText({
    model: groq(chosenModel),
    system: systemPrompt,
    messages: toModelMessages(messages),
    maxRetries: 0,
    ...(webSearchEnabled
      ? { tools: { browser_search: groq.tools.browserSearch({}) } }
      : {}),
    providerOptions: {
      groq: { reasoning_effort: 'low' },
    },
  });

  return result.toUIMessageStreamResponse();
}