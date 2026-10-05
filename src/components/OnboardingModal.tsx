'use client';

import { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';

interface Props {
  open: boolean;
  onComplete: () => void;
}

interface SlideProps {
  children: ReactNode;
}

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -60 : 60,
    opacity: 0,
  }),
};

export default function OnboardingModal({ open, onComplete }: Props) {
  const [[index, dir], setIndex] = useState<[number, number]>([0, 0]);
  const [finishing, setFinishing] = useState(false);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Esc closes the whole tour (skips)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onComplete();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  const next = () => {
    if (index < 3) setIndex([index + 1, 1]);
    else finish();
  };

  const prev = () => {
    if (index > 0) setIndex([index - 1, -1]);
  };

  const finish = () => {
    setFinishing(true);
    onComplete();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[80] bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            {/* Skip button */}
            <button
              onClick={finish}
              disabled={finishing}
              className="absolute top-4 right-4 z-20 text-xs text-stone-400 hover:text-stone-700 px-2.5 py-1 rounded-md hover:bg-stone-100 transition-colors disabled:opacity-40"
            >
              Skip tour
            </button>

            {/* Slides */}
            <div className="relative min-h-[440px] flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={index}
                  custom={dir}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full px-8 sm:px-14 py-16"
                >
                  {index === 0 && <SlideWelcome />}
                  {index === 1 && <SlideSources />}
                  {index === 2 && <SlideChat />}
                  {index === 3 && <SlideStudy />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="border-t border-stone-100 px-6 py-4 flex items-center justify-between bg-stone-50/50">
              {/* Progress dots */}
              <div className="flex items-center gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <motion.button
                    key={i}
                    onClick={() => setIndex([i, i > index ? 1 : -1])}
                    className={`rounded-full transition-colors ${
                      i === index
                        ? 'bg-accent-500 w-6 h-2'
                        : 'bg-stone-300 hover:bg-stone-400 w-2 h-2'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>

              {/* Nav buttons */}
              <div className="flex items-center gap-2">
                {index > 0 && (
                  <button
                    onClick={prev}
                    className="text-sm text-stone-500 hover:text-stone-800 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition"
                  >
                    Back
                  </button>
                )}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={next}
                  disabled={finishing}
                  className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 text-sm font-medium shadow-sm transition disabled:opacity-60"
                >
                  {index < 3 ? 'Next' : 'Get started'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────
   SLIDE 1 — Welcome
   ───────────────────────────────────────────────────────────── */
function SlideWelcome() {
  return (
    <div className="text-center flex flex-col items-center">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <Logo size={64} showWordmark={false} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="font-display text-3xl sm:text-4xl font-bold text-stone-900 mb-3 leading-tight"
      >
        Welcome to PadhAI
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="text-stone-600 max-w-md text-base leading-relaxed"
      >
        Turn any document into a study workspace. Let&apos;s take 30 seconds to
        show you how it works.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="mt-8 flex items-center gap-2 text-xs text-stone-400"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Free · Open source · No installation
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SLIDE 2 — Add sources
   ───────────────────────────────────────────────────────────── */
function SlideSources() {
  const sources = [
    { emoji: '📄', label: 'PDF' },
    { emoji: '🎥', label: 'YouTube' },
    { emoji: '🌐', label: 'Article' },
    { emoji: '✍️', label: 'Paste' },
  ];

  return (
    <div className="text-center">
      <StepBadge>Step 1</StepBadge>

      {/* Source icons flowing to a database pill */}
      <div className="flex items-end justify-center gap-3 sm:gap-5 mb-8 mt-4">
        {sources.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center text-2xl shadow-sm">
              {s.emoji}
            </div>
            <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">
              {s.label}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Animated arrow going into a "PadhAI" pill */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="flex flex-col items-center gap-3 mb-8"
      >
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
              className="w-1.5 h-1.5 rounded-full bg-accent-400"
            />
          ))}
        </div>

        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-50 border border-accent-200"
        >
          <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
          <span className="text-sm font-medium text-accent-800">
            PadhAI reads it
          </span>
        </motion.div>
      </motion.div>

      <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-3">
        Add your sources
      </h2>
      <p className="text-stone-600 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
        Upload a PDF, drop a YouTube link, paste an article, or write your own
        notes. PadhAI extracts and reads everything for you.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SLIDE 3 — Ask anything
   ───────────────────────────────────────────────────────────── */
function SlideChat() {
  return (
    <div className="text-center">
      <StepBadge>Step 2</StepBadge>

      {/* Mock chat */}
      <div className="max-w-sm mx-auto mt-4 mb-8 space-y-3 text-left">
        {/* User message */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex justify-end"
        >
          <div className="px-3.5 py-2 rounded-2xl rounded-tr-sm bg-stone-900 text-white text-xs sm:text-sm max-w-[80%]">
            What is photosynthesis?
          </div>
        </motion.div>

        {/* Assistant message with citation */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="flex gap-2"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[10px] font-bold font-display">
              P
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
              Photosynthesis converts light energy into glucose
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.3, type: 'spring', stiffness: 400 }}
                className="inline-flex items-center justify-center min-w-[1.2em] h-[1.2em] px-1.5 ml-0.5 rounded-full text-[0.65em] font-semibold bg-accent-100 text-accent-700 align-super"
              >
                1
              </motion.span>
              , using chlorophyll in the chloroplasts.
            </p>

            {/* Source chip that fades in */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.15, duration: 0.35 }}
              className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent-50 border border-accent-200 text-[10px] text-accent-800"
            >
              <span>📄</span>
              <span>Chapter 3 — Photosynthesis.pdf</span>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-3">
        Ask anything
      </h2>
      <p className="text-stone-600 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
        Every answer cites the exact passage it came from. Click a citation to
        jump straight to the source.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SLIDE 4 — Study & share
   ───────────────────────────────────────────────────────────── */
function SlideStudy() {
  const tools = [
    { emoji: '📝', label: 'Quiz' },
    { emoji: '🃏', label: 'Flashcards' },
    { emoji: '🧠', label: 'Brain Map' },
    { emoji: '🎬', label: 'Slides' },
  ];

  return (
    <div className="text-center">
      <StepBadge>Step 3</StepBadge>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-lg mx-auto mt-4 mb-8">
        {tools.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
            whileHover={{ y: -2 }}
            className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                delay: i * 0.3,
                ease: 'easeInOut',
              }}
              className="text-3xl"
            >
              {t.emoji}
            </motion.div>
            <span className="text-[11px] font-medium text-stone-600">
              {t.label}
            </span>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="text-xs text-accent-700 font-medium bg-accent-50 border border-accent-200 inline-block px-3 py-1 rounded-full mb-5"
      >
        Spaced repetition keeps flashcards fresh
      </motion.p>

      <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-3">
        Study and share
      </h2>
      <p className="text-stone-600 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
        Generate quizzes, flashcards, and concept maps. Export them as PDFs, or
        share a link with your class.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Small helper — step badge
   ───────────────────────────────────────────────────────────── */
function StepBadge({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="inline-block text-[10px] font-semibold uppercase tracking-wider text-accent-700 bg-accent-50 border border-accent-200 px-2.5 py-1 rounded-full"
    >
      {children}
    </motion.div>
  );
}