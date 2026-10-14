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
/**
 * Upstash's filter parser does NOT support SQL-style quote escaping ('').
 * When a source name contains characters that break their grammar
 * (quotes, backslashes, or newlines), we skip the source filter entirely.
 *
 * The notebook namespace already isolates chunks, so dropping the filter
 * just means we retrieve from all sources in the notebook — slightly less
 * precise, never broken.
 */
function isFilterSafe(sourceNames: string[]): boolean {
  return sourceNames.every((n) => {
    if (!n || n.length === 0) return false;
    if (n.includes("'")) return false;
    if (n.includes('"')) return false;
    if (n.includes('\\')) return false;
    if (n.includes('\n')) return false;
    if (n.includes('\r')) return false;
    return true;
  });
}

export async function retrieveChunks(
  query: string,
  notebookId: string,
  sourceNames: string[] = [],
  topK: number = 5
): Promise<RetrievedChunk[]> {
  if (!notebookId) return [];

  let filter: string | undefined;
  if (sourceNames.length > 0 && isFilterSafe(sourceNames)) {
    const sourcesList = sourceNames.map((n) => `'${n}'`).join(', ');
    filter = `sourceName IN (${sourcesList})`;
  } else if (sourceNames.length > 0) {
    console.log(
      '[rag] skipping source filter — names contain unsafe characters'
    );
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
  // If the name has unsafe characters, Upstash can't filter on it.
  // Fall back to deleting by source name from Postgres and re-ingesting
  // (handled elsewhere). Here, just skip the vector delete.
  if (!isFilterSafe([sourceName])) {
    console.warn(
      '[rag] clearSource skipped — name has unsafe characters:',
      sourceName
    );
    return;
  }
  await index.namespace(notebookId).delete({
    filter: `sourceName = '${sourceName}'`,
  });
}