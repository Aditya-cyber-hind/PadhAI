import type { SearchProvider, SearchResult } from './provider';

const SERPER_ENDPOINT = 'https://google.serper.dev/search';
const TIMEOUT_MS = 12_000;

interface SerperResponse {
  organic?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
    position?: number;
  }>;
}

export const serperProvider: SearchProvider = {
  name: 'serper',

  isConfigured(): boolean {
    return Boolean(process.env.SERPER_API_KEY);
  },

  async search(query: string, maxResults: number): Promise<SearchResult[]> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) return [];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(SERPER_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          num: maxResults,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn(
          `[serper] HTTP ${res.status}: ${errText.slice(0, 200)}`
        );
        return [];
      }

      const data = (await res.json()) as SerperResponse;
      const items = Array.isArray(data.organic) ? data.organic : [];

      const results: SearchResult[] = [];
      for (const item of items) {
        const title = (item.title || '').trim();
        const url = (item.link || '').trim();
        const content = (item.snippet || '').trim();
        if (!title || !url) continue;

        try {
          const u = new URL(url);
          if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
        } catch {
          continue;
        }

        // Position 1 = best. Convert to a 0-1 score (approx).
        const position = typeof item.position === 'number' ? item.position : 10;
        const score = Math.max(0, Math.min(1, 1 - (position - 1) / 10));

        results.push({
          title,
          url,
          content: content.slice(0, 800),
          score,
          provider: 'serper',
        });
      }

      return results;
    } catch (err) {
      if ((err as any)?.name === 'AbortError') {
        console.warn('[serper] request timed out');
      } else {
        console.warn('[serper] search failed:', err);
      }
      return [];
    } finally {
      clearTimeout(timer);
    }
  },
};