import {
  groq,
  groqBackup,
  mistral,
  PADHAI_MODEL,
  PADHAI_FALLBACK_MODEL,
  PADHAI_QWEN_MODEL,
  MISTRAL_MODEL,
} from '@/lib/llm';
import { retrieveChunks } from '@/lib/rag/retrieve';
import { getNotebook } from '@/lib/notebooks/db';
import { formatCustomInstructions } from '@/lib/notebooks/instructions';
import { checkAndGetUsage, logUsage } from '@/lib/usage/db';

export const maxDuration = 60;

const OUTPUT_TOKEN_BUDGET = 4096;
const MAX_HISTORY_MESSAGES = 8;

type CoderCommand = 'generate' | 'explain' | 'refactor' | 'tests' | 'comments' | 'debug';

interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Candidate {
  provider: 'primary' | 'backup' | 'mistral';
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
  if (mistral) {
    list.push({ provider: 'mistral', client: mistral, model: MISTRAL_MODEL, label: 'mistral/small' });
  }
  return list;
}

const SYSTEM_PROMPTS: Record<CoderCommand, string> = {
  generate: `You are PadhAI's Coder mode — a precise, production-minded code generator.

RULES:
- Output ONLY code. No prose before or after unless the user explicitly asks.
- Start every code block with a comment line: // filename: <sensible_name.ext>
- Use the language the user requests, or infer from context.
- Prefer clear, idiomatic code over clever code.
- Include type hints where the language supports them (Python, TypeScript).
- If the request is ambiguous, ask ONE clarifying question instead of guessing.
- Never invent APIs that don't exist. If you're unsure, say so in a comment.`,

  explain: `You are PadhAI's Coder mode — explaining code to a fellow engineer.

RULES:
- Lead with a one-sentence summary of what the code does.
- Then break it into logical chunks as bullets. For each chunk: WHAT it does, WHY it's written that way.
- Call out edge cases, bugs, and assumptions as a separate bullet list under "Gaps / caveats".
- If there's a subtle trick (a closure, an optimization, a language quirk), name it explicitly.
- No long paragraphs. Bullets only.
- If the code was shared earlier in this conversation, explain THAT code — do NOT ask the user to re-paste it.
- If you genuinely can't tell what the code does (incomplete, unparseable), say so in one sentence. Don't guess.`,

  refactor: `You are PadhAI's Coder mode — refactoring code.

RULES:
- Output the refactored code in one code block, starting with // filename: <name>.
- Then list the changes in 3-5 bullets — what changed and WHY.
- Preserve behavior. Do not add features, do not change public APIs.
- Improve readability, remove duplication, apply language idioms.
- If the original code has a bug, fix it and note it explicitly in the changelog.
- If the code was shared earlier in this conversation, refactor THAT code — do NOT ask the user to re-paste it.
- If the code is already clean, say so and suggest one or two optional improvements instead of churning it for the sake of change.`,

  tests: `You are PadhAI's Coder mode — writing tests.

RULES:
- Output ONE test file. Start with // filename: <test_filename>.
- Cover: (1) the happy path, (2) at least two edge cases, (3) one error/failure case.
- Use the standard testing framework for that language (pytest, vitest, jest, Go's testing pkg, etc.).
- Name tests descriptively — the test name should read as a sentence about what's being verified.
- One assertion per test where reasonable. Keep tests focused.
- Do NOT test private/internal helpers unless they're critical.
- If the code was shared earlier in this conversation, write tests for THAT code — do NOT ask the user to re-paste it.`,

  comments: `You are PadhAI's Coder mode — adding comments and docstrings.

RULES:
- Output the SAME code with comments added. Start with // filename: <name>.
- Do NOT change logic, structure, formatting, or variable names.
- Add docstrings to functions (purpose, params, returns). Add inline comments only to non-obvious lines.
- Keep comments short — one line where possible.
- Do NOT comment obvious lines like \`i++\` or \`return result\`. Only explain intent, not mechanics.
- If the code was shared earlier in this conversation, comment THAT code — do NOT ask the user to re-paste it.`,

  debug: `You are PadhAI's Coder mode — debugging.

RULES:
- First: name the likely bug in ONE sentence. Be direct — "The off-by-one is in the loop bound", not "There may be an issue with...".
- Then: explain WHY it happens in 2-3 short bullets.
- Then: output the fix as a code block starting with // filename: <name>. Minimal fix only.
- Do NOT rewrite unrelated code. Do NOT "clean up while you're in there".
- If the code was shared earlier in this conversation, debug THAT code — do NOT ask the user to re-paste it.
- If you can't find the bug with confidence, say so in one sentence and list what you'd need to narrow it down (input, error message, expected vs actual).`,
};

