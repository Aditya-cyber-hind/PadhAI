import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { auth } from '@/lib/auth/server';
import { groq, PADHAI_FALLBACK_MODEL, truncateSources } from '@/lib/groq';
import { retrieveChunks } from '@/lib/rag/retrieve';
import { checkAndGetUsage, logUsage } from '@/lib/usage/db';
import { listQuizzes, createQuiz, deleteAllQuizzes } from '@/lib/quizzes/db';

export const maxDuration = 60;

const QuizSchema = z.object({
  title: z.string(),
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

// GET: list quizzes for a notebook
export async function GET(req: NextRequest) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notebookId = req.nextUrl.searchParams.get('notebookId');
  if (!notebookId) {
    return Response.json({ error: 'notebookId required' }, { status: 400 });
  }

  try {
    const quizzes = await listQuizzes(notebookId, userId);
    return Response.json({ quizzes });
  } catch (err) {
    console.error('[quiz GET]', err);
    return Response.json({ error: 'Failed to list quizzes' }, { status: 500 });
  }
}

// POST: generate a new quiz and save it
export async function POST(req: NextRequest) {
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

  if (!notebookId) {
    return Response.json({ error: 'notebookId required' }, { status: 400 });
  }

  let contextText = '';

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
    }
  } catch (err) {
    console.error('[quiz] vector retrieval failed:', err);
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
      prompt: `Generate a title and exactly ${numQuestions} multiple-choice questions from the following material.

Difficulty level: ${difficulty.toUpperCase()} — ${difficultyGuide}.

Rules:
- The title should be short (max 6 words), descriptive, no quotes, no "Quiz:" prefix.
- Each question must be answerable ONLY from the text below.
- Do not invent facts or use outside knowledge.
- Each question must have exactly 4 options.
- The correctIndex must be the 0-based index of the correct option.

--- SOURCE ---
${safeSources}
--- END SOURCE ---`,
    });

    const questions = object.questions.slice(0, numQuestions);

    // Sanitize title — fallback to timestamp if the model returned junk
    let title = (object.title || '').trim().replace(/^["']|["']$/g, '');
    if (!title || title.length > 60) {
      const d = new Date();
      title = `Quiz · ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Save to DB
    const quizMeta = await createQuiz(notebookId, userId, title, difficulty, questions);

    try {
      await logUsage(userId, PADHAI_FALLBACK_MODEL, genUsage?.totalTokens ?? 500, 'quiz');
    } catch (err) {
      console.error('[quiz] usage log failed:', err);
    }

    return Response.json({
      quiz: {
        ...quizMeta,
        questions,
      },
    });
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

// DELETE: delete all quizzes for a notebook
export async function DELETE(req: NextRequest) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notebookId = req.nextUrl.searchParams.get('notebookId');
  if (!notebookId) {
    return Response.json({ error: 'notebookId required' }, { status: 400 });
  }

  try {
    const deleted = await deleteAllQuizzes(notebookId, userId);
    return Response.json({ deleted });
  } catch (err) {
    console.error('[quiz DELETE]', err);
    return Response.json({ error: 'Failed to delete quizzes' }, { status: 500 });
  }
}