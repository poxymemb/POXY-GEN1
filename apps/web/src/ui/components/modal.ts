import './modal.css';
import { el } from '../../lib/dom';
import { Icon } from '../icons';

/* Modal (centered) and Sheet (bottom, mobile-first). Scrim = vault-abyss
   60%. Focus is trapped while open; Escape and scrim click dismiss. */

export interface ModalOptions {
  title: string;
  content: HTMLElement;
  variant?: 'modal' | 'sheet';
  /** Called after the panel is dismissed and removed. */
  onClose?: () => void;
}

export interface ModalHandle {
  root: HTMLElement;
  close(): void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal(options: ModalOptions): ModalHandle {
  const { title, content, variant = 'modal', onClose } = options;

  const titleId = `px-modal-title-${Math.random().toString(36).slice(2, 8)}`;
  const previouslyFocused = document.activeElement as HTMLElement | null;

  const closeBtn = el(
    'button',
    { class: 'px-modal__close', type: 'button', 'aria-label': 'Close', onclick: () => close() },
    [Icon('close', 18)],
  );

  const panel = el(
    'div',
    {
      class: `px-modal__panel px-modal__panel--${variant}`,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': titleId,
    },
    [
      el('div', { class: 'px-modal__head' }, [
        el('h2', { class: 'px-modal__title t-heading', id: titleId }, [title]),
        closeBtn,
      ]),
      el('div', { class: 'px-modal__body' }, [content]),
    ],
  );

  const root = el('div', { class: `px-modal px-modal--${variant}` }, [
    el('div', { class: 'px-modal__scrim', onclick: () => close() }),
    panel,
  ]);

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function close() {
    document.removeEventListener('keydown', onKeydown);
    root.classList.remove('is-open');
    const remove = () => {
      root.remove();
      previouslyFocused?.focus();
      onClose?.();
    };
    root.addEventListener('transitionend', remove, { once: true });
    window.setTimeout(remove, 420); // reduced-motion fallback
  }

  document.addEventListener('keydown', onKeydown);
  document.body.append(root);
  requestAnimationFrame(() => {
    root.classList.add('is-open');
    (panel.querySelector<HTMLElement>(FOCUSABLE) ?? closeBtn).focus();
  });

  return { root, close };
}

export function Sheet(options: Omit<ModalOptions, 'variant'>): ModalHandle {
  return Modal({ ...options, variant: 'sheet' });
}
