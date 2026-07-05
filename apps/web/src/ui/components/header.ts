/* Header — page title in Fraunces, balance chips with SG numbers, bell.
   The title is quiet; the numbers are the heroes (Codex §6). */
import './header.css';
import { el } from '../../lib/dom';
import { IconButton } from './icon-button';
import { iconMarkup } from '../icons';

const BELL = iconMarkup('bell');

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
