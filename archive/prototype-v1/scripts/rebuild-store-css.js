/**

 * Stage 8 — Sky Store screen CSS from poxy-dashboard.html #sc-store.

 */

const fs = require('fs');

const path = require('path');



const mock = fs.readFileSync(path.join(__dirname, '../design/v2/poxy-dashboard.html'), 'utf8');

const cssMatch = mock.match(/<style>([\s\S]*?)<\/style>/);

if (!cssMatch) throw new Error('mockup style not found');

const mockStyle = cssMatch[1];



const BLOCKS = [

  '.page-head',

  '.panel-h',

  '.plans',

  '.plan',
  '.plan.featured',

  '.plan-badge',

  '.plan-name',

  '.plan-price',

  '.plan-per',

  '.plan-feats',
  '.plan-feats li',

  '.store-section',

  '.store-grid',

  '.store-card',

  '.store-vis',

  '.store-meta',

  '.store-name',

  '.store-buy',

  '.btn',

  '.btn-primary',

  '.btn-glass',

  '.coin-sm',

  '.chip-filter',

];



function extractRule(selector) {

  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const re = new RegExp(esc + '\\{([^}]+)\\}', 'm');

  const m = mockStyle.match(re);

  if (m) return selector + '{' + m[1].trim() + '}';

  const reNested = new RegExp(esc + '\\{([\\s\\S]*?)\\n  \\}', 'm');

  const m2 = mockStyle.match(reNested);

  return m2 ? selector + '{' + m2[1].trim() + '}' : '';

}



function scopeStore(css) {

  const scope = 'body.poxy-sky-app-active #storePage';

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

body.poxy-sky-app-active #stPanelStore,

body.poxy-sky-app-active #storePage {

  background: transparent !important;

}



body.poxy-sky-app-active #storePage .poxy-store-sidenav,

body.poxy-sky-app-active #storePage .poxy-store-bento,

body.poxy-sky-app-active #storePage .poxy-store-uplinks {

  display: none !important;

}



body.poxy-sky-app-active #storePage .poxy-store-layout {

  display: block !important;

  grid-template-columns: 1fr !important;

}



body.poxy-sky-app-active #storePage .poxy-store-main {

  width: 100% !important;

  max-width: none !important;

}



body.poxy-sky-app-active #storePage .poxy-store-grid-header {

  display: none !important;

}



body.poxy-sky-app-active #storePage .px-sky-page-head p {

  max-width: 520px;

}



/* ── Category chips ── */

body.poxy-sky-app-active #storePage #pxSkyStoreToolbar {

  display: flex;

  flex-wrap: wrap;

  align-items: center;

  gap: 10px;

  margin-bottom: 22px;

}



body.poxy-sky-app-active #storePage #pxSkyStoreCatChips {

  display: flex;

  flex-wrap: wrap;

  gap: 8px;

  flex: 1;

}



body.poxy-sky-app-active #storePage .px-sky-store-chip {

  font: 600 13px var(--font);

  padding: 8px 14px;

  border-radius: 10px;

  border: 1px solid var(--border);

  background: var(--glass);

  color: var(--text-dim);

  cursor: pointer;

}



body.poxy-sky-app-active #storePage .px-sky-store-chip.on {

  background: var(--btn-bg);

  color: #fff;

  border-color: var(--btn-bg);

}



body.poxy-sky-app-active #storePage #pxSkyStoreWallet {

  display: inline-flex;

  align-items: center;

  gap: 10px;

  margin-left: auto;

  font: 700 14px var(--font);

  color: var(--text-strong);

}



body.poxy-sky-app-active #storePage #pxSkyStoreWallet .px-sky-store-fund {

  font: 600 12px var(--font);

  padding: 7px 12px;

  border-radius: 10px;

  border: 1px solid var(--border);

  background: var(--glass);

  color: var(--text);

  cursor: pointer;

}



/* ── Membership ── */

body.poxy-sky-app-active #storePage #pxSkyStoreMembership {

  margin-bottom: 28px;

}



body.poxy-sky-app-active #storePage #pxSkyStoreMembership .plan.featured {

  border-color: var(--sky-500);

  background: linear-gradient(

    165deg,

    color-mix(in srgb, var(--sky-500) 12%, var(--card)),

    var(--card)

  );

  box-shadow: var(--shadow), 0 0 40px color-mix(in srgb, var(--sky-500) 18%, transparent);

}



/* ── Grid section title ── */

body.poxy-sky-app-active #storePage #pxSkyStoreSectionTitle {

  margin-bottom: 14px;

}



/* ── Legacy cards → Sky store cards ── */

body.poxy-sky-app-active #storePage .poxy-store-grid {

  display: grid !important;

  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important;

  gap: 13px !important;

}



