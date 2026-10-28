'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface WeakTopic {
  topic: string;
  wrong: number;
  total: number;
  accuracy_pct: number;
}

interface NotebookWeakTopics {
  notebook_id: string;
  notebook_name: string;
  notebook_emoji: string | null;
  topics: WeakTopic[];
}

interface Props {
  onOpenNotebook: (notebookId: string) => void;
  onRetakeTopic: (notebookId: string, topic: string) => Promise<void>;
  refreshKey?: number;
}

export default function WeakTopicsCard({
  onOpenNotebook,
  onRetakeTopic,
  refreshKey,
}: Props) {
  const [notebooks, setNotebooks] = useState<NotebookWeakTopics[]>([]);
  const [loading, setLoading] = useState(true);
  const [retakingKey, setRetakingKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/quiz/weak-topics');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.notebooks)) {
          setNotebooks(data.notebooks);
        }
      } catch (err) {
        console.error('[weak-topics] load failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleRetake = async (notebookId: string, topic: string) => {
    const key = `${notebookId}:${topic}`;
    setRetakingKey(key);
    try {
      await onRetakeTopic(notebookId, topic);
    } finally {
      setRetakingKey(null);
    }
  };

  if (loading) return null;
  if (notebooks.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 sm:mb-8"
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg">🎯</span>
          <h2 className="text-[11px] sm:text-sm font-semibold text-stone-500 uppercase tracking-wide">
            Study Focus
          </h2>
        </div>
        <span className="text-[10px] sm:text-xs text-stone-400">
          Across all your attempts
        </span>
      </div>

      <div className="space-y-2.5">
        {notebooks.map((nb) => (
          <motion.div
            key={nb.notebook_id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-stone-200 p-3 sm:p-4 hover:border-stone-300 transition-colors"
          >
            <button
              onClick={() => onOpenNotebook(nb.notebook_id)}
              className="flex items-center gap-2 mb-3 group"
            >
              <span className="text-base">{nb.notebook_emoji || '📓'}</span>
              <span className="font-semibold text-sm text-stone-900 group-hover:text-accent-700 transition-colors">
                {nb.notebook_name}
              </span>
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-stone-400 group-hover:text-accent-600 group-hover:translate-x-0.5 transition-all"
              >
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </button>

            <div className="space-y-1.5">
              {nb.topics.map((t) => {
                const key = `${nb.notebook_id}:${t.topic}`;
                const isRetaking = retakingKey === key;
                return (
                  <div
                    key={t.topic}
                    className="flex items-center gap-2 sm:gap-3 px-2 py-1.5 rounded-lg hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] text-stone-800 truncate">
                          {t.topic}
                        </span>
                        <span className="text-[10px] text-stone-400 shrink-0">
                          {t.wrong}/{t.total} wrong
                        </span>
                      </div>
                      <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            t.accuracy_pct < 40
                              ? 'bg-red-500'
                              : t.accuracy_pct < 60
                              ? 'bg-orange-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${t.accuracy_pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-stone-600 tabular-nums w-9 text-right shrink-0">
                      {t.accuracy_pct}%
                    </span>
                    <button
                      onClick={() => handleRetake(nb.notebook_id, t.topic)}
                      disabled={isRetaking || retakingKey !== null}
                      className="text-[11px] font-medium px-2 py-1 rounded text-accent-700 bg-accent-50 hover:bg-accent-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      {isRetaking ? '…' : 'Retake'}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}