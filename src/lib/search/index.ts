import type { SearchProvider, SearchResult } from './provider';
import { tavilyProvider } from './tavily';
import { serperProvider } from './serper';

export type { SearchResult, SearchProvider } from './provider';

/**
 * Fallback chain: Tavily first (best AI-oriented results with extracted
 * content), Serper as backup (Google-quality SERP). Both have generous
 * free tiers, so most searches will succeed on the first try.
 *
 * Each provider returns [] on error, so the chain just moves on.
 * Returns [] if every provider fails — the caller decides what to do.
 */
const PROVIDERS: SearchProvider[] = [tavilyProvider, serperProvider];

export async function searchWithFallback(
  query: string,
  maxResults = 8
): Promise<SearchResult[]> {
  const configured = PROVIDERS.filter((p) => p.isConfigured());
  if (configured.length === 0) {
    console.warn('[search] no providers configured');
    return [];
  }

  for (const provider of configured) {
    try {
      const t0 = Date.now();
      const results = await provider.search(query, maxResults);
      const ms = Date.now() - t0;
      if (results.length > 0) {
        console.log(
          `[search] ${provider.name} returned ${results.length} results in ${ms}ms`
        );
        return results;
      }
      console.log(`[search] ${provider.name} returned 0 results (${ms}ms)`);
    } catch (err) {
      console.warn(`[search] ${provider.name} threw:`, err);
    }
  }

  console.warn('[search] all providers exhausted');
  return [];
}

/**
 * Run multiple queries in parallel, then merge and dedupe by URL.
 * Preserves the highest-scoring result for each URL.
 */
export async function searchMultipleQueries(
  queries: string[],
  maxPerQuery = 5
): Promise<SearchResult[]> {
  const settled = await Promise.all(
    queries.map((q) =>
      searchWithFallback(q, maxPerQuery).catch(() => [] as SearchResult[])
    )
  );

  const byUrl = new Map<string, SearchResult>();
  for (const results of settled) {
    for (const r of results) {
      const existing = byUrl.get(r.url);
      if (!existing) {
        byUrl.set(r.url, r);
      } else if ((r.score ?? 0) > (existing.score ?? 0)) {
        byUrl.set(r.url, r);
      }
    }
  }

  return Array.from(byUrl.values());
}