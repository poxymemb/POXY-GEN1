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
  '.settings-grid',
  '.set-group',
  '.set-row',
  '.set-ic',
  '.set-txt',
  '.set-arrow',
  '.set-toggle',
  '.plans',
  '.plan',
  '.plan-badge',
  '.plan-name',
  '.plan-price',
  '.plan-feats',
  '.store-section',
  '.store-grid',
  '.store-card',
  '.store-vis',
  '.store-meta',
  '.store-name',
  '.store-buy',
  '.prof-banner',
  '.prof-edit',
  '.prof-card',
  '.prof-av',
  '.prof-name',
  '.prof-handle',
  '.prof-stats',
  '.prof-stat',
  '.prof-section',
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

/* ── Collection ── */
body.poxy-sky-app-active #collectionPage.visible {
  background: transparent !important;
  padding-top: 0 !important;
  padding-bottom: 24px !important;
}
body.poxy-sky-app-active #settingsPage.visible {
  padding-top: 0 !important;
}
body.poxy-sky-app-active #collectionPage .poxy-col-shell {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
body.poxy-sky-app-active #collectionPage .poxy-col-console {
  background: var(--glass) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--r-lg) !important;
  box-shadow: var(--shadow) !important;
  backdrop-filter: blur(20px) saturate(140%) !important;
}
body.poxy-sky-app-active #collectionPage .poxy-col-filter-tab {
  font: 600 13px var(--font) !important;
  padding: 8px 14px !important;
  border-radius: 10px !important;
  border: 1px solid var(--border) !important;
  background: var(--glass) !important;
  color: var(--text-dim) !important;
}
body.poxy-sky-app-active #collectionPage .poxy-col-filter-tab.active {
  background: var(--btn-bg) !important;
  color: #fff !important;
  border-color: var(--btn-bg) !important;
}
body.poxy-sky-app-active #colContent .col-card,
body.poxy-sky-app-active #colContent .poxy-col-card {
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--r) !important;
  box-shadow: var(--shadow) !important;
  transition: transform 0.16s, border-color 0.2s !important;
}
body.poxy-sky-app-active #colContent .col-card:hover,
body.poxy-sky-app-active #colContent .poxy-col-card:hover {
  transform: translateY(-3px) !important;
  border-color: var(--sky-500) !important;
}

/* ── Market ── */
body.poxy-sky-app-active #marketPage {
  background: transparent !important;
}
body.poxy-sky-app-active #marketPage .poxy-market-toolbar {
  background: var(--glass) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--r-lg) !important;
  box-shadow: var(--shadow) !important;
  backdrop-filter: blur(20px) saturate(140%) !important;
  margin-bottom: 20px !important;
}
body.poxy-sky-app-active #marketPage .poxy-market-search input,
body.poxy-sky-app-active #marketPage .poxy-market-select {
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  color: var(--text) !important;
  border-radius: 12px !important;
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
body.poxy-sky-app-active #marketPage .poxy-market-card {
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--r) !important;
  box-shadow: var(--shadow) !important;
}

/* ── Store ── */
body.poxy-sky-app-active #stPanelStore .poxy-store-layout {
  display: block !important;
  grid-template-columns: 1fr !important;
}
body.poxy-sky-app-active #stPanelStore .poxy-store-main {
  width: 100% !important;
  max-width: none !important;
}
body.poxy-sky-app-active #storeGrid .poxy-store-item,
body.poxy-sky-app-active #storeGrid .store-item-card {
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--r) !important;
  box-shadow: var(--shadow) !important;
}

/* ── Settings ── */
body.poxy-sky-app-active #settingsPage .poxy-settings-shell {
  display: block !important;
  grid-template-columns: 1fr !important;
}
body.poxy-sky-app-active #settingsPage .poxy-settings-viewport {
  width: 100% !important;
  max-width: none !important;
}
body.poxy-sky-app-active #settingsPage .poxy-settings-glass,
body.poxy-sky-app-active #settingsPage .poxy-settings-block {
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--r-lg) !important;
  box-shadow: var(--shadow) !important;
  color: var(--text) !important;
}
body.poxy-sky-app-active #settingsPage .poxy-settings-section-title {
  font-size: 12px !important;
  font-weight: 700 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
  color: var(--text-faint) !important;
}
body.poxy-sky-app-active #settingsPage .poxy-settings-input {
  background: var(--glass) !important;
  border: 1px solid var(--border) !important;
  color: var(--text) !important;
  border-radius: 12px !important;
}
body.poxy-sky-app-active #settingsPage .poxy-settings-btn-primary {
  background: var(--btn-bg) !important;
  color: var(--btn-text) !important;
  border-radius: 12px !important;
}
body.poxy-sky-app-active #settingsPage .poxy-settings-mobile-tabs {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  margin-bottom: 20px !important;
  padding: 0 !important;
  background: transparent !important;
  border: none !important;
}
body.poxy-sky-app-active #settingsPage .poxy-settings-nav-btn {
  font: 600 13px var(--font) !important;
  padding: 8px 14px !important;
  border-radius: 10px !important;
  border: 1px solid var(--border) !important;
  background: var(--glass) !important;
  color: var(--text-dim) !important;
}
body.poxy-sky-app-active #settingsPage .poxy-settings-nav-btn.active {
  background: var(--btn-bg) !important;
  color: #fff !important;
  border-color: var(--btn-bg) !important;
}

/* ── Profile ── */
body.poxy-sky-app-active #profilePage {
  background: transparent !important;
}
body.poxy-sky-app-active #profilePage .idhub-shell {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
body.poxy-sky-app-active #profilePage .idhub-hero {
  background: linear-gradient(135deg, var(--sky-500), color-mix(in srgb, var(--sky-500) 40%, #1c2a30)) !important;
  border-radius: var(--r-lg) var(--r-lg) 0 0 !important;
  border: 1px solid var(--border) !important;
  padding: 24px !important;
  text-align: center !important;
}
body.poxy-sky-app-active #profilePage .idhub-name {
  color: var(--text-strong) !important;
  font-size: 22px !important;
  text-shadow: none !important;
}
body.poxy-sky-app-active #profilePage .idhub-operator {
  color: var(--text-dim) !important;
}
body.poxy-sky-app-active #profilePage .idhub-stat-card,
body.poxy-sky-app-active #profilePage .idhub-panel {
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--r-lg) !important;
  box-shadow: var(--shadow) !important;
  color: var(--text) !important;
}
body.poxy-sky-app-active #profilePage .idhub-stat-label,
body.poxy-sky-app-active #profilePage .idhub-panel-title {
  color: var(--text-faint) !important;
}
body.poxy-sky-app-active #profilePage .idhub-stat-val {
  color: var(--text-strong) !important;
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
