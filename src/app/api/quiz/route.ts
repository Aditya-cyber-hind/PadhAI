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
  ).min(3).max(10),
});

export async function POST(req: Request) {
  const { sources, numQuestions = 5, difficulty = 'medium' } = await req.json();

  if (!sources || sources.trim().length < 100) {
    return Response.json({ error: 'Not enough source material' }, { status: 400 });
  }

  const safeSources = truncateSources(sources, 6000);

  try {
    const { object } = await generateObject({
      model: groq(PADHAI_MODEL),
      schema: QuizSchema,
      prompt: `Generate ${numQuestions} multiple-choice questions at ${difficulty} difficulty from the following material.
Each question must be answerable ONLY from the text below. Do not invent facts.

--- SOURCE ---
${safeSources}
--- END SOURCE ---`,
    });

    return Response.json(object);
  } catch (error) {
    console.error('Quiz generation error:', error);
    return Response.json({ error: 'Failed to generate quiz' }, { status: 500 });
  }
}