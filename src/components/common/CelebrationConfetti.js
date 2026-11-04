/**
 * CELEBRATION ANIMATION HELPER - Tasteful confetti respecting prefers-reduced-motion
 */

import confetti from 'canvas-confetti';

export function fireCelebrationConfetti() {
  if (typeof window === 'undefined') return;

  // STRICT ACCESSIBILITY REQUIREMENT: Respect prefers-reduced-motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    return;
  }

  // Subtle, tasteful, short burst (not overwhelming)
  try {
    confetti({
      particleCount: 55,
      spread: 70,
      startVelocity: 30,
      origin: { y: 0.75 },
      colors: ['#4f46e5', '#0284c7', '#059669', '#f59e0b', '#ec4899'],
      disableForReducedMotion: true,
      scalar: 0.85,
    });
  } catch (err) {
    console.warn('Confetti trigger skipped:', err);
  }
}
