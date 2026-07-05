/* Anchored-scroll helper for the single-page landing. Honors reduced motion
   (instant jump) per the shared laws. */
import { prefersReducedMotion } from '../../ui/motion';

export function scrollToSection(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  });
}
