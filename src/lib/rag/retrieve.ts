import { Index } from '@upstash/vector';

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

export interface RetrievedChunk {
  content: string;
  sourceName: string;
  chunkIndex: number;
  similarity: number;
}

export async function retrieveChunks(
  query: string,
  sessionId: string,
  topK: number = 5
): Promise<RetrievedChunk[]> {
  if (!sessionId) return [];

  const results = await index.query({
    data: query,
    topK,
    includeMetadata: true,
    filter: `sessionId = '${sessionId}'`,
  });

  return results.map((r) => ({
    content: (r.metadata?.content as string) ?? '',
    sourceName: (r.metadata?.sourceName as string) ?? '',
    chunkIndex: (r.metadata?.chunkIndex as number) ?? 0,
    similarity: r.score,
  }));
}

/**
 * Delete all chunks for a session (called on "Clear all sources").
 */
export async function clearSession(sessionId: string): Promise<void> {
  if (!sessionId) return;
  await index.delete({
    filter: `sessionId = '${sessionId}'`,
  });
}