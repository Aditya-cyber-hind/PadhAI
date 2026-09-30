'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { modalBackdrop, modalDialog } from '@/lib/motion';

export interface SuggestedSource {
  title: string;
  url: string;
  kind: 'article' | 'video' | 'docs' | 'reference';
  why: string;
}

interface Props {
  open: boolean;
  notebookId: string;
  onClose: () => void;
  onAdd: (source: SuggestedSource) => Promise<boolean>;
}

const KIND_META: Record<
  SuggestedSource['kind'],
  { icon: string; label: string }
> = {
  article: { icon: '📰', label: 'Article' },
  video: { icon: '🎥', label: 'Video' },
  docs: { icon: '📘', label: 'Docs' },
  reference: { icon: '📚', label: 'Reference' },
};

export default function SuggestSourcesModal({
  open,
  notebookId,
  onClose,
  onAdd,
}: Props) {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestedSource[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  const reset = () => {
    setTopic('');
    setLoading(false);
    setError('');
    setSuggestions(null);
    setSelected(new Set());
    setAdding(false);
    setAddedUrls(new Set());
    setFailedUrls(new Set());
  };

  const handleClose = () => {
    if (adding) return;
    reset();
    onClose();
  };

  const handleFind = async () => {
    const t = topic.trim();
    if (t.length < 3) {
      setError('Enter at least 3 characters.');
      return;
    }
    setLoading(true);
    setError('');
    setSuggestions(null);
    setSelected(new Set());

    try {
      const res = await fetch('/api/suggest-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: t }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSuggestions(data.sources || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const toggleAll = () => {
    if (!suggestions) return;
    if (selected.size === suggestions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(suggestions.map((s) => s.url)));
    }
  };

  const handleAddSelected = async () => {
    if (!suggestions || selected.size === 0) return;
    setAdding(true);
    setError('');

    const toAdd = suggestions.filter((s) => selected.has(s.url));
    for (const s of toAdd) {
      try {
        const ok = await onAdd(s);
        if (ok) {
          setAddedUrls((prev) => new Set(prev).add(s.url));
        } else {
          setFailedUrls((prev) => new Set(prev).add(s.url));
        }
      } catch {
        setFailedUrls((prev) => new Set(prev).add(s.url));
      }
    }

    setAdding(false);
  };

  const allAddedSuccessfully =
    suggestions !== null &&
    suggestions.length > 0 &&
    suggestions.every((s) => addedUrls.has(s.url));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={modalBackdrop}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
          onClick={handleClose}
        >
          <motion.div
            variants={modalDialog}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white rounded-2xl border border-stone-200 w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 flex-shrink-0">
              <h2 className="font-display text-lg font-bold text-stone-900 mb-1">
                Suggest sources
              </h2>
              <p className="text-xs text-stone-500">
                Enter a topic. PadhAI will find sources you can add in one click.
              </p>
            </div>

            {/* Topic input */}
            <div className="px-5 pb-3 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) handleFind();
                  }}
                  placeholder="e.g. React hooks, JEE Physics, Hindi grammar"
                  disabled={loading || adding}
                  className="flex-1 min-w-0 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400 disabled:bg-stone-100"
                  style={{ fontSize: '16px' }}
                />
                <button
                  onClick={handleFind}
                  disabled={loading || adding || topic.trim().length < 3}
                  className="flex-shrink-0 px-4 py-2 bg-accent-500 text-white rounded-lg text-sm font-medium hover:bg-accent-600 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed transition"
                >
                  {loading ? 'Finding...' : 'Find'}
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-600 mt-2">{error}</p>
              )}
            </div>

            {/* Results */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-3">
              {loading && (
                <div className="space-y-2 py-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 bg-stone-100 rounded-lg animate-pulse"
                    />
                  ))}
                  <p className="text-xs text-stone-400 italic text-center pt-2">
                    Asking the AI for good sources...
                  </p>
                </div>
              )}

              {!loading && suggestions && suggestions.length === 0 && (
                <p className="text-sm text-stone-500 italic py-4 text-center">
                  No suggestions returned. Try a more specific topic.
                </p>
              )}

              {!loading && suggestions && suggestions.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-2 pt-1">
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-stone-400">
                      {suggestions.length} suggestion{suggestions.length === 1 ? '' : 's'}
                    </p>
                    <button
                      onClick={toggleAll}
                      disabled={adding}
                      className="text-[11px] text-stone-500 hover:text-accent-600 transition"
                    >
                      {selected.size === suggestions.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {suggestions.map((s) => {
                      const meta = KIND_META[s.kind];
                      const isSelected = selected.has(s.url);
                      const isAdded = addedUrls.has(s.url);
                      const isFailed = failedUrls.has(s.url);

                      return (
                        <button
                          key={s.url}
                          type="button"
                          onClick={() => !adding && !isAdded && toggle(s.url)}
                          disabled={adding || isAdded}
                          className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all ${
                            isAdded
                              ? 'bg-green-50 border-green-200'
                              : isFailed
                              ? 'bg-red-50 border-red-200'
                              : isSelected
                              ? 'bg-accent-50 border-accent-400 shadow-sm'
                              : 'bg-white border-stone-200 hover:border-accent-300 hover:bg-accent-50/40'
                          } ${adding ? 'cursor-wait' : isAdded ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <div
                            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition ${
                              isAdded
                                ? 'bg-green-500 border-green-500'
                                : isSelected
                                ? 'bg-accent-500 border-accent-500'
                                : 'bg-white border-stone-300'
                            }`}
                          >
                            {(isSelected || isAdded) && (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-3 h-3"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs">{meta.icon}</span>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                                {meta.label}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-stone-900 truncate">
                              {s.title}
                            </p>
                            <p className="text-[11px] text-stone-500 leading-snug mt-0.5">
                              {s.why}
                            </p>
                            <p className="text-[10px] text-stone-400 truncate mt-1 font-mono">
                              {s.url}
                            </p>
                            {isAdded && (
                              <p className="text-[10px] font-semibold text-green-700 mt-1">
                                ✓ Added
                              </p>
                            )}
                            {isFailed && (
                              <p className="text-[10px] font-semibold text-red-600 mt-1">
                                ✗ Failed to add
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between flex-shrink-0">
              <button
                onClick={handleClose}
                disabled={adding}
                className="text-sm text-stone-600 hover:text-stone-900 transition disabled:opacity-40"
              >
                {allAddedSuccessfully ? 'Done' : 'Cancel'}
              </button>
              <button
                onClick={handleAddSelected}
                disabled={adding || selected.size === 0}
                className="px-4 py-2 rounded-lg bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed transition"
              >
                {adding
                  ? 'Adding...'
                  : `Add selected${selected.size > 0 ? ` (${selected.size})` : ''}`}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}