/* THE KOI — the inhabitant of the abyss. In the Vault, rarely, a koi
   shadow crosses behind all content: a soft dark-on-dark distortion,
   12s traverse, opacity <= 0.06. No UI, no tooltip, no achievement.
   Players discovering and discussing it IS the feature.

   Guards: only in vault env · never within 10s of a ritual start ·
   never during a ritual · killed by reduced-motion (CSS) · at most
   once per session · schedule is deterministic (koi-schedule.ts). */
import './living.css';
import { svgFromString } from '../../lib/dom';
import { onCue } from '../motion/cues';
import { koiDelaySeconds, koiSwimsToday } from './koi-schedule';

/* One CSS-mask-friendly silhouette: body sweep + tail, blurred by CSS. */
const KOI_SVG = `<svg viewBox="0 0 160 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path fill="currentColor" d="M8 32c22-16 52-22 78-16 16 4 30 10 40 16-10 6-24 12-40 16-26 6-56 0-78-16Zm118-14 26-8c-6 8-9 15-9 22s3 14 9 22l-26-8c-4-9-4-19 0-28Z"/>
  <circle fill="currentColor" cx="30" cy="28" r="2"/>
</svg>`;

let shownThisSession = false;
let lastRitualStart = 0;

// The pond listens for the ritual and yields to it.
onCue((cue) => {
  if (cue === 'ritual-start') lastRitualStart = performance.now();
});

function ritualActive(): boolean {
  return !!document.querySelector('.px-ritual');
}

function crossNow(): void {
  if (ritualActive() || performance.now() - lastRitualStart < 10_000) {
    // The fish waits for stillness; try once more in 30s.
    window.setTimeout(crossNow, 30_000);
    return;
  }
  const host = document.querySelector('[data-env="vault"]');
  if (!host) return; // not in the vault right now — the koi stays unseen

  const fish = document.createElement('div');
  fish.className = 'px-koi';
  fish.append(svgFromString(KOI_SVG));
  document.body.append(fish);
  fish.addEventListener('animationend', () => fish.remove(), { once: true });
  window.setTimeout(() => fish.remove(), 14_000); // safety net
}

/** Call once per session from the shell with the signed-in user id
    (or a device id pre-auth). Deterministic: no RNG per render. */
export function scheduleKoi(userId: string): void {
  if (shownThisSession) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!koiSwimsToday(userId)) return;
  shownThisSession = true;
  window.setTimeout(crossNow, koiDelaySeconds(userId) * 1000);
}

/** Dev/codex only: force a crossing to judge the silhouette. */
export function forceKoi(): void {
  const fish = document.createElement('div');
  fish.className = 'px-koi';
  fish.append(svgFromString(KOI_SVG));
  document.body.append(fish);
  fish.addEventListener('animationend', () => fish.remove(), { once: true });
  window.setTimeout(() => fish.remove(), 14_000);
}
