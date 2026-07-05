/* Section reveal-on-scroll. Elements marked .px-lp__reveal travel in once
   when they enter the viewport (Current tempo), one at a time. Honors
   reduced motion by resolving everything to its final state immediately.
   Uses the motion primitive `travel` — no feature-side keyframes. */
import { travel, prefersReducedMotion } from '../../ui/motion';

export function observeReveals(root: HTMLElement): void {
  const targets = Array.from(root.querySelectorAll<HTMLElement>('.px-lp__reveal'));

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const target = entry.target as HTMLElement;
        observer.unobserve(target);
        target.classList.add('is-in');
        void travel(target, { from: 'below', distance: 16 });
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
  );

  targets.forEach((t) => io.observe(t));
}
