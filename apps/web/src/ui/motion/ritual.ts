/* THE OPEN RITUAL — authoritative implementation of the timeline in
   docs/11-SCREEN-DNA.md §Open. PROMPT 04 wires this to the real gacha
   engine; only the data source changes, never the choreography.

   t (ms)      beat
   0–420       Lights down   overlay in; chrome fades; only the case remains
   420–1000    The Oath      commit hash types on (JBM); "Sealed before your
                             roll."; hash stays pinned top at 60% dim.
                             NEVER SKIPPABLE — honesty is not skippable.
   1000–1800   The Still     one slow breath (scale 1→1.015→1); silence.
                             NO rarity hints — no near-miss theatre, ever.
                             A tap here jumps to Emergence.
   1800–1950   The Break     one sky hairline crosses the case; it splits
                             (Common/Uncommon skip this beat entirely)
   1950–2350   Emergence     figure travels up from depth (Ritual ease,
                             overshoot); pigment glow blooms behind
   2350–2900   The Plaque    name sets in Fraunces; plaque slides in;
                             mint № counts up in mono; sparkle for Epic+
   2900+       Result rest   action sheet travels up

   Rarity scaling: Common/Uncommon ≈1400ms total; Mythic: Still +400ms,
   sparkle count 14. Reduced motion: Oath instant → result fades in. */
import './ritual.css';
import type { Rarity } from '@poxy/shared';
import { el, svgFromString } from '../../lib/dom';
import { Current, RitualEase, prefersReducedMotion } from './tempo';
import { travel } from './travel';
import { sparkle } from './sparkle';
import { countUp } from './count-up';
import { emitCue } from './cues';
import starMarkup from '../brand/star.svg?raw';

export interface RitualReveal {
  figureName: string;
  rarity: Rarity;
  mint: number;
  run: number;
  /** The pre-roll commit hash (the Oath shows it verbatim). */
  commitHash: string;
  /** Shards granted if dissolved (for the action label). */
  dissolveYield: number;
}

export interface RitualActions {
  onKeep?: () => void;
  onDissolve?: () => void;
  onOpenAnother?: () => void;
  onVerify?: () => void;
  /** Called when the ritual overlay has fully closed. */
  onClose?: () => void;
}

export interface RitualHandle {
  /** Resolves when the result rest is on screen. */
  finished: Promise<void>;
  close(): void;
}

const RARITY_WORD: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
};

