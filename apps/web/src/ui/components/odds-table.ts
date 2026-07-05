/* OddsTable — transparency rendered beautiful (Codex §2, "Proof, not
   promises"). Pigment dots per rarity, SG percentages, hairline rows,
   footer link to the fairness page. Odds are ALWAYS visible pre-purchase. */
import './odds-table.css';
import type { Rarity } from '@poxy/shared';
import { RARITY_LABEL } from '@poxy/shared';
import { el } from '../../lib/dom';

export interface OddsRow {
  rarity: Rarity;
  /** Percentage, e.g. 42.5 */
  percent: number;
}

export interface OddsTableOptions {
  rows: OddsRow[];
  /** Footer action, e.g. navigate to the fairness page. */
  onProofLink?: () => void;
}

export function OddsTable(options: OddsTableOptions): HTMLElement {
  const { rows, onProofLink } = options;

  const list = rows.map((row) =>
    el('div', { class: 'px-odds__row' }, [
      el('span', {
        class: 'px-odds__dot',
        style: `background: var(--px-pigment-${row.rarity})`,
        'aria-hidden': 'true',
      }),
      el('span', { class: 'px-odds__label' }, [RARITY_LABEL[row.rarity]]),
      el('span', { class: 'px-odds__value' }, [`${row.percent.toFixed(row.percent < 1 ? 2 : 1)}%`]),
    ]),
  );

  return el('div', { class: 'px-odds' }, [
    ...list,
    el('div', { class: 'px-odds__footer' }, [
      el(
        'button',
        { class: 'px-odds__proof', type: 'button', onclick: onProofLink as EventListener | undefined },
        ['How we prove fairness \u2192'],
      ),
    ]),
  ]);
}
