/* Skeleton language — washi, not shimmer (Codex, 02H).
   Loading placeholders are sunken paper sheets that breathe: a slow opacity
   oscillation (1.8s, +/-4%). NO grey shimmer sweeps anywhere - that is
   ad-tech grammar. Full-screen waits use the star spinner instead.
   Reduced motion: static sheets. */
import './skeleton.css';
import { el, svgFromString } from '../lib/dom';
import starMarkup from './brand/star.svg?raw';

export interface SkeletonOptions {
  /** CSS width, e.g. '100%' or '96px'. Default '100%'. */
  width?: string;
  /** CSS height. Default '16px'. */
  height?: string;
  /** Border radius token. Default 'var(--px-radius-4)'. */
  radius?: string;
}

/** A single breathing washi sheet. */
export function Skeleton(opts: SkeletonOptions = {}): HTMLElement {
  const sheet = el('span', { class: 'px-skeleton', 'aria-hidden': 'true' });
  sheet.style.width = opts.width ?? '100%';
  sheet.style.height = opts.height ?? '16px';
  if (opts.radius) sheet.style.borderRadius = opts.radius;
  return sheet;
}

/** FigureCard-shaped placeholder for grid loading. */
export function SkeletonFigureCard(): HTMLElement {
  return el('div', { class: 'px-skeleton-card', 'aria-hidden': 'true' }, [
    Skeleton({ height: 'auto', radius: 'var(--px-radius-8)' }),
    el('div', { class: 'px-skeleton-card__meta' }, [
      Skeleton({ width: '70%', height: '14px' }),
      Skeleton({ width: '45%', height: '11px' }),
    ]),
  ]);
}

/** Market/list row placeholder. */
export function SkeletonRow(): HTMLElement {
  return el('div', { class: 'px-skeleton-row', 'aria-hidden': 'true' }, [
    Skeleton({ width: '44px', height: '44px', radius: 'var(--px-radius-8)' }),
    el('div', { class: 'px-skeleton-row__lines' }, [
      Skeleton({ width: '55%', height: '13px' }),
      Skeleton({ width: '35%', height: '11px' }),
    ]),
    Skeleton({ width: '64px', height: '13px' }),
  ]);
}

/** Museum pedestal placeholder. */
export function SkeletonPedestal(): HTMLElement {
  return el('div', { class: 'px-skeleton-pedestal', 'aria-hidden': 'true' }, [
    Skeleton({ width: '56%', height: '72px', radius: 'var(--px-radius-4)' }),
    Skeleton({ width: '100%', height: '18px', radius: '2px' }),
  ]);
}

/** Star spinner - full-screen waits ONLY. The star turns slowly; it never
    decorates inline loading (washi sheets do that). */
export function StarSpinner(label = 'Loading'): HTMLElement {
  return el('div', { class: 'px-star-spinner', role: 'status', 'aria-label': label }, [
    el('span', { class: 'px-star-spinner__mark' }, [svgFromString(starMarkup)]),
  ]);
}
