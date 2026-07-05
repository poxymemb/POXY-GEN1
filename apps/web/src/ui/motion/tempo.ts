/* The three tempos (Codex §7). Features never invent durations or
   easings; they use these configs or the primitives built on them. */

export interface Tempo {
  duration: number;
  easing: string;
}

/** Hovers, toggles, chips, focus. */
export const Surface: Tempo = { duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' };

/** Panels, sheets, route changes. */
export const Current: Tempo = { duration: 320, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' };

/** Reveals and the Seal settle ONLY. Duration is per-beat (600–2400ms
    total ceremonies); the overshoot ease is the constant. */
export const RitualEase = 'cubic-bezier(0.34, 1.30, 0.5, 1)';

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Reduced-motion contract: a 150ms opacity fade to the final state. */
export const Reduced: Tempo = { duration: 150, easing: 'linear' };
