/* The environment shift IS the wow (Step 2 §3): scrolling out of the Vault
   hero into the Gallery reads as dawn breaking over the water. Rather than a
   DOM swap (what lightsDown/lightsUp choreograph for the router), the landing
   scrolls continuously, so we tie a single paper "morning wash" to the hero's
   exit ratio. It uses the same materials the primitives use (a paper overlay,
   Current-tempo easing) and collapses to a static split under reduced motion.
   One thing animates at a time: only this wash, only across the hero seam. */
import { prefersReducedMotion } from '../../ui/motion';

export function wireScrollLights(hero: HTMLElement): void {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    // Static split: the hero simply ends and the Gallery begins. No wash.
    return;
  }

  const wash = document.createElement('div');
  wash.className = 'px-lp__dawn';
  wash.setAttribute('aria-hidden', 'true');
  document.body.append(wash);

  let ticking = false;
  const update = () => {
    ticking = false;
    const rect = hero.getBoundingClientRect();
    const h = rect.height || 1;
    // 0 while the hero fills the screen; 1 once it has fully scrolled away.
    const exited = Math.min(1, Math.max(0, -rect.top / h));
    // The wash blooms as the hero leaves, then clears as the Gallery settles.
    const opacity = exited < 0.5 ? exited : 1 - exited;
    wash.style.opacity = String(opacity * 0.5);
    if (exited >= 1) {
      wash.style.opacity = '0';
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}
