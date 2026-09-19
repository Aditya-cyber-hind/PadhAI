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
    const { text, sourceName, userId } = await req.json();

    if (!text || text.trim().length < 50) {
      return Response.json({ error: 'Text too short to ingest' }, { status: 400 });
    }
    if (!sourceName) {
      return Response.json({ error: 'sourceName is required' }, { status: 400 });
    }
    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    const chunks = chunkText(text);
    console.log(`[ingest] ${sourceName} (user ${userId}): ${chunks.length} chunks`);

    if (chunks.length === 0) {
      return Response.json({ error: 'No chunks produced' }, { status: 400 });
    }

    try {
      await index.delete({
        filter: `userId = '${userId}' AND sourceName = '${sourceName}'`,
      });
    } catch {
      console.log(`[ingest] no prior chunks for ${sourceName} for this user`);
    }

    const toUpsert = chunks.map((chunk) => ({
      id: `${userId}::${sourceName}::${chunk.index}`,
      data: chunk.text,
      metadata: {
        content: chunk.text,
        sourceName,
        chunkIndex: chunk.index,
        userId,
      },
    }));

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