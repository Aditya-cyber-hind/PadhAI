import { generateObject } from 'ai';
import { z } from 'zod';
import { auth } from '@/lib/auth/server';
import { groq, PADHAI_FALLBACK_MODEL, truncateSources } from '@/lib/groq';
import { retrieveChunks } from '@/lib/rag/retrieve';
import { checkAndGetUsage, logUsage } from '@/lib/usage/db';

export const maxDuration = 60;

const QuizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).length(4),
      correctIndex: z.number().min(0).max(3),
      explanation: z.string(),
    })
  ).min(3).max(12),
});

const DIFFICULTY_PROMPTS: Record<string, string> = {
  easy: 'simple recall questions that test basic facts directly stated in the text',
  standard: 'a balanced mix of recall and comprehension questions',
  hard: 'application and analysis questions requiring reasoning beyond simple recall',
  expert: 'synthesis and evaluation questions that connect multiple concepts',
};

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

  const { sources, notebookId, numQuestions = 5, difficulty = 'standard' } = await req.json();

  let contextText = '';

  if (notebookId) {
    try {
      const chunks = await retrieveChunks(
        `key concepts, facts, and details for a quiz`,
        notebookId,
        [],
        20
      );
      const relevant = chunks.filter((c) => c.similarity > 0.2);
      if (relevant.length > 0) {
        contextText = relevant.map((c) => c.content).join('\n\n---\n\n');
        console.log(`[quiz] retrieved ${relevant.length} chunks from notebook ${notebookId}`);
      }
    } catch (err) {
      console.error('[quiz] vector retrieval failed:', err);
    }
  }

  if (!contextText && sources) {
    contextText = truncateSources(sources, 6000);
  }

  if (!contextText || contextText.trim().length < 100) {
    return Response.json({ error: 'Not enough source material' }, { status: 400 });
  }

  const safeSources = truncateSources(contextText, 6000);
  const difficultyGuide = DIFFICULTY_PROMPTS[difficulty] || DIFFICULTY_PROMPTS.standard;

  try {
    const { object, usage: genUsage } = await generateObject({
      model: groq(PADHAI_FALLBACK_MODEL),
      schema: QuizSchema,
      prompt: `Generate exactly ${numQuestions} multiple-choice questions from the following material.

Difficulty level: ${difficulty.toUpperCase()} — ${difficultyGuide}.

Rules:
- Each question must be answerable ONLY from the text below.
- Do not invent facts or use outside knowledge.
- Each question must have exactly 4 options.
- The correctIndex must be the 0-based index of the correct option.

--- SOURCE ---
${safeSources}
--- END SOURCE ---`,
    });

    try {
      await logUsage(userId, PADHAI_FALLBACK_MODEL, genUsage?.totalTokens ?? 500, 'quiz');
    } catch (err) {
      console.error('[quiz] usage log failed:', err);
    }

    return Response.json({ questions: object.questions.slice(0, numQuestions) });
  } catch (error: any) {
    const status = error?.statusCode ?? error?.lastError?.statusCode;
    if (status === 429) {
      return Response.json(
        { error: 'Rate limit reached. Please try again in a few minutes.' },
        { status: 429 }
      );
    }
    console.error('Quiz generation error:', error);
    return Response.json({ error: 'Failed to generate quiz' }, { status: 500 });
  }
}