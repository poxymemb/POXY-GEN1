import './toggle.css';
import { el } from '../../lib/dom';

export interface ToggleOptions {
  label: string;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}

export function Toggle(options: ToggleOptions): HTMLLabelElement {
  const { label, checked = false, disabled, onChange } = options;

  const input = el('input', { class: 'px-toggle__input', type: 'checkbox', disabled });
  input.checked = checked;
  if (onChange) input.addEventListener('change', () => onChange(input.checked));

  return el('label', { class: 'px-toggle' }, [
    input,
    el('span', { class: 'px-toggle__track', 'aria-hidden': 'true' }, [
      el('span', { class: 'px-toggle__thumb' }),
    ]),
    el('span', { class: 'px-toggle__label' }, [label]),
  ]);
}
