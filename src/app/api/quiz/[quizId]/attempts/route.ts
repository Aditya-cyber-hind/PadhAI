import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { listAttempts } from '@/lib/quizzes/db';

export const maxDuration = 15;

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
    const attempts = await listAttempts(quizId, userId);
    return Response.json({ attempts });
  } catch (err) {
    console.error('[quiz/[quizId]/attempts GET]', err);
    return Response.json({ error: 'Failed to load attempts' }, { status: 500 });
  }
}