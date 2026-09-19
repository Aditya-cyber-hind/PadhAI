import { NextRequest } from 'next/server';
import { clearSource } from '@/lib/rag/retrieve';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { notebookId, sourceName } = await req.json();
    if (!notebookId || !sourceName) {
      return Response.json({ error: 'notebookId and sourceName required' }, { status: 400 });
    }
    await clearSource(notebookId, sourceName);
    console.log(`[clear-source] deleted chunks for ${sourceName}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[clear-source] error:', error);
    return Response.json({ error: 'Failed to clear source' }, { status: 500 });
  }
}