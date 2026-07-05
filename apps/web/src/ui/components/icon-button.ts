import './icon-button.css';
import { el, svgFromString } from '../../lib/dom';

export interface IconButtonOptions {
  /** Trusted static SVG markup (our own icons only, never user content). */
  icon: string;
  /** Accessible name — required; icon buttons have no visible label. */
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: (event: MouseEvent) => void;
}

export function IconButton(options: IconButtonOptions): HTMLButtonElement {
  const { icon, label, active, disabled, onClick } = options;

  const root = el(
    'button',
    {
      class: `px-icon-btn${active ? ' is-active' : ''}`,
      type: 'button',
      'aria-label': label,
      'aria-pressed': active !== undefined ? String(active) : undefined,
      disabled,
      onclick: onClick as EventListener,
    },
    [svgFromString(icon)],
  );

  return root;
}
