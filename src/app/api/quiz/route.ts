import { generateObject } from 'ai';
import { z } from 'zod';
import { groq, PADHAI_MODEL, truncateSources } from '@/lib/groq';
import { retrieveChunks } from '@/lib/rag/retrieve';

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
  const { sources, userId, numQuestions = 5, difficulty = 'standard' } = await req.json();

  let contextText = '';

  // Try vector retrieval first
  if (userId) {
    try {
      const chunks = await retrieveChunks(
        `key concepts, facts, and details for a quiz`,
        userId,
        20
      );
      const relevant = chunks.filter((c) => c.similarity > 0.2);
      if (relevant.length > 0) {
        contextText = relevant.map((c) => c.content).join('\n\n---\n\n');
        console.log(`[quiz] retrieved ${relevant.length} chunks for user ${userId}`);
      }
    } catch (err) {
      console.error('[quiz] vector retrieval failed:', err);
    }
  }

  // Fallback to pasted sources
  if (!contextText && sources) {
    contextText = truncateSources(sources, 6000);
  }

  if (!contextText || contextText.trim().length < 100) {
    return Response.json({ error: 'Not enough source material' }, { status: 400 });
  }

  const safeSources = truncateSources(contextText, 6000);
  const difficultyGuide = DIFFICULTY_PROMPTS[difficulty] || DIFFICULTY_PROMPTS.standard;

  try {
    const { object } = await generateObject({
      model: groq(PADHAI_MODEL),
      schema: QuizSchema,
      prompt: `Generate exactly ${numQuestions} multiple-choice questions from the following material.

Difficulty level: ${difficulty.toUpperCase()} — ${difficultyGuide}.

Rules:
- Each question must be answerable ONLY from the text below.
- Do not invent facts or use outside knowledge.
- Each question must have exactly 4 options.
- The correctIndex must be the 0-based index of the correct option.
- The explanation must reference the source text.

--- SOURCE ---
${safeSources}
--- END SOURCE ---`,
    });

    const trimmed = { questions: object.questions.slice(0, numQuestions) };
    return Response.json(trimmed);
  } catch (error) {
    console.error('Quiz generation error:', error);
    return Response.json({ error: 'Failed to generate quiz' }, { status: 500 });
  }
}