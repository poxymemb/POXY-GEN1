import './field.css';
import { el, svgFromString } from '../../lib/dom';
import { iconMarkup } from '../icons';

/* The chevron reuses the Sumi 'forward' geometry rotated by CSS
   (see field.css .px-select__arrow) so the whole set stays one hand. */
const ARROW = iconMarkup('forward');

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
