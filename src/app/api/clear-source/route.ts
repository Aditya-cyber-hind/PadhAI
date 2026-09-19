import { NextRequest } from 'next/server';
import { clearSource } from '@/lib/rag/retrieve';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { userId, sourceName } = await req.json();
    if (!userId || !sourceName) {
      return Response.json({ error: 'userId and sourceName required' }, { status: 400 });
    }
    await clearSource(userId, sourceName);
    console.log(`[clear-source] deleted chunks for ${sourceName}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[clear-source] error:', error);
    return Response.json({ error: 'Failed to clear source' }, { status: 500 });
  }
} 
