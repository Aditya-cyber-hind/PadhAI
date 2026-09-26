import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { ApifyClient } from 'apify-client';

export const maxDuration = 30;

const TIMEOUT_MS = 8000;
const APIFY_TIMEOUT_MS = 25000;

// ============================================================
// Video ID extraction
// ============================================================
function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return id.length === 11 ? id : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = u.searchParams.get('v');
      if (v && v.length === 11) return v;

      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && (parts[0] === 'embed' || parts[0] === 'shorts')) {
        const id = parts[1];
        return id.length === 11 ? id : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// Timeout wrapper
// ============================================================
async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface TranscriptResult {
  text: string;
  sourceName: string;
  provider: string;
}

// ============================================================
// Provider 1: yTranscript
// ============================================================
async function tryYTranscript(videoId: string): Promise<TranscriptResult | null> {
  const apiKey = process.env.YTRANSCRIPT_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetchWithTimeout(
      `https://ytranscript.com/api/v1/transcript?videoId=${videoId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[youtube] yTranscript ${res.status}: ${body.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    const text = (data.transcript || data.text || '').trim();
    if (!text || text.length < 20) return null;

    return {
      text,
      sourceName: data.title ? `${data.title} (YouTube)` : `YouTube · ${videoId}`,
      provider: 'ytranscript',
    };
  } catch (err) {
    console.warn('[youtube] yTranscript failed:', err);
    return null;
  }
}

// ============================================================
// Provider 2: Supadata
// ============================================================
async function trySupadata(videoId: string): Promise<TranscriptResult | null> {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetchWithTimeout(
      `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true`,
      {
        headers: {
          'x-api-key': apiKey,
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[youtube] Supadata ${res.status}: ${body.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();

    let text = '';
    if (typeof data.content === 'string') {
      text = data.content;
    } else if (Array.isArray(data.content)) {
      text = data.content.map((s: any) => s.text || '').join(' ');
    }
    text = text.trim();

    if (!text || text.length < 20) return null;

    return {
      text,
      sourceName: `YouTube · ${videoId}`,
      provider: 'supadata',
    };
  } catch (err) {
    console.warn('[youtube] Supadata failed:', err);
    return null;
  }
}

// ============================================================
// Provider 3: youtubetranscriptdownload.com (YTDL)
// ============================================================
async function tryYTDL(videoId: string): Promise<TranscriptResult | null> {
  const apiKey = process.env.YTDL_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetchWithTimeout(
      `https://youtubetranscriptdownload.com/api/v1/transcript?video=${videoId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[youtube] YTDL ${res.status}: ${body.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    const text = (data.transcript || data.text || '').trim();
    if (!text || text.length < 20) return null;

    return {
      text,
      sourceName: data.title ? `${data.title} (YouTube)` : `YouTube · ${videoId}`,
      provider: 'ytdl',
    };
  } catch (err) {
    console.warn('[youtube] YTDL failed:', err);
    return null;
  }
}

// ============================================================
// Provider 4: Apify (slower, runs as a job)
// ============================================================
async function tryApify(videoId: string): Promise<TranscriptResult | null> {
  const apiToken = process.env.APIFY_TOKEN;
  if (!apiToken) return null;

  try {
    console.log('[youtube] starting Apify actor...');
    const client = new ApifyClient({ token: apiToken });

    // Run the actor synchronously and wait for dataset items
    const run = await client.actor('om_kh/video-transcript-api').call(
      { videoUrl: `https://www.youtube.com/watch?v=${videoId}` },
      { waitSecs: 30 }
    );

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    if (!items || items.length === 0) return null;

    const first = items[0] as any;
    const text = (first.transcript || first.text || '').trim();
    if (!text || text.length < 20) return null;

    return {
      text,
      sourceName: first.title ? `${first.title} (YouTube)` : `YouTube · ${videoId}`,
      provider: 'apify',
    };
  } catch (err) {
    console.warn('[youtube] Apify failed:', err);
    return null;
  }
}

// ============================================================
// Main handler
// ============================================================
export async function POST(req: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { url } = await req.json();
  if (!url || typeof url !== 'string') {
    return Response.json({ error: 'URL is required' }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return Response.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  console.log(`[youtube] fetching transcript for ${videoId}`);

  // Phase 1: Race the three fast REST providers in parallel
  console.log('[youtube] racing yTranscript, Supadata, YTDL...');

  const raceResult = await Promise.any([
    tryYTranscript(videoId).then((r) => { if (!r) throw new Error('yT null'); return r; }),
    trySupadata(videoId).then((r) => { if (!r) throw new Error('SD null'); return r; }),
    tryYTDL(videoId).then((r) => { if (!r) throw new Error('YTDL null'); return r; }),
  ]).catch(() => null);

  if (raceResult) {
    console.log(`[youtube] success via ${raceResult.provider}: ${raceResult.text.length} chars`);
    return Response.json({
      text: raceResult.text,
      sourceName: raceResult.sourceName,
      provider: raceResult.provider,
      videoId,
      wordCount: raceResult.text.split(/\s+/).filter(Boolean).length,
    });
  }

  // Phase 2: Fall back to Apify (slower, uses actor quota)
  console.log('[youtube] all fast providers failed, trying Apify...');
  const apifyResult = await tryApify(videoId);

  if (apifyResult) {
    console.log(`[youtube] success via apify: ${apifyResult.text.length} chars`);
    return Response.json({
      text: apifyResult.text,
      sourceName: apifyResult.sourceName,
      provider: 'apify',
      videoId,
      wordCount: apifyResult.text.split(/\s+/).filter(Boolean).length,
    });
  }

  // All failed
  console.warn('[youtube] all providers exhausted');
  return Response.json(
    {
      error:
        "Couldn't fetch the transcript from any provider. The video might not have captions, or the services are temporarily unavailable. Try pasting the transcript manually.",
    },
    { status: 503 }
  );
}