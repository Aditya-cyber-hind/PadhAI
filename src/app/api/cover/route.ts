import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Pollinations proxy route.
 *
 * Keeps the secret Pollinations key server-side so it never appears in
 * client URLs or DevTools. The client requests /api/cover?prompt=X&seed=Y
 * and this route fetches the image, then streams it back.
 *
 * Cache:
 *   Browser caches for 1 year (immutable) — the image for a given
 *   (prompt, seed) pair never changes because the seed is deterministic.
 *   So the client hits this route at most once per image, ever.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get('prompt');
  const seed = searchParams.get('seed') || '0';

  if (!prompt || prompt.trim().length === 0) {
    return new Response('Missing prompt', { status: 400 });
  }

  // Sanity caps — Pollinations rejects very long prompts anyway
  const trimmedPrompt = prompt.trim().slice(0, 500);

  const apiKey = process.env.POLLINATIONS_API_KEY;
  const encoded = encodeURIComponent(trimmedPrompt);

  // Base URL — same as before
  let upstreamUrl = `https://image.pollinations.ai/prompt/${encoded}?seed=${encodeURIComponent(
    seed
  )}&width=800&height=500&nologo=true`;

  // Attach the secret key if we have one
  if (apiKey) {
    upstreamUrl += `&token=${encodeURIComponent(apiKey)}`;
  } else {
    console.warn(
      '[cover] POLLINATIONS_API_KEY not set — falling back to rate-limited mode'
    );
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      // 25s timeout so we fail before Vercel's 30s cap
      signal: AbortSignal.timeout(25000),
      // Pollinations accepts GET, no special headers needed
      headers: {
        Accept: 'image/*',
      },
    });

    if (!upstream.ok) {
      console.warn(
        `[cover] upstream returned ${upstream.status} for "${trimmedPrompt.slice(0, 60)}..."`
      );
      return new Response('Cover image unavailable', {
        status: upstream.status === 429 ? 429 : 502,
      });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';

    // Stream the image body straight through. Don't buffer it.
    // Cache it forever on the client — it's deterministic for a
    // given (prompt, seed).
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        // Helpful if you ever put a CDN in front
        'X-Cover-Prompt-Length': String(trimmedPrompt.length),
      },
    });
  } catch (err) {
    const isTimeout = (err as any)?.name === 'TimeoutError';
    console.error(
      `[cover] fetch ${isTimeout ? 'timed out' : 'failed'}:`,
      err
    );
    return new Response(
      isTimeout ? 'Cover generation timed out' : 'Cover fetch failed',
      { status: isTimeout ? 504 : 502 }
    );
  }
}