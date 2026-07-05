/* The Seal — SACRED (Codex §5). Authenticity moments ONLY: verify verdict,
   certificates, provenance, the fairness page. Importing this component in
   any other feature is a Codex violation and fails review. Never decorate
   with it, never use it as a loading state, never recolor it. */
import './seal.css';
import { el, svgFromString } from '../../lib/dom';
import sealMarkup from '../brand/seal.svg?raw';

export interface SealOptions {
  /** Square size in px. Default 64. */
  size?: number;
  /** Caption under the mark, e.g. "Proven fair." */
  caption?: string;
}

export interface SealHandle {
  root: HTMLElement;
  /** Plays the stamp settle: scale 1.15 -> 1 with 1° rotation, 90ms
      ritual ease. Resolves when the impression has settled. */
  stamp(): Promise<void>;
}

export function Seal(options: SealOptions = {}): SealHandle {
  const { size = 64, caption } = options;

  const mark = el('span', { class: 'px-seal__mark', role: 'img', 'aria-label': 'POXY seal' }, [
    svgFromString(sealMarkup),
  ]);
  mark.style.width = `${size}px`;
  mark.style.height = `${size}px`;

  const root = el('div', { class: 'px-seal' }, [
    mark,
    caption ? el('span', { class: 'px-seal__caption' }, [caption]) : null,
  ]);

  function stamp(): Promise<void> {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.classList.add('is-stamped');
    if (reduced) return Promise.resolve();

    const settle = mark.animate(
      [
        { scale: '1.15', rotate: '1deg', opacity: '0' },
        { scale: '1', rotate: '0deg', opacity: '1' },
      ],
      { duration: 90, easing: 'cubic-bezier(0.34, 1.30, 0.5, 1)', fill: 'both' },
    );
    return settle.finished.then(() => undefined);
  }

  return { root, stamp };
}
