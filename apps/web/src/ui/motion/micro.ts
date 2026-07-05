/* The five micro-signatures (Codex, 02C Phase 3). These presets ARE the
   tactile brand — nothing else receives bespoke motion without a Codex
   amendment. Card lift (#1) and nav star fill (#4) live in component CSS
   (figure-card.css, nav.css); the programmatic three live here. */
import { Surface, prefersReducedMotion } from './tempo';
import { countUp } from './count-up';

/** #2 — balance chip tick: the number rolls to its new value under a
    single 8% sky flash. Used by Header.setBalance consumers. */
export function chipTick(valueEl: HTMLElement, to: number, format?: (v: number) => string): Promise<void> {
  const roll = countUp(valueEl, to, { duration: 480, format });

  if (!prefersReducedMotion()) {
    const chip = valueEl.closest('.px-header__chip') ?? valueEl;
    chip.animate(
      [
        { backgroundColor: 'rgba(96, 194, 224, 0.08)' },
        { backgroundColor: 'transparent' },
      ],
      { duration: Surface.duration * 2, easing: Surface.easing },
    );
  }
  return roll;
}

/** #3 — pity ring pulse at 90%: PityRing applies it via its `is-near`
    class (pity-ring.css); this helper exists for demo triggering. */
export function pityPulse(ringRoot: HTMLElement): void {
  ringRoot.classList.remove('is-near');
  // Force reflow so re-adding restarts the one-shot animation.
  void ringRoot.offsetWidth;
  ringRoot.classList.add('is-near');
}

/** #5 — toast travel: implemented inside toast.css (travel from bottom,
    Current tempo). Re-exported conceptually; no extra code needed. */
export const toastTravel = 'see ui/components/toast.css — .px-toast transitions';
