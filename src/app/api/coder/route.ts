import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { auth } from '@/lib/auth/server';
import { groq, PADHAI_FALLBACK_MODEL, PADHAI_MODEL } from '@/lib/groq';
import { retrieveChunks } from '@/lib/rag/retrieve';
import { checkAndGetUsage, logUsage } from '@/lib/usage/db';

export const maxDuration = 60;

const OUTPUT_TOKEN_BUDGET = 4096;
const MAX_HISTORY_MESSAGES = 8;

type CoderCommand = 'generate' | 'explain' | 'refactor' | 'tests' | 'comments' | 'debug';

interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
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

  explain: `You are PadhAI's Coder mode — explaining code.

RULES:
- Break the code into logical chunks.
- For each chunk, explain WHAT it does and WHY it might be written that way.
- Point out any edge cases, bugs, or assumptions.
- Use bullet points. No long paragraphs.
- If there's a subtle trick, call it out explicitly.
- If the code to explain was shared earlier in this conversation, refer to it directly — do NOT ask the user to re-paste it.`,

  refactor: `You are PadhAI's Coder mode — refactoring code.

RULES:
- Output the refactored code in one code block, starting with // filename: <name>.
- After the code, list the changes in 3-5 bullets.
- Preserve behavior. Do not add features.
- Improve readability, remove duplication, apply language idioms.
- If the original code has a bug, fix it and note it in the changelog.
- If the code to refactor was shared earlier in this conversation, refactor THAT code — do NOT ask the user to provide it.`,

  tests: `You are PadhAI's Coder mode — writing tests.

RULES:
- Output ONE test file. Start with // filename: <test_filename>.
- Cover: happy path, edge cases, and one error case.
- Use the standard testing framework for that language (pytest, vitest, etc.).
- Keep tests focused. One assertion per test where reasonable.
- Do NOT test private/internal helpers unless they're critical.
- If the code to test was shared earlier in this conversation, write tests for THAT code — do NOT ask the user to provide it.`,

  comments: `You are PadhAI's Coder mode — adding comments and docstrings.

RULES:
- Output the SAME code with comments added. Start with // filename: <name>.
- Do NOT change logic, structure, or formatting.
- Add docstrings to functions, comments to non-obvious lines.
- Keep comments short. One line where possible.
- If the code to comment was shared earlier in this conversation, comment THAT code — do NOT ask the user to provide it.`,

  debug: `You are PadhAI's Coder mode — debugging.

RULES:
- First: identify the likely bug in ONE sentence.
- Second: explain WHY it happens in 2-3 bullets.
- Third: output the fix as a code block starting with // filename: <name>.
- Do NOT rewrite unrelated code. Minimal fix only.
- If the code to debug was shared earlier in this conversation, debug THAT code — do NOT ask the user to provide it.`,
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

  // For non-generate commands, wrap the code with the instruction.
  // But if the message already looks like the full code payload, still wrap —
  // the model uses the conversation block to see the prior code context.
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

  // Trim to last N and filter out empties / non-text
  const trimmed = history
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_HISTORY_MESSAGES);

  // Dedupe: if the last history entry is a user message essentially identical
  // to the current message, drop it (happens on Refactor/Explain/etc. re-sends)
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
    // Trim extremely long messages so we don't blow up token cost
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
      { error: `Daily limit reached. Resets in 24 hours.`, usage },
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
  }: {
    message: string;
    command?: CoderCommand;
    notebookId?: string;
    sourceNames?: string[];
    history?: HistoryMessage[];
  } = body;

  if (!message || typeof message !== 'string') {
    return Response.json({ error: 'message is required' }, { status: 400 });
  }

  // Pull docs from the notebook if available — grounds code in the user's context
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

  // Build the conversation block from prior turns
  const conversationBlock = buildConversationBlock(history, message);

  const systemPrompt =
    SYSTEM_PROMPTS[command] +
    (conversationBlock
      ? `\n\n--- CONVERSATION SO FAR ---\n${conversationBlock}\n--- END CONVERSATION ---`
      : '') +
    (contextBlock
      ? `\n\n--- PROJECT CONTEXT ---\n${contextBlock}\n--- END CONTEXT ---`
      : '');

  let logged = false;

  const result = streamText({
    model: groq(PADHAI_MODEL),
    system: systemPrompt,
    prompt: buildPrompt(command, message),
    maxRetries: 0,
    maxOutputTokens: OUTPUT_TOKEN_BUDGET,
    onFinish: async ({ usage: finishUsage }) => {
      if (logged) return;
      logged = true;
      try {
        await logUsage(userId, PADHAI_MODEL, finishUsage?.totalTokens ?? 800, 'coder');
      } catch (err) {
        console.error('[coder] usage log failed:', err);
      }
    },
  });

  return result.toTextStreamResponse();
}