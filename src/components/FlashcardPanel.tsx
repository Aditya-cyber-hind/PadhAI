'use client';

import { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { downloadBlob, safeFilename } from '@/lib/export/download';
import { flashcardsToMarkdown } from '@/lib/export/markdown';
import { flashcardsToAnkiCSV } from '@/lib/export/csv';
import { flashcardsToPdf } from '@/lib/export/pdf';
import ConfirmModal from './ConfirmModal';
import EmptyState from './EmptyState';
import PanelSkeleton from './PanelSkeleton';

interface Card {
  id: string;
  term: string;
  definition: string;
  category: string;
  difficulty: number;
  known: boolean;
  next_review_at: string;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
}

interface Stats {
  total: number;
  due: number;
  new: number;
  scheduled: number;
}

interface Props {
  sources: string;
  notebookId: string;
  hasSources: boolean;
}

type CountOption = 'less' | 'standard' | 'more' | 'alot';
type Rating = 'again' | 'hard' | 'good' | 'easy';

const CATEGORY_COLORS: Record<string, string> = {
  concept: '#3b82f6',
  formula: '#8b5cf6',
  term: '#64748b',
  person: '#f59e0b',
  event: '#ef4444',
};

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Easy',
  2: 'Light',
  3: 'Medium',
  4: 'Hard',
  5: 'Expert',
};

const RATING_STYLES: Record<
  Rating,
  { label: string; sub: string; bg: string; hover: string; text: string }
> = {
  again: {
    label: 'Again',
    sub: 'forgot',
    bg: 'bg-red-50 border-red-200',
    hover: 'hover:bg-red-100',
    text: 'text-red-700',
  },
  hard: {
    label: 'Hard',
    sub: 'struggled',
    bg: 'bg-amber-50 border-amber-200',
    hover: 'hover:bg-amber-100',
    text: 'text-amber-700',
  },
  good: {
    label: 'Good',
    sub: 'got it',
    bg: 'bg-green-50 border-green-200',
    hover: 'hover:bg-green-100',
    text: 'text-green-700',
  },
  easy: {
    label: 'Easy',
    sub: 'trivial',
    bg: 'bg-accent-50 border-accent-200',
    hover: 'hover:bg-accent-100',
    text: 'text-accent-700',
  },
};

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return 'now';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = then - now;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'now';
  if (diffDays === 1) return 'in 1 day';
  if (diffDays < 30) return `in ${diffDays} days`;
  const months = Math.round(diffDays / 30);
  return `in ${months} month${months === 1 ? '' : 's'}`;
}

