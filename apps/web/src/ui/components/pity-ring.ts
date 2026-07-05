/* PityRing — visible pity turns anxiety into strategy (Codex §2).
   SVG ring: sky stroke on a hairline track, SG counter centered, fills
   clockwise. At >=90% a single quiet sky pulse (micro-signature #3). */
import './pity-ring.css';
import { el, svgFromString } from '../../lib/dom';
import { emitCue } from '../motion/cues';

export interface PityRingOptions {
  /** Openings done toward the guarantee. */
  current: number;
  /** Openings at which the guarantee triggers. */
  threshold: number;
  /** Ring diameter in px. Default 56. */
  size?: number;
  label?: string;
}

export interface PityRingHandle {
  root: HTMLElement;
  setProgress(current: number): void;
}

export function PityRing(options: PityRingOptions): PityRingHandle {
  const { current, threshold, size = 56, label = 'Pity progress' } = options;

  const stroke = 3;
  const r = (100 - stroke * 2) / 2;
  const circumference = 2 * Math.PI * r;

  const svg = svgFromString(`<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <circle class="px-pity__track" cx="50" cy="50" r="${r}" fill="none" stroke-width="${stroke}"/>
    <circle class="px-pity__fill" cx="50" cy="50" r="${r}" fill="none" stroke-width="${stroke}"
      stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"
      transform="rotate(-90 50 50)"/>
  </svg>`);

  const counter = el('span', { class: 'px-pity__counter' }, ['']);
  const root = el(
    'div',
    { class: 'px-pity', role: 'img', 'aria-label': '' },
    [svg, counter],
  );
  root.style.width = `${size}px`;
  root.style.height = `${size}px`;

  const fill = svg.querySelector<SVGCircleElement>('.px-pity__fill')!;
  let pulsed = false;
  let announcedFull = false;

  function setProgress(value: number) {
    const clamped = Math.max(0, Math.min(value, threshold));
    const ratio = threshold === 0 ? 0 : clamped / threshold;
    fill.style.strokeDashoffset = String(circumference * (1 - ratio));
    counter.textContent = String(threshold - clamped);
    root.setAttribute('aria-label', `${label}: ${clamped} of ${threshold}`);

    // One pulse, once, when crossing 90% — quiet, not an alarm.
    if (ratio >= 0.9 && !pulsed) {
      pulsed = true;
      root.classList.add('is-near');
    } else if (ratio < 0.9) {
      pulsed = false;
      root.classList.remove('is-near');
    }

    // Haptic-only cue when the guarantee is reached.
    if (ratio >= 1 && !announcedFull) {
      announcedFull = true;
      emitCue('pity-full');
    } else if (ratio < 1) {
      announcedFull = false;
    }
  }

  setProgress(current);
  return { root, setProgress };
}
