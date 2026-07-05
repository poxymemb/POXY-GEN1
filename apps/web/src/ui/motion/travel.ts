/* travel() — the only entrance (Codex §7): motion travels through space,
   slide+fade, never pop. */
import { Current, Reduced, prefersReducedMotion, type Tempo } from './tempo';

export interface TravelOptions {
  /** Where the element travels from. Default 'below'. */
  from?: 'below' | 'above' | 'left' | 'right' | 'depth';
  /** Travel distance in px (ignored for 'depth'). Default 16. */
  distance?: number;
  tempo?: Tempo;
  delay?: number;
}

const OFFSETS: Record<string, (d: number) => string> = {
  below: (d) => `translate3d(0, ${d}px, 0)`,
  above: (d) => `translate3d(0, ${-d}px, 0)`,
  left: (d) => `translate3d(${-d}px, 0, 0)`,
  right: (d) => `translate3d(${d}px, 0, 0)`,
  depth: () => 'scale(1.04)',
};

export function travel(el: Element, options: TravelOptions = {}): Promise<void> {
  const { from = 'below', distance = 16, tempo = Current, delay = 0 } = options;

  if (prefersReducedMotion()) {
    const fade = el.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: Reduced.duration,
      easing: Reduced.easing,
      fill: 'both',
    });
    return fade.finished.then(() => undefined);
  }

  const anim = el.animate(
    [
      { opacity: 0, transform: OFFSETS[from](distance) },
      { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
    ],
    { duration: tempo.duration, easing: tempo.easing, delay, fill: 'both' },
  );
  return anim.finished.then(() => undefined);
}
