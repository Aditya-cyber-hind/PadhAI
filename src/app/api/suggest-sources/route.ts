import { NextRequest } from 'next/server';
import { generateText } from 'ai';
import { auth } from '@/lib/auth/server';
import {
  groq,
  groqBackup,
  mistral,
  PADHAI_MODEL,
  PADHAI_FALLBACK_MODEL,
  MISTRAL_MODEL,
} from '@/lib/llm';
import { checkAndGetUsage, logUsage } from '@/lib/usage/db';
import { searchMultipleQueries, type SearchResult } from '@/lib/search';
import {
  getCachedSuggestions,
  setCachedSuggestions,
  type CachedSuggestion,
} from '@/lib/suggestions/cache';

export const maxDuration = 45;

/* ─────────────────────────────────────────────────────────────
   Candidate chain for suggest-sources.
   Same shape as Chat/Coder — Groq primary → Groq backup → Mistral.
   Mistral is the safety net when Groq's daily cap is hit.
   ───────────────────────────────────────────────────────────── */

interface LlmCandidate {
  client: any;
  model: string;
  label: string;
  isMistral: boolean;
}

function buildLlmCandidates(): LlmCandidate[] {
  const list: LlmCandidate[] = [
    { client: groq, model: PADHAI_FALLBACK_MODEL, label: 'groq-primary-20b', isMistral: false },
    { client: groq, model: PADHAI_MODEL, label: 'groq-primary-120b', isMistral: false },
  ];
  if (groqBackup) {
    list.push({ client: groqBackup, model: PADHAI_FALLBACK_MODEL, label: 'groq-backup-20b', isMistral: false });
    list.push({ client: groqBackup, model: PADHAI_MODEL, label: 'groq-backup-120b', isMistral: false });
  }
  if (mistral) {
    list.push({ client: mistral, model: MISTRAL_MODEL, label: 'mistral-small', isMistral: true });
  }
  return list;
}

async function generateTextWithFallback(options: {
  system: string;
  prompt: string;
  maxOutputTokens: number;
  temperature: number;
}): Promise<{ text: string; totalTokens: number; usedLabel: string } | null> {
  const candidates = buildLlmCandidates();

  for (const candidate of candidates) {
    try {
      const result = await generateText({
        model: candidate.client(candidate.model),
        system: options.system,
        prompt: options.prompt,
        maxRetries: 0,
        maxOutputTokens: options.maxOutputTokens,
        temperature: options.temperature,
        // Only Groq supports reasoning_effort
        ...(candidate.isMistral
          ? {}
          : { providerOptions: { groq: { reasoning_effort: 'low' } } }),
      });

      console.log(`[suggest-sources] ${candidate.label} responded`);
      return {
        text: result.text || '',
        totalTokens: result.usage?.totalTokens ?? 0,
        usedLabel: candidate.label,
      };
    } catch (err: any) {
      const status = err?.statusCode ?? err?.lastError?.statusCode;
      if (status === 429) {
        console.warn(
          `[suggest-sources] ${candidate.label} rate-limited (429), trying next candidate`
        );
      } else {
        console.warn(
          `[suggest-sources] ${candidate.label} failed:`,
          err?.message || err
        );
      }
      continue;
    }
  }

  console.warn('[suggest-sources] all LLM candidates exhausted');
  return null;
}

/* ─────────────────────────────────────────────────────────────
   Prompts
   ───────────────────────────────────────────────────────────── */

const QUERY_GEN_PROMPT = `You are PadhAI's search-query generator.

Given a study topic, output 3-5 short web search queries that would find the BEST learning resources for it.

RULES:
- Return ONLY valid JSON. No prose, no markdown fences.
- Format: { "queries": ["query 1", "query 2", ...] }
- Each query should be 2-6 words.
- Vary the angle: one for "tutorial", one for "documentation" or "reference", one for "examples", one for "video" or "explained".
- If the topic is very niche, broaden the queries so they actually return results (e.g. for "SOF Olympiad Class 8 IGKO" use "IGKO general knowledge olympiad", "SOF olympiad preparation", "GK olympiad class 8").
- Match the language of the topic (Hinglish topic → English queries still fine, but include the original terms).`;

const RANK_PROMPT = `You are PadhAI's source-ranker.

You are given a study topic and a list of search results. Pick the 4-6 BEST sources to help someone learn that topic.

RULES:
- Return ONLY valid JSON. No prose, no markdown fences.
- Format: { "sources": [ { "title": string, "url": string, "kind": "article" | "video" | "docs" | "reference", "why": string } ] }
- Only include URLs from the provided list. Do NOT invent URLs.
- Skip paywalled sites, social media, link shorteners, and pure shopping pages.
- Prefer: Wikipedia, official docs, MDN, Khan Academy, YouTube educational channels, established blogs.
- "why" is one short sentence (<15 words) about what makes this useful for THIS topic.
- Give a mix of kinds when possible.
- Order from most useful to least useful.`;

