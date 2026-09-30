import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export interface CachedSuggestion {
  title: string;
  url: string;
  kind: 'article' | 'video' | 'docs' | 'reference';
  why: string;
}

/**
 * Normalize a topic so "React Hooks", " react hooks ", and "React  Hooks"
 * all map to the same cache key.
 */
export function normalizeTopic(topic: string): string {
  return topic.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Look up cached suggestions. Returns null on miss.
 * Increments the hit counter in the background on a hit.
 */
export async function getCachedSuggestions(
  topic: string
): Promise<CachedSuggestion[] | null> {
  const key = normalizeTopic(topic);
  if (!key) return null;

  try {
    const rows = await sql`
      SELECT sources, hits
      FROM suggestion_cache
      WHERE topic_normalized = ${key}
      LIMIT 1
    `;

    if (rows.length === 0) return null;

    const row = rows[0] as { sources: unknown; hits: number };
    const sources = row.sources as CachedSuggestion[];
    if (!Array.isArray(sources) || sources.length === 0) return null;

    // Fire-and-forget hit counter — don't await, don't fail the request
    void sql`
      UPDATE suggestion_cache
      SET hits = hits + 1
      WHERE topic_normalized = ${key}
    `.catch((err: unknown) => {
      console.error('[suggestion-cache] hit counter failed:', err);
    });

    return sources;
  } catch (err) {
    console.error('[suggestion-cache] get failed:', err);
    return null;
  }
}

/**
 * Store suggestions for a topic. Idempotent — later writes for the same
 * topic are ignored (first write wins, keeps the popular entries stable).
 */
export async function setCachedSuggestions(
  topic: string,
  sources: CachedSuggestion[]
): Promise<void> {
  const key = normalizeTopic(topic);
  if (!key || !Array.isArray(sources) || sources.length === 0) return;

  try {
    await sql`
      INSERT INTO suggestion_cache (topic_normalized, sources)
      VALUES (${key}, ${JSON.stringify(sources)}::jsonb)
      ON CONFLICT (topic_normalized) DO NOTHING
    `;
  } catch (err) {
    console.error('[suggestion-cache] set failed:', err);
  }
}