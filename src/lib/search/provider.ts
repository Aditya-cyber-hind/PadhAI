/**
 * Shared types for search providers.
 *
 * Every provider implements `search()` and returns a normalized
 * SearchResult[]. This lets the fallback chain swap providers
 * without the caller caring which one actually answered.
 */

export interface SearchResult {
  title: string;
  url: string;
  /** Short snippet or extracted content for the LLM to rank on */
  content: string;
  /** Optional relevance score (0-1). Only Tavily and Brave provide this. */
  score?: number;
  /** Which provider returned this result — for logs and debugging */
  provider: string;
}

export interface SearchProvider {
  name: string;
  isConfigured(): boolean;
  search(query: string, maxResults: number): Promise<SearchResult[]>;
}