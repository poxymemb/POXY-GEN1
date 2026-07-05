/* THE PROMISE (Gallery) — "Proof, not promises." Three columns with real
   codex artifacts: the OddsTable (published odds), a Verify verdict mock
   (public for every opening), and a run-size plaque (limited runs). This is
   where the honesty pillar stops being a slogan and becomes evidence. */
import { el } from '../../../lib/dom';
import { OddsTable, Plaque } from '../../../ui';
import { scrollToSection } from '../nav';

function oddsCard(): HTMLElement {
  // Season 1 Gold case odds (illustrative, published-style). The DB owns the
  // authoritative numbers at launch; the shape is the point here.
  const odds = OddsTable({
    rows: [
      { rarity: 'common', percent: 58 },
      { rarity: 'uncommon', percent: 27 },
      { rarity: 'rare', percent: 10 },
      { rarity: 'epic', percent: 3.6 },
      { rarity: 'legendary', percent: 1.2 },
      { rarity: 'mythic', percent: 0.2 },
    ],
    onProofLink: () => scrollToSection('px-lp-faq'),
  });

  return el('article', { class: 'px-promise__card m-paper m-paper-raised px-lp__reveal' }, [
    el('h3', { class: 'px-promise__card-title t-heading' }, ['Odds you can read']),
    el('p', { class: 'px-promise__card-note t-caption' }, [
      'Every case shows its odds before you spend a thing. Gold case, Season 1.',
    ]),
    odds,
  ]);
}

function verifyCard(): HTMLElement {
  const verify = el('div', { class: 'px-promise__verify' }, [
    el('div', { class: 'px-promise__verify-row' }, [
      el('span', { class: 't-caption' }, ['server seed hash']),
      el('span', { class: 't-mono' }, ['a3f81c\u2026e92d']),
    ]),
    el('div', { class: 'px-promise__verify-row' }, [
      el('span', { class: 't-caption' }, ['client seed']),
      el('span', { class: 't-mono' }, ['7f04\u2026b6c1']),
    ]),
    el('div', { class: 'px-promise__verify-row' }, [
      el('span', { class: 't-caption' }, ['nonce']),
      el('span', { class: 't-mono' }, ['0008']),
    ]),
  ]);

  return el('article', { class: 'px-promise__card m-paper m-paper-raised px-lp__reveal' }, [
    el('h3', { class: 'px-promise__card-title t-heading' }, ['Openings you can check']),
    el('p', { class: 'px-promise__card-note t-caption' }, [
      'The result is sealed before you roll. This page will be public for every opening.',
    ]),
    verify,
  ]);
}

function runCard(): HTMLElement {
  return el('article', { class: 'px-promise__card m-paper m-paper-raised px-lp__reveal' }, [
    el('h3', { class: 'px-promise__card-title t-heading' }, ['Runs you can count']),
    el('p', { class: 'px-promise__card-note t-caption' }, [
      'Every figure is printed in a fixed run. When it is gone, it is gone.',
    ]),
    el('div', { class: 'px-promise__runline' }, [
      Plaque({ mint: 142, run: 2500 }),
      el('span', { class: 't-caption' }, ['Kaze no Katana \u00b7 legendary run 250']),
    ]),
  ]);
}

export function promiseSection(): HTMLElement {
  return el(
    'section',
    { class: 'px-lp__section px-promise', 'data-env': 'gallery', id: 'px-lp-promise' },
    [
      el('div', { class: 'px-lp__col' }, [
        el('p', { class: 'px-lp__eyebrow t-caption px-lp__reveal' }, ['The pillar']),
        el('h2', { class: 'px-lp__section-title t-title px-lp__reveal' }, ['Proof, not promises']),
        el('p', { class: 'px-lp__lead t-body px-lp__reveal' }, [
          'A gacha you can trust is a contradiction in this industry. We resolve it with three things anyone can inspect.',
        ]),
        el('div', { class: 'px-promise__grid' }, [oddsCard(), verifyCard(), runCard()]),
      ]),
    ],
  );
}
