/* #/codex — the living styleguide. Dev-only (excluded from production by
   the import guard in main.ts). 02C upgrades this stub into the full
   Living Codex with motion demos. */
import './codex-page.css';
import '../ui/materials.css';
import { el } from '../lib/dom';
import { RARITIES } from '@poxy/shared';
import {
  Star, Button, IconButton, Chip, Input, Select, Toggle, Slider, Tabs,
  SegmentedControl, Tooltip, toast, Modal, Sheet, RarityGem, RarityBadge,
  FigureCard, Plaque, StatNumber, PityRing, OddsTable, Pedestal, NavRail,
  TabBar, EmptyState, Header,
} from '../ui';
// Direct import, not via barrel: the codex page demos the Seal in its
// sanctioned context (a verify verdict mock). Features must not copy this.
import { Seal } from '../ui/components/seal';
import { openRitual } from '../ui/motion/ritual';
import { lightsDown, lightsUp, sparkle, travel, chipTick } from '../ui/motion';

const ICON_HOME = `<svg viewBox="0 0 22 22" aria-hidden="true"><path d="M4 10.5 11 4l7 6.5V18a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1v-7.5Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
const ICON_GRID = `<svg viewBox="0 0 22 22" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="12" y="4" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="12" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="12" y="12" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
const ICON_OPEN = `<svg viewBox="0 0 22 22" aria-hidden="true"><path d="M5 8h12v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8Zm-1-3h14v3H4V5Zm5 6h4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
const ICON_MARKET = `<svg viewBox="0 0 22 22" aria-hidden="true"><path d="M4 9l1.2-4h11.6L18 9M4 9h14M4 9v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9m-9 4h4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;

function section(id: string, title: string, note: string | null, ...content: HTMLElement[]): HTMLElement {
  return el('section', { class: 'cx-section', id: `cx-${id}` }, [
    el('h2', { class: 'cx-section__title t-heading' }, [title]),
    note ? el('p', { class: 'cx-section__note t-caption' }, [note]) : null,
    el('div', { class: 'cx-section__body' }, content),
  ]);
}

const CHAPTERS: Array<[string, string]> = [
  ['philosophy', 'Philosophy'],
  ['star', 'Star'],
  ['pigments', 'Pigments'],
  ['type', 'Type'],
  ['materials', 'Materials'],
  ['components', 'Components'],
  ['motion', 'Motion'],
  ['dna', 'Screen DNA'],
];

function row(...items: Array<HTMLElement | string>): HTMLElement {
  return el(
    'div',
    { class: 'cx-row' },
    items.map((i) => (typeof i === 'string' ? el('span', { class: 't-caption' }, [i]) : i)),
  );
}

function swatch(name: string, cssVar: string): HTMLElement {
  return el('div', { class: 'cx-swatch' }, [
    el('span', { class: 'cx-swatch__chip', style: `background: var(${cssVar})` }),
    el('span', { class: 'cx-swatch__name t-mono' }, [name]),
  ]);
}

