/* SEASON 1 WALL — the 24-figure grid as silhouettes (the mystery layer).
   Each card shows a rarity gem + run size + the name obscured as "???"
   except the already-revealed figures. Tapping a hidden card opens a sheet
   with its rarity, run size and one lore fragment (partially inked) —
   enough to speculate on. A quiet "next unveiling" date sits above the wall
   (a date, never a ticking-seconds pressure timer). */
import { el } from '../../../lib/dom';
import { RarityGem, RarityBadge, FigureCard, Sheet } from '../../../ui';
import { RARITY_LABEL } from '@poxy/shared';
import { SEASON_ONE, daysUntilNextUnveiling, type SeasonFigure } from '../season-one';

const num = (n: number) => n.toLocaleString('en-GB');

/** Deterministic partial redaction of a lore line: keep short words and the
    first word of each clause, brush-redact the rest. Full line on reveal. */
function redactLore(lore: string): HTMLElement {
  const words = lore.split(' ');
  return el(
    'p',
    { class: 'px-wall__lore t-body' },
    words.map((word, i) => {
      const bare = word.replace(/[.,;]/g, '');
      const keep = i === 0 || bare.length <= 3 || i % 4 === 0;
      if (keep) return el('span', {}, [`${word} `]);
      return el('span', { class: 'px-wall__redact', 'aria-hidden': 'true' }, [`${word} `]);
    }),
  );
}

function openFigureSheet(fig: SeasonFigure): void {
  const content = el('div', { class: 'px-wall__sheet' }, [
    el('div', { class: 'px-wall__sheet-head' }, [
      RarityGem({ rarity: fig.rarity, size: 'l', labelled: true }),
      RarityBadge(fig.rarity),
    ]),
    el('p', { class: 'px-wall__sheet-run t-data-m' }, [`Run ${num(fig.runSize)}`]),
    fig.revealed ? el('p', { class: 'px-wall__lore t-body' }, [fig.lore]) : redactLore(fig.lore),
    el('p', { class: 'px-wall__sheet-note t-caption' }, [
      fig.revealed
        ? 'Unveiled. Its full record opens with the season.'
        : 'The curator unveils one figure each week.',
    ]),
  ]);

  Sheet({
    title: fig.revealed ? fig.name : `${RARITY_LABEL[fig.rarity]} \u00b7 unrevealed`,
    content,
  });
}

function card(fig: SeasonFigure): HTMLElement {
  if (fig.revealed) {
    return FigureCard({
      name: fig.name,
      rarity: fig.rarity,
      run: fig.runSize,
      remaining: fig.runSize,
      state: 'unowned',
      onClick: () => openFigureSheet(fig),
    });
  }
  // Hidden card: name obscured as "???", gem + run size visible to speculate.
  return FigureCard({
    name: '???',
    rarity: fig.rarity,
    run: fig.runSize,
    remaining: fig.runSize,
    state: 'unowned',
    onClick: () => openFigureSheet(fig),
  });
}

export function seasonWallSection(): HTMLElement {
  const days = daysUntilNextUnveiling();
  const revealed = SEASON_ONE.filter((f) => f.revealed).length;

  const grid = el(
    'div',
    { class: 'px-wall__grid' },
    SEASON_ONE.map((fig) => el('div', { class: 'px-wall__cell px-lp__reveal' }, [card(fig)])),
  );

  return el(
    'section',
    { class: 'px-lp__section px-wall', 'data-env': 'gallery', id: 'px-lp-wall' },
    [
      el('div', { class: 'px-lp__col' }, [
        el('p', { class: 'px-lp__eyebrow t-caption px-lp__reveal' }, ['Season 1 \u00b7 Japanese Memories']),
        el('h2', { class: 'px-lp__section-title t-title px-lp__reveal' }, ['Twenty-four figures. Four already in the light.']),
        el('div', { class: 'px-wall__meta px-lp__reveal' }, [
          el('span', { class: 't-data-m' }, [`${revealed} / 24 unveiled`]),
          el('span', { class: 't-caption' }, [`Next unveiling in ${days} days`]),
        ]),
        el('p', { class: 'px-lp__lead t-body px-lp__reveal' }, [
          'The curator unveils one figure each week. Tap any silhouette for its rarity, its run and a fragment of its story.',
        ]),
        grid,
      ]),
    ],
  );
}
