import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { auth } from '@/lib/auth/server';
import { groq, PADHAI_FALLBACK_MODEL, truncateSources } from '@/lib/groq';
import { retrieveChunks } from '@/lib/rag/retrieve';
import { getNotebook } from '@/lib/notebooks/db';
import { formatCustomInstructions } from '@/lib/notebooks/instructions';
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
      topic: z.string(),
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

  const {
    sources,
    notebookId,
    numQuestions = 5,
    difficulty = 'standard',
    focusTopics,
  }: {
    sources?: string;
    notebookId?: string;
    numQuestions?: number;
    difficulty?: string;
    focusTopics?: string[];
  } = await req.json();

  if (!notebookId) {
    return Response.json({ error: 'notebookId required' }, { status: 400 });
  }

  const isFocused = Array.isArray(focusTopics) && focusTopics.length > 0;

  let contextText = '';

  try {
    // When focused, retrieve chunks specifically about the weak topics
    const query = isFocused
      ? `content about: ${focusTopics!.join(', ')}`
      : `key concepts, facts, and details for a quiz`;

    const chunks = await retrieveChunks(query, notebookId, [], 20);
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

  // ── Source size check ────────────────────────────────────
  if (!contextText || contextText.trim().length < 500) {
    return Response.json(
      {
        error:
          'Your sources are too short to generate a good quiz. Add a longer document, upload another PDF, or paste more text — then try again.',
      },
      { status: 400 }
    );
  }
  const safeSources = truncateSources(contextText, 6000);
  const difficultyGuide = DIFFICULTY_PROMPTS[difficulty] || DIFFICULTY_PROMPTS.standard;

  let customInstructionsBlock = '';
  try {
    const nb = await getNotebook(notebookId, userId);
    customInstructionsBlock = formatCustomInstructions(nb?.custom_instructions);
  } catch (err) {
    console.error('[quiz] failed to load custom instructions:', err);
  }

  // Different prompt for focused retakes vs. full quizzes
  const topicRules = isFocused
    ? `- Focus ONLY on these topics: ${focusTopics!.join(', ')}.
- Every question MUST test one of those topics.
- Set each question's topic to one of: ${focusTopics!.map((t) => `"${t}"`).join(', ')}.
- Ignore other material.`
    : `- First decide 3-6 distinct topics that together cover the whole quiz.
- Each question gets exactly one topic from that set.
- Topics must be SPECIFIC (e.g. "Photosynthesis", "Calvin Cycle") — never broad ("Biology", "Science").
- Different questions may share a topic. Aim for 2-3 questions per topic.`;

  const titleRules = isFocused
    ? `- The title must clearly signal a retake: e.g. "Focused: ${focusTopics![0]}" or "Retake — ${focusTopics!.join(' & ')}". Max 8 words. No "Quiz:" prefix.`
    : `- The title should be short (max 6 words), descriptive, no quotes, no "Quiz:" prefix.`;

  try {
    const { object, usage: genUsage } = await generateObject({
      model: groq(PADHAI_FALLBACK_MODEL),
      schema: QuizSchema,
      providerOptions: {
        groq: { reasoning_effort: 'low' },
      },
      prompt: `${customInstructionsBlock}

Generate a title and exactly ${numQuestions} multiple-choice questions from the following material.

Difficulty level: ${difficulty.toUpperCase()} — ${difficultyGuide}.

Rules:
${titleRules}
- Each question must be answerable ONLY from the text below.
- Do not invent facts or use outside knowledge.
- Each question must have exactly 4 options.
- The correctIndex must be the 0-based index of the correct option.
${topicRules}

--- SOURCE ---
${safeSources}
--- END SOURCE ---`,
    });

    const questions = object.questions.slice(0, numQuestions);

    // Sanitize title
    let title = (object.title || '').trim().replace(/^["']|["']$/g, '');
    if (!title || title.length > 80) {
      const d = new Date();
      title = `Quiz · ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Save to DB (with topic now)
    const quizMeta = await createQuiz(notebookId, userId, title, difficulty, questions);

    try {
      await logUsage(
        userId,
        PADHAI_FALLBACK_MODEL,
        genUsage?.totalTokens ?? 500,
        isFocused ? 'quiz-retake' : 'quiz'
      );
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