import { NextRequest } from 'next/server';
import { clearNotebook } from '@/lib/rag/retrieve';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { notebookId } = await req.json();
    if (!notebookId) {
      return Response.json({ error: 'notebookId required' }, { status: 400 });
    }
    await clearNotebook(notebookId);
    console.log(`[clear-session] reset notebook ${notebookId}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[clear-session] error:', error);
    return Response.json({ error: 'Failed to clear notebook' }, { status: 500 });
  }
}