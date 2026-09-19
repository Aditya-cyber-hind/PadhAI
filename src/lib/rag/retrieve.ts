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
  sourceNames: string[] = [],
  topK: number = 5
): Promise<RetrievedChunk[]> {
  if (!userId) return [];

  // Build filter: always by userId, plus restrict to specific sources if provided
  let filter = `userId = '${userId}'`;
  if (sourceNames.length > 0) {
    const sourcesList = sourceNames.map((n) => `'${n}'`).join(', ');
    filter += ` AND sourceName IN (${sourcesList})`;
  }

  const results = await index.query({
    data: query,
    topK,
    includeMetadata: true,
    filter,
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
  await index.delete({ filter: `userId = '${userId}'` });
}

export async function clearSource(userId: string, sourceName: string): Promise<void> {
  if (!userId || !sourceName) return;
  await index.delete({
    filter: `userId = '${userId}' AND sourceName = '${sourceName}'`,
  });
}