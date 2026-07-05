import './field.css';
import { el } from '../../lib/dom';

export interface InputOptions {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'search';
  placeholder?: string;
  value?: string;
  disabled?: boolean;
  autocomplete?: string;
  onInput?: (value: string) => void;
}

export interface InputHandle {
  root: HTMLElement;
  input: HTMLInputElement;
  /** Errors state fact then remedy; empty string clears. */
  setError(message: string): void;
}

export function Input(options: InputOptions): InputHandle {
  const { label, name, type = 'text', placeholder, value, disabled, autocomplete, onInput } = options;

  const id = `px-input-${name}`;
  const input = el('input', {
    class: 'px-field__control',
    id,
    name,
    type,
    placeholder,
    value,
    disabled,
    autocomplete,
  });

  if (onInput) input.addEventListener('input', () => onInput(input.value));

  const error = el('p', { class: 'px-field__error', role: 'alert', hidden: true });
  const root = el('div', { class: 'px-field' }, [
    el('label', { class: 'px-field__label', for: id }, [label]),
    input,
    error,
  ]);

  return {
    root,
    input,
    setError(message) {
      error.textContent = message;
      error.hidden = message.length === 0;
      root.classList.toggle('has-error', message.length > 0);
      input.setAttribute('aria-invalid', String(message.length > 0));
    },
  };
}
