/* THE RITUAL, LIVE — the interactivity centerpiece. A single quiet button
   "Witness an opening" runs the real Open Ritual (ui/motion/ritual.ts) with
   a scripted Legendary and placeholder art. A DEMO watermark sits on the
   plaque so no one mistakes it for a real mint. Let them FEEL the product. */
import { el } from '../../../lib/dom';
import { Button, toast } from '../../../ui';
import { openRitual } from '../../../ui/motion/ritual';
import { scrollToSection } from '../nav';

function witness(): void {
  const handle = openRitual(
    {
      figureName: 'Kaze no Katana',
      rarity: 'legendary',
      mint: 17,
      run: 250,
      commitHash: 'a3f81c\u2026e92d \u00b7 7f04\u2026b6c1 \u00b7 sha-256',
      dissolveYield: 400,
    },
    {
      onVerify: () => scrollToSection('px-lp-promise'),
      onKeep: () => toast({ message: 'Demo only. The real thing opens with Season 1.' }),
      onDissolve: () => toast({ message: 'Demo only. No shards were granted.' }),
      onOpenAnother: () => witness(),
    },
  );

  // Mark the overlay as a demo so the plaque carries a DEMO watermark and no
  // one reads this as a real, owned mint.
  const overlay = document.body.querySelector<HTMLElement>('.px-ritual:not(.is-demo)');
  overlay?.classList.add('is-demo');

  void handle.finished;
}

export function ritualSection(): HTMLElement {
  const btn = Button({
    label: 'Witness an opening',
    variant: 'primary',
    size: 'l',
    onClick: witness,
  });
  btn.root.id = 'px-ritual-cta';

  return el(
    'section',
    { class: 'px-lp__section px-ritual-demo env-vault', 'data-env': 'vault', id: 'px-lp-ritual' },
    [
      el('div', { class: 'px-lp__col px-ritual-demo__col px-lp__reveal' }, [
        el('p', { class: 'px-lp__eyebrow t-caption' }, ['The moment']),
        el('h2', { class: 'px-lp__section-title t-title' }, ['See what an opening feels like']),
        el('p', { class: 'px-lp__lead t-body' }, [
          'No confetti, no sirens. The case is sealed, the light breaks once, the figure arrives. This is the real ritual, running a demo Legendary.',
        ]),
        btn.root,
      ]),
    ],
  );
}
