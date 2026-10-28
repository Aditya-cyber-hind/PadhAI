import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { getWeakTopics } from '@/lib/quiz/weak-topics';

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const notebookId = req.nextUrl.searchParams.get('notebookId');

  try {
    const results = await getWeakTopics(userId, notebookId);
    return Response.json({ notebooks: results });
  } catch (err) {
    console.error('[weak-topics GET]', err);
    return Response.json({ error: 'Failed to compute weak topics' }, { status: 500 });
  }
}