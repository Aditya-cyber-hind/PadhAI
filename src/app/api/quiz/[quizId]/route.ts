import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { getFullQuiz, deleteQuiz } from '@/lib/quizzes/db';

export const maxDuration = 30;

// GET: load one quiz with all its questions
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { quizId } = await params;

  try {
    const quiz = await getFullQuiz(quizId, userId);
    if (!quiz) {
      return Response.json({ error: 'Quiz not found' }, { status: 404 });
    }
    return Response.json({ quiz });
  } catch (err) {
    console.error('[quiz/[quizId] GET]', err);
    return Response.json({ error: 'Failed to load quiz' }, { status: 500 });
  }
}

// DELETE: delete one quiz
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { quizId } = await params;

  try {
    const ok = await deleteQuiz(quizId, userId);
    if (!ok) {
      return Response.json({ error: 'Quiz not found' }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (err) {
    console.error('[quiz/[quizId] DELETE]', err);
    return Response.json({ error: 'Failed to delete quiz' }, { status: 500 });
  }
}