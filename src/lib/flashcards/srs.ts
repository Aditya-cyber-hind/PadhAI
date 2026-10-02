/**
 * SM-2 spaced repetition algorithm (simplified).
 *
 * Reference: https://super-memory.com/english/ol/sm2.htm
 *
 * Each card tracks three state variables:
 *   - ease_factor   : how easy the card is for you (starts 2.5, clamps 1.3–2.8)
 *   - interval_days : days until the next review
 *   - repetitions   : consecutive successful reviews
 *
 * Ratings:
 *   - again : you forgot it. Reset interval, lower ease.
 *   - hard  : correct, but with difficulty. Smaller interval bump, lower ease.
 *   - good  : correct. Standard interval bump, no change to ease.
 *   - easy  : trivial. Larger interval bump, raise ease.
 */

export type Rating = 'again' | 'hard' | 'good' | 'easy';

export interface SrsState {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
}

export interface SrsResult extends SrsState {
  next_review_at: Date;
}

const MIN_EASE = 1.3;
const MAX_EASE = 2.8;
const DEFAULT_EASE = 2.5;

/**
 * Given a card's current SRS state and how the user rated it,
 * return the new state and the next review date.
 */
export function scheduleNext(state: SrsState, rating: Rating): SrsResult {
  const ease = clampEase(state.ease_factor || DEFAULT_EASE);
  const reps = state.repetitions || 0;
  const interval = state.interval_days || 0;

  let nextInterval: number;
  let nextEase = ease;
  let nextReps = reps;

  switch (rating) {
    case 'again': {
      // Reset — see this card again today or tomorrow
      nextInterval = 1;
      nextEase = clampEase(ease - 0.2);
      nextReps = 0;
      break;
    }
    case 'hard': {
      // Small step forward, ease drops slightly
      nextInterval = reps === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
      nextEase = clampEase(ease - 0.15);
      nextReps = reps + 1;
      break;
    }
    case 'easy': {
      // Big jump, ease rises
      const base = reps === 0 ? 3 : interval * ease * 1.3;
      nextInterval = Math.max(1, Math.round(base));
      nextEase = clampEase(ease + 0.15);
      nextReps = reps + 1;
      break;
    }
    case 'good':
    default: {
      // Standard path
      let base: number;
      if (reps === 0) base = 1;
      else if (reps === 1) base = 3;
      else base = interval * ease;
      nextInterval = Math.max(1, Math.round(base));
      nextReps = reps + 1;
      break;
    }
  }

  const now = new Date();
  const next = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1000);

  return {
    ease_factor: nextEase,
    interval_days: nextInterval,
    repetitions: nextReps,
    next_review_at: next,
  };
}

function clampEase(e: number): number {
  if (Number.isNaN(e)) return DEFAULT_EASE;
  return Math.min(MAX_EASE, Math.max(MIN_EASE, e));
}

/**
 * Human-readable label for how many cards are due now.
 * Used in the header text.
 */
export function describeDue(count: number): string {
  if (count === 0) return 'All caught up';
  if (count === 1) return '1 card due today';
  return `${count} cards due today`;
}