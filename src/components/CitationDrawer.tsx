'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCitation } from './CitationContext';

export default function CitationDrawer() {
  const { openCitation, closeCitation, requestScrollToSource } = useCitation();

  // Close on Escape key
  useEffect(() => {
    if (!openCitation) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCitation();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCitation, closeCitation]);

  // Lock body scroll while open
  useEffect(() => {
    if (!openCitation) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [openCitation]);

  if (!openCitation) return null;
  if (typeof document === 'undefined') return null;

  const { id, sourceName, content } = openCitation;

  // Heuristic: pasted-text sources aren't real cards in SourcePanel,
  // so scrolling to them has no effect. Hide the button for those.
  const isScrollable = !sourceName.toLowerCase().includes('pasted');

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={closeCitation}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed top-0 right-0 bottom-0 w-full sm:w-96 bg-white border-l border-stone-200 shadow-2xl z-50 flex flex-col animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-label="Source citation"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-stone-200 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
              Source {id}
            </p>
            <h2
              className="text-sm font-semibold text-stone-900 mt-0.5 truncate"
              title={sourceName}
            >
              {sourceName}
            </h2>
          </div>
          <button
            onClick={closeCitation}
            className="flex-shrink-0 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>

        {/* Footer actions */}
        {isScrollable && (
          <footer className="border-t border-stone-200 px-5 py-3 flex-shrink-0">
            <button
              onClick={() => requestScrollToSource(sourceName)}
              className="w-full px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-700 text-sm font-medium transition"
            >
              ↑ Scroll to source
            </button>
          </footer>
        )}
      </aside>
    </>,
    document.body
  );
}