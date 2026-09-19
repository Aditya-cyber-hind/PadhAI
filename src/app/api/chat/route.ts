import { streamText, UIMessage } from 'ai';
import { groq, PADHAI_MODEL, truncateSources } from '@/lib/groq';
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

export async function POST(req: Request) {
  const {
    messages,
    sources,
    userId,
    sourceNames,
    useWebSearch,
  }: {
    messages: UIMessage[];
    sources?: string;
    userId?: string;
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

  if (query.trim().length > 0 && userId) {
    try {
      const chunks = await retrieveChunks(query, userId, sourceNames ?? [], 5);
      const relevant = chunks.filter((c) => c.similarity > 0.3);

      if (relevant.length > 0) {
        contextBlock = relevant
          .map(
            (c) =>
              `[Source: ${c.sourceName} (chunk ${c.chunkIndex}, similarity ${c.similarity.toFixed(2)})]\n${c.content}`
          )
          .join('\n\n---\n\n');
        console.log(`[chat] retrieved ${relevant.length} chunks for user ${userId}`);
      }
    } catch (err) {
      console.error('[chat] vector retrieval failed:', err);
    }
  }

  if (!contextBlock && sources) {
    contextBlock = truncateSources(sources, 6000);
    console.log('[chat] using raw sources as fallback');
  }

  const webSearchEnabled = useWebSearch === true;

  const systemPrompt = webSearchEnabled
    ? `You are PadhAI, a helpful research assistant with web access.
Use the browser search tool to find current, accurate information from the web.
You may also reference the user's provided context if it's relevant.

--- CONTEXT ---
${contextBlock || 'No context provided.'}
--- END CONTEXT ---`
    : `You are PadhAI, a helpful research assistant.
Answer questions based ONLY on the context provided below.
If the answer isn't in the context, say so clearly.
Cite which source you're referencing when possible.
Be concise and accurate. Do not invent facts.

--- CONTEXT ---
${contextBlock || 'No context available yet.'}
--- END CONTEXT ---`;

  try {
    const result = streamText({
      model: groq(PADHAI_MODEL),
      system: systemPrompt,
      messages: toModelMessages(messages),
      ...(webSearchEnabled
        ? {
            tools: {
              browser_search: groq.tools.browserSearch({}),
            },
          }
        : {}),
      providerOptions: {
        groq: {
          reasoning_effort: 'low',
        },
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err: any) {
    if (err?.statusCode === 429) {
      return Response.json(
        { error: 'Daily API limit reached. Please try again in ~20 minutes.' },
        { status: 429 }
      );
    }
    throw err;
  }
}