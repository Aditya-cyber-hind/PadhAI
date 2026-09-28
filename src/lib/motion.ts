'use client';

import type { Variants, Transition } from 'motion/react';

/**
 * Shared motion variants and transitions.
 * Import these everywhere so all animations feel consistent.
 *
 * Guiding rule: FAST (150-300ms), subtle, purposeful.
 * No bouncing, no long fades, no attention-grabbing nonsense.
 */

// Spring easing for entrance animations
export const springSmooth: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 0.6,
};

// Snappy fade for instant-state changes
export const fadeQuick: Transition = {
  duration: 0.15,
  ease: 'easeOut',
};

// Message bubble entrance — slide up + fade
export const messageEntry: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springSmooth,
  },
};

// Tab cross-fade — quick fade only, no movement (feels snappier)
export const tabCrossFade: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.18, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1, ease: 'easeIn' },
  },
};

// Card stagger — parent controls children
export const cardGrid: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

export const cardItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springSmooth,
  },
};

// Modal backdrop + dialog
export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.12, ease: 'easeIn' },
  },
};

export const modalDialog: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springSmooth,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 4,
    transition: { duration: 0.12, ease: 'easeIn' },
  },
};

// Button press feedback
export const pressScale = {
  whileTap: { scale: 0.97 },
  transition: { duration: 0.08 },
};

// Reveal on scroll — for landing page sections
export const revealOnScroll: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};