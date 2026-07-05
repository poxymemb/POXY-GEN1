/* Header — page title in Fraunces, balance chips with SG numbers, bell.
   The title is quiet; the numbers are the heroes (Codex §6). */
import './header.css';
import { el } from '../../lib/dom';
import { IconButton } from './icon-button';

const BELL = `<svg viewBox="0 0 20 20" aria-hidden="true">
  <path d="M10 2.5c-2.9 0-5 2.2-5 5.2v2.9l-1.3 2.6a.7.7 0 0 0 .6 1h11.4a.7.7 0 0 0 .6-1L15 10.6V7.7c0-3-2.1-5.2-5-5.2Z M8.3 15.7a1.8 1.8 0 0 0 3.4 0"
    fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export interface BalanceChip {
  id: string;
  /** Formatted amount, e.g. "1,240". */
  value: string;
  /** Caption label, e.g. "PX" or "Shards". */
  label: string;
}

export interface HeaderOptions {
  title: string;
  balances?: BalanceChip[];
  onBell?: () => void;
  onBalanceClick?: (id: string) => void;
}

export interface HeaderHandle {
  root: HTMLElement;
  /** Update a balance chip value (micro-signature #2: chip tick handled
      by motion preset in 02C; this just swaps the text). */
  setBalance(id: string, value: string): void;
}

export function Header(options: HeaderOptions): HeaderHandle {
  const { title, balances = [], onBell, onBalanceClick } = options;

  const values = new Map<string, HTMLElement>();

  const chips = balances.map((chip) => {
    const value = el('span', { class: 'px-header__chip-value' }, [chip.value]);
    values.set(chip.id, value);
    return el(
      'button',
      {
        class: 'px-header__chip',
        type: 'button',
        onclick: onBalanceClick ? () => onBalanceClick(chip.id) : undefined,
      },
      [value, el('span', { class: 'px-header__chip-label' }, [chip.label])],
    );
  });

  const root = el('header', { class: 'px-header' }, [
    el('h1', { class: 'px-header__title' }, [title]),
    el('div', { class: 'px-header__side' }, [
      ...chips,
      onBell ? IconButton({ icon: BELL, label: 'Notifications', onClick: onBell }) : null,
    ]),
  ]);

  return {
    root,
    setBalance(id, value) {
      const node = values.get(id);
      if (node) node.textContent = value;
    },
  };
}
