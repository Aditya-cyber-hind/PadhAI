import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export const maxDuration = 30;

const FETCH_TIMEOUT_MS = 10000;
const MAX_HTML_SIZE = 5 * 1024 * 1024; // 5MB cap — homepages can be huge

export async function POST(req: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { url } = await req.json();
  if (!url || typeof url !== 'string') {
    return Response.json({ error: 'URL is required' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Only HTTP and HTTPS URLs are supported');
    }
  } catch {
    return Response.json(
      { error: "That doesn't look like a valid URL." },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) {
      return Response.json(
        { error: `That page returned an error (${res.status}). Try a different link.` },
        { status: 400 }
      );
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return Response.json(
        { error: "That link doesn't point to a web page (maybe a PDF or image?)." },
        { status: 400 }
      );
    }

    // Cap response size so we don't try to parse a 50MB homepage
    const reader = res.body?.getReader();
    let html = '';
    if (reader) {
      const decoder = new TextDecoder();
      let totalBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_HTML_SIZE) {
          reader.cancel();
          break;
        }
        html += decoder.decode(value, { stream: true });
      }
      html += decoder.decode();
    } else {
      html = await res.text();
    }

    if (!html || html.length < 200) {
      return Response.json(
        {
          error:
            'That page has no readable content. Try a news article, blog post, or Wikipedia link.',
        },
        { status: 400 }
      );
    }

    // Quick heuristic: reject obvious homepage shells before running Readability
    // (Google, YouTube, Facebook, etc. — pages with mostly <script> and <link> tags)
    const textDensity =
      html.length < 5000 ? 0 : html.replace(/<[^>]+>/g, '').length / html.length;
    if (textDensity < 0.05) {
      return Response.json(
        {
          error:
            "That page doesn't have enough readable text. Try a news article, blog post, or Wikipedia link.",
        },
        { status: 400 }
      );
    }

    const dom = new JSDOM(html, {
      url: parsed.toString(),
      // Disable JS execution — we only want the static HTML
      runScripts: undefined,
      pretendToBeVisual: false,
    });

    const readerInstance = new Readability(dom.window.document);
    const article = readerInstance.parse();

    if (!article || !article.textContent || article.textContent.trim().length < 200) {
      return Response.json(
        {
          error:
            "Couldn't extract article text from that page. Try a news article, blog post, or Wikipedia link.",
        },
        { status: 400 }
      );
    }

    const text = article.textContent
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();

    const sourceName = article.title?.trim() || parsed.hostname;

    return Response.json({
      text,
      sourceName,
      title: article.title || '',
      byline: article.byline || '',
      wordCount: text.split(/\s+/).length,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return Response.json(
        { error: 'That page took too long to load. Try a different link.' },
        { status: 504 }
      );
    }
    console.error('[web] fetch failed:', err);
    return Response.json(
      { error: "Couldn't fetch that page. Try a different link." },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }
}