/* ─────────────────────────────────────────────────────────────
   Main handler
   ───────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const usage = await checkAndGetUsage(userId);
  if (!usage.ok) {
    return Response.json(
      { error: 'Daily limit reached. Resets in 24 hours.' },
      { status: 429 }
    );
  }

  const { topic }: { topic?: string } = await req.json();
  if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
    return Response.json(
      { error: 'Topic must be at least 3 characters.' },
      { status: 400 }
    );
  }

  const trimmed = topic.trim().slice(0, 200);

  // ── Cache ────────────────────────────────────────────────
  const cached = await getCachedSuggestions(trimmed);
  if (cached && cached.length > 0) {
    console.log(`[suggest-sources] cache HIT for "${trimmed}"`);
    return Response.json({ sources: cached, cached: true });
  }

  console.log(`[suggest-sources] cache MISS for "${trimmed}"`);

  try {
    // ── Step 1: Generate search queries ────────────────────
    const queryGen = await generateTextWithFallback({
      system: QUERY_GEN_PROMPT,
      prompt: `Topic: ${trimmed}\n\nReturn the JSON now.`,
      maxOutputTokens: 500,
      temperature: 0.4,
    });

    if (!queryGen) {
      return Response.json(
        {
          error:
            'The AI is busy right now. Try again in a moment, or use a broader topic.',
        },
        { status: 503 }
      );
    }

    const queries = parseQueries(queryGen.text);

    if (queries.length === 0) {
      console.warn(
        '[suggest-sources] query generation failed, using topic verbatim'
      );
      queries.push(trimmed);
    }

    console.log(`[suggest-sources] queries: ${queries.join(' | ')}`);

    // ── Step 2: Run the search chain ───────────────────────
    const searchResults = await searchMultipleQueries(queries, 5);

    if (searchResults.length === 0) {
      console.warn('[suggest-sources] search returned no results');
      return Response.json(
        {
          error:
            'Search is unavailable right now. Try again in a moment, or paste a URL directly in the Sources panel.',
        },
        { status: 502 }
      );
    }

    console.log(`[suggest-sources] ${searchResults.length} unique results`);

    // ── Step 3: Rank with the LLM ──────────────────────────
    const rankInput = searchResults
      .slice(0, 20)
      .map(
        (r, i) =>
          `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.content.slice(0, 200)}`
      )
      .join('\n\n');

    const ranked = await generateTextWithFallback({
      system: RANK_PROMPT,
      prompt: `Topic: ${trimmed}\n\nCandidate sources:\n\n${rankInput}\n\nReturn the JSON now.`,
      maxOutputTokens: 1500,
      temperature: 0.2,
    });

    if (!ranked) {
      return Response.json(
        {
          error:
            'The AI is busy right now. Try again in a moment — your search results are ready to use.',
        },
        { status: 503 }
      );
    }

    // Log combined usage
    try {
      const total = queryGen.totalTokens + ranked.totalTokens;
      await logUsage(
        userId,
        ranked.usedLabel,
        total || 1500,
        'suggest-sources'
      );
    } catch (err) {
      console.error('[suggest-sources] usage log failed:', err);
    }

    const parsed = parseRankedSources(ranked.text, searchResults);

    if (!parsed) {
      console.error(
        '[suggest-sources] could not rank. Raw length:',
        ranked.text.length
      );
      return Response.json(
        {
          error:
            'The AI couldn\u2019t rank the results. Try again in a moment, or use a simpler topic.',
        },
        { status: 502 }
      );
    }

    void setCachedSuggestions(trimmed, parsed);

    return Response.json({ sources: parsed, cached: false });
  } catch (err) {
    console.error('[suggest-sources] failed:', err);
    return Response.json(
      {
        error:
          'Couldn\u2019t reach the AI. Try again in a moment, or paste a URL directly.',
      },
      { status: 500 }
    );
  }
}

/* ─────────────────────────────────────────────────────────────
   Parsing helpers
   ───────────────────────────────────────────────────────────── */

function parseQueries(raw: string): string[] {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  text = text.trim();

  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return [];
  text = text.slice(first, last + 1);

  try {
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed?.queries) ? parsed.queries : null;
    if (!arr) return [];
    return arr
      .filter((q: any) => typeof q === 'string' && q.trim().length >= 2)
      .map((q: string) => q.trim().slice(0, 120))
      .slice(0, 5);
  } catch {
    return [];
  }
}

function parseRankedSources(
  raw: string,
  candidates: SearchResult[]
): CachedSuggestion[] | null {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  text = text.trim();

  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  text = text.slice(first, last + 1);

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  const arr = Array.isArray(parsed?.sources) ? parsed.sources : null;
  if (!arr) return null;

  // Build a lookup of valid URLs from the search candidates
  const validUrls = new Set(candidates.map((c) => c.url));

  const valid: CachedSuggestion[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;

    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const url = typeof item.url === 'string' ? item.url.trim() : '';
    const why = typeof item.why === 'string' ? item.why.trim() : '';
    const kind = ['article', 'video', 'docs', 'reference'].includes(item.kind)
      ? item.kind
      : 'article';

    if (!title || !url || !why) continue;

    // Reject URLs that weren't in the candidate set — the LLM must not invent
    if (!validUrls.has(url)) {
      console.warn(`[suggest-sources] rejecting invented URL: ${url}`);
      continue;
    }

    valid.push({ title, url, kind, why });
  }

  return valid.length > 0 ? valid.slice(0, 6) : null;
}