import { streamText, UIMessage } from 'ai';
import { groq, PADHAI_MODEL, truncateSources } from '@/lib/groq';

export const maxDuration = 30;

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
  const { messages, sources }: { messages: UIMessage[]; sources?: string } =
    await req.json();

  const safeSources = truncateSources(sources ?? '', 6000);

  const systemPrompt = `You are PadhAI, a helpful research assistant.
Answer questions based ONLY on the context the user provides below.
If the answer isn't in the context, say so clearly.
Cite which document or section you're referencing when possible.
Be concise and accurate. Do not invent facts.

--- USER SOURCES ---
${safeSources && safeSources.trim().length > 0 ? safeSources : 'No sources have been provided yet.'}
--- END SOURCES ---`;

  const result = streamText({
    model: groq(PADHAI_MODEL),
    system: systemPrompt,
    messages: toModelMessages(messages),
    providerOptions: {
      groq: {
        reasoning_effort: 'low',
      },
    },
  });

  return result.toUIMessageStreamResponse();
}