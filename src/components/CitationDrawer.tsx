'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useCitation } from './CitationContext';

export default function CitationDrawer() {
  const { openCitation, closeCitation, requestScrollToSource } = useCitation();

  useEffect(() => {
    if (!openCitation) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCitation();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCitation, closeCitation]);

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
  const isScrollable = !sourceName.toLowerCase().includes('pasted');

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black/30 z-40"
        onClick={closeCitation}
        aria-hidden="true"
      />

      <motion.aside
        key="drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 38, mass: 0.8 }}
        className="fixed top-0 right-0 bottom-0 w-full sm:w-96 bg-white border-l border-stone-200 shadow-2xl z-50 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Source citation"
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-stone-200 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-accent-600 uppercase tracking-wide">
              Source {id}
            </p>
            <h2
              className="font-display text-base font-bold text-stone-900 mt-0.5 truncate"
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

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>

        {isScrollable && (
          <footer className="border-t border-stone-200 px-5 py-3 flex-shrink-0">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => requestScrollToSource(sourceName)}
              className="w-full px-4 py-2.5 bg-accent-500 text-white rounded-lg hover:bg-accent-600 text-sm font-medium transition"
            >
              ↑ Scroll to source
            </motion.button>
          </footer>
        )}
      </motion.aside>
    </AnimatePresence>,
    document.body
  );
}