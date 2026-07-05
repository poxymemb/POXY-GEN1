/* The pre-launch landing page — public face of POXY WORLD before the beta.
   Not a teaser: a waiting-for-the-game campaign that converts a stranger into
   one of three measurable states (Founder / Member / Follower).

   Design authority: docs/10-BRAND.md + docs/11-SCREEN-DNA.md. Built entirely
   from the existing UI kit and motion primitives. Data/commerce (Supabase +
   Stripe) land in Step 1; this module renders finished with mock demand
   state and swaps only the data source, never the composition. */
import './prelaunch.css';
import './sections/sections.css';
import '../../ui/materials.css';
import { el } from '../../lib/dom';
import { heroSection } from './sections/hero';
import { promiseSection } from './sections/promise';
import { visionVideoSection } from './sections/vision-video';
import { seasonWallSection } from './sections/season-wall';
import { ritualSection } from './sections/ritual';
import { howVideoSection } from './sections/how-video';
import { founderSection } from './sections/founder';
import { communitySection } from './sections/community';
import { waitlistSection } from './sections/waitlist';
import { faqSection } from './sections/faq';
import { footerSection } from './sections/footer';
import { observeReveals } from './reveal';
import { wireScrollLights } from './scroll-lights';

export function renderPrelaunch(host: HTMLElement): void {
  host.textContent = '';
  // A previous render may have left its dawn overlay on the body.
  document.querySelectorAll('.px-lp__dawn').forEach((n) => n.remove());

  const skip = el('a', { class: 'px-lp__skip', href: '#px-lp-offer' }, ['Skip to Founder Pass']);
  const hero = heroSection();

  // The page opens in the Vault (the hero is water and light); scrolling into
  // The Promise lightsUp into the Gallery. Env is set per-section below.
  const page = el('main', { class: 'px-lp', id: 'px-lp-top' }, [
    skip,
    hero,
    promiseSection(),
    visionVideoSection(),
    seasonWallSection(),
    ritualSection(),
    howVideoSection(),
    founderSection(),
    communitySection(),
    waitlistSection(),
    faqSection(),
    footerSection(),
  ]);

  host.append(page);

  // Section entrances: travel once via IntersectionObserver, one thing at a
  // time (codex law). Reduced motion resolves everything to final state.
  observeReveals(page);

  // The dawn wash across the Vault-hero seam — the environment shift is the
  // wow. Static split (no wash) under reduced motion.
  wireScrollLights(hero);
}
