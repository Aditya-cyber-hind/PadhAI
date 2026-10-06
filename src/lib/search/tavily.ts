import type { SearchProvider, SearchResult } from './provider';

const TAVILY_ENDPOINT = 'https://api.tavily.com/search';
const TIMEOUT_MS = 12_000;

interface TavilyResponse {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    score?: number;
  }>;
}

export const tavilyProvider: SearchProvider = {
  name: 'tavily',

  isConfigured(): boolean {
    return Boolean(process.env.TAVILY_API_KEY);
  },

  async search(query: string, maxResults: number): Promise<SearchResult[]> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return [];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(TAVILY_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: 'basic',
          max_results: maxResults,
          include_answer: false,
          include_raw_content: false,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn(
          `[tavily] HTTP ${res.status}: ${errText.slice(0, 200)}`
        );
        return [];
      }

      const data = (await res.json()) as TavilyResponse;
      const items = Array.isArray(data.results) ? data.results : [];

      const results: SearchResult[] = [];
      for (const item of items) {
        const title = (item.title || '').trim();
        const url = (item.url || '').trim();
        const content = (item.content || '').trim();
        if (!title || !url) continue;

        try {
          const u = new URL(url);
          if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
        } catch {
          continue;
        }

        results.push({
          title,
          url,
          content: content.slice(0, 800),
          score: typeof item.score === 'number' ? item.score : undefined,
          provider: 'tavily',
        });
      }

      return results;
    } catch (err) {
      if ((err as any)?.name === 'AbortError') {
        console.warn('[tavily] request timed out');
      } else {
        console.warn('[tavily] search failed:', err);
      }
      return [];
    } finally {
      clearTimeout(timer);
    }
  },
};