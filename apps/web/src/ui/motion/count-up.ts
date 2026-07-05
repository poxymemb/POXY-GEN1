/* countUp() — the number roll for plaques and scores. Numbers are heroes;
   they arrive, they don't just appear. */
import { prefersReducedMotion } from './tempo';

export interface CountUpOptions {
  /** Duration in ms. Default 600. */
  duration?: number;
  /** Formatter, e.g. mint padding or locale separators. */
  format?: (value: number) => string;
}

export function countUp(el: Element, to: number, options: CountUpOptions = {}): Promise<void> {
  const { duration = 600, format = (v) => v.toLocaleString('en-GB') } = options;

  if (prefersReducedMotion() || duration <= 0) {
    el.textContent = format(to);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // Ease-out cubic: fast start, settling landing — a roll, not a timer.
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(Math.round(from + (to - from) * eased));
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}
