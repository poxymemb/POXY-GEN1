/* RarityGem — the ONLY place a pigment fills a shape (Codex §4 quarantine).
   The star silhouette in pigment with a subtle inner gradient. */
import './rarity-gem.css';
import type { Rarity } from '@poxy/shared';
import { el, svgFromString } from '../../lib/dom';
import { RARITY_LABEL } from '@poxy/shared';

const SIZES = { s: 14, m: 20, l: 32 } as const;

let gradientCounter = 0;

export interface RarityGemOptions {
  rarity: Rarity;
  size?: keyof typeof SIZES;
  /** Decorative by default; set true to expose the rarity name to AT. */
  labelled?: boolean;
}

export function RarityGem(options: RarityGemOptions): HTMLElement {
  const { rarity, size = 'm', labelled } = options;
  const px = SIZES[size];
  const gradId = `px-gem-grad-${gradientCounter++}`;

  // Star path matches assets/brand/star.svg geometry.
  const markup = `<svg viewBox="0 0 100 100" width="${px}" height="${px}" aria-hidden="true">
    <defs>
      <radialGradient id="${gradId}" cx="50%" cy="38%" r="70%">
        <stop offset="0%" stop-color="var(--px-pigment-${rarity})" stop-opacity="1"/>
        <stop offset="72%" stop-color="var(--px-pigment-${rarity})" stop-opacity="0.88"/>
        <stop offset="100%" stop-color="var(--px-pigment-${rarity})" stop-opacity="0.72"/>
      </radialGradient>
    </defs>
    <path fill="url(#${gradId})" d="M 49.5 7.8 Q 50 2 50.5 7.8 C 53.6 33.9 66.1 46.4 92.2 49.5 Q 98 50 92.2 50.5 C 66.1 53.6 53.6 66.1 50.5 92.2 Q 50 98 49.5 92.2 C 46.4 66.1 33.9 53.6 7.8 50.5 Q 2 50 7.8 49.5 C 33.9 46.4 46.4 33.9 49.5 7.8 Z"/>
  </svg>`;

  const root = el('span', { class: `px-gem px-gem--${size}` }, [svgFromString(markup)]);

  if (labelled) {
    root.setAttribute('role', 'img');
    root.setAttribute('aria-label', RARITY_LABEL[rarity]);
  } else {
    root.setAttribute('aria-hidden', 'true');
  }

  return root;
}
