import './button.css';
import { el } from '../../lib/dom';
import { Star } from './star';

export interface ButtonOptions {
  label: string;
  /** primary = sky action · ghost = ink outline · danger = functional */
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'm' | 'l';
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: (event: MouseEvent) => void;
}

export interface ButtonHandle {
  root: HTMLButtonElement;
  /** Loading swaps the label for the star spinner (the only spinner). */
  setLoading(loading: boolean): void;
  setDisabled(disabled: boolean): void;
}

export function Button(options: ButtonOptions): ButtonHandle {
  const { label, variant = 'primary', size = 'm', disabled, type = 'button', onClick } = options;

  const text = el('span', { class: 'px-btn__label' }, [label]);
  const root = el(
    'button',
    { class: `px-btn px-btn--${variant} px-btn--${size}`, type, disabled, onclick: onClick as EventListener },
    [text],
  );

  let spinner: HTMLElement | null = null;

  return {
    root,
    setLoading(loading) {
      root.classList.toggle('is-loading', loading);
      root.disabled = loading || root.hasAttribute('data-locked');
      if (loading && !spinner) {
        spinner = Star({ size: 12, mode: 'spin' });
        root.prepend(spinner);
      } else if (!loading && spinner) {
        spinner.remove();
        spinner = null;
      }
    },
    setDisabled(value) {
      root.toggleAttribute('data-locked', value);
      root.disabled = value;
    },
  };
}
