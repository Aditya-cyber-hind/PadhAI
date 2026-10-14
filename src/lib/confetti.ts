import confetti from 'canvas-confetti';

/**
 * Success celebration for PadhAI.
 *
 * Small, tasteful, and amber-colored to match the theme.
 * Uses canvas-confetti — 4KB, no dependencies.
 *
 * Respects prefers-reduced-motion: skips confetti for users who
 * have that setting on (accessibility).
 */

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Small burst for successful saves / actions */
export function celebrateSmall(): void {
  if (prefersReducedMotion()) return;
  confetti({
    particleCount: 40,
    spread: 60,
    startVelocity: 30,
    origin: { y: 0.7 },
    colors: ['#f59e0b', '#fbbf24', '#fcd34d', '#d97706', '#ffffff'],
    scalar: 0.9,
    ticks: 120,
    disableForReducedMotion: true,
  });
}

/** Bigger burst for completing a session / quiz */
export function celebrateBig(): void {
  if (prefersReducedMotion()) return;

  const duration = 1200;
  const animationEnd = Date.now() + duration;
  const colors = ['#f59e0b', '#fbbf24', '#fcd34d', '#d97706', '#ffffff'];

  // Left-side cannon
  const leftCannon = confetti.create(
    document.createElement('canvas'),
    { resize: true, useWorker: true }
  );

  // Main burst from the center
  confetti({
    particleCount: 100,
    spread: 90,
    startVelocity: 45,
    origin: { y: 0.6 },
    colors,
    scalar: 1,
    ticks: 200,
    disableForReducedMotion: true,
  });

  // Side cannons for 1.2s
  const interval = window.setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 30 * (timeLeft / duration);

    confetti({
      particleCount,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.8 },
      colors,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.8 },
      colors,
      disableForReducedMotion: true,
    });
  }, 250);
}