body.poxy-sky-app-active #storePage .poxy-store-grid .poxy-store-card {

  display: flex;

  flex-direction: column;

  background: var(--card) !important;

  border: 1px solid var(--border) !important;

  border-radius: var(--r) !important;

  overflow: hidden;

  box-shadow: var(--shadow) !important;

  padding: 0 !important;

  transition: transform 0.16s;

}



body.poxy-sky-app-active #storePage .poxy-store-grid .poxy-store-card:hover {

  transform: translateY(-3px);

}



body.poxy-sky-app-active #storePage .poxy-store-grid .poxy-store-card h4,

body.poxy-sky-app-active #storePage .poxy-store-grid .poxy-store-card .poxy-store-card-desc {

  display: none;

}



body.poxy-sky-app-active #storePage .poxy-store-grid .poxy-store-card-badge {

  top: 8px;

  right: 8px;

  font-size: 10px;

  padding: 4px 8px;

  border-radius: 8px;

  background: var(--sky-500);

  color: #fff;

}



body.poxy-sky-app-active #storePage .poxy-store-grid .poxy-store-card-visual {

  order: 1;

  height: 90px !important;

  min-height: 90px !important;

  border: none !important;

  border-bottom: 1px solid var(--border) !important;

  border-radius: 0 !important;

  background: radial-gradient(

    120% 90% at 50% 20%,

    var(--sc, var(--sky-500)),

    color-mix(in srgb, var(--sc, var(--sky-500)) 40%, var(--bg-2))

  ) !important;

}



body.poxy-sky-app-active #storePage .poxy-store-grid .poxy-store-card-tag {

  display: none;

}



body.poxy-sky-app-active #storePage .poxy-store-grid .poxy-store-card-foot {

  order: 2;

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 8px;

  padding: 12px 14px !important;

  margin: 0 !important;

  border: none !important;

  background: transparent !important;

}



body.poxy-sky-app-active #storePage .poxy-store-grid .poxy-store-card-foot::before {

  content: attr(data-sky-name);

  font-size: 13.5px;

  font-weight: 600;

  color: var(--text-strong);

  flex: 1;

  min-width: 0;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

}



body.poxy-sky-app-active #storePage .poxy-store-grid .poxy-store-card-price {

  display: none !important;

}



body.poxy-sky-app-active #storePage .poxy-store-grid .poxy-store-card-status {

  font-size: 12px;

  color: var(--text-dim);

}



body.poxy-sky-app-active #storePage .poxy-store-grid .poxy-store-card-acquire,

body.poxy-sky-app-active #storePage .poxy-store-grid .px-sky-store-buy {

  display: inline-flex;

  align-items: center;

  font: 700 13px var(--font);

  color: var(--text-strong);

  background: var(--glass);

  border: 1px solid var(--border);

  padding: 6px 11px;

  border-radius: 9px;

  cursor: pointer;

  flex-shrink: 0;

}



body.poxy-sky-app-active #storePage .poxy-store-signin,

body.poxy-sky-app-active #storePage .poxy-store-empty {

  grid-column: 1 / -1;

  text-align: center;

  color: var(--text-dim);

  padding: 24px;

  font-size: 14px;

}



/* Pass / VIP panels */

body.poxy-sky-app-active #storePage .poxy-pass-panel,

body.poxy-sky-app-active #storePage .poxy-vip-panel {

  grid-column: 1 / -1;

  background: var(--card);

  border: 1px solid var(--border);

  border-radius: var(--r-lg);

  padding: 20px;

  box-shadow: var(--shadow);

}



body.poxy-sky-app-active #storePage .poxy-pass-buy,

body.poxy-sky-app-active #storePage .poxy-vip-btn {

  font: 600 13px var(--font) !important;

  border-radius: 12px !important;

  border: 1px solid var(--border) !important;

  background: var(--btn-bg) !important;

  color: var(--btn-text) !important;

}



body.poxy-sky-app-active #storePage #pxSkyStoreMembership .plan-feats li {
  font-size: 13.5px;
  color: var(--text-dim);
  padding-left: 22px;
  position: relative;
  list-style: none;
}

body.poxy-sky-app-active #storePage #pxSkyStoreMembership .plan-feats li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: var(--sky-500);
  font-weight: 700;
}

body.poxy-sky-app-active #storePage .store-card:hover {
  transform: translateY(-3px);
}

@media (max-width: 680px) {

  body.poxy-sky-app-active #storePage .plans {

    grid-template-columns: 1fr !important;

  }

  body.poxy-sky-app-active #storePage #pxSkyStoreWallet {

    width: 100%;

    margin-left: 0;

    justify-content: space-between;

  }

}

`;



const outDir = path.join(__dirname, '../assets/poxy-sky/screens');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });



const header = '/* POXY Sky Store — Stage 8 from poxy-dashboard.html #sc-store */\n';

fs.writeFileSync(path.join(outDir, 'store.css'), header + manual + scopeStore(extracted) + '\n');

console.log('assets/poxy-sky/screens/store.css built');

