import { streamText, UIMessage } from 'ai';
import { auth } from '@/lib/auth/server';
import {
  groq,
  groqBackup,
  mistral,
  PADHAI_MODEL,
  PADHAI_FALLBACK_MODEL,
  PADHAI_QWEN_MODEL,
  MISTRAL_MODEL,
  truncateSources,
} from '@/lib/llm';
import { retrieveChunks } from '@/lib/rag/retrieve';
import { checkAndGetUsage, logUsage, getOrgUsage, ORG_DAILY_LIMIT } from '@/lib/usage/db';

export const maxDuration = 60;

const OUTPUT_TOKEN_BUDGET = 3072;
const MAX_HISTORY_MESSAGES = 6;

interface Candidate {
  provider: 'primary' | 'backup' | 'mistral';
  client: any;
  model: string;
  label: string;
  supportsBrowserSearch: boolean;
}

function buildCandidates(): Candidate[] {
  const list: Candidate[] = [
    { provider: 'primary', client: groq, model: PADHAI_MODEL, label: 'primary/120b', supportsBrowserSearch: true },
    { provider: 'primary', client: groq, model: PADHAI_FALLBACK_MODEL, label: 'primary/20b', supportsBrowserSearch: true },
    { provider: 'primary', client: groq, model: PADHAI_QWEN_MODEL, label: 'primary/qwen3.8', supportsBrowserSearch: false },
  ];
  if (groqBackup) {
    list.push({ provider: 'backup', client: groqBackup, model: PADHAI_MODEL, label: 'backup/120b', supportsBrowserSearch: true });
    list.push({ provider: 'backup', client: groqBackup, model: PADHAI_FALLBACK_MODEL, label: 'backup/20b', supportsBrowserSearch: true });
    list.push({ provider: 'backup', client: groqBackup, model: PADHAI_QWEN_MODEL, label: 'backup/qwen3.8', supportsBrowserSearch: false });
  }
  if (mistral) {
    list.push({ provider: 'mistral', client: mistral, model: MISTRAL_MODEL, label: 'mistral/small', supportsBrowserSearch: false });
  }
  return list;
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

// ─────────────────────────────────────────────────────────────
//  PadhAI's identity — the core of what makes responses feel smart
// ─────────────────────────────────────────────────────────────
const PADHAI_IDENTITY = `You are PadhAI — a study assistant that helps students learn from THEIR OWN sources.

## Core principles

1. **Lead with the answer.** Your first sentence IS the answer. No preamble like "Based on your sources..." or "Great question!" or "According to the provided context...". Just answer.

2. **Match the format to the question.**
   - "What is X?"         → 2-4 sentences of plain prose
   - "How does X work?"   → numbered steps (3-6), one idea per step
   - "Why does X happen?" → 1-sentence answer, then 2-4 causal bullets
   - "Compare X and Y"    → markdown table, one row per dimension
   - "List / examples"    → bulleted list, one item per line
   - "Explain like I'm 5" → very short sentences, one analogy, no jargon
   - Math / derivations   → steps as numbered list, then a boxed final formula
   - Anything numeric     → show the working, not just the result

3. **Be honest about gaps.** If the user's sources don't cover something:
   - Say it directly: "Your sources don't cover [X]."
   - If you know the answer from training data, give a SHORT version and label it explicitly: "From general knowledge — not your sources — [brief answer]."
   - Do NOT put citations in the general-knowledge section.
   - Optionally end with: "Want me to suggest sources that cover this?"

4. **Length discipline.** Default to 150-250 words. Expand only if the user asks for "detail", "explain fully", "step by step", or similar. A tight 200-word answer beats a rambling 500-word one.

5. **Cite inline, right after each claim.**
   - ✅ "The cell membrane is selectively permeable [1]."
   - ❌ "The cell membrane is selectively permeable. [1][2][3]"
   - ✅ "Photosynthesis converts light to glucose [1], while respiration releases it [2]."
   - Never cluster citations at the end of a paragraph.

6. **Refuse off-topic requests gracefully.** PadhAI is a study tool. If asked to write code essays, tell jokes, discuss news unrelated to sources, or roleplay — politely redirect: "That's outside what PadhAI is for. I study your sources. Want me to summarize them, quiz you, or explain a concept?"

7. **No hedging, no filler.** Never say "It seems", "It appears", "One could argue", "It's important to note". Say what you mean. If you don't know, say "I don't know that from your sources."

8. **Never invent facts, citations, or numbers.** If unsure, use principle 3.`;

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

  const webSearchEnabled = useWebSearch === true;

  const allCandidates = buildCandidates();
  const candidates = webSearchEnabled
    ? allCandidates.filter((c) => c.supportsBrowserSearch)
    : allCandidates;

  if (candidateIndex >= candidates.length) {
    return Response.json(
      {
        error: 'ALL_MODELS_EXHAUSTED',
        message: webSearchEnabled
          ? 'Web search is enabled but all web-search-capable models are busy. Try again in a minute or turn off Web Search.'
          : 'Every available model has hit its daily rate limit. Try again in 30-60 minutes.',
      },
      { status: 429 }
    );
  }

  const chosen = candidates[candidateIndex];
  console.log(`[chat] attempt ${candidateIndex + 1}/${candidates.length}: ${chosen.label}${webSearchEnabled ? ' (web search on)' : ''}`);

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
- Don't cite obvious statements. Only cite when it adds clarity.
- Never cite anything from general knowledge or web search — those go uncited and explicitly labeled.`
    : '';

  const systemPrompt = webSearchEnabled
    ? `${PADHAI_IDENTITY}
${formatting}
${citationGuide}

You have web search enabled. Use it to fill gaps the sources don't cover — but clearly mark anything from the web as "From the web, not your sources:".

--- CONTEXT (user's sources) ---
${contextBlock || 'No context provided.'}
--- END CONTEXT ---`
    : `${PADHAI_IDENTITY}
${formatting}
${citationGuide}

Answer using ONLY the sources below. If they don't cover something, follow principle 3 — be honest, don't guess.

--- CONTEXT (user's sources) ---
${contextBlock || 'No context available yet.'}
--- END CONTEXT ---`;

  const estimatedTokens = Math.ceil((systemPrompt.length + query.length) / 4) + 500;
  let logged = false;

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
    ...(webSearchEnabled && chosen.supportsBrowserSearch
      ? { tools: { browser_search: chosen.client.tools.browserSearch({}) } }
      : {}),
    providerOptions: {
      groq: { reasoning_effort: 'medium' },
    },
  });

  const response = result.toUIMessageStreamResponse();
  response.headers.set('X-Candidate-Index', String(candidateIndex));
  response.headers.set('X-Candidate-Model', chosen.model);

  try {
    const citationsJson = JSON.stringify(citations);
    const citationsB64 =
      typeof Buffer !== 'undefined'
        ? Buffer.from(citationsJson, 'utf-8').toString('base64')
        : btoa(unescape(encodeURIComponent(citationsJson)));
    response.headers.set('X-Citations', citationsB64);
  } catch (err) {
    console.error('[chat] failed to encode citations header:', err);
  }

  return response;
}