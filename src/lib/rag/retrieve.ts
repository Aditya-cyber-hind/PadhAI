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
  userId: string,
  topK: number = 5
): Promise<RetrievedChunk[]> {
  if (!userId) return [];

  const results = await index.query({
    data: query,
    topK,
    includeMetadata: true,
    filter: `userId = '${userId}'`,
  });

  return results.map((r) => ({
    content: (r.metadata?.content as string) ?? '',
    sourceName: (r.metadata?.sourceName as string) ?? '',
    chunkIndex: (r.metadata?.chunkIndex as number) ?? 0,
    similarity: r.score,
  }));
}

export async function clearSession(userId: string): Promise<void> {
  if (!userId) return;
  await index.delete({
    filter: `userId = '${userId}'`,
  });
}