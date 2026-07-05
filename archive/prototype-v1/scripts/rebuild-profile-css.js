/**
 * Stage 10 — Sky Profile screen CSS from poxy-dashboard.html #sc-profile.
 */
const fs = require('fs');
const path = require('path');

const mock = fs.readFileSync(path.join(__dirname, '../design/v2/poxy-dashboard.html'), 'utf8');
const cssMatch = mock.match(/<style>([\s\S]*?)<\/style>/);
if (!cssMatch) throw new Error('mockup style not found');
const mockStyle = cssMatch[1];

const BLOCKS = [
  '.page-head',
  '.prof-banner',
  '.prof-edit',
  '.prof-card',
  '.prof-av',
  '.prof-name',
  '.prof-handle',
  '.prof-stats',
  '.prof-stat',
  '.prof-section',
  '.pthemes',
  '.ptheme',
  '.pro-lock',
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

function scopeProfile(css) {
  const scope = 'body.poxy-sky-app-active #profilePage';
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
body.poxy-sky-app-active #profilePage {
  background: transparent !important;
}

body.poxy-sky-app-active #profilePage .idhub-blob,
body.poxy-sky-app-active #profilePage .idhub-settings-btn,
body.poxy-sky-app-active #profilePage .idhub-hero,
body.poxy-sky-app-active #profilePage .idhub-stats {
  display: none !important;
}

body.poxy-sky-app-active #profilePage .idhub-shell {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}

body.poxy-sky-app-active #profilePage .prof-stat .v {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-strong);
}

body.poxy-sky-app-active #profilePage .prof-stat .l {
  font-size: 12px;
  color: var(--text-dim);
}

body.poxy-sky-app-active #profilePage .prof-section h3 {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-faint);
  margin-bottom: 13px;
}

body.poxy-sky-app-active #profilePage .ptheme.sel {
  border-color: var(--text);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--pc) 40%, transparent);
}

body.poxy-sky-app-active #profilePage .pro-lock .pl-ic {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: var(--sky-500);
  color: #fff;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

body.poxy-sky-app-active #profilePage .pro-lock .pl-ic svg {
  width: 18px;
  height: 18px;
}

body.poxy-sky-app-active #profilePage .pro-lock .pl-txt .t {
  font-size: 14px;
  font-weight: 650;
  color: var(--text-strong);
}

body.poxy-sky-app-active #profilePage .pro-lock .pl-txt .d {
  font-size: 12.5px;
  color: var(--text-dim);
}

body.poxy-sky-app-active #profilePage .idhub-panel,
body.poxy-sky-app-active #profilePage .poxy-streak-panel {
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--r-lg) !important;
  box-shadow: var(--shadow) !important;
  color: var(--text) !important;
  margin-bottom: 20px;
}

body.poxy-sky-app-active #profilePage .idhub-panel-title {
  color: var(--text-faint) !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  letter-spacing: 0.05em !important;
  text-transform: uppercase !important;
}

body.poxy-sky-app-active #profilePage .idhub-panel-meta,
body.poxy-sky-app-active #profilePage .poxy-streak-head p {
  color: var(--text-dim) !important;
}

body.poxy-sky-app-active #profilePage .idhub-stat-label {
  color: var(--text-faint) !important;
}

body.poxy-sky-app-active #profilePage .idhub-stat-val,
body.poxy-sky-app-active #profilePage .poxy-streak-days {
  color: var(--text-strong) !important;
}
`;

const outDir = path.join(__dirname, '../assets/poxy-sky/screens');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const header = '/* POXY Sky Profile — Stage 10 from poxy-dashboard.html #sc-profile */\n';
fs.writeFileSync(path.join(outDir, 'profile.css'), header + manual + scopeProfile(extracted) + '\n');
console.log('assets/poxy-sky/screens/profile.css built');
