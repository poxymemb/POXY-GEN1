/* Pedestal — the museum display unit: a glass card on the gallery ground
   with a soft ground shadow and a Plaque beneath. The sanctioned
   environment-mixing exception; used only in the Museum. */
import './pedestal.css';
import { el } from '../../lib/dom';
import { Plaque, type PlaqueOptions } from './plaque';

export interface PedestalOptions {
  /** The displayed artwork / figure element. */
  content: HTMLElement;
  plaque: PlaqueOptions;
}

export function Pedestal(options: PedestalOptions): HTMLElement {
  const { content, plaque } = options;

  return el('figure', { class: 'px-pedestal' }, [
    el('div', { class: 'px-pedestal__case m-glass' }, [
      content,
      el('span', { class: 'px-pedestal__ground', 'aria-hidden': 'true' }),
    ]),
    el('figcaption', { class: 'px-pedestal__plaque' }, [Plaque(plaque)]),
  ]);
}