export default function FlashcardPanel({ sources, notebookId, hasSources }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [dueCards, setDueCards] = useState<Card[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, due: 0, new: 0, scheduled: 0 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState<CountOption>('standard');
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [reviewingAnyway, setReviewingAnyway] = useState(false);
  const [sessionRatings, setSessionRatings] = useState<Record<Rating, number>>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  // ── Load ───────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!notebookId) return;
    try {
      const res = await fetch(`/api/flashcards?notebookId=${notebookId}&mode=due`);
      if (!res.ok) return;
      const data = await res.json();
      setDueCards(Array.isArray(data.cards) ? data.cards : []);
      if (data.stats) setStats(data.stats);

      const allRes = await fetch(`/api/flashcards?notebookId=${notebookId}`);
      if (allRes.ok) {
        const allData = await allRes.json();
        if (Array.isArray(allData.cards)) setCards(allData.cards);
      }

      setCurrentIndex(0);
      setRevealed(false);
      setShowResults(false);
      setReviewingAnyway(false);
      setSessionRatings({ again: 0, hard: 0, good: 0, easy: 0 });
    } catch (err) {
      console.error('[flashcards] load failed:', err);
    } finally {
      setInitialLoadDone(true);
    }
  }, [notebookId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Export helpers (unchanged) ─────────────────────────
  const handleExport = async (format: 'md' | 'csv' | 'pdf') => {
    if (cards.length === 0) return;
    const title = 'PadhAI Flashcards';
    const base = safeFilename(title);
    const meta = { title, generatedAt: new Date() };

    if (format === 'md') {
      downloadBlob(
        new Blob([flashcardsToMarkdown(cards as any, meta)], { type: 'text/markdown' }),
        `${base}.md`
      );
      return;
    }
    if (format === 'csv') {
      downloadBlob(
        new Blob([flashcardsToAnkiCSV(cards as any)], { type: 'text/csv' }),
        `${base}.csv`
      );
      return;
    }

    const { extractMath, renderLatexToPng } = await import('@/lib/export/latex');
    const mathMap: Record<string, { dataUrl: string; width: number; height: number }> = {};
    let counter = 0;

    const buildField = (text: string) => {
      const { text: plain, segments } = extractMath(text);
      const placeholders: { key: string; latex: string; displayMode: boolean }[] = [];
      let out = plain;
      for (let i = 0; i < segments.length; i++) {
        const key = `MATH_${counter}`;
        out = out.replace(`{{MATH_${i}}}`, `{{${key}}}`);
        placeholders.push({
          key,
          latex: segments[i].latex,
          displayMode: segments[i].displayMode,
        });
        counter++;
      }
      return { text: out, placeholders };
    };

    const transformed = cards.map((c) => ({
      id: c.id,
      term: buildField(c.term),
      definition: buildField(c.definition),
      category: c.category,
      difficulty: c.difficulty,
      known: c.known,
    }));

    for (const c of transformed) {
      for (const field of [c.term, c.definition]) {
        for (const p of field.placeholders) {
          if (mathMap[p.key]) continue;
          mathMap[p.key] = await renderLatexToPng(p.latex, p.displayMode);
        }
      }
    }

    const pdf = await flashcardsToPdf(
      transformed.map((c) => ({
        id: c.id,
        term: c.term.text,
        definition: c.definition.text,
        category: c.category,
        difficulty: c.difficulty,
        known: c.known,
      })),
      meta,
      mathMap
    );
    downloadBlob(pdf, `${base}.pdf`);
  };

  // ── Generate ───────────────────────────────────────────
  const generateCards = async () => {
    if (!hasSources) {
      setError('Please upload a PDF or paste some text first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources, notebookId, count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Rate a card (SM-2) ─────────────────────────────────
  const rateCard = async (rating: Rating) => {
    const activeDeck = reviewingAnyway ? cards : dueCards;
    const card = activeDeck[currentIndex];
    if (!card) return;

    // Optimistic: bump session counter, advance immediately
    setSessionRatings((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));
    setRevealed(false);

    const isLast = currentIndex >= activeDeck.length - 1;
    if (!isLast) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResults(true);
    }

    // Fire-and-forget the schedule update
    try {
      await fetch('/api/flashcards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: card.id,
          rating,
          current: {
            ease_factor: card.ease_factor ?? 2.5,
            interval_days: card.interval_days ?? 0,
            repetitions: card.repetitions ?? 0,
          },
        }),
      });
    } catch (err) {
      console.error('[flashcards] rate failed:', err);
    }
  };

  // ── Reset / clear ──────────────────────────────────────
  const restartSession = () => {
    setCurrentIndex(0);
    setRevealed(false);
    setShowResults(false);
    setReviewingAnyway(false);
    setSessionRatings({ again: 0, hard: 0, good: 0, easy: 0 });
  };

  const reviewAnyway = () => {
    setReviewingAnyway(true);
    setCurrentIndex(0);
    setRevealed(false);
    setShowResults(false);
    setSessionRatings({ again: 0, hard: 0, good: 0, easy: 0 });
  };

  const onConfirmClear = async () => {
    setConfirmClear(false);
    try {
      await fetch(`/api/flashcards?notebookId=${notebookId}`, { method: 'DELETE' });
      setCards([]);
      setDueCards([]);
      setStats({ total: 0, due: 0, new: 0, scheduled: 0 });
      setCurrentIndex(0);
      setRevealed(false);
      setShowResults(false);
    } catch (err) {
      console.error('[flashcards] clear failed:', err);
    }
  };

  // ── Loading ────────────────────────────────────────────
  if (loading || !initialLoadDone) {
    return (
      <PanelSkeleton
        variant="card"
        rows={3}
        status={loading ? 'Generating cards...' : 'Loading your deck...'}
      />
    );
  }

  // ── Empty (no cards at all) ────────────────────────────
  if (cards.length === 0) {
    if (!hasSources) {
      return (
        <EmptyState
          emoji="🃏"
          title="Master every term"
          description="Active recall — flip cards, rate your recall, and let spaced repetition schedule your reviews."
          hint="Add a source first — then come back to generate flashcards."
        />
      );
    }
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
          <EmptyState
            emoji="✨"
            title="No cards yet"
            description="Generate a deck of flashcards from your sources. PadhAI schedules them with spaced repetition so you review at the right time."
            actionLabel="Generate Flashcards"
            onAction={generateCards}
            footer={
              <div className="w-full max-w-sm">
                <label className="block text-xs font-semibold text-stone-600 mb-2 text-left">
                  Number of cards
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(e.target.value as CountOption)}
                  className="w-full p-2.5 border border-stone-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400"
                >
                  <option value="less">Less (8)</option>
                  <option value="standard">Standard (15)</option>
                  <option value="more">More (25)</option>
                  <option value="alot">A lot (40)</option>
                </select>
                {error && <p className="text-red-600 mt-3 text-sm text-left">{error}</p>}
              </div>
            }
          />
        </div>
      </div>
    );
  }

  // ── All caught up (nothing due, not reviewing anyway) ──
  if (dueCards.length === 0 && !reviewingAnyway && !showResults) {
    return (
      <>
        <div className="h-full overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-3xl mx-auto">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center text-3xl mb-5 shadow-sm">
                🎉
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
                All caught up!
              </h2>
              <p className="text-sm text-stone-500 max-w-md mb-6">
                {stats.total} card{stats.total === 1 ? '' : 's'} in your deck ·{' '}
                {stats.scheduled} scheduled for later
              </p>

              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={reviewAnyway}
                  className="px-5 py-2.5 rounded-lg border border-stone-300 bg-white text-stone-700 text-sm font-medium hover:bg-stone-50 transition"
                >
                  Review anyway (extra practice)
                </button>
                <button
                  onClick={generateCards}
                  className="px-5 py-2.5 rounded-lg bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 transition shadow-sm"
                >
                  Generate more cards
                </button>
              </div>

              <div className="flex flex-wrap gap-3 mt-6 justify-center">
                <button
                  onClick={() => handleExport('csv')}
                  className="text-xs px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-100 transition"
                >
                  ↓ Anki CSV
                </button>
                <button
                  onClick={() => handleExport('md')}
                  className="text-xs px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-100 transition"
                >
                  ↓ Markdown
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="text-xs px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-100 transition"
                >
                  ↓ PDF
                </button>
                <button
                  onClick={() => setConfirmClear(true)}
                  className="text-xs px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-100 hover:border-red-300 hover:text-red-600 transition"
                >
                  🗑️ Clear deck
                </button>
              </div>
            </div>
          </div>
        </div>

        <ConfirmModal
          open={confirmClear}
          title="Delete all flashcards?"
          description="This will permanently delete every flashcard in this notebook. This cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={onConfirmClear}
          onCancel={() => setConfirmClear(false)}
        />
      </>
    );
  }

  // ── Session complete ───────────────────────────────────
  if (showResults) {
    const totalRated =
      sessionRatings.again +
      sessionRatings.hard +
      sessionRatings.good +
      sessionRatings.easy;
    const easyPct =
      totalRated > 0
        ? Math.round(
            ((sessionRatings.good + sessionRatings.easy) / totalRated) * 100
          )
        : 0;

    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDash = (easyPct / 100) * circumference;

    return (
      <>
        <div className="h-full overflow-y-auto bg-stone-50">
          <div className="max-w-3xl mx-auto p-4 sm:p-6">
            <header className="text-center mb-6 sm:mb-8">
              <p className="text-xs uppercase tracking-wide text-stone-400 mb-2">
                Session complete
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
                {easyPct >= 80 ? '🏆' : easyPct >= 50 ? '👍' : '📚'} Nice work!
              </h1>
            </header>

            <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
                <div className="relative w-40 h-40 flex-shrink-0">
                  <svg width="160" height="160" className="transform -rotate-90">
                    <circle cx="80" cy="80" r={radius} stroke="#e7e5e4" strokeWidth="12" fill="none" />
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      stroke={easyPct >= 80 ? '#10b981' : easyPct >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${strokeDash} ${circumference}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-4xl font-bold text-stone-900">{easyPct}%</p>
                    <p className="text-xs text-stone-500 mt-1">recalled well</p>
                  </div>
                </div>

                <div className="text-center sm:text-left">
                  <p className="text-sm text-stone-500 mb-1">Rated {totalRated} cards</p>
                  <p className="text-2xl font-bold text-stone-900 mb-3">
                    {sessionRatings.good + sessionRatings.easy} solid
                  </p>
                  <p className="text-sm text-stone-500 mb-1">Need more work</p>
                  <p className="text-2xl font-bold text-red-500">
                    {sessionRatings.again + sessionRatings.hard}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
              <h2 className="text-sm font-semibold text-stone-700 mb-4">
                How you rated them
              </h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={[
                    { label: 'Again', count: sessionRatings.again, fill: '#ef4444' },
                    { label: 'Hard', count: sessionRatings.hard, fill: '#f59e0b' },
                    { label: 'Good', count: sessionRatings.good, fill: '#10b981' },
                    { label: 'Easy', count: sessionRatings.easy, fill: '#8b5cf6' },
                  ]}
                >
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#78716c' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#78716c' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #e7e5e4',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={restartSession}
                className="flex-1 px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 font-medium transition"
              >
                ↻ Restart session
              </button>
              <button
                onClick={() => setConfirmClear(true)}
                className="px-6 py-3 border border-stone-300 rounded-lg hover:bg-stone-100 hover:border-red-300 hover:text-red-600 font-medium transition"
              >
                🗑️ New deck
              </button>
            </div>
          </div>
        </div>

        <ConfirmModal
          open={confirmClear}
          title="Delete all flashcards?"
          description="This will permanently delete every flashcard in this notebook. This cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={onConfirmClear}
          onCancel={() => setConfirmClear(false)}
        />
      </>
    );
  }

  // ── Active session ─────────────────────────────────────
  const activeDeck = reviewingAnyway ? cards : dueCards;
  const current = activeDeck[currentIndex];
  if (!current) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <p className="text-sm text-stone-500">No cards to review.</p>
      </div>
    );
  }

  const categoryColor = CATEGORY_COLORS[current.category] ?? '#64748b';
  const isNew = (current.repetitions ?? 0) === 0;
  const isDueSoon = !isNew && !reviewingAnyway;

  return (
    <>
      <div className="h-full flex flex-col">
        <header className="px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-stone-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-2 sm:mb-3 flex-wrap gap-2">
            <div>
              <h1 className="font-display text-lg sm:text-xl font-bold text-stone-900">
                🃏 Flashcards
              </h1>
              <p className="text-xs text-stone-500">
                {reviewingAnyway ? (
                  <>Extra practice · Card {currentIndex + 1} of {activeDeck.length}</>
                ) : (
                  <>
                    {stats.due} due today · Card {currentIndex + 1} of {activeDeck.length}
                    {stats.new > 0 && ` · ${stats.new} new`}
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleExport('csv')}
                className="text-xs px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-100 transition"
                title="Export for Anki"
              >
                ↓ Anki CSV
              </button>
              <button
                onClick={() => handleExport('md')}
                className="text-xs px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-100 transition"
                title="Export as Markdown"
              >
                ↓ MD
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="text-xs px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-100 transition"
                title="Export as PDF"
              >
                ↓ PDF
              </button>
              <button
                onClick={() => setConfirmClear(true)}
                className="text-xs px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-100 hover:border-red-300 hover:text-red-600 transition"
              >
                🗑️ Clear
              </button>
            </div>
          </div>

          <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-500 transition-all duration-300"
              style={{
                width: `${Math.round((currentIndex / activeDeck.length) * 100)}%`,
              }}
            />
          </div>
        </header>

        <div className="flex-1 min-h-0 p-4 sm:p-6 flex items-center justify-center bg-stone-50">
          <div
            onClick={() => setRevealed((r) => !r)}
            className="w-full max-w-2xl min-h-[280px] sm:min-h-[320px] bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:border-accent-300 transition-all"
          >
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <div
                className="inline-flex items-center px-2.5 py-1 rounded-full text-white text-xs"
                style={{ backgroundColor: categoryColor }}
              >
                {current.category}
              </div>
              {isNew && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-accent-100 text-accent-700">
                  New
                </span>
              )}
              {isDueSoon && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-500">
                  was due {formatRelative(current.next_review_at)}
                </span>
              )}
            </div>

            <div className="text-center flex-1 flex flex-col justify-center">
              <p className="text-xs text-stone-400 mb-2 sm:mb-3 uppercase tracking-wide">
                {revealed ? 'Answer' : 'Prompt'}
              </p>

              {!revealed ? (
                <div className="prose prose-stone max-w-none text-xl sm:text-2xl font-semibold text-stone-900">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                  >
                    {current.term.replace(/\u202F/g, ' ')}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="prose prose-stone max-w-none text-base sm:text-lg text-stone-700">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                  >
                    {current.definition.replace(/\u202F/g, ' ')}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {!revealed && (
              <p className="text-xs text-stone-400 mt-4 sm:mt-6">Tap to reveal</p>
            )}
          </div>
        </div>

        <footer className="border-t border-stone-200 bg-white p-3 sm:p-4 flex-shrink-0">
          <div className="max-w-2xl mx-auto">
            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="w-full px-4 py-2.5 sm:py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 font-medium transition"
              >
                Reveal Answer
              </button>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(RATING_STYLES) as Rating[]).map((r) => {
                  const style = RATING_STYLES[r];
                  return (
                    <button
                      key={r}
                      onClick={() => rateCard(r)}
                      className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2.5 rounded-lg border-2 font-medium transition ${style.bg} ${style.hover} ${style.text}`}
                    >
                      <span className="text-sm font-semibold">{style.label}</span>
                      <span className="text-[10px] opacity-70">{style.sub}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </footer>
      </div>

      <ConfirmModal
        open={confirmClear}
        title="Delete all flashcards?"
        description="This will permanently delete every flashcard in this notebook. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={onConfirmClear}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  );
}