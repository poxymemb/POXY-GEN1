/**
 * Stage 5 — Sky Collection screen CSS from poxy-dashboard.html #sc-collection.
 */
const fs = require('fs');
const path = require('path');

const mock = fs.readFileSync(path.join(__dirname, '../design/v2/poxy-dashboard.html'), 'utf8');
const cssMatch = mock.match(/<style>([\s\S]*?)<\/style>/);
if (!cssMatch) throw new Error('mockup style not found');
const mockStyle = cssMatch[1];

const BLOCKS = [
  '.page-head',
  '.panel',
  '.panel-pad',
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
  '.miles',
  '.ring-prog',
  '.m-txt',
  '.btn',
  '.btn-glass',
];

function extractRule(selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(esc + '\\{([^}]+)\\}', 'm');
  const m = mockStyle.match(re);
  return m ? selector + '{' + m[1].trim() + '}' : '';
}

function scopeCss(css) {
  const scope = 'body.poxy-sky-app-active #collectionPage';
  return css
    .replace(/^(\s*)(\.[\w#][^{]*)\{/gm, (m, indent, sel) => {
      const t = sel.trim();
      if (t.startsWith('@')) return m;
      return indent + scope + ' ' + t + '{';
    })
    .replace(/\}(\s*)(\.[\w#][^{]*)\{/g, '}$1' + scope + ' $2{');
}

const extracted = BLOCKS.map(extractRule).filter(Boolean).join('\n');

const manual = `
body.poxy-sky-app-active #collectionPage.visible {
  background: transparent !important;
  padding-top: 0 !important;
  padding-bottom: 24px !important;
}

body.poxy-sky-app-active #collectionPage .poxy-col-shell {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* ── Hide legacy tactical chrome ── */
body.poxy-sky-app-active #collectionPage .poxy-col-arch-header,
body.poxy-sky-app-active #collectionPage .poxy-col-metrics-grid,
body.poxy-sky-app-active #collectionPage .poxy-col-console-grid,
body.poxy-sky-app-active #collectionPage .poxy-col-burn-panel,
body.poxy-sky-app-active #collectionPage .poxy-col-inv-header .poxy-col-inv-title {
  display: none !important;
}

/* ── Miles panel (injected by poxy-collection-sky.js) ── */
body.poxy-sky-app-active #collectionPage #pxSkyColMiles {
  margin-bottom: 20px;
}

/* ── Sky toolbar: flatten tactical console ── */
body.poxy-sky-app-active #collectionPage .poxy-col-controls {
  margin-bottom: 18px;
}

body.poxy-sky-app-active #collectionPage .poxy-col-console {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  padding: 0 !important;
}

body.poxy-sky-app-active #collectionPage .poxy-col-console-row--top,
body.poxy-sky-app-active #collectionPage .poxy-col-console-row--bottom {
  display: contents;
}

body.poxy-sky-app-active #collectionPage .poxy-col-filters.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 0;
}

body.poxy-sky-app-active #collectionPage .poxy-col-filter-tab {
  font: 600 13px var(--font) !important;
  padding: 8px 14px !important;
  border-radius: 10px !important;
  border: 1px solid var(--border) !important;
  background: var(--glass) !important;
  color: var(--text-dim) !important;
  box-shadow: none !important;
  text-transform: none !important;
  letter-spacing: normal !important;
}

body.poxy-sky-app-active #collectionPage .poxy-col-filter-tab.active {
  background: var(--btn-bg) !important;
  color: #fff !important;
  border-color: var(--btn-bg) !important;
}

body.poxy-sky-app-active #collectionPage .poxy-col-utils {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

body.poxy-sky-app-active #collectionPage .poxy-col-multi-toggle,
body.poxy-sky-app-active #collectionPage .poxy-col-sort-btn {
  font: 600 13px var(--font) !important;
  padding: 8px 14px !important;
  border-radius: 10px !important;
  border: 1px solid var(--border) !important;
  background: var(--glass) !important;
  color: var(--text-dim) !important;
  box-shadow: none !important;
  text-transform: none !important;
  letter-spacing: normal !important;
  min-height: 0 !important;
}

body.poxy-sky-app-active #collectionPage .poxy-col-multi-toggle.is-active {
  background: var(--btn-bg) !important;
  color: #fff !important;
  border-color: var(--btn-bg) !important;
}

body.poxy-sky-app-active #collectionPage .poxy-col-sort-btn .material-symbols-outlined {
  font-size: 16px !important;
}

body.poxy-sky-app-active #collectionPage .px-sky-col-search {
  margin-left: auto;
  min-width: 180px;
}

body.poxy-sky-app-active #collectionPage .px-sky-col-search input:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

body.poxy-sky-app-active #collectionPage .poxy-col-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

body.poxy-sky-app-active #collectionPage .poxy-col-capsule {
  font: 600 13px var(--font) !important;
  padding: 8px 14px !important;
  border-radius: 10px !important;
  border: 1px solid var(--border) !important;
  background: var(--glass) !important;
  color: var(--text) !important;
  box-shadow: none !important;
  text-transform: none !important;
  letter-spacing: normal !important;
  min-height: 0 !important;
}

body.poxy-sky-app-active #collectionPage .poxy-col-capsule-burn:not(:disabled):hover,
body.poxy-sky-app-active #collectionPage .poxy-col-capsule-craft:hover {
  border-color: var(--sky-500) !important;
  transform: translateY(-1px);
}

body.poxy-sky-app-active #collectionPage .poxy-col-capsule .poxy-craft-sep,
body.poxy-sky-app-active #collectionPage .poxy-col-capsule .poxy-col-arrow-icon {
  display: none;
}

body.poxy-sky-app-active #collectionPage .poxy-col-capsule-craft {
  font-size: 13px !important;
}

/* ── View tabs + inventory chrome ── */
body.poxy-sky-app-active #collectionPage .poxy-col-view-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

body.poxy-sky-app-active #collectionPage .poxy-col-view-tab {
  font: 600 13px var(--font) !important;
  padding: 8px 14px !important;
  border-radius: 10px !important;
  border: 1px solid var(--border) !important;
  background: var(--glass) !important;
  color: var(--text-dim) !important;
}

body.poxy-sky-app-active #collectionPage .poxy-col-view-tab.is-active {
  background: var(--btn-bg) !important;
  color: #fff !important;
  border-color: var(--btn-bg) !important;
}

body.poxy-sky-app-active #collectionPage .poxy-col-inv-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 14px;
  padding: 0;
  background: transparent !important;
  border: none !important;
}

body.poxy-sky-app-active #collectionPage .poxy-col-mode-btn {
  font: 600 13px var(--font) !important;
  padding: 8px 14px !important;
  border-radius: 10px !important;
  border: 1px solid var(--border) !important;
  background: var(--glass) !important;
  color: var(--text-dim) !important;
}

body.poxy-sky-app-active #collectionPage .poxy-col-mode-btn.is-active {
  background: var(--btn-bg) !important;
  color: #fff !important;
  border-color: var(--btn-bg) !important;
}

body.poxy-sky-app-active #collectionPage .poxy-col-inv-count {
  font-size: 12px !important;
  color: var(--text-faint) !important;
  letter-spacing: normal !important;
  text-transform: none !important;
}

/* ── Card grid → mockup cards-cell look ── */
body.poxy-sky-app-active #collectionPage #colContent .col-grid,
body.poxy-sky-app-active #collectionPage #colContent .poxy-col-inventory-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)) !important;
  gap: 14px !important;
}

body.poxy-sky-app-active #collectionPage #colContent .col-card,
body.poxy-sky-app-active #collectionPage #colContent .poxy-col-card,
body.poxy-sky-app-active #collectionPage #colContent .pcard {
  text-align: left;
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--r) !important;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.16s, border-color 0.2s !important;
  box-shadow: var(--shadow) !important;
  padding: 0 !important;
}

body.poxy-sky-app-active #collectionPage #colContent .pcard--passport,
body.poxy-sky-app-active #collectionPage #colContent .pcard--passport[data-rarity] {
  background: var(--card) !important;
  gap: 0 !important;
}

body.poxy-sky-app-active #collectionPage #colContent .col-card:hover,
body.poxy-sky-app-active #collectionPage #colContent .poxy-col-card:hover,
body.poxy-sky-app-active #collectionPage #colContent .pcard:hover {
  transform: translateY(-3px) !important;
  border-color: var(--rarity-color, var(--sky-500)) !important;
}

body.poxy-sky-app-active #collectionPage #colContent .pcard-pp {
  display: flex;
  flex-direction: column;
  gap: 0;
}

body.poxy-sky-app-active #collectionPage #colContent .pcard-s2 {
  order: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  padding: 16px;
  background: radial-gradient(
    110% 80% at 50% 16%,
    color-mix(in srgb, var(--rarity-color, var(--sky-500)) 26%, var(--bg-2)),
    var(--bg-2)
  ) !important;
  border-bottom: 1px solid var(--border);
}

body.poxy-sky-app-active #collectionPage #colContent .pcard-s2-avatar {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--rarity-color, var(--sky-500)) 12%, var(--card));
  border: 1px solid var(--border);
}

body.poxy-sky-app-active #collectionPage #colContent .pcard-s2-info {
  display: block;
  text-align: center;
  margin-top: 10px;
  width: 100%;
}

body.poxy-sky-app-active #collectionPage #colContent .pcard-s2-num {
  display: block;
  font-size: 13.5px !important;
  font-weight: 650 !important;
  color: var(--text-strong) !important;
  letter-spacing: normal !important;
}

body.poxy-sky-app-active #collectionPage #colContent .pcard-s2-owner,
body.poxy-sky-app-active #collectionPage #colContent .pcard-s2-hash,
body.poxy-sky-app-active #collectionPage #colContent .pcard-s3,
body.poxy-sky-app-active #collectionPage #colContent .pcard-s1-id {
  display: none !important;
}

body.poxy-sky-app-active #collectionPage #colContent .pcard-s1 {
  order: 2;
  padding: 10px 14px 12px;
  border-top: none;
  background: transparent;
}

body.poxy-sky-app-active #collectionPage #colContent .pcard-s1-badge {
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
  border: none !important;
  padding: 0 !important;
  background: transparent !important;
}

body.poxy-sky-app-active #collectionPage #colContent .pcard-viewport {
  height: 160px !important;
  background: radial-gradient(
    110% 80% at 50% 16%,
    color-mix(in srgb, var(--rarity-color, var(--sky-500)) 26%, var(--bg-2)),
    var(--bg-2)
  ) !important;
  border-bottom: 1px solid var(--border) !important;
}

body.poxy-sky-app-active #collectionPage #colContent .pcard-meta {
  padding: 12px 14px !important;
}

body.poxy-sky-app-active #collectionPage #colContent .pcard-tier-badge {
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
  margin-top: 3px !important;
}

body.poxy-sky-app-active #collectionPage #colContent .pcard-serial {
  font-size: 13.5px !important;
  font-weight: 650 !important;
  color: var(--text-strong) !important;
}

body.poxy-sky-app-active #collectionPage .poxy-col-craft-zone {
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--r-lg) !important;
  box-shadow: var(--shadow) !important;
  margin-bottom: 18px;
}

body.poxy-sky-app-active #collectionPage .poxy-col-header-actions {
  background: var(--glass) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--r-lg) !important;
  padding: 10px 14px !important;
  margin-bottom: 12px;
}
`;

const outDir = path.join(__dirname, '../assets/poxy-sky/screens');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const header = '/* POXY Sky Collection — Stage 5 from poxy-dashboard.html #sc-collection */\n';
fs.writeFileSync(
  path.join(outDir, 'collection.css'),
  header + manual + scopeCss(extracted) + '\n'
);
console.log('assets/poxy-sky/screens/collection.css built');
