import './tooltip.css';
import { el } from '../../lib/dom';

export interface TooltipOptions {
  /** The element the tooltip describes. */
  anchor: HTMLElement;
  text: string;
}

/** Attaches a hover/focus tooltip to an anchor. Returns the wrapper. */
export function Tooltip(options: TooltipOptions): HTMLElement {
  const { anchor, text } = options;

  const id = `px-tip-${Math.random().toString(36).slice(2, 8)}`;
  const bubble = el('span', { class: 'px-tooltip__bubble', id, role: 'tooltip' }, [text]);
  const root = el('span', { class: 'px-tooltip' }, [anchor, bubble]);

  anchor.setAttribute('aria-describedby', id);

  const show = () => root.classList.add('is-open');
  const hide = () => root.classList.remove('is-open');

  anchor.addEventListener('mouseenter', show);
  anchor.addEventListener('mouseleave', hide);
  anchor.addEventListener('focus', show);
  anchor.addEventListener('blur', hide);

  return root;
}
