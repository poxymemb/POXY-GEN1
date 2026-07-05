import './chip.css';
import { el } from '../../lib/dom';

export interface ChipOptions {
  label: string;
  selected?: boolean;
  /** Filter chips toggle; static chips just display. */
  onToggle?: (selected: boolean) => void;
}

export function Chip(options: ChipOptions): HTMLButtonElement {
  const { label, selected = false, onToggle } = options;

  const root = el(
    'button',
    {
      class: `px-chip${selected ? ' is-selected' : ''}`,
      type: 'button',
      'aria-pressed': String(selected),
    },
    [label],
  );

  if (onToggle) {
    root.addEventListener('click', () => {
      const next = !root.classList.contains('is-selected');
      root.classList.toggle('is-selected', next);
      root.setAttribute('aria-pressed', String(next));
      onToggle(next);
    });
  }

  return root;
}
