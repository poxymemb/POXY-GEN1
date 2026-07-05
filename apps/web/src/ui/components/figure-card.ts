/* FigureCard — the catalog plate: locked 3:4, artwork slot, Fraunces name,
   plaque strip. Placeholder art direction: a pigment-tinted star gem on the
   env surface at 8% — placeholders must already look intentional. */
import './figure-card.css';
import type { Rarity } from '@poxy/shared';
import { el } from '../../lib/dom';
import { RarityGem } from './rarity-gem';
import { formatMint } from './plaque';

export interface FigureCardOptions {
  name: string;
  rarity: Rarity;
  mint?: number;
  run: number;
  /** owned (default) · unowned (grayscale + dashed) · new (sky dot) */
  state?: 'owned' | 'unowned' | 'new';
  /** Artwork element (image etc.). Omitted = intentional placeholder. */
  artwork?: HTMLElement;
  onClick?: () => void;
}

export function FigureCard(options: FigureCardOptions): HTMLElement {
  const { name, rarity, mint, run, state = 'owned', artwork, onClick } = options;

  const art = el('div', { class: 'px-figure-card__art', 'data-rive-slot': '' }, [
    artwork ?? el('div', { class: 'px-figure-card__placeholder' }, [RarityGem({ rarity, size: 'l' })]),
  ]);

  const plaqueText =
    state === 'unowned' || mint === undefined
      ? `${run.toLocaleString('en-GB')} minted`
      : formatMint(mint, run);

  const root = el(
    onClick ? 'button' : 'article',
    {
      class: `px-figure-card px-figure-card--${state}`,
      type: onClick ? 'button' : undefined,
      onclick: onClick as EventListener | undefined,
    },
    [
      state === 'new' ? el('span', { class: 'px-figure-card__new-dot', 'aria-hidden': 'true' }) : null,
      art,
      el('div', { class: 'px-figure-card__meta' }, [
        el('span', { class: 'px-figure-card__name' }, [name]),
        el('span', { class: 'px-figure-card__plaque' }, [plaqueText]),
      ]),
    ],
  );

  return root as HTMLElement;
}