export function renderCodexPage(host: HTMLElement): void {
  host.textContent = '';

  const page = el('div', { class: 'cx-page', 'data-env': 'gallery' });

  // --- head with env toggle: the one sky accent of this page lives in
  // the controls, so demo compositions below stay honest.
  const envSwitch = SegmentedControl({
    segments: [
      { id: 'gallery', label: 'Gallery' },
      { id: 'vault', label: 'Vault' },
    ],
    active: 'gallery',
    onChange: (id) => {
      page.setAttribute('data-env', id);
      page.classList.toggle('env-vault', id === 'vault');
    },
  });

  page.append(
    el('header', { class: 'cx-head' }, [
      el('div', {}, [
        el('h1', { class: 'cx-title t-title' }, ['The POXY Codex']),
        el('p', { class: 't-caption' }, ['Living styleguide. Still Water v1.1. Dev build only.']),
      ]),
      envSwitch.root,
    ]),
    el(
      'nav',
      { class: 'cx-chapters', 'aria-label': 'Codex chapters' },
      CHAPTERS.map(([id, label]) =>
        el('a', { class: 'cx-chapters__link', href: `#cx-${id}`, onclick: (e: Event) => {
          e.preventDefault();
          document.getElementById(`cx-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } }, [label]),
      ),
    ),
  );

  // --- philosophy pull-quotes (from docs/10-BRAND.md)
  page.append(
    section(
      'philosophy',
      '静水 Still Water',
      'The design law. Full text: docs/10-BRAND.md.',
      el('blockquote', { class: 'cx-quote' }, [
        el('p', { class: 'cx-quote__line' }, ['A still water surface with depth beneath. Anticipation lives in silence, not noise.']),
      ]),
      el('blockquote', { class: 'cx-quote' }, [
        el('p', { class: 'cx-quote__line' }, ['Would this exist in a quiet museum, or only in a casino? If casino — delete it.']),
      ]),
      el('blockquote', { class: 'cx-quote' }, [
        el('p', { class: 'cx-quote__line' }, ['Quiet is what makes the reveal loud. The number is the drama.']),
      ]),
    ),
  );

  // --- type ramp
  page.append(
    section(
      'type',
      'Type — the museum voice',
      'Max three faces per screen. Fraunces and Space Grotesk never share a line.',
      el('p', { class: 't-display' }, ['Kaze no Katana']),
      el('p', { class: 't-title' }, ['Season one, Japanese Memories']),
      el('p', { class: 't-heading' }, ['Provenance and runs']),
      el('p', { class: 't-body' }, ['The shelf keeps what the water decides. Each figure carries its number.']),
      el('p', { class: 't-caption' }, ['Opened 12 Mar 2026, verified']),
      row(el('span', { class: 't-data-l' }, ['2,500']), el('span', { class: 't-data-m' }, ['0.40%'])),
      el('p', { class: 't-mono' }, ['c0mm1t 7f3a…9d21 / \u2116 0142']),
    ),
  );

  // --- pigments
  page.append(
    section(
      'pigments',
      'Pigments — quarantined',
      'Gems, badges, reveal glow. Nowhere else.',
      row(...RARITIES.map((r) => RarityGem({ rarity: r, size: 'l', labelled: true }))),
      row(...RARITIES.map((r) => RarityBadge(r))),
      row(...['common', 'rare', 'mythic'].map((r) => swatch(`pigment-${r}`, `--px-pigment-${r}`))),
    ),
  );

  // --- materials
  page.append(
    section(
      'materials',
      'Materials',
      'Paper, glass, ink. Hairlines draw walls; shadows stay soft.',
      el('div', { class: 'cx-materials' }, [
        el('div', { class: 'm-paper cx-material' }, [el('span', { class: 't-caption' }, ['m-paper'])]),
        el('div', { class: 'm-paper-raised cx-material' }, [el('span', { class: 't-caption' }, ['m-paper-raised'])]),
        el('div', { class: 'm-paper-raised m-paper--grain cx-material' }, [el('span', { class: 't-caption' }, ['m-paper--grain'])]),
        el('div', { class: 'm-glass cx-material' }, [el('span', { class: 't-caption' }, ['m-glass'])]),
        el('div', { class: 'm-ink cx-material' }, [el('span', { class: 't-caption' }, ['m-ink'])]),
      ]),
      row(Plaque({ mint: 142, run: 2500 }), Plaque({ mint: 17, run: 250, provenance: 'Opened 12 Mar 2026' })),
    ),
  );

  // --- the star
  page.append(
    section(
      'star',
      'The Star',
      'The only decorative glyph. Spin is the only spinner.',
      row(
        Star({ size: 40 }),
        Star({ size: 24 }),
        Star({ size: 16 }),
        Star({ size: 24, mode: 'spin', label: 'Loading' }),
        Star({ size: 24, mode: 'breathe' }),
      ),
    ),
  );

  // --- buttons & controls
  const loadingDemo = Button({ label: 'Open case', size: 'l' });
  loadingDemo.setLoading(true);

  page.append(
    section(
      'components',
      'Buttons',
      'One primary per viewport. Danger is quiet by default; solid danger lives only inside confirmation sheets.',
      row(
        Button({ label: 'Open case' }).root,
        Button({ label: 'View odds', variant: 'ghost' }).root,
        Button({
          label: 'Dissolve',
          variant: 'danger',
          onClick: () =>
            Sheet({
              title: 'Confirm dissolve',
              content: el('div', {}, [
                el('p', { class: 't-body' }, ['Dissolving returns 60 shards. The figure and its number are gone for good.']),
                el('div', { class: 'cx-row', style: 'margin-top:16px' }, [
                  Button({ label: 'Dissolve', variant: 'danger-solid' }).root,
                  Button({ label: 'Keep it', variant: 'ghost' }).root,
                ]),
              ]),
            }),
        }).root,
      ),
      row(
        loadingDemo.root,
        (() => { const b = Button({ label: 'Unavailable' }); b.setDisabled(true); return b.root; })(),
        IconButton({ icon: ICON_MARKET, label: 'Market' }),
      ),
    ),
  );

  const input = Input({ label: 'Display name', name: 'demo-name', placeholder: 'How the museum lists you' });
  const inputErr = Input({ label: 'Email', name: 'demo-email', type: 'email', value: 'not-an-email' });
  inputErr.setError("That doesn't look like an email. Check the address.");

  page.append(
    section(
      'fields',
      'Fields & selection',
      null,
      el('div', { class: 'cx-grid-2' }, [
        input.root,
        inputErr.root,
        Select({
          label: 'Sort by',
          name: 'demo-sort',
          options: [
            { value: 'newest', label: 'Newest first' },
            { value: 'rarity', label: 'Rarity' },
            { value: 'number', label: 'Lowest mint number' },
          ],
        }).root,
        Slider({ label: 'Open count', min: 1, max: 10, value: 3, format: (v) => `\u00d7${v}` }).root,
      ]),
      row(
        Chip({ label: 'All', selected: true, onToggle: () => {} }),
        Chip({ label: 'Owned', onToggle: () => {} }),
        Chip({ label: 'Missing', onToggle: () => {} }),
        Toggle({ label: 'Reduce motion', onChange: () => {} }),
      ),
      row(
        Tabs({ tabs: [ { id: 'all', label: 'Season wall' }, { id: 'club', label: 'Club' }, { id: 'trades', label: 'Trades' } ] }).root,
      ),
      row(
        Tooltip({ anchor: Button({ label: 'Hover me', variant: 'ghost' }).root, text: 'Tooltips state facts.' }),
        Button({
          label: 'Show toast',
          variant: 'ghost',
          onClick: () => toast({ message: 'Figure moved to your museum.', actionLabel: 'Undo', onAction: () => {} }),
        }).root,
        Button({
          label: 'Open modal',
          variant: 'ghost',
          onClick: () =>
            Modal({
              title: 'Confirm dissolve',
              content: el('div', {}, [
                el('p', { class: 't-body' }, ['Dissolving returns 60 shards. The figure and its number are gone for good.']),
                el('div', { class: 'cx-row', style: 'margin-top:16px' }, [
                  Button({ label: 'Dissolve', variant: 'danger-solid' }).root,
                  Button({ label: 'Keep it', variant: 'ghost' }).root,
                ]),
              ]),
            }),
        }).root,
        Button({
          label: 'Open sheet',
          variant: 'ghost',
          onClick: () =>
            Sheet({
              title: 'Result',
              content: el('p', { class: 't-body' }, ['Sheets travel up from the bottom in Current tempo.']),
            }),
        }).root,
      ),
    ),
  );

  // --- figure cards
  page.append(
    section(
      'cards',
      'Figure cards',
      'Locked 3:4. Placeholders look intentional. Absence is designed.',
      el('div', { class: 'cx-cards' }, [
        FigureCard({ name: 'Kaze no Katana', rarity: 'legendary', mint: 17, run: 250, state: 'new', onClick: () => {} }),
        FigureCard({ name: 'Koi no Yoru', rarity: 'rare', mint: 402, run: 1800, onClick: () => {} }),
        FigureCard({ name: 'Tsuki Usagi', rarity: 'common', run: 2500, remaining: 1203, state: 'unowned' }),
        FigureCard({ name: 'Hoshi no Ko', rarity: 'epic', run: 800, remaining: 0, state: 'unowned' }),
      ]),
    ),
  );

  // --- numbers
  const pity = PityRing({ current: 27, threshold: 30 });
  page.append(
    section(
      'numbers',
      'Numbers are heroes',
      'StatNumber, PityRing (quiet pulse at 90%), OddsTable with proof footer.',
      row(
        StatNumber({ value: '17/24', caption: 'Season wall' }).root,
        StatNumber({ value: '4,120', caption: 'Collector score' }).root,
        pity.root,
        Button({ label: '+1 open', variant: 'ghost', onClick: () => pity.setProgress(28 + Math.floor(Math.random() * 2)) }).root,
      ),
      OddsTable({
        rows: [
          { rarity: 'common', percent: 51.2 },
          { rarity: 'uncommon', percent: 28 },
          { rarity: 'rare', percent: 14 },
          { rarity: 'epic', percent: 5 },
          { rarity: 'legendary', percent: 1.4 },
          { rarity: 'mythic', percent: 0.4 },
        ],
        onProofLink: () => toast({ message: 'The fairness page arrives with PROMPT 04.' }),
      }),
    ),
  );

  // --- motion: the ritual and the transition
  const demoRitual = (rarity: 'common' | 'rare' | 'legendary' | 'mythic', name: string, run: number) => () =>
    openRitual(
      {
        figureName: name,
        rarity,
        mint: Math.ceil(Math.random() * run),
        run,
        commitHash: 'a3f81c…e92d 7f04…b6c1 sha-256',
        dissolveYield: { common: 10, rare: 60, legendary: 400, mythic: 1000 }[rarity],
      },
      { onVerify: () => toast({ message: 'Verify opens the fairness page (PROMPT 04).' }) },
    );

  const lightsBox = el('div', { class: 'cx-lights-demo m-paper-raised' }, [
    el('p', { class: 't-body', style: 'padding: 16px' }, ['A gallery scene. Press the button to walk into the vault.']),
  ]);
  let lightsState: 'gallery' | 'vault' = 'gallery';

  page.append(
    section(
      'motion',
      'Motion — water & light',
      'The Open Ritual (tap during the Still skips to Emergence; the Oath never skips). lightsDown/lightsUp is THE route transition.',
      row(
        Button({ label: 'Ritual: Common', variant: 'ghost', onClick: demoRitual('common', 'Tsuki Usagi', 2500) }).root,
        Button({ label: 'Ritual: Rare', variant: 'ghost', onClick: demoRitual('rare', 'Koi no Yoru', 1800) }).root,
        Button({ label: 'Ritual: Legendary', onClick: demoRitual('legendary', 'Kaze no Katana', 250) }).root,
        Button({ label: 'Ritual: Mythic', variant: 'ghost', onClick: demoRitual('mythic', 'Akane no Ryu', 100) }).root,
      ),
      lightsBox,
      row(
        Button({
          label: 'lightsDown / lightsUp',
          variant: 'ghost',
          onClick: () => {
            const swap = (env: 'gallery' | 'vault', text: string) => () => {
              lightsBox.className = `cx-lights-demo ${env === 'vault' ? 'm-glass' : 'm-paper-raised'}`;
              lightsBox.setAttribute('data-env', env);
              const p = el('p', { class: 't-body', style: 'padding: 16px' }, [text]);
              lightsBox.textContent = '';
              lightsBox.append(p);
              return lightsBox;
            };
            if (lightsState === 'gallery') {
              lightsState = 'vault';
              void lightsDown({ outgoing: lightsBox, swap: swap('vault', 'The vault. Dark water, one light.') });
            } else {
              lightsState = 'gallery';
              void lightsUp({ outgoing: lightsBox, swap: swap('gallery', 'Back in the gallery. Museum morning.') });
            }
          },
        }).root,
        Button({
          label: 'sparkle()',
          variant: 'ghost',
          onClick: () => void sparkle(lightsBox, { pigment: 'legendary', count: 10 }),
        }).root,
        Button({
          label: 'travel()',
          variant: 'ghost',
          onClick: () => void travel(lightsBox, { from: 'below' }),
        }).root,
        Button({
          label: 'chip tick',
          variant: 'ghost',
          onClick: () => {
            const value = header.root.querySelector<HTMLElement>('.px-header__chip-value');
            if (value) void chipTick(value, 1240 + Math.floor(Math.random() * 400));
          },
        }).root,
      ),
    ),
  );

  // --- seal (sanctioned demo: verify verdict context)
  const seal = Seal({ size: 72, caption: 'Proven fair.' });
  page.append(
    section(
      'seal',
      'The Seal — authenticity only',
      'Demo of the verify verdict. Features other than verify/certificates never import it.',
      row(seal.root, Button({ label: 'Stamp', variant: 'ghost', onClick: () => void seal.stamp() }).root),
    ),
  );

  // --- pedestal + empty state
  page.append(
    section(
      'pedestal',
      'Museum pedestal & empty state',
      null,
      el('div', { class: 'cx-grid-2' }, [
        Pedestal({
          content: RarityGem({ rarity: 'epic', size: 'l' }),
          plaque: { mint: 88, run: 900, provenance: 'Crafted 2 Jun 2026' },
        }),
        EmptyState({ message: 'The shelves are ready.', actionLabel: 'Open your first case', onAction: () => {} }),
      ]),
    ),
  );

  // --- header + nav
  const header = Header({
    title: 'Collection',
    balances: [
      { id: 'px', value: '1,240', label: 'PX' },
      { id: 'shards', value: '360', label: 'Shards' },
    ],
    onBell: () => toast({ message: 'No new notices.' }),
  });

  const navItems = [
    { id: 'home', label: 'Home', icon: ICON_HOME },
    { id: 'open', label: 'Open', icon: ICON_OPEN },
    { id: 'collection', label: 'Collection', icon: ICON_GRID },
    { id: 'market', label: 'Market', icon: ICON_MARKET },
  ];

  page.append(
    section(
      'header-nav',
      'Header & navigation',
      'Active nav = star fill + sky (micro-signature #4).',
      header.root,
      el('div', { class: 'cx-nav-demo' }, [
        NavRail({ items: navItems, active: 'collection' }).root,
        el('div', { class: 'cx-nav-demo__tabbar' }, [TabBar({ items: navItems, active: 'open' }).root]),
      ]),
    ),
  );

  // --- screen DNA thumbnails (blueprints live in docs/11-SCREEN-DNA.md)
  const dnaThumb = (name: string, env: 'gallery' | 'vault', heroNote: string) =>
    el('div', { class: `cx-dna ${env === 'vault' ? 'cx-dna--vault' : ''}` }, [
      el('span', { class: 'cx-dna__hero' }),
      el('span', { class: 'cx-dna__row' }),
      el('span', { class: 'cx-dna__row cx-dna__row--short' }),
      el('span', { class: 'cx-dna__name t-caption' }, [name]),
      el('span', { class: 'cx-dna__note t-mono' }, [heroNote]),
    ]);

  page.append(
    section(
      'dna',
      'Screen DNA',
      'One hero per screen (tokonoma). Full blueprints: docs/11-SCREEN-DNA.md.',
      el('div', { class: 'cx-dna-grid' }, [
        dnaThumb('Home', 'gallery', "hero: today's case"),
        dnaThumb('Open', 'vault', 'hero: the altar'),
        dnaThumb('Collection', 'gallery', 'hero: the wall'),
        dnaThumb('Figure detail', 'gallery', 'hero: the figure'),
        dnaThumb('Market', 'gallery', 'hero: the crowd'),
        dnaThumb('Museum', 'gallery', 'hero: pedestals'),
        dnaThumb('Passport', 'vault', 'hero: the card'),
        dnaThumb('Verify', 'gallery', 'hero: the verdict'),
      ]),
    ),
  );

  page.append(
    el('footer', { class: 'cx-foot t-caption' }, [
      'Would this exist in a quiet museum, or only in a casino?',
    ]),
  );

  host.append(page);
}
