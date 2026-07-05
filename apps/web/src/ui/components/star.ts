/* The Star — the only decorative glyph and the only spinner (Codex §3).
   Renders assets/brand/star.svg (kept as a synced copy in ui/brand/). */
import './star.css';
import { svgFromString } from '../../lib/dom';
import starMarkup from '../brand/star.svg?raw';

export interface StarOptions {
  /** Square size in px. Default 16. */
  size?: number;
  /** 'static' (default) · 'spin' (loading, 1.6s + breath) · 'breathe' */
  mode?: 'static' | 'spin' | 'breathe';
  /** Extra class for color context (star is always currentColor). */
  className?: string;
  label?: string;
}

export function Star(options: StarOptions = {}): HTMLElement {
  const { size = 16, mode = 'static', className, label } = options;

  const wrap = document.createElement('span');
  wrap.className = `px-star px-star--${mode}${className ? ` ${className}` : ''}`;
  wrap.style.width = `${size}px`;
  wrap.style.height = `${size}px`;

  if (label) {
    wrap.setAttribute('role', 'img');
    wrap.setAttribute('aria-label', label);
  } else {
    wrap.setAttribute('aria-hidden', 'true');
  }

  wrap.append(svgFromString(starMarkup));
  return wrap;
}
