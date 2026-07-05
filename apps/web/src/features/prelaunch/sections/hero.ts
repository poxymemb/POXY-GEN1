/* HERO (Vault) — the star breathing over the abyss. Fraunces display
   headline, one supporting line, two CTAs (primary sky Founder / ghost
   waitlist), and a quiet mono founders counter below (Screen DNA §Open
   environment grammar; PROMPT 00 section 1). One sky accent: the primary CTA. */
import { el } from '../../../lib/dom';
import { Star, Button } from '../../../ui';
import { FOUNDER } from '../config';
import { foundersClaimed, nextFounderMint } from '../mock-state';
import { scrollToSection } from '../nav';

function foundersLine(): string {
  const claimed = foundersClaimed();
  const mint = String(nextFounderMint()).padStart(4, '0');
  return `\u2116 ${mint} of ${FOUNDER.runSize} \u00b7 ${claimed} claimed`;
}

export function heroSection(): HTMLElement {
  const founderBtn = Button({
    label: `Become a Founder \u00b7 ${FOUNDER.priceLabel}`,
    variant: 'primary',
    size: 'l',
    onClick: () => scrollToSection('px-lp-offer'),
  });

  const waitlistBtn = Button({
    label: 'Join the waitlist',
    variant: 'ghost',
    size: 'l',
    onClick: () => scrollToSection('px-lp-waitlist'),
  });

  const star = Star({ size: 96, mode: 'breathe', className: 'px-hero__star', label: 'POXY WORLD' });

  return el(
    'section',
    { class: 'px-lp__section px-hero env-vault', 'data-env': 'vault', id: 'px-lp-hero' },
    [
      el('div', { class: 'px-lp__col px-hero__col' }, [
        el('div', { class: 'px-hero__star-wrap' }, [star]),
        el('p', { class: 'px-hero__wordmark t-caption' }, ['POXY WORLD \u00b7 by AETRYX']),
        el('h1', { class: 'px-hero__title t-display' }, ["Collect what's provably real."]),
        el('p', { class: 'px-hero__sub t-body' }, [
          'Limited runs. Public odds. Verifiable openings. Season 1 \u2014 Japanese Memories.',
        ]),
        el('div', { class: 'px-hero__ctas' }, [founderBtn.root, waitlistBtn.root]),
        el('p', { class: 'px-hero__counter t-mono', id: 'px-hero-counter' }, [foundersLine()]),
      ]),
    ],
  );
}
