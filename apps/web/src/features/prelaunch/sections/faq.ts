/* FAQ — eight questions, written fully in curator voice (fact then remedy,
   sentence case, no hype). Answers the questions that decide whether a person
   pays honestly: what you get, when, refunds, odds/proof, is this an NFT,
   who is behind it. PROMPT 00 section 10. */
import { el } from '../../../lib/dom';
import { LAUNCH_WINDOW, FOUNDER, COMPANY } from '../config';

interface QA {
  q: string;
  a: string;
}

const FAQ: QA[] = [
  {
    q: 'What do I actually get?',
    a: 'Digital collectible figures with fixed, published run sizes. You open cases, keep the figures you want on a personal Museum shelf, dissolve duplicates into shards, and trade with other collectors. Every figure carries a mint number that is yours.',
  },
  {
    q: 'What is a Founder Pass?',
    a: `A ${FOUNDER.priceLabel} one-time pass, limited to ${FOUNDER.runSize}, with its own mint number kept on your Passport forever. It gives day-one beta access, 500 PX at launch, a Founder frame and your name on the Founding Collectors wall.`,
  },
  {
    q: 'When does it open?',
    a: `Season 1 opens: ${LAUNCH_WINDOW}. This is an honest window, not a fixed date. If it moves, Founders and the waitlist hear it first.`,
  },
  {
    q: 'Can I get a refund?',
    a: 'Yes. The Founder Pass is refundable in full until 30 days after beta opens, on top of the UK 14-day cooling-off period. If the product is not for you once you have played it, you get your money back.',
  },
  {
    q: 'How do I know the openings are fair?',
    a: 'Every case publishes its odds before you spend anything. Every opening is sealed with a commit hash before you roll and can be recomputed on a public verify page afterwards. Run sizes are fixed and public. Proof, not promises.',
  },
  {
    q: 'Is this an NFT or crypto?',
    a: 'No. There is no blockchain, no token, no wallet, no speculation on chain. Figures live in your account. Prices are in pounds. PX cannot be cashed out.',
  },
  {
    q: 'Is it gambling?',
    a: 'Cases contain random figures with published odds, so we treat it with care: 18+ only, spending limits, self-exclusion, no cashing out. A visible pity system guarantees progress toward the rarest tiers instead of chasing near-misses.',
  },
  {
    q: 'Who is behind it?',
    a: `${COMPANY.legalName}, a company registered in the ${COMPANY.jurisdiction}. Payments are handled by Stripe. We are a small team building this in the open.`,
  },
];

function item(qa: QA): HTMLElement {
  return el('details', { class: 'px-faq__item hairline-b px-lp__reveal' }, [
    el('summary', { class: 'px-faq__q t-heading' }, [qa.q]),
    el('p', { class: 'px-faq__a t-body' }, [qa.a]),
  ]);
}

export function faqSection(): HTMLElement {
  return el(
    'section',
    { class: 'px-lp__section px-faq', 'data-env': 'gallery', id: 'px-lp-faq' },
    [
      el('div', { class: 'px-lp__col' }, [
        el('p', { class: 'px-lp__eyebrow t-caption px-lp__reveal' }, ['Straight answers']),
        el('h2', { class: 'px-lp__section-title t-title px-lp__reveal' }, ['Questions worth asking']),
        el('div', { class: 'px-faq__list' }, FAQ.map(item)),
      ]),
    ],
  );
}
