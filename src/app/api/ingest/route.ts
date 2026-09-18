import { NextRequest } from 'next/server';
import { Index } from '@upstash/vector';
import { chunkText } from '@/lib/rag/chunking';

export const maxDuration = 60;

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

export async function POST(req: NextRequest) {
  try {
    const { text, sourceName, sessionId } = await req.json();

    if (!text || text.trim().length < 50) {
      return Response.json({ error: 'Text too short to ingest' }, { status: 400 });
    }
    if (!sourceName) {
      return Response.json({ error: 'sourceName is required' }, { status: 400 });
    }
    if (!sessionId) {
      return Response.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const chunks = chunkText(text);
    console.log(`[ingest] ${sourceName} (session ${sessionId}): ${chunks.length} chunks`);

    if (chunks.length === 0) {
      return Response.json({ error: 'No chunks produced' }, { status: 400 });
    }

    // Delete existing chunks for this (sessionId, sourceName) pair
    try {
      await index.delete({
        filter: `sessionId = '${sessionId}' AND sourceName = '${sourceName}'`,
      });
    } catch {
      console.log(`[ingest] no prior chunks for ${sourceName} in this session`);
    }

    const toUpsert = chunks.map((chunk) => ({
      id: `${sessionId}::${sourceName}::${chunk.index}`,
      data: chunk.text,
      metadata: {
        content: chunk.text,
        sourceName,
        chunkIndex: chunk.index,
        sessionId,
      },
    }));

    // Upsert in batches of 100
    for (let i = 0; i < toUpsert.length; i += 100) {
      await index.upsert(toUpsert.slice(i, i + 100));
    }

    console.log(`[ingest] stored ${chunks.length} chunks for ${sourceName}`);
    return Response.json({ success: true, chunks: chunks.length, sourceName });
  } catch (error) {
    console.error('[ingest] error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Ingestion failed' },
      { status: 500 }
    );
  }
}