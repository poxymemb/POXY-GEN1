import '@poxy/tokens/css/variables.css';
import './ui/fonts.css';
import './style.css';

// Entry point. The router, shell and features arrive in later sessions
// (PROMPT 02 design system, PROMPT 03 shell/auth). This placeholder only
// proves the workspace wiring: tokens package CSS + TypeScript build.
const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  app.innerHTML = `
    <main class="px-boot" data-env="gallery">
      <h1 class="px-boot__title">POXY WORLD</h1>
      <p class="px-boot__note">The atelier is being built.</p>
    </main>
  `;
}
