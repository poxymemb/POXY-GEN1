import './toast.css';
import { el } from '../../lib/dom';

/* Toasts travel up from the bottom (micro-signature #5), read as small ink
   plaques, and never stack beyond three — the quietest possible messenger. */

const MAX_VISIBLE = 3;
const DEFAULT_MS = 3600;

let region: HTMLElement | null = null;

function ensureRegion(): HTMLElement {
  if (!region || !region.isConnected) {
    region = el('div', { class: 'px-toast-region', 'aria-live': 'polite' });
    document.body.append(region);
  }
  return region;
}

export interface ToastOptions {
  message: string;
  /** Optional action, e.g. "Undo". */
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

export function toast(options: ToastOptions): void {
  const { message, actionLabel, onAction, durationMs = DEFAULT_MS } = options;
  const host = ensureRegion();

  while (host.children.length >= MAX_VISIBLE) {
    host.firstElementChild?.remove();
  }

  const item = el('div', { class: 'px-toast' }, [
    el('span', { class: 'px-toast__text' }, [message]),
    actionLabel
      ? el(
          'button',
          {
            class: 'px-toast__action',
            type: 'button',
            onclick: () => {
              onAction?.();
              dismiss();
            },
          },
          [actionLabel],
        )
      : null,
  ]);

  let timer = 0;

  function dismiss() {
    window.clearTimeout(timer);
    item.classList.add('is-leaving');
    item.addEventListener('transitionend', () => item.remove(), { once: true });
    // Reduced motion: transition is 0ms and transitionend may not fire.
    window.setTimeout(() => item.remove(), 400);
  }

  host.append(item);
  requestAnimationFrame(() => item.classList.add('is-open'));
  timer = window.setTimeout(dismiss, durationMs);
}
