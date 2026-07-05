/* StatNumber — numbers are heroes (Codex §6): SG data-l value with an
   Inter caption beneath. */
import './stat-number.css';
import { el } from '../../lib/dom';

export interface StatNumberOptions {
  value: string;
  caption: string;
  size?: 'm' | 'l';
}

export interface StatNumberHandle {
  root: HTMLElement;
  /** Update the displayed value (e.g. after a countUp). */
  setValue(value: string): void;
}

export function StatNumber(options: StatNumberOptions): StatNumberHandle {
  const { value, caption, size = 'l' } = options;

  const num = el('span', { class: size === 'l' ? 't-data-l' : 't-data-m' }, [value]);
  const root = el('div', { class: 'px-stat' }, [
    num,
    el('span', { class: 'px-stat__caption' }, [caption]),
  ]);

  return {
    root,
    setValue(next) {
      num.textContent = next;
    },
  };
}
