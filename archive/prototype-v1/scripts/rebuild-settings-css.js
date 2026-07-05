/**
 * Stage 9 — Sky Settings screen CSS from poxy-dashboard.html #sc-settings.
 */
const fs = require('fs');
const path = require('path');

const mock = fs.readFileSync(path.join(__dirname, '../design/v2/poxy-dashboard.html'), 'utf8');
const cssMatch = mock.match(/<style>([\s\S]*?)<\/style>/);
if (!cssMatch) throw new Error('mockup style not found');
const mockStyle = cssMatch[1];

const BLOCKS = [
  '.page-head',
  '.settings-grid',
  '.set-group',
  '.set-group h3',
  '.set-row',
  '.set-ic',
  '.set-txt',
  '.set-arrow',
  '.set-toggle',
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

function scopeSettings(css) {
  const scope = 'body.poxy-sky-app-active #settingsPage';
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
body.poxy-sky-app-active #settingsPage {
  background: transparent !important;
  padding-top: 0 !important;
}

body.poxy-sky-app-active #settingsPage .poxy-settings-sidebar,
body.poxy-sky-app-active #settingsPage .poxy-settings-viewport-head,
body.poxy-sky-app-active #settingsPage .poxy-settings-mobile-tabs {
  display: none !important;
}

body.poxy-sky-app-active #settingsPage .poxy-settings-shell {
  display: block !important;
  grid-template-columns: 1fr !important;
}

body.poxy-sky-app-active #settingsPage.px-sky-settings--hub .poxy-settings-viewport {
  display: none !important;
}

body.poxy-sky-app-active #settingsPage.px-sky-settings--detail #pxSkySettingsHub {
  display: none !important;
}

body.poxy-sky-app-active #settingsPage.px-sky-settings--detail .poxy-settings-viewport {
  display: block !important;
  width: 100% !important;
  max-width: none !important;
}

body.poxy-sky-app-active #settingsPage #pxSkySettingsBack {
  margin-bottom: 16px;
}

body.poxy-sky-app-active #settingsPage #pxSkySettingsBack button {
  font: 600 14px var(--font);
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--glass);
  color: var(--text);
  cursor: pointer;
}

body.poxy-sky-app-active #settingsPage .set-txt .st {
  display: block;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text-strong);
}

body.poxy-sky-app-active #settingsPage .set-txt .sd {
  display: block;
  font-size: 12.5px;
  color: var(--text-dim);
}

body.poxy-sky-app-active #settingsPage .set-row:hover {
  background: var(--glass);
}

body.poxy-sky-app-active #settingsPage .set-toggle.on {
  background: var(--sky-500);
}

body.poxy-sky-app-active #settingsPage .set-toggle.on::after {
  transform: translateX(18px);
}

body.poxy-sky-app-active #settingsPage .set-toggle::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
}

body.poxy-sky-app-active #settingsPage .set-toggle {
  position: relative;
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

@media (max-width: 680px) {
  body.poxy-sky-app-active #settingsPage .settings-grid {
    grid-template-columns: 1fr !important;
  }
}
`;

const outDir = path.join(__dirname, '../assets/poxy-sky/screens');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const header = '/* POXY Sky Settings — Stage 9 from poxy-dashboard.html #sc-settings */\n';
fs.writeFileSync(path.join(outDir, 'settings.css'), header + manual + scopeSettings(extracted) + '\n');
console.log('assets/poxy-sky/screens/settings.css built');
