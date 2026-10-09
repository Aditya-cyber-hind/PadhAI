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

/**
 * Escape a string for use inside a single-quoted Upstash filter literal.
 *
 * Upstash's filter grammar is a SQL-like parser. The escape rules are:
 *   - Single quotes must be doubled: '  →  ''
 *   - Backslashes must be doubled: \  →  \\
 *
 * Without this, source names like "Newton's Laws.pdf" break the parser
 * with errors like: mismatched input 's' expecting {',', ')'}
 */
function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "''");
}

export async function retrieveChunks(
  query: string,
  notebookId: string,
  sourceNames: string[] = [],
  topK: number = 5
): Promise<RetrievedChunk[]> {
  if (!notebookId) return [];

  let filter: string | undefined;
  if (sourceNames.length > 0) {
    const sourcesList = sourceNames
      .map((n) => `'${escapeFilterValue(n)}'`)
      .join(', ');
    filter = `sourceName IN (${sourcesList})`;
  }

  const ns = index.namespace(notebookId);

  const results = await ns.query({
    data: query,
    topK,
    includeMetadata: true,
    ...(filter ? { filter } : {}),
  });

  return results.map((r) => ({
    content: (r.metadata?.content as string) ?? '',
    sourceName: (r.metadata?.sourceName as string) ?? '',
    chunkIndex: (r.metadata?.chunkIndex as number) ?? 0,
    similarity: r.score,
  }));
}

export async function clearNotebook(notebookId: string): Promise<void> {
  if (!notebookId) return;
  await index.namespace(notebookId).reset();
}

export async function clearSource(
  notebookId: string,
  sourceName: string
): Promise<void> {
  if (!notebookId || !sourceName) return;
  await index.namespace(notebookId).delete({
    filter: `sourceName = '${escapeFilterValue(sourceName)}'`,
  });
}