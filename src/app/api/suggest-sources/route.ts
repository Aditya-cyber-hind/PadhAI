import { NextRequest } from 'next/server';
import { generateText } from 'ai';
import { auth } from '@/lib/auth/server';
import { groq, PADHAI_FALLBACK_MODEL } from '@/lib/groq';
import { checkAndGetUsage, logUsage } from '@/lib/usage/db';
import {
  getCachedSuggestions,
  setCachedSuggestions,
  type CachedSuggestion,
} from '@/lib/suggestions/cache';

export const maxDuration = 45;

interface SuggestedSource {
  title: string;
  url: string;
  kind: 'article' | 'video' | 'docs' | 'reference';
  why: string;
}

const SYSTEM_PROMPT = `You are PadhAI's source-finder. Given a study topic, you suggest 3-5 high-quality web sources that would genuinely help someone learn it.

RULES:
- Return ONLY valid JSON. No prose, no markdown code fences.
- Format: { "sources": [ { "title": string, "url": string, "kind": "article" | "video" | "docs" | "reference", "why": string } ] }
- Prefer stable, well-known sources: Wikipedia, official docs, MDN, Khan Academy, YouTube educational channels, established blogs.
- Avoid paywalled sites, social media, and link shorteners.
- The URL must be a real, stable URL. If unsure, use a site's main category page.
- "why" is one short sentence (<15 words).
- Match the language and level of the topic.
- Give a mix of kinds.
- If the topic is very niche or specific, suggest broader resources that cover adjacent topics (e.g. for "SOF Olympiad Class 8 IGKO" suggest general knowledge / Olympiad preparation sites, not a URL that pretends to be exactly that).`;

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

  // ── Cache check ─────────────────────────────────────────
  const cached = await getCachedSuggestions(trimmed);
  if (cached && cached.length > 0) {
    console.log(`[suggest-sources] cache HIT for "${trimmed}"`);
    return Response.json({ sources: cached, cached: true });
  }

  console.log(`[suggest-sources] cache MISS for "${trimmed}"`);

  let logged = false;

  try {
    const result = await generateText({
      model: groq(PADHAI_FALLBACK_MODEL),
      system: SYSTEM_PROMPT,
      prompt: `Topic: ${trimmed}\n\nReturn the JSON now.`,
      maxRetries: 0,
      maxOutputTokens: 2000,
      temperature: 0.3,
      providerOptions: {
        groq: { reasoning_effort: 'low' },
      },
    });

    if (!logged) {
      logged = true;
      try {
        await logUsage(
          userId,
          PADHAI_FALLBACK_MODEL,
          result.usage?.totalTokens ?? 500,
          'suggest-sources'
        );
      } catch (err) {
        console.error('[suggest-sources] usage log failed:', err);
      }
    }

    const raw = (result.text || '').trim();
    const parsed = parseSuggestions(raw);

    if (!parsed) {
      console.error(
        '[suggest-sources] could not parse. Raw length:',
        raw.length,
        'First 300:',
        raw.slice(0, 300)
      );
      return Response.json(
        {
          error:
            'The AI couldn\u2019t suggest sources for that topic. Try a broader topic \u2014 for example "Photosynthesis" instead of "Class 8 Chapter 4 question 12".',
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
          'Couldn\u2019t reach the AI. Try again in a moment, or use a broader topic.',
      },
      { status: 500 }
    );
  }
}

function parseSuggestions(raw: string): SuggestedSource[] | null {
  let text = raw.trim();

  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  text = text.trim();

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;

  text = text.slice(firstBrace, lastBrace + 1);

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  const arr = Array.isArray(parsed?.sources) ? parsed.sources : null;
  if (!arr) return null;

  const valid: SuggestedSource[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;

    const title = typeof item.title === 'string' ? item.title.trim() : '';
    let url = typeof item.url === 'string' ? item.url.trim() : '';
    const why = typeof item.why === 'string' ? item.why.trim() : '';
    const kind = ['article', 'video', 'docs', 'reference'].includes(item.kind)
      ? item.kind
      : 'article';

    if (!title || !url || !why) continue;

    // Auto-prepend https:// if the model returned a bare domain
    if (!/^https?:\/\//i.test(url) && /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}/i.test(url)) {
      url = `https://${url}`;
    }

    try {
      const u = new URL(url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
    } catch {
      continue;
    }

    valid.push({ title, url, kind, why });
  }

  return valid.length > 0 ? valid.slice(0, 8) : null;
}