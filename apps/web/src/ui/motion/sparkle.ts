/* sparkle() — the ONLY particle system permitted (Codex §3): 6–14 brand
   stars drifting radially and fading. Fired once per Epic+ reveal. */
import './sparkle.css';
import { prefersReducedMotion, RitualEase } from './tempo';
import starMarkup from '../brand/star.svg?raw';

export interface SparkleOptions {
  /** Rarity pigment token name, e.g. 'legendary' → var(--px-pigment-legendary). */
  pigment: string;
  /** Number of stars, clamped 6–14. */
  count?: number;
}

export function sparkle(container: HTMLElement, options: SparkleOptions): Promise<void> {
  const { pigment } = options;
  if (prefersReducedMotion()) return Promise.resolve();

  const count = Math.max(6, Math.min(options.count ?? 8, 14));
  const layer = document.createElement('div');
  layer.className = 'px-sparkle';
  layer.style.color = `var(--px-pigment-${pigment})`;
  container.append(layer);

  const done: Promise<unknown>[] = [];

  for (let i = 0; i < count; i++) {
    const star = document.createElement('span');
    star.className = 'px-sparkle__star';
    star.innerHTML = starMarkup; // trusted static brand asset
    const size = 6 + Math.random() * 10;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    layer.append(star);

    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.9;
    const radius = 40 + Math.random() * 70;
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;
    const duration = 300 + Math.random() * 400;

    const anim = star.animate(
      [
        { transform: 'translate(-50%, -50%) translate(0, 0) scale(0.4)', opacity: 0 },
        { transform: `translate(-50%, -50%) translate(${dx * 0.35}px, ${dy * 0.35}px) scale(1)`, opacity: 1, offset: 0.3 },
        { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.6)`, opacity: 0 },
      ],
      { duration, easing: RitualEase, fill: 'forwards' },
    );
    done.push(anim.finished);
  }

  return Promise.all(done).then(() => layer.remove());
}
