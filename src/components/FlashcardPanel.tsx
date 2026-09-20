'use client';

import { useEffect, useState, useMemo } from 'react';
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
  Cell,
} from 'recharts';

interface Card {
  id: string;
  term: string;
  definition: string;
  category: string;
  difficulty: number;
  known: boolean;
}

interface Props {
  sources: string;
  notebookId: string;
  hasSources: boolean;
}

type CountOption = 'less' | 'standard' | 'more' | 'alot';

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

const DIFFICULTY_COLORS = ['#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444'];

export default function FlashcardPanel({ sources, notebookId, hasSources }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState<CountOption>('standard');
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Load existing cards on mount
  useEffect(() => {
    if (!notebookId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/flashcards?notebookId=${notebookId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.cards)) {
          setCards(data.cards);
          setCurrentIndex(0);
          setRevealed(false);
          setShowResults(false);
        }
      } catch (err) {
        console.error('[flashcards] load failed:', err);
      } finally {
        if (!cancelled) setInitialLoadDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notebookId]);

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

      setCards(data.cards);
      setCurrentIndex(0);
      setRevealed(false);
      setShowResults(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const markCard = async (known: boolean) => {
    const card = cards[currentIndex];
    if (!card) return;

    // Update local state
    const updatedCards = cards.map((c) => (c.id === card.id ? { ...c, known } : c));
    setCards(updatedCards);

    try {
      await fetch('/api/flashcards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, known }),
      });
    } catch (err) {
      console.error('[flashcards] mark failed:', err);
      setCards(cards); // revert
      return;
    }

    // Advance or show results
    setRevealed(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Last card marked — show results screen
      setShowResults(true);
    }
  };

  const resetDeck = () => {
    setCurrentIndex(0);
    setRevealed(false);
    setShowResults(false);
  };

  const reviewUnknown = () => {
    // Move to first unknown card
    const firstUnknown = cards.findIndex((c) => !c.known);
    if (firstUnknown >= 0) {
      setCurrentIndex(firstUnknown);
      setRevealed(false);
      setShowResults(false);
    }
  };

  const clearDeck = async () => {
    if (!confirm('Delete all flashcards for this notebook?')) return;
    try {
      await fetch(`/api/flashcards?notebookId=${notebookId}`, { method: 'DELETE' });
      setCards([]);
      setCurrentIndex(0);
      setRevealed(false);
      setShowResults(false);
    } catch (err) {
      console.error('[flashcards] clear failed:', err);
    }
  };

  // ---- Loading skeleton ----
  if (loading || !initialLoadDone) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto">
          <header className="mb-6">
            <h1 className="text-xl font-bold text-stone-900">🃏 Flashcards</h1>
            <p className="text-sm text-stone-500 animate-pulse">
              {loading ? 'Generating cards...' : 'Loading...'}
            </p>
          </header>
          <div className="bg-white p-8 rounded-lg border border-stone-200">
            <div className="h-4 bg-stone-200 rounded w-1/3 mb-4 animate-pulse" />
            <div className="h-24 bg-stone-100 rounded mb-4 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ---- Empty state ----
  if (cards.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto">
          <header className="mb-6">
            <h1 className="text-xl font-bold text-stone-900">🃏 Flashcards</h1>
            <p className="text-sm text-stone-500">
              Active recall — flip cards to memorise concepts from your sources
            </p>
          </header>

          {!hasSources ? (
            <div className="bg-white p-12 rounded-lg border border-stone-200 text-center">
              <p className="text-5xl mb-4">🃏</p>
              <h2 className="text-lg font-semibold text-stone-800 mb-2">
                No sources yet
              </h2>
              <p className="text-sm text-stone-500 max-w-md mx-auto">
                Upload a PDF or paste some text. Then come back to generate flashcards.
              </p>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg border border-stone-200">
              <div className="mb-4">
                <label className="block text-xs font-semibold text-stone-600 mb-2">
                  Number of cards
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(e.target.value as CountOption)}
                  className="w-full p-3 border border-stone-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                >
                  <option value="less">Less (8)</option>
                  <option value="standard">Standard (15)</option>
                  <option value="more">More (25)</option>
                  <option value="alot">A lot (40)</option>
                </select>
              </div>

              <div className="text-center">
                <button
                  onClick={generateCards}
                  className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700"
                >
                  Generate Flashcards
                </button>
                {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Results screen ----
  if (showResults) {
    const knownCount = cards.filter((c) => c.known).length;
    const unknownCount = cards.length - knownCount;
    const pct = Math.round((knownCount / cards.length) * 100);

    // Difficulty breakdown
    const difficultyData = [1, 2, 3, 4, 5].map((d) => {
      const atD = cards.filter((c) => c.difficulty === d);
      return {
        difficulty: DIFFICULTY_LABELS[d],
        known: atD.filter((c) => c.known).length,
        unknown: atD.filter((c) => !c.known).length,
        total: atD.length,
      };
    }).filter((d) => d.total > 0);

    // Category breakdown
    const categoryData = Object.keys(CATEGORY_COLORS)
      .map((cat) => {
        const atCat = cards.filter((c) => c.category === cat);
        return {
          name: cat,
          count: atCat.length,
          known: atCat.filter((c) => c.known).length,
          color: CATEGORY_COLORS[cat],
        };
      })
      .filter((c) => c.count > 0);

    // Score ring
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDash = (pct / 100) * circumference;

    return (
      <div className="h-full overflow-y-auto bg-stone-50">
        <div className="max-w-3xl mx-auto p-6">
          <header className="text-center mb-8">
            <p className="text-xs uppercase tracking-wide text-stone-400 mb-2">
              Deck complete
            </p>
            <h1 className="text-3xl font-bold text-stone-900">
              {pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '📚'} Nice work!
            </h1>
          </header>

          {/* Score ring */}
          <div className="bg-white rounded-2xl border border-stone-200 p-8 mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <div className="relative w-40 h-40 flex-shrink-0">
                <svg width="160" height="160" className="transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="#e7e5e4"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke={pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${strokeDash} ${circumference}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-4xl font-bold text-stone-900">{pct}%</p>
                  <p className="text-xs text-stone-500 mt-1">mastered</p>
                </div>
              </div>

              <div className="text-center sm:text-left">
                <p className="text-sm text-stone-500 mb-1">You knew</p>
                <p className="text-2xl font-bold text-green-600 mb-3">
                  {knownCount} of {cards.length}
                </p>
                <p className="text-sm text-stone-500 mb-1">Still learning</p>
                <p className="text-2xl font-bold text-red-500">
                  {unknownCount}
                </p>
              </div>
            </div>
          </div>

          {/* Difficulty breakdown */}
          {difficultyData.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
              <h2 className="text-sm font-semibold text-stone-700 mb-4">
                Where you struggled
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={difficultyData} barGap={2}>
                  <XAxis
                    dataKey="difficulty"
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
                  <Bar dataKey="known" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="unknown" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-stone-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Known
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Still learning
                </span>
              </div>
            </div>
          )}

          {/* Category pills */}
          {categoryData.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
              <h2 className="text-sm font-semibold text-stone-700 mb-4">
                Breakdown by category
              </h2>
              <div className="flex flex-wrap gap-2">
                {categoryData.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs"
                    style={{ backgroundColor: c.color }}
                  >
                    <span className="capitalize">{c.name}</span>
                    <span className="opacity-80">
                      {c.known}/{c.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {unknownCount > 0 && (
              <button
                onClick={reviewUnknown}
                className="flex-1 px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700 font-medium"
              >
                Review {unknownCount} unknown
              </button>
            )}
            <button
              onClick={resetDeck}
              className="flex-1 px-6 py-3 border border-stone-300 rounded-lg hover:bg-stone-100 font-medium"
            >
              ↻ Restart deck
            </button>
            <button
              onClick={clearDeck}
              className="px-6 py-3 border border-stone-300 rounded-lg hover:bg-stone-100 hover:border-red-300 hover:text-red-600 font-medium"
            >
              🗑️ New deck
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Card view ----
  const current = cards[currentIndex];
  const knownCount = cards.filter((c) => c.known).length;
  const progressPct = Math.round((knownCount / cards.length) * 100);
  const categoryColor = CATEGORY_COLORS[current.category] ?? '#64748b';

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4 bg-white border-b border-stone-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-stone-900">🃏 Flashcards</h1>
            <p className="text-xs text-stone-500">
              Card {currentIndex + 1} of {cards.length}
              {' · '}
              {knownCount} known ({progressPct}%)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetDeck}
              className="text-xs px-3 py-1.5 border border-stone-300 rounded hover:bg-stone-100"
            >
              ↻ Reset
            </button>
            <button
              onClick={clearDeck}
              className="text-xs px-3 py-1.5 border border-stone-300 rounded hover:bg-stone-100 hover:border-red-300 hover:text-red-600"
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <div className="flex-1 min-h-0 p-6 flex items-center justify-center bg-stone-50">
        <div
          onClick={() => setRevealed((r) => !r)}
          className="w-full max-w-2xl min-h-[320px] bg-white rounded-2xl border border-stone-200 shadow-sm p-8 flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all"
        >
          <div
            className="inline-flex items-center px-2.5 py-1 rounded-full text-white text-xs mb-6"
            style={{ backgroundColor: categoryColor }}
          >
            {current.category}
          </div>

          <div className="text-center flex-1 flex flex-col justify-center">
            <p className="text-xs text-stone-400 mb-3 uppercase tracking-wide">
              {revealed ? 'Answer' : 'Prompt'}
            </p>

            {!revealed ? (
              <div className="prose prose-stone max-w-none text-2xl font-semibold text-stone-900">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                >
                  {current.term.replace(/\u202F/g, ' ')}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="prose prose-stone max-w-none text-lg text-stone-700">
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
            <p className="text-xs text-stone-400 mt-6">Tap to reveal</p>
          )}
        </div>
      </div>

      <footer className="border-t border-stone-200 bg-white p-4 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex gap-3">
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="flex-1 px-4 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700 font-medium"
            >
              Reveal Answer
            </button>
          ) : (
            <>
              <button
                onClick={() => markCard(false)}
                className="flex-1 px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 font-medium"
              >
                ❌ Still learning
              </button>
              <button
                onClick={() => markCard(true)}
                className="flex-1 px-4 py-3 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 font-medium"
              >
                ✅ Known
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}