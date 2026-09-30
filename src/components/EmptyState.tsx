'use client';

import { ReactNode } from 'react';
import { motion } from 'motion/react';

interface Suggestion {
  label: string;
  hint?: string;
  icon?: ReactNode;
  onClick: () => void;
}

interface Props {
  /** Emoji shown inside the badge, e.g. "📝", "🃏", "🧠" */
  emoji: string;
  /** Fraunces headline */
  title: string;
  /** Inter subtitle below the title */
  description?: string;
  /** Optional primary action button (pass both label and onClick) */
  actionLabel?: string;
  onAction?: () => void;
  /** Optional: replaces the action button with a row/grid of suggestion cards */
  suggestions?: Suggestion[];
  /** Optional: shown instead of button/suggestions when there's nothing to act on */
  hint?: string;
  /** Optional extra content rendered below everything */
  footer?: ReactNode;
}

export default function EmptyState({
  emoji,
  title,
  description,
  actionLabel,
  onAction,
  suggestions,
  hint,
  footer,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
      {/* Badge — identical structure across every panel */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-12 h-12 rounded-xl bg-accent-50 border border-stone-200 flex items-center justify-center mb-4 shadow-sm text-2xl"
      >
        <span aria-hidden>{emoji}</span>
      </motion.div>

      {/* Headline */}
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
        {title}
      </h2>

      {/* Description */}
      {description && (
        <p className="text-sm text-stone-500 max-w-md mb-6">{description}</p>
      )}

      {/* Mode 1: Suggestion cards */}
      {suggestions && suggestions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl mt-1">
          {suggestions.map((s, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={s.onClick}
              className="group flex items-start gap-3 text-left bg-white border border-stone-200 rounded-xl p-3.5 shadow-sm hover:border-accent-400 hover:bg-accent-50/40 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              {s.icon && (
                <span className="flex-shrink-0 mt-0.5 text-stone-400 group-hover:text-accent-600 transition-colors">
                  {s.icon}
                </span>
              )}
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-stone-800 group-hover:text-accent-700 truncate">
                  {s.label}
                </span>
                {s.hint && (
                  <span className="block text-[11px] text-stone-500 leading-snug mt-0.5">
                    {s.hint}
                  </span>
                )}
              </span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Mode 2: Primary action button */}
      {actionLabel && onAction && !suggestions && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onAction}
          className="mt-1 px-5 py-2.5 rounded-lg bg-accent-500 text-white text-sm font-medium shadow-sm hover:bg-accent-600 transition-colors"
        >
          {actionLabel}
        </motion.button>
      )}

      {/* Mode 3: Passive hint (no sources, disabled state) */}
      {hint && !actionLabel && !suggestions && (
        <p className="text-xs text-stone-400 mt-1 italic">{hint}</p>
      )}

      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
}