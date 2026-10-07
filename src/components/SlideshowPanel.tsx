'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
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
   ───────────────────────────────────────────────────────────── */

interface FrameProps {
  themeId: ThemeId;
  accent?: 'default' | 'emerald' | 'rose' | 'orange';
  children: React.ReactNode;
}

function SlideFrame({ themeId, accent = 'default', children }: FrameProps) {
  if (themeId === 'editorial') {
    const accentColor =
      accent === 'emerald' ? '#059669'
      : accent === 'rose' ? '#be123c'
      : accent === 'orange' ? '#ea580c'
      : '#b45309';

    return (
      <div className="relative w-full h-full bg-[#fbf8f1] text-stone-900 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(120, 113, 108, 0.12) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
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

  // Notion
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
   TITLE SLIDE — theme-aware
   ───────────────────────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────────────────────
   SLIDE RENDERER
   ───────────────────────────────────────────────────────────── */

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

  /* ───────────────────────────────────────────────────────────
     PRESENT MODE — theme-aware background
     ─────────────────────────────────────────────────────────── */
  if (presenting && deck) {
    const slide = currentSlide === 0 ? null : deck.slides[currentSlide - 1];

    const presentBg =
      activeThemeId === 'editorial'
        ? 'bg-[#fbf8f1]'
        : activeThemeId === 'notion'
        ? 'bg-white'
        : 'bg-stone-950';

    const isDarkPresent = activeThemeId === 'bold';

    return (
      <div className={`fixed inset-0 ${presentBg} z-[100] flex flex-col`}>
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

        <div
          className={`absolute top-4 left-4 text-xs font-mono z-20 pointer-events-none ${
            isDarkPresent ? 'text-stone-500' : 'text-stone-600'
          }`}
        >
          {currentSlide + 1} / {totalSlides}
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
          <button
            onClick={() => setShowNotes((s) => !s)}
            className={
              isDarkPresent
                ? 'text-xs text-stone-400 hover:text-white px-3 py-1.5 border border-stone-700 rounded backdrop-blur-sm bg-stone-900/60 transition'
                : 'text-xs text-stone-700 hover:text-stone-900 px-3 py-1.5 border border-stone-300 rounded backdrop-blur-sm bg-white/80 transition'
            }
            title="Toggle notes (N)"
          >
            {showNotes ? '🙈 Hide notes' : '📝 Show notes'}
          </button>
          <button
            onClick={exit}
            className={
              isDarkPresent
                ? 'text-xs text-stone-400 hover:text-white px-3 py-1.5 border border-stone-700 rounded backdrop-blur-sm bg-stone-900/60 transition'
                : 'text-xs text-stone-700 hover:text-stone-900 px-3 py-1.5 border border-stone-300 rounded backdrop-blur-sm bg-white/80 transition'
            }
            title="Exit (Esc)"
          >
            ✕ Exit
          </button>
        </div>

        {showNotes && slide && (
          <div
            className={`border-t backdrop-blur-sm p-6 max-h-48 overflow-y-auto z-20 ${
              isDarkPresent
                ? 'border-stone-800 bg-stone-900/95'
                : 'border-stone-200 bg-white/95'
            }`}
          >
            <p className="text-xs uppercase tracking-wide mb-2 text-stone-500">
              Speaker notes
            </p>
            <p
              className={`text-sm leading-relaxed ${
                isDarkPresent ? 'text-stone-300' : 'text-stone-700'
              }`}
            >
              {slide.notes}
            </p>
          </div>
        )}

        <div
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 text-xs z-20 pointer-events-none ${
            isDarkPresent ? 'text-stone-600' : 'text-stone-500'
          }`}
        >
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

  /* ───────────────────────────────────────────────────────────
     NO DECK YET — SETUP VIEW
     ─────────────────────────────────────────────────────────── */
  if (!deck) {
    if (!hasSources) {
      return (
        <EmptyState
          emoji="📊"
          title="Turn sources into slides"
          description="Generate a presentation-ready deck from any document — twelve layouts across three themes, ready to present."
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

  /* ───────────────────────────────────────────────────────────
     DECK VIEW — thumbnails + controls
     ─────────────────────────────────────────────────────────── */
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