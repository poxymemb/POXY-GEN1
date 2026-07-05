/**
 * Stage 6 — Sky Market screen CSS from poxy-dashboard.html #sc-market.
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
  '.btn',
  '.btn-primary',
  '.btn-glass',
  '.coin-sm',
];

function extractRule(selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(esc + '\\{([^}]+)\\}', 'm');
  const m = mockStyle.match(re);
  return m ? selector + '{' + m[1].trim() + '}' : '';
}

function scopeCss(css) {
  const scope = 'body.poxy-sky-app-active #marketPage';
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
body.poxy-sky-app-active #marketPage,
body.poxy-sky-app-active #stPanelMarket {
  background: transparent !important;
}

body.poxy-sky-app-active #marketPage .poxy-market-shell {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* ── Hide legacy chrome ── */
body.poxy-sky-app-active #marketPage .pxy-ae-label-chip,
body.poxy-sky-app-active #marketPage .pxy-ae-bento {
  display: none !important;
}

body.poxy-sky-app-active #marketPage .poxy-market-header {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin-bottom: 16px;
}

body.poxy-sky-app-active #marketPage .pxy-ae-tab-row {
  display: flex;
  gap: 8px;
  margin-bottom: 0;
}

body.poxy-sky-app-active #marketPage .poxy-market-tab {
  font: 600 13px var(--font) !important;
  padding: 8px 14px !important;
  border-radius: 10px !important;
  border: 1px solid var(--border) !important;
  background: var(--glass) !important;
  color: var(--text-dim) !important;
  box-shadow: none !important;
  text-transform: none !important;
}

body.poxy-sky-app-active #marketPage .poxy-market-tab.active {
  background: var(--btn-bg) !important;
  color: #fff !important;
  border-color: var(--btn-bg) !important;
}

body.poxy-sky-app-active #marketPage .poxy-market-tab::after {
  display: none !important;
}

/* ── Sky toolbar ── */
body.poxy-sky-app-active #marketPage #marketToolbar {
  display: flex !important;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}

body.poxy-sky-app-active #marketPage #pxSkyMarketSortChips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

body.poxy-sky-app-active #marketPage .px-sky-market-chip {
  font: 600 13px var(--font);
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--glass);
  color: var(--text-dim);
  cursor: pointer;
}

body.poxy-sky-app-active #marketPage .px-sky-market-chip.on {
  background: var(--btn-bg);
  color: #fff;
  border-color: var(--btn-bg);
}

body.poxy-sky-app-active #marketPage .px-sky-market-chip:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

body.poxy-sky-app-active #marketPage .poxy-market-field--sort-native,
body.poxy-sky-app-active #marketPage #marketSort {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

body.poxy-sky-app-active #marketPage .poxy-market-search {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  background: var(--glass);
  border-radius: 10px;
  padding: 8px 13px;
  min-width: 180px;
  flex: 1;
  max-width: 280px;
}

body.poxy-sky-app-active #marketPage .poxy-market-search input {
  border: none;
  background: none;
  outline: none;
  font: 500 14px var(--font);
  color: var(--text);
  width: 100%;
}

body.poxy-sky-app-active #marketPage .poxy-market-field:not(.poxy-market-field--sort-native) .poxy-market-select {
  font: 600 13px var(--font) !important;
  padding: 8px 14px !important;
  border-radius: 10px !important;
  border: 1px solid var(--border) !important;
  background: var(--glass) !important;
  color: var(--text-dim) !important;
}

body.poxy-sky-app-active #marketPage #pxSkyMarketSellBtn {
  margin-left: auto;
}

/* ── Listings grid ── */
body.poxy-sky-app-active #marketPage .poxy-market-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)) !important;
  gap: 14px !important;
}

body.poxy-sky-app-active #marketPage .poxy-market-card {
  display: flex;
  flex-direction: column;
  text-align: left;
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--r) !important;
  overflow: hidden;
  box-shadow: var(--shadow) !important;
  padding: 0 !important;
  transition: transform 0.16s, border-color 0.2s;
}

body.poxy-sky-app-active #marketPage .poxy-market-card:hover {
  transform: translateY(-3px);
  border-color: var(--sky-500) !important;
}

body.poxy-sky-app-active #marketPage .poxy-market-card-visual {
  order: 1;
  height: 160px !important;
  display: grid !important;
  place-items: center;
  font-size: 42px !important;
  border: none !important;
  border-bottom: 1px solid var(--border) !important;
  border-radius: 0 !important;
  background: radial-gradient(
    110% 80% at 50% 16%,
    color-mix(in srgb, var(--sky-500) 26%, var(--bg-2)),
    var(--bg-2)
  ) !important;
}

body.poxy-sky-app-active #marketPage .poxy-market-card-body {
  order: 2;
  padding: 12px 14px 4px !important;
}

body.poxy-sky-app-active #marketPage .poxy-market-card-serial {
  font-size: 13.5px !important;
  font-weight: 650 !important;
  color: var(--text-strong) !important;
  margin-bottom: 4px;
}

body.poxy-sky-app-active #marketPage .poxy-market-card-tier {
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
}

body.poxy-sky-app-active #marketPage .poxy-market-card-side {
  order: 3;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 14px 12px !important;
  margin: 0 !important;
  border: none !important;
}

body.poxy-sky-app-active #marketPage .poxy-market-card-price {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px !important;
  font-weight: 700 !important;
  color: var(--text-strong) !important;
}

body.poxy-sky-app-active #marketPage .poxy-market-card-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

body.poxy-sky-app-active #marketPage .poxy-market-btn {
  font: 600 12px var(--font) !important;
  padding: 7px 10px !important;
  border-radius: 10px !important;
  border: 1px solid var(--border) !important;
}

body.poxy-sky-app-active #marketPage .poxy-market-btn--primary {
  background: var(--btn-bg) !important;
  color: var(--btn-text) !important;
  border-color: var(--btn-bg) !important;
}

body.poxy-sky-app-active #marketPage .poxy-market-btn--ghost,
body.poxy-sky-app-active #marketPage .poxy-market-btn--muted {
  background: var(--glass) !important;
  color: var(--text) !important;
}

body.poxy-sky-app-active #marketPage .poxy-market-lock-overlay {
  border-radius: var(--r);
}
`;

const outDir = path.join(__dirname, '../assets/poxy-sky/screens');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const header = '/* POXY Sky Market — Stage 6 from poxy-dashboard.html #sc-market */\n';
fs.writeFileSync(
  path.join(outDir, 'market.css'),
  header + manual + scopeCss(extracted) + '\n'
);
console.log('assets/poxy-sky/screens/market.css built');