const COMMAND_LABELS: Record<CoderCommand, string> = {
  generate: 'Generate code',
  explain: 'Explain this code',
  refactor: 'Refactor this code',
  tests: 'Write tests for this code',
  comments: 'Add comments to this code',
  debug: 'Debug this code',
};

function buildPrompt(command: CoderCommand, userMessage: string): string {
  if (command === 'generate') return userMessage;
  return `${COMMAND_LABELS[command]}:

\`\`\`
${userMessage}
\`\`\``;
}

function buildConversationBlock(
  history: HistoryMessage[] | undefined,
  currentMessage: string
): string {
  if (!Array.isArray(history) || history.length === 0) return '';

  const trimmed = history
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_HISTORY_MESSAGES);

  if (trimmed.length > 0) {
    const last = trimmed[trimmed.length - 1];
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
    if (last.role === 'user' && norm(last.content) === norm(currentMessage)) {
      trimmed.pop();
    }
  }

  if (trimmed.length === 0) return '';

  const lines = trimmed.map((m) => {
    const label = m.role === 'user' ? 'User' : 'Assistant';
    const content =
      m.content.length > 4000 ? m.content.slice(0, 4000) + '\n…[truncated]' : m.content;
    return `${label}:\n${content}`;
  });

  return lines.join('\n\n---\n\n');
}

export async function POST(req: NextRequest) {
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
        message: 'Daily limit reached. Resets in 24 hours.',
        usage,
      },
      { status: 429 }
    );
  }

  const body = await req.json();
  const {
    message,
    command = 'generate',
    notebookId,
    sourceNames,
    history,
    candidateIndex = 0,
  }: {
    message: string;
    command?: CoderCommand;
    notebookId?: string;
    sourceNames?: string[];
    history?: HistoryMessage[];
    candidateIndex?: number;
  } = body;

  if (!message || typeof message !== 'string') {
    return Response.json({ error: 'message is required' }, { status: 400 });
  }

  const candidates = buildCandidates();

  if (candidateIndex >= candidates.length) {
    return Response.json(
      {
        error: 'ALL_MODELS_EXHAUSTED',
        message:
          'Every available model has hit its daily rate limit. Try again in 30-60 minutes.',
      },
      { status: 429 }
    );
  }

  const chosen = candidates[candidateIndex];
  console.log(
    `[coder] attempt ${candidateIndex + 1}/${candidates.length}: ${chosen.label} (command: ${command})`
  );

  let contextBlock = '';
  if (notebookId) {
    try {
      const chunks = await retrieveChunks(message, notebookId, sourceNames ?? [], 5);
      const relevant = chunks.filter((c) => c.similarity > 0.35);
      if (relevant.length > 0) {
        contextBlock = relevant
          .map((c, i) => `[${i + 1}] (${c.sourceName})\n${c.content}`)
          .join('\n\n---\n\n');
      }
    } catch (err) {
      console.error('[coder] retrieval failed:', err);
    }
  }

  const conversationBlock = buildConversationBlock(history, message);

  let customInstructionsBlock = '';
  if (notebookId) {
    try {
      const nb = await getNotebook(notebookId, userId);
      customInstructionsBlock = formatCustomInstructions(nb?.custom_instructions);
    } catch (err) {
      console.error('[coder] failed to load custom instructions:', err);
    }
  }

  const systemPrompt =
    SYSTEM_PROMPTS[command] +
    customInstructionsBlock +
    (conversationBlock
      ? `\n\n--- CONVERSATION SO FAR ---\n${conversationBlock}\n--- END CONVERSATION ---`
      : '') +
    (contextBlock
      ? `\n\n--- PROJECT CONTEXT ---\n${contextBlock}\n--- END CONTEXT ---`
      : '');

  let logged = false;

  const result = streamText({
    model: chosen.client(chosen.model),
    system: systemPrompt,
    prompt: buildPrompt(command, message),
    maxRetries: 0,
    maxOutputTokens: OUTPUT_TOKEN_BUDGET,
    onFinish: async ({ usage: finishUsage }) => {
      if (logged) return;
      logged = true;
      try {
        await logUsage(
          userId,
          chosen.model,
          finishUsage?.totalTokens ?? 800,
          'coder'
        );
      } catch (err) {
        console.error('[coder] usage log failed:', err);
      }
    },
    providerOptions:
      chosen.provider === 'mistral'
        ? undefined
        : { groq: { reasoning_effort: 'low' } },
  });

  const response = result.toTextStreamResponse();
  response.headers.set('X-Candidate-Index', String(candidateIndex));
  response.headers.set('X-Candidate-Model', chosen.model);
  return response;
}