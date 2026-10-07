'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import ConfirmModal from './ConfirmModal';
import EmptyState from './EmptyState';
import PanelSkeleton from './PanelSkeleton';
import { THEMES, DEFAULT_THEME, getTheme, type ThemeId } from '@/lib/slideshow/themes';
import {
  BulletsLayout,
  SectionLayout,
  StatementLayout,
  TakeawayLayout,
  sanitizeLayout,
  type SlideData,
} from '@/lib/slideshow/layouts';

type SlideType = 'section' | 'bullets' | 'statement' | 'takeaway';

interface Slide extends SlideData {}

interface Slideshow {
  id: string;
  title: string;
  subtitle: string;
  theme: string;
  slides: Slide[];
}

interface Props {
  sources: string;
  notebookId: string;
  hasSources: boolean;
}

type CountOption = 'brief' | 'standard' | 'detailed' | 'full';

/* ─────────────────────────────────────────────────────────────
   THEME-AWARE FRAME
   Every slide renders inside one of these. Theme controls:
     - background
     - text color
     - accent bar
     - optional background decoration
   ───────────────────────────────────────────────────────────── */

interface FrameProps {
  themeId: ThemeId;
  accent?: 'default' | 'emerald' | 'rose' | 'orange';
  children: React.ReactNode;
}

function SlideFrame({ themeId, accent = 'default', children }: FrameProps) {
  // ── Editorial — cream paper, warm accent, thin rules ─────
  if (themeId === 'editorial') {
    const accentColor =
      accent === 'emerald' ? '#059669'
      : accent === 'rose' ? '#be123c'
      : accent === 'orange' ? '#ea580c'
      : '#b45309';

    return (
      <div className="relative w-full h-full bg-[#fbf8f1] text-stone-900 overflow-hidden">
        {/* subtle paper texture via dot grid */}
        <div
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(120, 113, 108, 0.12) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* top rule */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: accentColor }}
        />
        <div className="relative z-10 w-full h-full flex items-center justify-center px-10 sm:px-16 md:px-24 py-14">
          <div className="w-full max-w-5xl">{children}</div>
        </div>
      </div>
    );
  }

  // ── Bold — near-black, amber glow, high contrast ─────────
  if (themeId === 'bold') {
    return (
      <div className="relative w-full h-full bg-stone-950 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-1/2 h-1/2 rounded-full bg-accent-600 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-1/2 h-1/2 rounded-full bg-orange-600 blur-[120px]" />
        </div>
        <div className="relative z-10 w-full h-full flex items-center justify-center px-10 sm:px-16 md:px-24 py-14">
          <div className="w-full max-w-5xl">{children}</div>
        </div>
      </div>
    );
  }

  // ── Notion — soft white, subtle borders, doc-like ────────
  // (this is the default fallback)
  return (
    <div className="relative w-full h-full bg-white text-stone-800 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-stone-200" />
      <div className="relative z-10 w-full h-full flex items-center justify-center px-10 sm:px-16 md:px-24 py-14">
        <div className="w-full max-w-5xl">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   THEME-AWARE SLIDE COMPONENTS
   Each slide type has one layout per theme.
   Session 2 will add more layouts per type.
   ───────────────────────────────────────────────────────────── */

function SectionSlide({ slide, themeId }: { slide: Slide; themeId: ThemeId }) {
  const label = slide.sectionLabel || slide.heading;
  const num = slide.sectionNumber || '01';

  if (themeId === 'editorial') {
    return (
      <SlideFrame themeId="editorial" accent="emerald">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-12">
          <div
            className="font-display text-7xl sm:text-9xl font-black leading-none"
            style={{ color: '#059669', letterSpacing: '-0.04em' }}
          >
            {num}
          </div>
          <div className="flex-1">
            <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-emerald-700 font-semibold mb-3">
              Section
            </p>
            <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold leading-tight text-stone-900">
              {label}
            </h2>
          </div>
        </div>
      </SlideFrame>
    );
  }

  if (themeId === 'bold') {
    return (
      <SlideFrame themeId="bold" accent="emerald">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-12">
          <div className="font-display text-7xl sm:text-9xl font-black leading-none bg-gradient-to-br from-emerald-300 to-cyan-500 bg-clip-text text-transparent">
            {num}
          </div>
          <div className="flex-1">
            <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-emerald-400 font-semibold mb-3">
              Section
            </p>
            <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold leading-tight">
              {label}
            </h2>
          </div>
        </div>
      </SlideFrame>
    );
  }

  // Notion
  return (
    <SlideFrame themeId="notion" accent="emerald">
      <div className="flex flex-col items-start gap-6">
        <span className="inline-block px-3 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
          Section {num}
        </span>
        <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold leading-tight text-stone-900">
          {label}
        </h2>
      </div>
    </SlideFrame>
  );
}

function BulletsSlide({ slide, themeId }: { slide: Slide; themeId: ThemeId }) {
  const mathBlock =
    slide.math && slide.math.trim() !== '' ? (
      <div
        className={`mt-8 sm:mt-10 text-2xl sm:text-3xl text-center max-w-none ${
          themeId === 'bold' ? 'text-stone-100 prose prose-invert prose-2xl' : 'prose prose-stone prose-2xl'
        }`}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw, rehypeKatex]}
        >
          {slide.math.replace(/\u202F/g, ' ')}
        </ReactMarkdown>
      </div>
    ) : null;

  if (themeId === 'editorial') {
    return (
      <SlideFrame themeId="editorial" accent="orange">
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-8 sm:mb-10 leading-tight text-stone-900">
          {slide.heading}
        </h2>
        <ul className="space-y-4 sm:space-y-5">
          {slide.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-4 text-lg sm:text-xl md:text-2xl text-stone-800 leading-snug">
              <span className="mt-2 sm:mt-3 flex-shrink-0 w-6 h-0.5 bg-amber-600 rounded-full" />
              <span className="flex-1">{b}</span>
            </li>
          ))}
        </ul>
        {mathBlock}
      </SlideFrame>
    );
  }

  if (themeId === 'bold') {
    return (
      <SlideFrame themeId="bold" accent="orange">
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-8 sm:mb-10 leading-tight">
          {slide.heading}
        </h2>
        <ul className="space-y-4 sm:space-y-5">
          {slide.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-4 text-lg sm:text-xl md:text-2xl text-stone-200 leading-snug">
              <span className="mt-2 sm:mt-3 flex-shrink-0 w-6 h-0.5 bg-gradient-to-r from-accent-400 to-orange-400 rounded-full" />
              <span className="flex-1">{b}</span>
            </li>
          ))}
        </ul>
        {mathBlock}
      </SlideFrame>
    );
  }

  // Notion
  return (
    <SlideFrame themeId="notion">
      <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 leading-tight text-stone-900">
        {slide.heading}
      </h2>
      <ul className="space-y-3 sm:space-y-4">
        {slide.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-3 text-lg sm:text-xl text-stone-700 leading-relaxed">
            <span className="mt-2.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-stone-400" />
            <span className="flex-1">{b}</span>
          </li>
        ))}
      </ul>
      {mathBlock}
    </SlideFrame>
  );
}

