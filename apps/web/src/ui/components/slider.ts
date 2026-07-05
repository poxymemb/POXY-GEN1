import './slider.css';
import { el } from '../../lib/dom';

export interface SliderOptions {
  label: string;
  min: number;
  max: number;
  step?: number;
  value?: number;
  disabled?: boolean;
  /** Formats the value readout (SG numbers). Default: String(value). */
  format?: (value: number) => string;
  onChange?: (value: number) => void;
}

export interface SliderHandle {
  root: HTMLElement;
  input: HTMLInputElement;
}

export function Slider(options: SliderOptions): SliderHandle {
  const { label, min, max, step = 1, value = min, disabled, format = String, onChange } = options;

  const input = el('input', {
    class: 'px-slider__input',
    type: 'range',
    min: String(min),
    max: String(max),
    step: String(step),
    disabled,
  });
  input.value = String(value);

  const readout = el('span', { class: 'px-slider__value t-data-m' }, [format(value)]);

  const paint = () => {
    const pct = ((Number(input.value) - min) / (max - min)) * 100;
    input.style.setProperty('--fill', `${pct}%`);
    readout.textContent = format(Number(input.value));
  };
  paint();

  input.addEventListener('input', () => {
    paint();
    onChange?.(Number(input.value));
  });

  const root = el('div', { class: 'px-slider' }, [
    el('div', { class: 'px-slider__head' }, [
      el('span', { class: 'px-field__label' }, [label]),
      readout,
    ]),
    input,
  ]);

  return { root, input };
}
