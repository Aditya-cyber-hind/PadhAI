import { streamText, UIMessage } from 'ai';
import { auth } from '@/lib/auth/server';
import {
  groq,
  groqBackup,
  PADHAI_MODEL,
  PADHAI_FALLBACK_MODEL,
  PADHAI_QWEN_36_MODEL,
  PADHAI_QWEN_38_MODEL,
  truncateSources,
} from '@/lib/groq';
import { retrieveChunks } from '@/lib/rag/retrieve';
import { checkAndGetUsage, logUsage, getOrgUsage, ORG_DAILY_LIMIT } from '@/lib/usage/db';

export const maxDuration = 60;

const OUTPUT_TOKEN_BUDGET = 1024;
const MAX_HISTORY_MESSAGES = 6;

interface Candidate {
  provider: 'primary' | 'backup';
  client: any;
  model: string;
  label: string;
}

function buildCandidates(): Candidate[] {
  const list: Candidate[] = [
    { provider: 'primary', client: groq, model: PADHAI_MODEL, label: 'primary/120b' },
    { provider: 'primary', client: groq, model: PADHAI_FALLBACK_MODEL, label: 'primary/20b' },
    { provider: 'primary', client: groq, model: PADHAI_QWEN_36_MODEL, label: 'primary/qwen3.6' },
    { provider: 'primary', client: groq, model: PADHAI_QWEN_38_MODEL, label: 'primary/qwen3.8' },
  ];
  if (groqBackup) {
    list.push({ provider: 'backup', client: groqBackup, model: PADHAI_MODEL, label: 'backup/120b' });
    list.push({ provider: 'backup', client: groqBackup, model: PADHAI_FALLBACK_MODEL, label: 'backup/20b' });
    list.push({ provider: 'backup', client: groqBackup, model: PADHAI_QWEN_36_MODEL, label: 'backup/qwen3.6' });
    list.push({ provider: 'backup', client: groqBackup, model: PADHAI_QWEN_38_MODEL, label: 'backup/qwen3.8' });
  }
  return list;
}

function supportsBrowserSearch(model: string): boolean {
  return model === PADHAI_MODEL || model === PADHAI_FALLBACK_MODEL;
}

function toModelMessages(uiMessages: UIMessage[]) {
  const trimmed = uiMessages.slice(-MAX_HISTORY_MESSAGES);
  return trimmed.map((m) => {
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

  const orgUsed = await getOrgUsage();
  if (orgUsed >= ORG_DAILY_LIMIT) {
    return Response.json(
      { error: `Service-wide daily limit reached. Try again tomorrow.` },
      { status: 429 }
    );
  }

  const body = await req.json();
  const {
    messages,
    sources,
    notebookId,
    sourceNames,
    useWebSearch,
    candidateIndex = 0,
  }: {
    messages: UIMessage[];
    sources?: string;
    notebookId?: string;
    sourceNames?: string[];
    useWebSearch?: boolean;
    candidateIndex?: number;
  } = body;

  const candidates = buildCandidates();

  if (candidateIndex >= candidates.length) {
    return Response.json(
      {
        error: 'ALL_MODELS_EXHAUSTED',
        message: 'Every available model has hit its daily rate limit. Try again in 30-60 minutes.',
      },
      { status: 429 }
    );
  }

  const chosen = candidates[candidateIndex];
  console.log(`[chat] attempt ${candidateIndex + 1}/${candidates.length}: ${chosen.label}`);

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

  const mathInstruction = `

When writing math or chemical formulas:
- Use $...$ for inline math (e.g., $H_2O$, $x^2$)
- Use $$...$$ for block equations on their own line
- Do NOT use \\( \\) or \\[ \\] delimiters
- Use proper subscripts: H_2O instead of H2O
`;

  const systemPrompt = webSearchEnabled
    ? `You are PadhAI, a helpful research assistant with web access.
Use the browser search tool to find current, accurate information.
${mathInstruction}

--- CONTEXT ---
${contextBlock || 'No context provided.'}
--- END CONTEXT ---`
    : `You are PadhAI, a helpful research assistant.
Answer questions based ONLY on the context provided below.
If the answer isn't in the context, say so clearly.
${mathInstruction}

--- CONTEXT ---
${contextBlock || 'No context available yet.'}
--- END CONTEXT ---`;

  const estimatedTokens = Math.ceil((systemPrompt.length + query.length) / 4) + 500;
  let logged = false;

  const isQwen =
    chosen.model === PADHAI_QWEN_36_MODEL || chosen.model === PADHAI_QWEN_38_MODEL;
  const streamWebSearch = webSearchEnabled && !isQwen && supportsBrowserSearch(chosen.model);

  const result = streamText({
    model: chosen.client(chosen.model),
    system: systemPrompt,
    messages: toModelMessages(messages),
    maxRetries: 0,
    maxOutputTokens: OUTPUT_TOKEN_BUDGET,
    onFinish: async ({ usage: finishUsage }) => {
      if (logged) return;
      logged = true;
      try {
        const total = finishUsage?.totalTokens ?? estimatedTokens;
        await logUsage(userId, chosen.model, total, 'chat');
        console.log(`[chat] logged ${total} tokens via ${chosen.label}`);
      } catch (err) {
        console.error('[chat] usage log failed:', err);
      }
    },
    ...(streamWebSearch
      ? { tools: { browser_search: chosen.client.tools.browserSearch({}) } }
      : {}),
    providerOptions: {
      groq: { reasoning_effort: 'low' },
    },
  });

  // Send the candidate index in a header so the client knows which model responded
  const response = result.toUIMessageStreamResponse();
  response.headers.set('X-Candidate-Index', String(candidateIndex));
  response.headers.set('X-Candidate-Model', chosen.model);
  return response;
}