export function openRitual(reveal: RitualReveal, actions: RitualActions = {}): RitualHandle {
  const reduced = prefersReducedMotion();
  const simple = reveal.rarity === 'common' || reveal.rarity === 'uncommon';
  const mythic = reveal.rarity === 'mythic';

  // --- build the scene -----------------------------------------------
  const oathHash = el('span', { class: 'px-ritual__hash t-mono' }, ['']);
  const oathCaption = el('span', { class: 'px-ritual__oath-caption t-caption' }, [
    'Sealed before your roll.',
  ]);
  const oath = el('div', { class: 'px-ritual__oath' }, [oathHash, oathCaption]);

  const caseHalfTop = el('div', { class: 'px-ritual__case-half px-ritual__case-half--top' }, [
    el('div', { class: 'px-ritual__case-face' }, [svgFromString(starMarkup)]),
  ]);
  const caseHalfBottom = el('div', { class: 'px-ritual__case-half px-ritual__case-half--bottom' }, [
    el('div', { class: 'px-ritual__case-face' }, [svgFromString(starMarkup)]),
  ]);
  const breakLine = el('span', { class: 'px-ritual__break', 'aria-hidden': 'true' });
  const caseBox = el('div', { class: 'px-ritual__case' }, [caseHalfTop, caseHalfBottom, breakLine]);

  const glow = el('div', { class: 'px-ritual__glow', 'aria-hidden': 'true' });
  glow.style.background = `radial-gradient(closest-side, var(--px-pigment-${reveal.rarity}-glow) 0%, transparent 70%)`;

  const figure = el('div', { class: 'px-ritual__figure' }, [svgFromString(starMarkup)]);
  figure.style.color = `var(--px-pigment-${reveal.rarity})`;

  const stage = el('div', { class: 'px-ritual__stage' }, [glow, caseBox, figure]);

  const rarityWord = el('p', { class: 'px-ritual__rarity t-caption' }, [RARITY_WORD[reveal.rarity]]);
  const name = el('h2', { class: 'px-ritual__name' }, [reveal.figureName]);
  const mintEl = el('span', { class: 'px-ritual__mint' }, ['']);
  const plaque = el('div', { class: 'px-ritual__plaque' }, [
    el('span', { class: 'px-ritual__plaque-bar' }, [mintEl]),
  ]);
  const plaqueZone = el('div', { class: 'px-ritual__plaque-zone' }, [rarityWord, name, plaque]);

  const mkAction = (label: string, handler?: () => void, primary = false) =>
    el(
      'button',
      {
        class: `px-ritual__action${primary ? ' px-ritual__action--primary' : ''}`,
        type: 'button',
        onclick: () => {
          handler?.();
          close();
        },
      },
      [label],
    );

  const sheet = el('div', { class: 'px-ritual__sheet' }, [
    mkAction('Keep', actions.onKeep, true),
    mkAction(`Dissolve +${reveal.dissolveYield}`, actions.onDissolve),
    mkAction('Open another', actions.onOpenAnother),
    mkAction('Verify', actions.onVerify),
  ]);

  const root = el('div', { class: 'px-ritual', 'data-env': 'vault', role: 'dialog', 'aria-label': 'Opening' }, [
    oath,
    stage,
    plaqueZone,
    sheet,
  ]);

  document.body.append(root);
  emitCue('ritual-start'); // silent cue: the living layer yields to the ritual

  function close() {
    root.classList.add('is-closing');
    const remove = () => {
      root.remove();
      actions.onClose?.();
    };
    root.addEventListener('transitionend', remove, { once: true });
    window.setTimeout(remove, 400);
  }

  // --- choreography ---------------------------------------------------
  const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

  async function typeOn(target: Element, text: string, totalMs: number): Promise<void> {
    const steps = Math.max(1, Math.ceil(text.length / 3));
    const perStep = totalMs / steps;
    for (let i = 1; i <= steps; i++) {
      target.textContent = text.slice(0, Math.min(i * 3, text.length));
      await wait(perStep);
    }
  }

  function showResultInstantly() {
    root.classList.add('is-open', 'is-emerged', 'is-rested');
    oathHash.textContent = reveal.commitHash;
    mintEl.textContent = `\u2116 ${String(reveal.mint).padStart(4, '0')} / ${reveal.run.toLocaleString('en-GB')}`;
  }

  const finished = (async () => {
    if (reduced) {
      // Reduced motion: the Oath is stated instantly, the result fades in.
      showResultInstantly();
      await travel(plaqueZone, {});
      return;
    }

    // 0–420 — LIGHTS DOWN: abyss in; only the case remains.
    root.classList.add('is-open');
    await Promise.all([
      travel(caseBox, { from: 'depth', tempo: Current }),
      wait(420),
    ]);

    // 420–1000 — THE OATH. No skip listener exists yet, by design:
    // the commit hash is the honesty of the roll, it is never skippable.
    root.classList.add('is-oath');
    await typeOn(oathHash, reveal.commitHash, 380);
    oathCaption.classList.add('is-visible');
    await wait(200);
    root.classList.add('is-oath-rested'); // pins the hash at 60% dim

    // 1000–1800 — THE STILL: one slow breath. Tap jumps to Emergence.
    let skipStill: (() => void) | null = null;
    const stillDuration = mythic ? 1200 : 800;
    const breath = caseBox.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.015)', offset: 0.5 },
        { transform: 'scale(1)' },
      ],
      { duration: stillDuration, easing: 'ease-in-out' },
    );
    const tapped = new Promise<void>((resolve) => {
      skipStill = () => {
        breath.cancel();
        resolve();
      };
      root.addEventListener('pointerdown', () => skipStill?.(), { once: true });
    });
    await Promise.race([breath.finished.then(() => undefined).catch(() => undefined), tapped]);
    skipStill = null;

    // 1800–1950 — THE BREAK (Epic+ only): one sky hairline, then the split.
    if (!simple) {
      breakLine.classList.add('is-lit');
      emitCue('break');
      await wait(150);
      caseHalfTop.animate(
        [{ transform: 'translateY(0) rotate(0deg)' }, { transform: 'translateY(-14px) rotate(-1.2deg)' }],
        { duration: 400, easing: RitualEase, fill: 'forwards' },
      );
      caseHalfBottom.animate(
        [{ transform: 'translateY(0) rotate(0deg)' }, { transform: 'translateY(14px) rotate(0.8deg)' }],
        { duration: 400, easing: RitualEase, fill: 'forwards' },
      );
    }

    // 1950–2350 — EMERGENCE: the figure travels up from depth; glow blooms.
    root.classList.add('is-emerged');
    emitCue('reveal', { rarity: reveal.rarity });
    glow.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 400,
      easing: 'ease-out',
      fill: 'forwards',
    });
    await figure.animate(
      [
        { opacity: 0, transform: 'translateY(34px) scale(0.92)' },
        { opacity: 1, transform: 'translateY(-6px) scale(1.03)', offset: 0.72 },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ],
      { duration: 400, easing: RitualEase, fill: 'forwards' },
    ).finished;

    // 2350–2900 — THE PLAQUE: name in Fraunces, mint № rolls, sparkle Epic+.
    void travel(plaqueZone, { from: 'below', distance: 14 });
    const mintRoll = countUp(mintEl, reveal.mint, {
      duration: 420,
      format: (v) =>
        `\u2116 ${String(v).padStart(4, '0')} / ${reveal.run.toLocaleString('en-GB')}`,
    });
    const epicPlus = ['epic', 'legendary', 'mythic'].includes(reveal.rarity);
    if (epicPlus) {
      void sparkle(stage, { pigment: reveal.rarity, count: mythic ? 14 : 8 });
    }
    await mintRoll;
    emitCue('tick'); // one soft stone click on landing — never per-digit
    await wait(130);

    // 2900+ — RESULT REST: the action sheet travels up.
    root.classList.add('is-rested');
    await travel(sheet, { from: 'below', distance: 24 });
  })();

  return { finished, close };
}
