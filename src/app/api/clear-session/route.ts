import { NextRequest } from 'next/server';
import { clearSession } from '@/lib/rag/retrieve';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return Response.json({ error: 'sessionId required' }, { status: 400 });
    }
    await clearSession(sessionId);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[clear-session] error:', error);
    return Response.json({ error: 'Failed to clear session' }, { status: 500 });
  }
} 
