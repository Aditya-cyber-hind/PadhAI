import { streamText, UIMessage } from 'ai';
import { groq, PADHAI_MODEL } from '@/lib/groq';

export const maxDuration = 30;

// Manual conversion — avoids a known convertToModelMessages bug in v5
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

  const systemPrompt = `You are PadhAI, a helpful research assistant.
Answer questions based ONLY on the context the user provides below.
If the answer isn't in the context, say so clearly.
Cite which document or section you're referencing when possible.
Be concise and accurate. Do not invent facts.

--- USER SOURCES ---
${sources && sources.trim().length > 0 ? sources : 'No sources have been provided yet.'}
--- END SOURCES ---`;

  const result = streamText({
    model: groq(PADHAI_MODEL),
    system: systemPrompt,
    messages: toModelMessages(messages),
    providerOptions: {
      groq: {
        reasoning_effort: 'medium',
      },
    },
  });

  return result.toUIMessageStreamResponse();
}