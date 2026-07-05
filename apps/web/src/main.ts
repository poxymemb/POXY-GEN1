import '@poxy/tokens/css/variables.css';
import './ui/fonts.css';
import './style.css';
import { wireSuimon } from './ui/sound';
import { startHour } from './ui/living/hour';
import './ui/living/living.css';

// The senses subscribe to motion cues once, at shell level.
wireSuimon();
// The gallery light follows the visitor's clock.
startHour();

// Entry point. The real router and shell arrive with PROMPT 03.
// #/codex is the dev-only living styleguide (02B/02C); the dynamic import
// keeps it out of production bundles entirely.
const app = document.querySelector<HTMLDivElement>('#app');

async function route(): Promise<void> {
  if (!app) return;

  if (import.meta.env.DEV && location.hash.startsWith('#/codex')) {
    const { renderCodexPage } = await import('./app/codex-page');
    renderCodexPage(app);
    return;
  }

  app.innerHTML = `
    <main class="px-boot" data-env="gallery">
      <h1 class="px-boot__title">POXY WORLD</h1>
      <p class="px-boot__note">The atelier is being built.</p>
    </main>
  `;
}

window.addEventListener('hashchange', () => void route());
void route();
