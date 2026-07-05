/* EmptyState — empty states are invitations (Codex §9): star outline at
   10% ink, one Fraunces line, one ghost action. Never a sad face.
   Poetic copy lives in ui/copy/states.ts; pass `variant` to use it. */
import './empty-state.css';
import { el } from '../../lib/dom';
import { Star } from './star';
import { Button } from './button';
import { STATES, type StateVariant } from '../copy/states';

export interface EmptyStateOptions {
  /** Curated copy variant (preferred). Explicit fields override it. */
  variant?: StateVariant;
  /** One inviting Fraunces line, e.g. "The shelves are ready." */
  message?: string;
  /** Quieter caption under the message. */
  sub?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState(options: EmptyStateOptions): HTMLElement {
  const base = options.variant ? STATES[options.variant] : undefined;
  const message = options.message ?? base?.message ?? '';
  const sub = options.sub ?? base?.sub;
  const actionLabel = options.actionLabel ?? base?.actionLabel;

  return el('div', { class: 'px-empty' }, [
    Star({ size: 48, className: 'px-empty__star' }),
    el('p', { class: 'px-empty__message' }, [message]),
    sub ? el('p', { class: 'px-empty__sub t-caption' }, [sub]) : null,
    actionLabel
      ? Button({ label: actionLabel, variant: 'ghost', onClick: () => options.onAction?.() }).root
      : null,
  ]);
}
