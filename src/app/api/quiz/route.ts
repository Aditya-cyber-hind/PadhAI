import { generateObject } from 'ai';
import { z } from 'zod';
import { groq, PADHAI_MODEL, truncateSources } from '@/lib/groq';

export const maxDuration = 60;

const QuizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().describe('The quiz question'),
      options: z.array(z.string()).length(4).describe('Exactly 4 answer choices'),
      correctIndex: z.number().min(0).max(3).describe('Index of correct answer (0-3)'),
      explanation: z.string().describe('Why the correct answer is right'),
    })
  ).min(3).max(12),
});

// Difficulty guidance for the model
const DIFFICULTY_PROMPTS: Record<string, string> = {
  easy: 'simple recall questions that test basic facts directly stated in the text',
  standard: 'a balanced mix of recall and comprehension questions',
  hard: 'application and analysis questions requiring reasoning beyond simple recall',
  expert: 'synthesis and evaluation questions that connect multiple concepts and test deep understanding',
};

export async function POST(req: Request) {
  const { sources, numQuestions = 5, difficulty = 'standard' } = await req.json();

  if (!sources || sources.trim().length < 100) {
    return Response.json({ error: 'Not enough source material' }, { status: 400 });
  }

  const safeSources = truncateSources(sources, 6000);
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

    // Trim in case the model returned more than requested
    const trimmed = {
      questions: object.questions.slice(0, numQuestions),
    };

    return Response.json(trimmed);
  } catch (error) {
    console.error('Quiz generation error:', error);
    return Response.json({ error: 'Failed to generate quiz' }, { status: 500 });
  }
}