import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { getFullQuiz, submitAttempt, SubmitAnswer } from '@/lib/quizzes/db';

export const maxDuration = 30;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { quizId } = await params;

  let body: { answers?: SubmitAnswer[]; duration_seconds?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const answers = Array.isArray(body.answers) ? body.answers : [];
  if (answers.length === 0) {
    return Response.json({ error: 'answers[] required' }, { status: 400 });
  }
  for (const a of answers) {
    if (
      typeof a.question_id !== 'string' ||
      typeof a.selected_index !== 'number' ||
      a.selected_index < 0 ||
      a.selected_index > 3
    ) {
      return Response.json({ error: 'Malformed answer entry' }, { status: 400 });
    }
  }

  try {
    const quiz = await getFullQuiz(quizId, userId);
    if (!quiz) {
      return Response.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const result = await submitAttempt(
      quizId,
      quiz.notebook_id,
      userId,
      answers,
      typeof body.duration_seconds === 'number' ? body.duration_seconds : null
    );
    if (!result) {
      return Response.json({ error: 'Quiz not found' }, { status: 404 });
    }
    return Response.json(result);
  } catch (err) {
    console.error('[quiz/[quizId]/submit POST]', err);
    return Response.json({ error: 'Failed to save attempt' }, { status: 500 });
  }
}