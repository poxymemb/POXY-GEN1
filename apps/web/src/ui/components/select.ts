import './field.css';
import { el, svgFromString } from '../../lib/dom';

const ARROW = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
  <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export interface SelectOptions {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  value?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}

export interface SelectHandle {
  root: HTMLElement;
  select: HTMLSelectElement;
}

export function Select(opts: SelectOptions): SelectHandle {
  const { label, name, options, value, disabled, onChange } = opts;

  const id = `px-select-${name}`;
  const select = el(
    'select',
    { class: 'px-field__control', id, name, disabled },
    options.map((o) => el('option', { value: o.value, selected: o.value === value }, [o.label])),
  );

  if (onChange) select.addEventListener('change', () => onChange(select.value));

  const root = el('div', { class: 'px-field' }, [
    el('label', { class: 'px-field__label', for: id }, [label]),
    el('div', { class: 'px-select' }, [
      select,
      el('span', { class: 'px-select__arrow' }, [svgFromString(ARROW)]),
    ]),
  ]);

  return { root, select };
}
