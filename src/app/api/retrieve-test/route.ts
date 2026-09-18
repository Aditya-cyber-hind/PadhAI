import { NextRequest } from 'next/server';
import { retrieveChunks } from '@/lib/rag/retrieve';

export async function POST(req: NextRequest) {
  try {
    const { query, topK = 5 } = await req.json();
    const chunks = await retrieveChunks(query, topK);
    return Response.json({ query, chunks });
  } catch (error) {
    console.error('[retrieve-test] error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Retrieval failed' },
      { status: 500 }
    );
  }
} 
