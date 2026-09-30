import { NextRequest } from 'next/server';
import { generateText } from 'ai';
import { auth } from '@/lib/auth/server';
import { groq, PADHAI_MODEL } from '@/lib/groq';
import { checkAndGetUsage, logUsage } from '@/lib/usage/db';

export const maxDuration = 45;

interface SuggestedSource {
  title: string;
  url: string;
  kind: 'article' | 'video' | 'docs' | 'reference';
  why: string;
}

const SYSTEM_PROMPT = `You are PadhAI's source-finder. Given a study topic, you suggest 4-6 high-quality web sources that would genuinely help someone learn it.

RULES:
- Return ONLY valid JSON. No prose, no markdown code fences.
- Format: { "sources": [ { "title": string, "url": string, "kind": "article" | "video" | "docs" | "reference", "why": string } ] }
- Prefer stable, well-known sources: Wikipedia, official docs, MDN, Khan Academy, YouTube educational channels, established blogs (CSS-Tricks, Smashing, Real Python, Overreacted, etc.).
- Avoid paywalled sites (Medium, Substack unless free, news sites).
- Avoid social media (Reddit, Twitter, Facebook, TikTok, Instagram).
- Avoid link shorteners.
- The URL must be a real, stable, guessable URL. If you're not confident a specific URL exists, use the site's main category or search page instead.
- "why" is one short sentence (<15 words) explaining what makes this source useful for THIS topic.
- Match the language and level of the topic (e.g. "JEE Physics" → Indian-focused resources; "React hooks" → MDN / react.dev / educational YouTube).
- If the topic is too vague ("math", "science"), pick a concrete entry point and note the assumption in the first source's "why".
- Give a mix of kinds — at least one reference and one article.`;

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

  let logged = false;

  try {
    const result = await generateText({
      model: groq(PADHAI_MODEL),
      system: SYSTEM_PROMPT,
      prompt: `Topic: ${trimmed}\n\nReturn the JSON now.`,
      maxRetries: 0,
      maxOutputTokens: 1500,
      temperature: 0.4,
    });

    if (!logged) {
      logged = true;
      try {
        await logUsage(
          userId,
          PADHAI_MODEL,
          result.usage?.totalTokens ?? 500,
          'suggest-sources'
        );
      } catch (err) {
        console.error('[suggest-sources] usage log failed:', err);
      }
    }

    // Parse the JSON from the model's response
    const raw = result.text.trim();
    const parsed = parseSuggestions(raw);

    if (!parsed) {
      console.error('[suggest-sources] could not parse:', raw.slice(0, 500));
      return Response.json(
        { error: "The AI didn't return usable suggestions. Try rephrasing the topic." },
        { status: 502 }
      );
    }

    return Response.json({ sources: parsed });
  } catch (err) {
    console.error('[suggest-sources] failed:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to suggest sources' },
      { status: 500 }
    );
  }
}

/**
 * The model occasionally wraps JSON in ```json ... ``` fences despite instructions.
 * Strip them, then parse. Also validates each entry.
 */
function parseSuggestions(raw: string): SuggestedSource[] | null {
  let text = raw.trim();

  // Strip markdown fences if present
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  text = text.trim();

  // If the model included prose before/after JSON, find the first { and last }
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
    const url = typeof item.url === 'string' ? item.url.trim() : '';
    const why = typeof item.why === 'string' ? item.why.trim() : '';
    const kind = ['article', 'video', 'docs', 'reference'].includes(item.kind)
      ? item.kind
      : 'article';

    if (!title || !url || !why) continue;

    // Must be a valid HTTP(S) URL
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