function StatementSlide({ slide, themeId }: { slide: Slide; themeId: ThemeId }) {
  if (themeId === 'editorial') {
    return (
      <SlideFrame themeId="editorial" accent="rose">
        <div className="text-center max-w-4xl mx-auto">
          <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-rose-700 font-semibold mb-6">
            {slide.heading}
          </p>
          <p className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-stone-900">
            {slide.statement}
          </p>
        </div>
      </SlideFrame>
    );
  }

  if (themeId === 'bold') {
    return (
      <SlideFrame themeId="bold" accent="rose">
        <div className="text-center">
          <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-accent-400 font-semibold mb-6">
            {slide.heading}
          </p>
          <p className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight max-w-4xl mx-auto">
            {slide.statement}
          </p>
        </div>
      </SlideFrame>
    );
  }

  // Notion
  return (
    <SlideFrame themeId="notion">
      <div className="max-w-4xl">
        <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-4">
          {slide.heading}
        </p>
        <p className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-stone-900">
          {slide.statement}
        </p>
      </div>
    </SlideFrame>
  );
}

function TakeawaySlide({ slide, themeId }: { slide: Slide; themeId: ThemeId }) {
  if (themeId === 'editorial') {
    return (
      <SlideFrame themeId="editorial" accent="orange">
        <div className="mb-8 sm:mb-10">
          <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-amber-700 font-semibold mb-3">
            Key Takeaways
          </p>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-stone-800">
            {slide.heading}
          </h2>
        </div>
        <ul className="space-y-5 sm:space-y-6">
          {slide.takeaways.map((t, i) => (
            <li key={i} className="flex items-start gap-4 sm:gap-5">
              <span className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-600 flex items-center justify-center text-sm sm:text-base font-bold text-white">
                {i + 1}
              </span>
              <span className="text-lg sm:text-xl md:text-2xl text-stone-800 leading-snug flex-1 pt-1 sm:pt-1.5">
                {t}
              </span>
            </li>
          ))}
        </ul>
      </SlideFrame>
    );
  }

  if (themeId === 'bold') {
    return (
      <SlideFrame themeId="bold" accent="orange">
        <div className="mb-8 sm:mb-10">
          <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-accent-400 font-semibold mb-3">
            Key Takeaways
          </p>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-stone-300">
            {slide.heading}
          </h2>
        </div>
        <ul className="space-y-5 sm:space-y-6">
          {slide.takeaways.map((t, i) => (
            <li key={i} className="flex items-start gap-4 sm:gap-5">
              <span className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-accent-500 to-orange-500 flex items-center justify-center text-sm sm:text-base font-bold text-white">
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

  // Notion
  return (
    <SlideFrame themeId="notion">
      <div className="mb-6 sm:mb-8">
        <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-3">
          Key Takeaways
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
          {slide.heading}
        </h2>
      </div>
      <ul className="space-y-4">
        {slide.takeaways.map((t, i) => (
          <li
            key={i}
            className="flex items-start gap-4 p-3 rounded-lg bg-stone-50 border border-stone-200"
          >
            <span className="flex-shrink-0 w-6 h-6 rounded-md bg-stone-800 flex items-center justify-center text-xs font-bold text-white">
              {i + 1}
            </span>
            <span className="text-base sm:text-lg text-stone-700 leading-snug flex-1">
              {t}
            </span>
          </li>
        ))}
      </ul>
    </SlideFrame>
  );
}

function TitleSlide({
  title,
  subtitle,
  slideCount,
  themeId,
}: {
  title: string;
  subtitle: string;
  slideCount: number;
  themeId: ThemeId;
}) {
  if (themeId === 'editorial') {
    return (
      <SlideFrame themeId="editorial" accent="orange">
        <div className="text-center max-w-4xl mx-auto">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-700 font-semibold mb-6">
            A PadhAI Presentation
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-black leading-tight text-stone-900 mb-6">
            {title}
          </h1>
          <div className="w-24 h-1 bg-amber-600 rounded-full mx-auto mb-6" />
          {subtitle && (
            <p className="text-lg sm:text-xl md:text-2xl text-stone-600 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
          <p className="text-xs text-stone-500 mt-8">{slideCount} slides</p>
        </div>
      </SlideFrame>
    );
  }

  if (themeId === 'bold') {
    return (
      <SlideFrame themeId="bold" accent="orange">
        <div className="text-center">
          <div className="inline-block mb-6 px-3 py-1 rounded-full border border-stone-700 text-xs uppercase tracking-[0.2em] text-stone-400">
            {slideCount} slides
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-black leading-tight mb-6">
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

  // Notion
  return (
    <SlideFrame themeId="notion">
      <div className="max-w-4xl">
        <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-4">
          {slideCount} slides
        </p>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black leading-tight text-stone-900 mb-4">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg sm:text-xl md:text-2xl text-stone-600">
            {subtitle}
          </p>
        )}
      </div>
    </SlideFrame>
  );
}

function SlideRenderer({
  slide,
  title,
  subtitle,
  slideCount,
  index,
  themeId,
}: {
  slide: Slide | null;
  title: string;
  subtitle: string;
  slideCount: number;
  index: number;
  themeId: ThemeId;
}) {
  if (index === 0) {
    return (
      <TitleSlide
        title={title}
        subtitle={subtitle}
        slideCount={slideCount}
        themeId={themeId}
      />
    );
  }

  if (!slide) return null;

  const safe = sanitizeLayout(slide);

  switch (safe.type) {
    case 'section':
      return <SectionLayout slide={safe} themeId={themeId} />;
    case 'statement':
      return <StatementLayout slide={safe} themeId={themeId} />;
    case 'takeaway':
      return <TakeawayLayout slide={safe} themeId={themeId} />;
    case 'bullets':
    default:
      return <BulletsLayout slide={safe} themeId={themeId} />;
  }
}

/* ─────────────────────────────────────────────────────────────
   MAIN PANEL
   ───────────────────────────────────────────────────────────── */

export default function SlideshowPanel({ sources, notebookId, hasSources }: Props) {
  const [deck, setDeck] = useState<Slideshow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState<CountOption>('standard');
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const [presenting, setPresenting] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(false);

  const totalSlides = deck ? deck.slides.length + 1 : 0;
  const activeThemeId: ThemeId = deck
    ? (getTheme(deck.theme).id as ThemeId)
    : theme;

  useEffect(() => {
    if (!notebookId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/slideshow?notebookId=${notebookId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.slideshow) {
          setDeck(data.slideshow);
          setTheme(getTheme(data.slideshow.theme).id as ThemeId);
        }
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
        body: JSON.stringify({ sources, notebookId, count, theme }),
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

  const onConfirmClear = async () => {
    setConfirmClear(false);
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

  if (loading || !initialLoadDone) {
    return (
      <PanelSkeleton
        variant="card"
        rows={3}
        status={loading ? 'Building presentation...' : 'Loading your deck...'}
      />
    );
  }

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
            themeId={activeThemeId}
          />
        </div>

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

        {showNotes && slide && (
          <div className="border-t border-stone-800 bg-stone-900/95 backdrop-blur-sm p-6 max-h-48 overflow-y-auto z-20">
            <p className="text-xs uppercase tracking-wide text-stone-500 mb-2">
              Speaker notes
            </p>
            <p className="text-stone-300 text-sm leading-relaxed">{slide.notes}</p>
          </div>
        )}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-stone-600 z-20 pointer-events-none">
          ← → to navigate · N for notes · F for fullscreen · Esc to exit
        </div>

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

  if (!deck) {
    if (!hasSources) {
      return (
        <EmptyState
          emoji="📊"
          title="Turn sources into slides"
          description="Generate a presentation-ready deck from any document — five designed slide types, ready to present."
          hint="Add a source first — then come back to build your slides."
        />
      );
    }
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
          <EmptyState
            emoji="📊"
            title="No slideshow yet"
            description="Build a presentation deck from your sources. Pick a theme and length below."
            actionLabel="Generate Slideshow"
            onAction={generate}
            footer={
              <div className="w-full space-y-5 text-left">
                {/* Theme picker */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-2.5">
                    Theme
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {THEMES.map((t) => {
                      const active = theme === t.id;
                      return (
                        <motion.button
                          key={t.id}
                          type="button"
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setTheme(t.id)}
                          className={`text-left p-3 rounded-xl border-2 transition-all ${
                            active
                              ? 'border-accent-500 bg-accent-50 shadow-sm'
                              : 'border-stone-200 bg-white hover:border-accent-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-base">{t.emoji}</span>
                            <span
                              className={`text-sm font-semibold ${
                                active ? 'text-accent-700' : 'text-stone-800'
                              }`}
                            >
                              {t.label}
                            </span>
                            {active && (
                              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-500" />
                            )}
                          </div>
                          <p className="text-[11px] text-stone-500 leading-snug">
                            {t.preview}
                          </p>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Deck length */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-2">
                    Deck length
                  </label>
                  <select
                    value={count}
                    onChange={(e) => setCount(e.target.value as CountOption)}
                    className="w-full p-2.5 border border-stone-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400"
                  >
                    <option value="brief">Brief (6 slides)</option>
                    <option value="standard">Standard (10 slides)</option>
                    <option value="detailed">Detailed (15 slides)</option>
                    <option value="full">Full (20 slides)</option>
                  </select>
                </div>

                {error && (
                  <p className="text-red-600 text-sm text-left">{error}</p>
                )}
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col">
        <header className="px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-display text-lg sm:text-xl font-bold text-stone-900">
                📊 Slideshow
              </h1>
              <p className="text-xs text-stone-500">
                {deck.title} · {deck.slides.length} slides ·{' '}
                <span className="text-accent-700 font-medium">
                  {getTheme(deck.theme).label}
                </span>{' '}
                theme
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={generate}
                disabled={loading}
                className="text-xs px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-100 transition disabled:opacity-40"
              >
                ↻ Regenerate
              </button>
              <button
                onClick={() => setConfirmClear(true)}
                className="text-xs px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-100 hover:border-red-300 hover:text-red-600 transition"
              >
                🗑️ Clear
              </button>
              <button
                onClick={startPresenting}
                className="text-xs px-4 py-1.5 bg-accent-500 text-white rounded-lg hover:bg-accent-600 font-medium transition shadow-sm"
              >
                ▶ Present
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-stone-100">
          <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
            <div className="aspect-video rounded-lg overflow-hidden border border-stone-300 shadow-sm">
              <TitleSlide
                title={deck.title}
                subtitle={deck.subtitle}
                slideCount={deck.slides.length}
                themeId={activeThemeId}
              />
            </div>

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
                  themeId={activeThemeId}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmClear}
        title="Delete this slideshow?"
        description="The generated deck will be permanently deleted. You can regenerate it anytime from your sources."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={onConfirmClear}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  );
}