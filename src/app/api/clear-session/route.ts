import { NextRequest } from 'next/server';
import { clearSession } from '@/lib/rag/retrieve';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return Response.json({ error: 'userId required' }, { status: 400 });
    }
    await clearSession(userId);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[clear-session] error:', error);
    return Response.json({ error: 'Failed to clear session' }, { status: 500 });
  }
}