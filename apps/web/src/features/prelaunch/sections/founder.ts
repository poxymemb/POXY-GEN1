/* FOUNDER PASS (Gallery, the offer) — the strongest demand signal: real
   money for a product still in development, sold honestly. Styled as a
   certificate. Carries the honesty frame verbatim, the refund promise, the
   ASA-safe disclosure and the £ price. When sales are disabled (kill switch)
   the page degrades to waitlist-only with honest copy — never a dead button.
   The Stripe checkout is wired in Step 1; here it is a mock intent. */
import { el } from '../../../lib/dom';
import { Button, Star, Plaque, toast } from '../../../ui';
import {
  FOUNDER,
  ASA_DISCLOSURE,
  REFUND_PROMISE,
  LAUNCH_WINDOW,
  FOUNDER_SALES_ENABLED,
} from '../config';
import { nextFounderMint, foundersRemaining } from '../mock-state';
import { scrollToSection } from '../nav';

const num = (n: number) => n.toLocaleString('en-GB');

function contentsList(): HTMLElement {
  return el(
    'ul',
    { class: 'px-founder__contents' },
    FOUNDER.contents.map((line) =>
      el('li', { class: 'px-founder__content' }, [
        Star({ size: 12, className: 'px-founder__bullet' }),
        el('span', { class: 't-body' }, [line]),
      ]),
    ),
  );
}

export function founderSection(): HTMLElement {
  const remaining = foundersRemaining();
  const mint = String(nextFounderMint()).padStart(4, '0');

  const cta = FOUNDER_SALES_ENABLED
    ? Button({
        label: `Become a Founder \u00b7 ${FOUNDER.priceLabel}`,
        variant: 'primary',
        size: 'l',
        onClick: () =>
          toast({
            message: 'Checkout opens with Season 1 sign-up. Your card is not charged yet.',
          }),
      })
    : Button({
        label: 'Join the waitlist',
        variant: 'primary',
        size: 'l',
        onClick: () => scrollToSection('px-lp-waitlist'),
      });

  const card = el('article', { class: 'px-founder__card m-paper m-paper-raised m-paper--grain' }, [
    el('div', { class: 'px-founder__head' }, [
      el('p', { class: 'px-founder__eyebrow t-caption' }, ['Founder Pass']),
      Plaque({ mint: nextFounderMint(), run: FOUNDER.runSize }),
    ]),
    el('h3', { class: 'px-founder__title t-title' }, ['One of the first five hundred']),
    el('p', { class: 'px-founder__scarcity t-data-m' }, [
      `${num(remaining)} remaining \u00b7 next \u2116 ${mint} of ${FOUNDER.runSize}`,
    ]),
    contentsList(),
    el('div', { class: 'px-founder__price' }, [
      el('span', { class: 't-data-l' }, [FOUNDER.priceLabel]),
      el('span', { class: 'px-founder__price-cap t-caption' }, ['one-time \u00b7 one per account']),
    ]),
    cta.root,
    el('p', { class: 'px-founder__fallback t-caption' }, [
      'Not ready? ',
      el('button', {
        class: 'px-founder__fallback-link',
        type: 'button',
        onclick: () => scrollToSection('px-lp-waitlist'),
      }, ['Join the waitlist below.']),
    ]),
  ]);

  // The honesty frame — verbatim, plainly stated, next to the price.
  const honesty = el('div', { class: 'px-founder__honesty hairline-t' }, [
    el('p', { class: 't-caption' }, [
      `POXY WORLD is in development. Season 1 opens: ${LAUNCH_WINDOW}. This is early access, not a finished product.`,
    ]),
    el('p', { class: 't-caption' }, [REFUND_PROMISE]),
    el('p', { class: 'px-founder__asa t-caption' }, [ASA_DISCLOSURE]),
    el('p', { class: 'px-founder__age t-caption' }, ['18+ only. Play responsibly.']),
  ]);

  return el(
    'section',
    { class: 'px-lp__section px-founder', 'data-env': 'gallery', id: 'px-lp-offer' },
    [
      el('div', { class: 'px-lp__col' }, [
        el('p', { class: 'px-lp__eyebrow t-caption px-lp__reveal' }, ['The offer']),
        el('h2', { class: 'px-lp__section-title t-title px-lp__reveal' }, ['Back it before it exists']),
        el('p', { class: 'px-lp__lead t-body px-lp__reveal' }, [
          'The honest test of whether this should exist is whether anyone will pay for it. A Founder Pass is that test, and your place in it.',
        ]),
        el('div', { class: 'px-founder__reveal px-lp__reveal' }, [card, honesty]),
      ]),
    ],
  );
}
