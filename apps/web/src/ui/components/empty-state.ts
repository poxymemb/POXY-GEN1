/* EmptyState — empty states are invitations (Codex §9): star outline at
   10% ink, one Fraunces line, one ghost action. Never a sad face. */
import './empty-state.css';
import { el } from '../../lib/dom';
import { Star } from './star';
import { Button } from './button';

export interface EmptyStateOptions {
  /** One inviting Fraunces line, e.g. "The shelves are ready." */
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState(options: EmptyStateOptions): HTMLElement {
  const { message, actionLabel, onAction } = options;

  return el('div', { class: 'px-empty' }, [
    Star({ size: 48, className: 'px-empty__star' }),
    el('p', { class: 'px-empty__message' }, [message]),
    actionLabel
      ? Button({ label: actionLabel, variant: 'ghost', onClick: () => onAction?.() }).root
      : null,
  ]);
}
