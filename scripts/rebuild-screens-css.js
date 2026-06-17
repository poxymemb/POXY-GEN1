/**
 * Stages 5–10 — Sky screens CSS from poxy-dashboard.html mockup.
 */
const fs = require('fs');
const path = require('path');

const mock = fs.readFileSync(path.join(__dirname, '../design/v2/poxy-dashboard.html'), 'utf8');
const cssMatch = mock.match(/<style>([\s\S]*?)<\/style>/);
if (!cssMatch) throw new Error('mockup style not found');
const mockStyle = cssMatch[1];

function extractRule(selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(esc + '\\{([^}]+)\\}', 'm');
  const m = mockStyle.match(re);
  return m ? selector + '{' + m[1].trim() + '}' : '';
}

const selectors = [
  '.page-head',
  '.toolbar',
  '.chip-filter',
  '.tb-spacer',
  '.search',
  '.cards',
  '.cards-cell',
  '.cell-frame',
  '.cell-meta',
  '.cell-name',
  '.cell-rar',
  '.cell-row',
  '.cell-price',
  '.miles',
  '.ring-prog',
  '.m-txt',
  '.btn',
  '.btn-primary',
  '.btn-glass',
  '.panel',
  '.panel-pad',
  '.coin-sm',
];

function scopeBlock(css) {
  return css
    .replace(/^(\s*)(\.[\w.-][^{]*)\{/gm, (m, indent, sel) => {
      return indent + '#pxSkyStage ' + sel.trim() + '{';
    })
    .replace(/\}(\s*)(\.[\w.-][^{]*)\{/g, '}$1#pxSkyStage $2{');
}

const extracted = scopeBlock(selectors.map(extractRule).filter(Boolean).join('\n'));

const manual = `
/* POXY Sky screens — Stages 5–10 */
body.poxy-sky-app-active .px-sky-page-head {
  margin-bottom: 22px;
  animation: pxSkyScreenIn 0.3s var(--ease, cubic-bezier(0.4, 0, 0.2, 1));
}
body.poxy-sky-app-active .px-sky-page-head h1 {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-strong);
}
body.poxy-sky-app-active .px-sky-page-head p {
  font-size: 15px;
  color: var(--text-dim);
  margin-top: 3px;
}

/* ── Hide legacy chrome ── */
body.poxy-sky-app-active #collectionPage .poxy-col-arch-header,
body.poxy-sky-app-active #collectionPage .poxy-col-metrics-grid,
body.poxy-sky-app-active #collectionPage .poxy-col-console-grid,
body.poxy-sky-app-active #marketPage .poxy-market-header,
body.poxy-sky-app-active #marketPage .pxy-ae-bento,
body.poxy-sky-app-active #storePage .poxy-store-sidenav,
body.poxy-sky-app-active #storePage .poxy-store-bento,
body.poxy-sky-app-active #storePage .poxy-store-uplinks,
body.poxy-sky-app-active #settingsPage .poxy-settings-sidebar,
body.poxy-sky-app-active #settingsPage .poxy-settings-viewport-head,
body.poxy-sky-app-active #profilePage .idhub-blob,
body.poxy-sky-app-active #profilePage .idhub-settings-btn {
  display: none !important;
}

body.poxy-sky-app-active #settingsPage.visible {
  padding-top: 0 !important;
}

/* Full-page routes inside stage */
body.poxy-sky-app-active #pxSkyStage > .page.visible {
  display: block !important;
  position: relative !important;
  inset: auto !important;
  min-height: 0 !important;
  max-width: none !important;
  z-index: 1 !important;
}

/* SPA panels transparent in sky mode */
body.poxy-sky-app-active #pxSkyStage .st-spa-panel,
body.poxy-sky-app-active #pxSkyStage .page.visible {
  background: transparent !important;
  color: var(--text) !important;
}
`;

fs.writeFileSync(
  path.join(__dirname, '../assets/poxy-sky/screens.css'),
  '/* POXY Sky screens — Stages 5–10 from poxy-dashboard.html */\n' + manual + extracted + '\n'
);
console.log('screens.css built');
