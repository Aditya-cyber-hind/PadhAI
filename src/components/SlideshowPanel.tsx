'use client';

import { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';

interface Slide {
  heading: string;
  bullets: string[];
  notes: string;
  math?: string;
}

interface Slideshow {
  id: string;
  title: string;
  subtitle: string;
  slides: Slide[];
}

interface Props {
  sources: string;
  notebookId: string;
  hasSources: boolean;
}

type CountOption = 'brief' | 'standard' | 'detailed' | 'full';

export default function SlideshowPanel({ sources, notebookId, hasSources }: Props) {
  const [deck, setDeck] = useState<Slideshow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState<CountOption>('standard');
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const [presenting, setPresenting] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    if (!notebookId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/slideshow?notebookId=${notebookId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.slideshow) setDeck(data.slideshow);
      } catch (err) {
        console.error('[slideshow] load failed:', err);
      } finally {
        if (!cancelled) setInitialLoadDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notebookId]);

  const generate = async () => {
    if (!hasSources) {
      setError('Please upload a PDF or paste some text first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/slideshow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources, notebookId, count }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      setDeck(data.slideshow);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const clear = async () => {
    if (!confirm('Delete this slideshow?')) return;
    try {
      await fetch(`/api/slideshow?notebookId=${notebookId}`, { method: 'DELETE' });
      setDeck(null);
    } catch (err) {
      console.error('[slideshow] clear failed:', err);
    }
  };

  const startPresenting = () => {
    setCurrentSlide(0);
    setShowNotes(false);
    setPresenting(true);
  };

  const next = useCallback(() => {
    if (!deck) return;
    setCurrentSlide((i) => Math.min(i + 1, deck.slides.length - 1));
  }, [deck]);

  const prev = useCallback(() => {
    setCurrentSlide((i) => Math.max(i - 1, 0));
  }, []);

  const exit = useCallback(() => {
    setPresenting(false);
  }, []);

  useEffect(() => {
    if (!presenting) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.key === 'Escape') {
        exit();
      } else if (e.key === 'n' || e.key === 'N') {
        setShowNotes((s) => !s);
      } else if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [presenting, next, prev, exit]);

  if (loading || !initialLoadDone) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto">
          <header className="mb-6">
            <h1 className="text-xl font-bold text-stone-900">📊 Slideshow</h1>
            <p className="text-sm text-stone-500 animate-pulse">
              {loading ? 'Building presentation...' : 'Loading...'}
            </p>
          </header>
          <div className="bg-white p-8 rounded-lg border border-stone-200">
            <div className="h-6 bg-stone-200 rounded w-1/2 mb-4 animate-pulse" />
            <div className="h-32 bg-stone-100 rounded mb-4 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (presenting && deck) {
    const slide = deck.slides[currentSlide];
    return (
      <div className="fixed inset-0 bg-stone-900 z-[100] flex flex-col">
        <div className="absolute top-4 left-4 text-stone-400 text-sm font-mono z-10">
          {currentSlide + 1} / {deck.slides.length}
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <button
            onClick={() => setShowNotes((s) => !s)}
            className="text-xs text-stone-400 hover:text-white px-3 py-1.5 border border-stone-700 rounded"
            title="Toggle notes (N)"
          >
            {showNotes ? '🙈 Hide notes' : '📝 Show notes'}
          </button>
          <button
            onClick={exit}
            className="text-xs text-stone-400 hover:text-white px-3 py-1.5 border border-stone-700 rounded"
            title="Exit (Esc)"
          >
            ✕ Exit
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-12 sm:p-20">
          <div className="max-w-4xl w-full">
            {currentSlide === 0 ? (
              <div className="text-center">
                <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6">
                  {deck.title}
                </h1>
                {deck.subtitle && (
                  <p className="text-xl sm:text-2xl text-stone-400">
                    {deck.subtitle}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <h2 className="text-3xl sm:text-5xl font-bold text-white mb-8">
                  {slide.heading}
                </h2>
                <ul className="space-y-4">
                  {slide.bullets.map((b, i) => (
                    <li key={i} className="text-xl sm:text-2xl text-stone-200 flex gap-3">
                      <span className="text-stone-600 flex-shrink-0">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {slide.math && slide.math.trim() !== '' && (
                  <div className="mt-8 text-2xl sm:text-3xl text-center text-stone-100 prose prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeRaw, rehypeKatex]}
                    >
                      {slide.math.replace(/\u202F/g, ' ')}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {showNotes && currentSlide > 0 && (
          <div className="border-t border-stone-700 bg-stone-800 p-6 max-h-48 overflow-y-auto">
            <p className="text-xs uppercase tracking-wide text-stone-500 mb-2">
              Speaker notes
            </p>
            <p className="text-stone-300 text-sm leading-relaxed">{slide.notes}</p>
          </div>
        )}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-stone-600">
          ← → to navigate · N for notes · F for fullscreen · Esc to exit
        </div>

        <button
          onClick={prev}
          disabled={currentSlide === 0}
          className="absolute left-0 top-0 bottom-0 w-1/4 opacity-0 cursor-w-resize"
          aria-label="Previous slide"
        />
        <button
          onClick={next}
          disabled={currentSlide === deck.slides.length - 1}
          className="absolute right-0 top-0 bottom-0 w-1/4 opacity-0 cursor-e-resize"
          aria-label="Next slide"
        />
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto">
          <header className="mb-6">
            <h1 className="text-xl font-bold text-stone-900">📊 Slideshow</h1>
            <p className="text-sm text-stone-500">
              Turn your sources into a presentation deck
            </p>
          </header>

          {!hasSources ? (
            <div className="bg-white p-12 rounded-lg border border-stone-200 text-center">
              <p className="text-5xl mb-4">📊</p>
              <h2 className="text-lg font-semibold text-stone-800 mb-2">
                No sources yet
              </h2>
              <p className="text-sm text-stone-500 max-w-md mx-auto">
                Upload a source, then generate a slideshow from it.
              </p>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg border border-stone-200">
              <div className="mb-4">
                <label className="block text-xs font-semibold text-stone-600 mb-2">
                  Deck length
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(e.target.value as CountOption)}
                  className="w-full p-3 border border-stone-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                >
                  <option value="brief">Brief (6 slides)</option>
                  <option value="standard">Standard (10 slides)</option>
                  <option value="detailed">Detailed (15 slides)</option>
                  <option value="full">Full (20 slides)</option>
                </select>
              </div>

              <div className="text-center">
                <button
                  onClick={generate}
                  className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700"
                >
                  Generate Slideshow
                </button>
                {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4 border-b border-stone-200 bg-white flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-bold text-stone-900">📊 Slideshow</h1>
            <p className="text-xs text-stone-500">
              {deck.title} · {deck.slides.length} slides
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={generate}
              disabled={loading}
              className="text-xs px-3 py-1.5 border border-stone-300 rounded hover:bg-stone-100"
            >
              ↻ Regenerate
            </button>
            <button
              onClick={clear}
              className="text-xs px-3 py-1.5 border border-stone-300 rounded hover:bg-stone-100 hover:border-red-300 hover:text-red-600"
            >
              🗑️ Clear
            </button>
            <button
              onClick={startPresenting}
              className="text-xs px-4 py-1.5 bg-stone-900 text-white rounded hover:bg-stone-700 font-medium"
            >
              ▶ Present
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-stone-50">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-stone-900 rounded-xl p-6 min-h-[200px] flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-white mb-2">{deck.title}</h2>
            {deck.subtitle && (
              <p className="text-sm text-stone-400">{deck.subtitle}</p>
            )}
            <p className="text-xs text-stone-600 mt-4">Slide 1 · Title</p>
          </div>

          {deck.slides.map((slide, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-stone-200 p-6 min-h-[200px] flex flex-col"
            >
              <p className="text-xs text-stone-400 mb-3">Slide {i + 2}</p>
              <h3 className="text-lg font-semibold text-stone-900 mb-3">
                {slide.heading}
              </h3>
              <ul className="space-y-1.5 flex-1">
                {slide.bullets.slice(0, 3).map((b, j) => (
                  <li key={j} className="text-xs text-stone-600 flex gap-2">
                    <span className="text-stone-400">•</span>
                    <span className="line-clamp-2">{b}</span>
                  </li>
                ))}
                {slide.bullets.length > 3 && (
                  <li className="text-xs text-stone-400 italic">
                    +{slide.bullets.length - 3} more
                  </li>
                )}
              </ul>
              {slide.math && slide.math.trim() !== '' && (
                <div className="mt-3 text-sm text-stone-700 prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                  >
                    {slide.math.replace(/\u202F/g, ' ')}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}