/* FIRST VISIT — ink in water. The only splash screen this product will
   ever have, and it plays once per device: 6 seconds, before the first
   onboarding screen. An ink drop falls into the abyss, blooms (SVG
   turbulence), the bloom collapses into the brand star, the star settles
   to logo + wordmark, then the shell lightsUp into auth.

   Skippable by tap after 1.5s (a quiet "skip" ghost appears). Never
   repeats: localStorage now, profile flag after PROMPT 03. Budget: this
   whole module + CSS is ~6KB source, no video files. Reduced motion:
   a still frame (star + wordmark) held briefly. */
import './living.css';
import { el, svgFromString } from '../../lib/dom';
import { emitCue } from '../motion/cues';
import starMarkup from '../brand/star.svg?raw';

const KEY = 'poxy-intro-seen';

const INK_SVG = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <filter id="px-ink-bloom" x="-40%" y="-40%" width="180%" height="180%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="34"/>
    </filter>
  </defs>
  <g class="px-intro-anim">
    <circle class="px-intro__drop" cx="100" cy="-8" r="5" fill="currentColor"/>
    <circle class="px-intro__bloom" cx="100" cy="100" r="52" fill="currentColor"
      filter="url(#px-ink-bloom)" opacity="0"/>
  </g>
</svg>`;

export function introSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* private mode: it will replay, which is acceptable */
  }
}

/** Plays the intro if this device has never seen it. Resolves when the
    overlay has left the DOM (the shell then proceeds to auth). */
export function maybePlayIntro(): Promise<void> {
  if (introSeen()) return Promise.resolve();
  return playIntro();
}

/** Codex/dev replay. Marks seen on completion either way. */
export function playIntro(): Promise<void> {
  markSeen();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stage = el('div', { class: 'px-intro__stage' }, [svgFromString(INK_SVG)]);
  const star = el('div', { class: 'px-intro__star' }, [svgFromString(starMarkup)]);
  star.style.cssText =
    'position:fixed;left:50%;top:50%;width:96px;height:96px;translate:-50% -50%;color:#F0F0F1;opacity:0;';
  const wordmark = el('div', { class: 'px-intro__wordmark' }, ['POXY WORLD']);
  const skip = el('button', { class: 'px-intro__skip', type: 'button' }, ['skip']);
  const root = el('div', { class: 'px-intro', role: 'presentation' }, [stage, star, wordmark, skip]);
  document.body.append(root);

  let finished: () => void;
  const done = new Promise<void>((resolve) => (finished = resolve));

  const timers: number[] = [];
  const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

  function leave() {
    for (const t of timers) window.clearTimeout(t);
    root.classList.add('is-leaving');
    const remove = () => {
      root.remove();
      finished();
    };
    root.addEventListener('transitionend', remove, { once: true });
    window.setTimeout(remove, 700);
  }

  function endFrame() {
    star.style.opacity = '1';
    star.style.transition = 'none';
    wordmark.classList.add('is-visible');
    stage.style.opacity = '0';
  }

  if (reduced) {
    endFrame();
    at(1600, leave);
    return done;
  }

  const drop = root.querySelector<SVGCircleElement>('.px-intro__drop');
  const bloom = root.querySelector<SVGCircleElement>('.px-intro__bloom');

  // 0.8s: the drop falls into still water.
  at(800, () => {
    drop?.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(108px)' }],
      { duration: 600, easing: 'cubic-bezier(0.5, 0, 1, 0.6)', fill: 'forwards' },
    );
  });

  // 1.4s: impact — the ink blooms in water.
  at(1400, () => {
    emitCue('reveal', {}); // one Drop if sound is on; silence otherwise
    if (drop) drop.style.opacity = '0';
    bloom?.animate(
      [
        { opacity: 0, transform: 'scale(0.25)' },
        { opacity: 0.9, transform: 'scale(1)', offset: 0.4 },
        { opacity: 0.8, transform: 'scale(1.55)' },
      ],
      { duration: 2400, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)', fill: 'forwards' },
    );
  });

  // 1.5s: the quiet skip appears.
  at(1500, () => skip.classList.add('is-visible'));

  // 3.8s: the bloom collapses into the star.
  at(3800, () => {
    bloom?.animate(
      [
        { opacity: 0.8, transform: 'scale(1.55)' },
        { opacity: 0, transform: 'scale(0.5)' },
      ],
      { duration: 700, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
    );
    star.style.transition = 'opacity 700ms cubic-bezier(0.4, 0, 0.2, 1)';
    star.style.opacity = '1';
    // `scale` as its own property: the -50%/-50% translate stays untouched.
    star.animate(
      [{ scale: '1.4' }, { scale: '0.98', offset: 0.7 }, { scale: '1' }],
      { duration: 800, easing: 'cubic-bezier(0.34, 1.2, 0.5, 1)', fill: 'forwards' },
    );
  });

  // 4.7s: the wordmark sets under the settled star.
  at(4700, () => wordmark.classList.add('is-visible'));

  // 6s: lights up into auth.
  at(6000, leave);

  // Tap-to-skip becomes available with the ghost.
  skip.addEventListener('click', () => {
    endFrame();
    window.setTimeout(leave, 250);
  });

  return done;
}
