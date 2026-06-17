/**
 * Stage 4 — Sky Home + Open screens CSS from poxy-dashboard.html mockup.
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
  '.panel-h',
  '.btn',
  '.coin-sm',
  '.boxes',
  '.box-card',
  '.box-3d',
  '.box-body',
  '.box-lid',
  '.box-mk',
  '.box-name',
  '.box-odds',
  '.box-price',
  '.open-intro',
  '.cards',
  '.cards-cell',
  '.cell-frame',
  '.cell-meta',
  '.cell-name',
  '.cell-rar',
  '.miles',
  '.ring-prog',
  '.m-txt',
];

function extractRule(selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(esc + '\\{([^}]+)\\}', 'm');
  const m = mockStyle.match(re);
  return m ? selector + '{' + m[1].trim() + '}' : '';
}

function scopeCss(css) {
  return css
    .replace(/^(\s*)(\.[\w.-][^{]*)\{/gm, (m, indent, sel) => {
      const t = sel.trim();
      if (t.startsWith('#pxSky')) return m;
      return indent + '#pxSkyHome ' + t + ', #pxSkyOpen ' + t + '{';
    })
    .replace(/\}(\s*)(\.[\w.-][^{]*)\{/g, '}$1#pxSkyHome $2, #pxSkyOpen $2{');
}

const extracted = BLOCKS.map(extractRule).filter(Boolean).join('\n');

const manual = `
#pxSkyHome, #pxSkyOpen { display: none; }
body.poxy-sky-app-active #pxSkyHome.px-sky-screen--active,
body.poxy-sky-app-active #pxSkyOpen.px-sky-screen--active {
  display: block;
  animation: pxSkyScreenIn 0.3s var(--ease, cubic-bezier(0.4, 0, 0.2, 1));
}
@keyframes pxSkyScreenIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}
body.poxy-sky-app-active #stPanelDashboard .px-legacy-dash {
  display: none !important;
}
#pxSkyHome .px-home-welcome {
  display: flex;
  gap: 18px;
  align-items: center;
  flex-wrap: wrap;
}
#pxSkyHome .px-home-welcome-main { flex: 1; min-width: 220px; }
#pxSkyHome .px-home-lead {
  font-size: 15px;
  color: var(--text-dim);
  max-width: 420px;
}
#pxSkyHome .px-home-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
}
#pxSkyHome .px-home-stats { display: flex; gap: 10px; flex-wrap: wrap; }
#pxSkyHome .px-stat-chip {
  text-align: center;
  background: var(--glass);
  border-radius: 16px;
  border: 1px solid var(--border);
  padding: 16px 20px;
  min-width: 100px;
}
#pxSkyHome .px-stat-val {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}
#pxSkyHome .px-stat-lbl { font-size: 12px; color: var(--text-dim); margin-top: 4px; }
#pxSkyHome .px-home-col-section { margin-top: 28px; }
#pxSkyHome .px-home-view-all { margin-top: 16px; }
#pxSkyOpen .page-head { margin-bottom: 22px; }
#pxSkyOpen .px-open-spin-host { margin-top: 8px; }
#pxSkyOpen .px-open-spin-host .st-hero { margin: 0; padding: 0; }
body.poxy-sky-app-active #pxSkyOpen .dsh-spin-label,
body.poxy-sky-app-active #pxSkyOpen .st-hero-glow {
  display: none !important;
}
#pxSkyOpen .px-open-spin-host .st-glass-surface { display: none; }
`;

const header = `/* POXY Sky Home — Stage 4 from poxy-dashboard.html */\n`;

fs.writeFileSync(
  path.join(__dirname, '../assets/poxy-sky/screens/home.css'),
  header + manual + scopeCss(extracted) + '\n'
);
console.log('home.css built');
