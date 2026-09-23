'use client';

import { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';

type SlideType = 'section' | 'bullets' | 'statement' | 'takeaway';

interface Slide {
  type: SlideType;
  heading: string;
  bullets: string[];
  statement: string;
  sectionNumber: string;
  sectionLabel: string;
  takeaways: string[];
  math?: string;
  notes: string;
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

// ============================================================
// Shared slide chrome — the frame every slide sits inside
// ============================================================
function SlideFrame({
  children,
  accent = 'from-blue-500 to-purple-500',
}: {
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="relative w-full h-full bg-stone-950 text-white overflow-hidden">
      {/* Subtle radial gradient background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 rounded-full bg-blue-600 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-1/2 h-1/2 rounded-full bg-purple-600 blur-[120px]" />
      </div>

      {/* Accent bar on the left edge */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${accent}`} />

      {/* Slide content */}
      <div className="relative z-10 w-full h-full flex items-center justify-center px-10 sm:px-16 md:px-24 py-10">
        <div className="w-full max-w-5xl">{children}</div>
      </div>
    </div>
  );
}

// ============================================================
// Slide type: SECTION — big number, label
// ============================================================
function SectionSlide({ slide }: { slide: Slide }) {
  return (
    <SlideFrame accent="from-emerald-500 to-cyan-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-12">
        <div className="text-7xl sm:text-9xl font-black leading-none bg-gradient-to-br from-emerald-300 to-cyan-500 bg-clip-text text-transparent">
          {slide.sectionNumber || '01'}
        </div>
        <div className="flex-1">
          <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-emerald-400 font-semibold mb-3">
            Section
          </p>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold leading-tight">
            {slide.sectionLabel || slide.heading}
          </h2>
        </div>
      </div>
    </SlideFrame>
  );
}

// ============================================================
// Slide type: BULLETS — the workhorse
// ============================================================
function BulletsSlide({ slide }: { slide: Slide }) {
  return (
    <SlideFrame accent="from-blue-500 to-purple-500">
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-8 sm:mb-10 leading-tight">
        {slide.heading}
      </h2>

      <ul className="space-y-4 sm:space-y-5">
        {slide.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-4 text-lg sm:text-xl md:text-2xl text-stone-200 leading-snug">
            <span className="mt-2 sm:mt-3 flex-shrink-0 w-6 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full" />
            <span className="flex-1">{b}</span>
          </li>
        ))}
      </ul>

      {slide.math && slide.math.trim() !== '' && (
        <div className="mt-8 sm:mt-10 text-2xl sm:text-3xl text-center text-stone-100 prose prose-invert prose-2xl max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw, rehypeKatex]}
          >
            {slide.math.replace(/\u202F/g, ' ')}
          </ReactMarkdown>
        </div>
      )}
    </SlideFrame>
  );
}

// ============================================================
// Slide type: STATEMENT — one big idea
// ============================================================
function StatementSlide({ slide }: { slide: Slide }) {
  return (
    <SlideFrame accent="from-amber-500 to-rose-500">
      <div className="text-center">
        <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-amber-400 font-semibold mb-6">
          {slide.heading}
        </p>
        <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight max-w-4xl mx-auto">
          {slide.statement}
        </p>
      </div>
    </SlideFrame>
  );
}

// ============================================================
// Slide type: TAKEAWAY — closing summary
// ============================================================
function TakeawaySlide({ slide }: { slide: Slide }) {
  return (
    <SlideFrame accent="from-purple-500 to-pink-500">
      <div className="mb-8 sm:mb-10">
        <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-purple-400 font-semibold mb-3">
          Key Takeaways
        </p>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-stone-300">
          {slide.heading}
        </h2>
      </div>

      <ul className="space-y-5 sm:space-y-6">
        {slide.takeaways.map((t, i) => (
          <li key={i} className="flex items-start gap-4 sm:gap-5">
            <span className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm sm:text-base font-bold text-white">
              {i + 1}
            </span>
            <span className="text-lg sm:text-xl md:text-2xl text-stone-100 leading-snug flex-1 pt-1 sm:pt-1.5">
              {t}
            </span>
          </li>
        ))}
      </ul>
    </SlideFrame>
  );
}

// ============================================================
// Slide type: TITLE — always slide 0
// ============================================================
function TitleSlide({
  title,
  subtitle,
  slideCount,
}: {
  title: string;
  subtitle: string;
  slideCount: number;
}) {
  return (
    <SlideFrame accent="from-blue-500 to-purple-500">
      <div className="text-center">
        <div className="inline-block mb-6 px-3 py-1 rounded-full border border-stone-700 text-xs uppercase tracking-[0.2em] text-stone-400">
          {slideCount} slides
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black leading-tight mb-6">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg sm:text-xl md:text-2xl text-stone-400 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
      </div>
    </SlideFrame>
  );
}

// ============================================================
// Renders a slide based on its type
// ============================================================
function SlideRenderer({
  slide,
  title,
  subtitle,
  slideCount,
  index,
}: {
  slide: Slide | null;
  title: string;
  subtitle: string;
  slideCount: number;
  index: number;
}) {
  // index 0 = title slide
  if (index === 0) {
    return <TitleSlide title={title} subtitle={subtitle} slideCount={slideCount} />;
  }

  if (!slide) return null;

  switch (slide.type) {
    case 'section':
      return <SectionSlide slide={slide} />;
    case 'statement':
      return <StatementSlide slide={slide} />;
    case 'takeaway':
      return <TakeawaySlide slide={slide} />;
    case 'bullets':
    default:
      return <BulletsSlide slide={slide} />;
  }
}

// ============================================================
// Main panel
// ============================================================
export default function SlideshowPanel({ sources, notebookId, hasSources }: Props) {
  const [deck, setDeck] = useState<Slideshow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState<CountOption>('standard');
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const [presenting, setPresenting] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(false);

  const totalSlides = deck ? deck.slides.length + 1 : 0;

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
    setCurrentSlide((i) => Math.min(i + 1, totalSlides - 1));
  }, [deck, totalSlides]);

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

  // ---- Loading state ----
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

  // ---- Present mode ----
  if (presenting && deck) {
    const slide = currentSlide === 0 ? null : deck.slides[currentSlide - 1];
    return (
      <div className="fixed inset-0 bg-stone-950 z-[100] flex flex-col">
        <div className="flex-1 min-h-0 relative">
          <SlideRenderer
            slide={slide}
            title={deck.title}
            subtitle={deck.subtitle}
            slideCount={deck.slides.length}
            index={currentSlide}
          />
        </div>

        {/* Top bar */}
        <div className="absolute top-4 left-4 text-stone-500 text-xs font-mono z-20 pointer-events-none">
          {currentSlide + 1} / {totalSlides}
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
          <button
            onClick={() => setShowNotes((s) => !s)}
            className="text-xs text-stone-400 hover:text-white px-3 py-1.5 border border-stone-700 rounded backdrop-blur-sm bg-stone-900/60 transition"
            title="Toggle notes (N)"
          >
            {showNotes ? '🙈 Hide notes' : '📝 Show notes'}
          </button>
          <button
            onClick={exit}
            className="text-xs text-stone-400 hover:text-white px-3 py-1.5 border border-stone-700 rounded backdrop-blur-sm bg-stone-900/60 transition"
            title="Exit (Esc)"
          >
            ✕ Exit
          </button>
        </div>

        {/* Speaker notes panel */}
        {showNotes && slide && (
          <div className="border-t border-stone-800 bg-stone-900/95 backdrop-blur-sm p-6 max-h-48 overflow-y-auto z-20">
            <p className="text-xs uppercase tracking-wide text-stone-500 mb-2">
              Speaker notes
            </p>
            <p className="text-stone-300 text-sm leading-relaxed">{slide.notes}</p>
          </div>
        )}

        {/* Bottom hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-stone-600 z-20 pointer-events-none">
          ← → to navigate · N for notes · F for fullscreen · Esc to exit
        </div>

        {/* Click zones */}
        <button
          onClick={prev}
          disabled={currentSlide === 0}
          className="absolute left-0 top-0 bottom-0 w-1/4 opacity-0 cursor-w-resize z-10"
          aria-label="Previous slide"
        />
        <button
          onClick={next}
          disabled={currentSlide === totalSlides - 1}
          className="absolute right-0 top-0 bottom-0 w-1/4 opacity-0 cursor-e-resize z-10"
          aria-label="Next slide"
        />
      </div>
    );
  }

  // ---- Empty state ----
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

  // ---- Deck preview view (not presenting) ----
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

      <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-stone-100">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Title slide preview */}
          <div className="aspect-video rounded-lg overflow-hidden border border-stone-300 shadow-sm">
            <TitleSlide
              title={deck.title}
              subtitle={deck.subtitle}
              slideCount={deck.slides.length}
            />
          </div>

          {/* Content slides */}
          {deck.slides.map((slide, i) => (
            <div
              key={i}
              className="aspect-video rounded-lg overflow-hidden border border-stone-300 shadow-sm"
            >
              <SlideRenderer
                slide={slide}
                title={deck.title}
                subtitle={deck.subtitle}
                slideCount={deck.slides.length}
                index={i + 1}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}