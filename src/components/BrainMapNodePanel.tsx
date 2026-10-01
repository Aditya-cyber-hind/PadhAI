'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { BrainMapNode, BrainMapEdge } from '@/lib/brainmaps/db';

export const NODE_COLORS: Record<string, string> = {
  concept: '#3b82f6',
  formula: '#8b5cf6',
  process: '#10b981',
  term: '#64748b',
  person: '#f59e0b',
  event: '#ef4444',
};

export const NODE_TYPE_LABEL: Record<string, string> = {
  concept: 'Concept',
  formula: 'Formula',
  process: 'Process',
  term: 'Term',
  person: 'Person',
  event: 'Event',
};

interface Props {
  node: BrainMapNode | null;
  allNodes: BrainMapNode[];
  allEdges: BrainMapEdge[];
  onClose: () => void;
  onJumpTo: (nodeId: string) => void;
  onExplain: (node: BrainMapNode) => void;
  onAddFlashcard: (node: BrainMapNode) => void;
}

export default function BrainMapNodePanel({
  node,
  allNodes,
  allEdges,
  onClose,
  onJumpTo,
  onExplain,
  onAddFlashcard,
}: Props) {
  const isOpen = node !== null;
  const nodeById = new Map(allNodes.map((n) => [n.id, n]));

  // Keyboard shortcuts: E = Explain in Chat, F = Add to flashcards
  useEffect(() => {
    if (!isOpen || !node) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        onExplain(node);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        onAddFlashcard(node);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, node, onExplain, onAddFlashcard]);

  const connections = node
    ? allEdges
        .filter((e) => e.source === node.id || e.target === node.id)
        .map((e) => {
          const otherId = e.source === node.id ? e.target : e.source;
          const other = nodeById.get(otherId);
          const direction = e.source === node.id ? 'out' : 'in';
          return { edge: e, other, direction };
        })
        .filter((c) => c.other)
        .sort((a, b) => b.edge.strength - a.edge.strength)
    : [];

  return (
    <AnimatePresence>
      {isOpen && node && (
        <motion.aside
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="absolute top-0 right-0 bottom-0 w-full sm:w-96 max-w-full bg-white border-l border-stone-200 shadow-xl z-30 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-start gap-3 px-4 py-4 border-b border-stone-200">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold flex-shrink-0 shadow-sm"
              style={{
                backgroundColor: NODE_COLORS[node.type] || '#64748b',
              }}
            >
              {node.label.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                  style={{
                    backgroundColor: NODE_COLORS[node.type] || '#64748b',
                  }}
                >
                  {NODE_TYPE_LABEL[node.type] || node.type}
                </span>
                <span className="text-[10px] text-stone-400">
                  Importance {node.importance}/5
                </span>
              </div>
              <h2 className="font-display text-lg font-bold text-stone-900 leading-tight">
                {node.label}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
              title="Close (Esc)"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {/* Summary */}
            <div>
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                What it is
              </p>
              <p className="text-sm text-stone-700 leading-relaxed">
                {node.summary || 'No description available.'}
              </p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onExplain(node)}
                className="flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-accent-500 text-white hover:bg-accent-600 shadow-sm transition-colors"
                title="Explain in Chat (E)"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Explain in Chat
              </button>
              <button
                onClick={() => onAddFlashcard(node)}
                className="flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-700 hover:border-accent-400 hover:bg-accent-50 hover:text-accent-700 transition-colors"
                title="Add to flashcards (F)"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5"
                >
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                Add to flashcards
              </button>
            </div>

            {/* Sources */}
            {node.sourceRefs && node.sourceRefs.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                  From your sources
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {node.sourceRefs.map((ref, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-1 rounded-full bg-accent-50 border border-accent-200 text-accent-700 truncate max-w-full"
                      title={ref}
                    >
                      📄 {ref}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Connections */}
            <div>
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                Connected to ({connections.length})
              </p>
              {connections.length === 0 ? (
                <p className="text-xs text-stone-400 italic">
                  No connections to other concepts.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {connections.map((c, i) => {
                    const other = c.other!;
                    const color = NODE_COLORS[other.type] || '#64748b';
                    return (
                      <button
                        key={i}
                        onClick={() => onJumpTo(other.id)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-stone-200 bg-white hover:border-accent-400 hover:bg-accent-50/40 transition-all text-left group"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-stone-800 truncate group-hover:text-accent-700">
                            {other.label}
                          </span>
                          <span className="block text-[10px] text-stone-500">
                            {c.direction === 'out' ? '→' : '←'} {c.edge.label}
                            {' · '}
                            {Math.round(c.edge.strength * 100)}%
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer hints */}
          <div className="px-4 py-2 border-t border-stone-200 bg-stone-50 text-[10px] text-stone-400 flex items-center gap-3 flex-wrap">
            <span>Click a connected concept to jump</span>
            <span>·</span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-white border border-stone-200 text-stone-600 font-mono">E</kbd> explain
            </span>
            <span>·</span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-white border border-stone-200 text-stone-600 font-mono">F</kbd> flashcard
            </span>
            <span>·</span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-white border border-stone-200 text-stone-600 font-mono">Esc</kbd> close
            </span>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}