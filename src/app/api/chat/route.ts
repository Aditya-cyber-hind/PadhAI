import { streamText, UIMessage } from 'ai';
import { auth } from '@/lib/auth/server';
import {
  groq,
  groqBackup,
  PADHAI_MODEL,
  PADHAI_FALLBACK_MODEL,
  PADHAI_QWEN_MODEL,
  truncateSources,
} from '@/lib/groq';
import { retrieveChunks } from '@/lib/rag/retrieve';
import { checkAndGetUsage, logUsage, getOrgUsage, ORG_DAILY_LIMIT } from '@/lib/usage/db';

export const maxDuration = 60;

const OUTPUT_TOKEN_BUDGET = 3072;
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
    { provider: 'primary', client: groq, model: PADHAI_QWEN_MODEL, label: 'primary/qwen3.8' },
  ];
  if (groqBackup) {
    list.push({ provider: 'backup', client: groqBackup, model: PADHAI_MODEL, label: 'backup/120b' });
    list.push({ provider: 'backup', client: groqBackup, model: PADHAI_FALLBACK_MODEL, label: 'backup/20b' });
    list.push({ provider: 'backup', client: groqBackup, model: PADHAI_QWEN_MODEL, label: 'backup/qwen3.8' });
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
      {
        error: 'DAILY_LIMIT_REACHED',
        message: `Daily limit reached (${usage.limit.toLocaleString()} tokens). Resets in 24 hours.`,
        usage,
      },
      { status: 429 }
    );
  }

  const orgUsed = await getOrgUsage();
  if (orgUsed >= ORG_DAILY_LIMIT) {
    return Response.json(
      {
        error: 'ORG_LIMIT_REACHED',
        message: 'Service-wide daily limit reached. Try again tomorrow.',
      },
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
  const citations: Array<{ id: number; sourceName: string; content: string }> = [];

  if (query.trim().length > 0 && notebookId) {
    try {
      const chunks = await retrieveChunks(query, notebookId, sourceNames ?? [], 5);
      const relevant = chunks.filter((c) => c.similarity > 0.3);
      if (relevant.length > 0) {
        contextBlock = relevant
          .map((c, i) => {
            const id = i + 1;
            citations.push({
              id,
              sourceName: c.sourceName,
              content: c.content,
            });
            return `[${id}] (${c.sourceName}, chunk ${c.chunkIndex}, similarity ${c.similarity.toFixed(2)})\n${c.content}`;
          })
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

  const formatting = `

MATH FORMATTING (strict):
- Inline math: $F = ma$, $a = \\frac{F}{m}$
- Display math on its own line: $$v = u + at$$
- NEVER use \\[ ... \\] or \\( ... \\) or [ ... ] for math — always use $ or $$
- NEVER write formulas as bare text like "F=ma" or "v = u + at" — always wrap in $...$
- Use \\frac{}{} for fractions, \\sqrt{} for square roots, ^{} for superscripts

MARKDOWN SAFETY:
- NEVER put a pipe | inside a table cell — it breaks the table
- Wrap special symbols in backticks: \`|\`, \`<\`, \`*\`, \`#\`
- Prefer numbered lists over tables when the answer contains symbols
- Never leave raw ** or * markers in table cells
`;

  const citationGuide = citations.length > 0
    ? `

CITATIONS:
- Each source block above starts with a number in square brackets, like [1], [2].
- When a claim comes from a specific source, cite it with that number: "Sugar is sweet [1]."
- Multiple sources for one claim: [1][3]
- Valid numbers: ${citations.map((c) => c.id).join(', ')}. Do not use any other number.
- Place citations right after the sentence's period.
- Don't cite obvious statements. Only cite when it adds clarity.`
    : '';

  const systemPrompt = webSearchEnabled
    ? `You are PadhAI, a helpful research assistant with web access.
Use the browser search tool to find current, accurate information.
${formatting}
${citationGuide}

--- CONTEXT ---
${contextBlock || 'No context provided.'}
--- END CONTEXT ---`
    : `You are PadhAI, a helpful research assistant.
Answer questions based ONLY on the context provided below.
If the answer isn't in the context, say so clearly.
${formatting}
${citationGuide}

--- CONTEXT ---
${contextBlock || 'No context available yet.'}
--- END CONTEXT ---`;

  const estimatedTokens = Math.ceil((systemPrompt.length + query.length) / 4) + 500;
  let logged = false;

  // Qwen doesn't support Groq's browser_search tool, so exclude it from
  // web-search streaming. The other two GPT-OSS models do.
  const isQwen = chosen.model === PADHAI_QWEN_MODEL;
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

  const response = result.toUIMessageStreamResponse();
  response.headers.set('X-Candidate-Index', String(candidateIndex));
  response.headers.set('X-Candidate-Model', chosen.model);

  // Base64-encode citations. HTTP headers only support Latin-1 (bytes 0-255),
  // and chunk content often contains Unicode (arrows, Sanskrit, math symbols).
  // Base64 is pure ASCII, so this always works.
  try {
    const citationsJson = JSON.stringify(citations);
    const citationsB64 =
      typeof Buffer !== 'undefined'
        ? Buffer.from(citationsJson, 'utf-8').toString('base64')
        : btoa(unescape(encodeURIComponent(citationsJson)));
    response.headers.set('X-Citations', citationsB64);
  } catch (err) {
    console.error('[chat] failed to encode citations header:', err);
    // Fail soft — chat still works, just without citation pills
  }

  return response;
}