/* RarityBadge — pigment dot + Inter caption label. With RarityGem and the
   reveal glow, one of exactly three sanctioned pigment uses (Codex §4). */
import './rarity-badge.css';
import type { Rarity } from '@poxy/shared';
import { RARITY_LABEL } from '@poxy/shared';
import { el } from '../../lib/dom';

export function RarityBadge(rarity: Rarity): HTMLElement {
  return el('span', { class: 'px-rarity-badge' }, [
    el('span', {
      class: 'px-rarity-badge__dot',
      style: `background: var(--px-pigment-${rarity})`,
      'aria-hidden': 'true',
    }),
    el('span', { class: 'px-rarity-badge__label' }, [RARITY_LABEL[rarity]]),
  ]);
}
