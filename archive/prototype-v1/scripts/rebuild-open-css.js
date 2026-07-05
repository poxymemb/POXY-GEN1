/**
 * Stage 7 — Sky Open ritual CSS from poxy-dashboard.html #sc-open + #ritual.
 */
const fs = require('fs');
const path = require('path');

const mock = fs.readFileSync(path.join(__dirname, '../design/v2/poxy-dashboard.html'), 'utf8');
const cssMatch = mock.match(/<style>([\s\S]*?)<\/style>/);
if (!cssMatch) throw new Error('mockup style not found');
const mockStyle = cssMatch[1];

const BLOCKS = [
  '.page-head',
  '.open-intro',
  '.boxes',
  '.box-card',
  '.box-3d',
  '.box-body',
  '.box-lid',
  '.box-mk',
  '.box-name',
  '.box-odds',
  '.box-price',
  '.ritual-close',
  '.stage-box',
  '.stage-hint',
  '.stage-title',
  '.big-box',
  '.bb-body',
  '.bb-lid',
  '.bb-mk',
  '.gen-frame',
  '.gen-reveal',
  '.gen-sweep',
  '.gen-frame .ring',
  '.result',
  '.rname',
  '.rrar',
  '.result-actions',
  '.btn',
  '.btn-primary',
  '.btn-glass',
  '.coin-sm',
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

function scopeOpen(css) {
  const scope = 'body.poxy-sky-app-active #pxSkyOpen';
  return css
    .replace(/^(\s*)(\.[\w#][^{]*)\{/gm, (m, indent, sel) => {
      const t = sel.trim();
      if (t.startsWith('@')) return m;
      return indent + scope + ' ' + t + '{';
    })
    .replace(/\}(\s*)(\.[\w#][^{]*)\{/g, '}$1' + scope + ' $2{');
}

function scopeRitual(css) {
  return css.replace(/^(\s*)(\.[\w#][^{]*)\{/gm, (m, indent, sel) => {
    const t = sel.trim();
    if (t.startsWith('@')) return m;
    if (t === '.ritual' || t.startsWith('.ritual ')) return m;
    return indent + '#pxSkyRitual ' + t + '{';
  });
}

let extracted = '';
BLOCKS.forEach((sel) => {
  const rule = extractRule(sel);
  if (!rule) return;
  if (sel === '.ritual-close') {
    extracted += rule.replace(/^\.ritual-close/, '#pxSkyRitual .ritual-close') + '\n';
  } else if (
    sel.startsWith('.stage-') ||
    sel.startsWith('.big-box') ||
    sel.startsWith('.bb-') ||
    sel.startsWith('.gen-') ||
    sel === '.gen-frame .ring' ||
    sel.startsWith('.result') ||
    sel === '.rname' ||
    sel === '.rrar'
  ) {
    extracted += scopeRitual(rule) + '\n';
  } else {
    extracted += scopeOpen(rule) + '\n';
  }
});

const manual = `
body.poxy-sky-app-active #pxSkyOpen .px-open-spin-host,
body.poxy-sky-app-active #pxSkyOpen .st-premium-tray {
  display: none !important;
}

body.poxy-sky-app-active #pxSkyOpenBoxes {
  margin-bottom: 8px;
}

body.poxy-sky-app-active #pxSkyOpen .px-sky-box-card.active {
  border-color: var(--sky-500) !important;
  transform: translateY(-4px);
}

body.poxy-sky-app-active #pxSkyOpen .px-sky-box-card.sold-out {
  opacity: 0.45;
  pointer-events: none;
}

#pxSkyRitual.px-sky-ritual {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: var(--bg);
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

#pxSkyRitual.px-sky-ritual.show {
  display: flex;
  animation: pxSkyFadeIn 0.3s var(--ease, cubic-bezier(0.4, 0, 0.2, 1));
}

@keyframes pxSkyFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pxSkyReveal {
  0% { opacity: 0; clip-path: inset(0 0 100% 0); }
  100% { opacity: 1; clip-path: inset(0 0 0 0); }
}

@keyframes pxSkySweep {
  0% { opacity: 1; top: -10%; }
  100% { opacity: 0; top: 100%; }
}

#pxSkyRitual .gen-frame.run .gen-reveal {
  animation: pxSkyReveal 2.4s var(--ease, cubic-bezier(0.4, 0, 0.2, 1)) forwards;
}

#pxSkyRitual .gen-frame.run .gen-sweep {
  animation: pxSkySweep 2.4s var(--ease, cubic-bezier(0.4, 0, 0.2, 1)) forwards;
}

#pxSkyRitual .stage-box,
#pxSkyRitual .result {
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  text-align: center;
  width: 100%;
  max-width: 420px;
}

#pxSkyRitual .stage-box.is-active,
#pxSkyRitual .result.is-active {
  display: flex;
}

#pxSkyRitual #pxSkyStageGen.is-active {
  display: flex;
}

#pxSkyRitual #pxSkyStageGen {
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  text-align: center;
}

#pxSkyRitual .big-box.opening .bb-lid {
  transform: translateY(-30px) rotateX(50deg);
  opacity: 0;
  transition: transform 0.6s var(--ease, cubic-bezier(0.4, 0, 0.2, 1)), opacity 0.6s;
}

#pxSkyRitual .big-box.opening .bb-body {
  transform: scale(0.9);
  opacity: 0;
  transition: all 0.6s var(--ease, cubic-bezier(0.4, 0, 0.2, 1)) 0.1s;
}

#pxSkyRitual .btn {
  font: 600 14px var(--font);
  cursor: pointer;
  padding: 11px 18px;
  border-radius: 12px;
  border: 1px solid transparent;
  transition: transform 0.15s, filter 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

#pxSkyRitual .btn-primary {
  background: var(--btn-bg);
  color: var(--btn-text);
}

#pxSkyRitual .btn-glass {
  background: var(--glass-strong);
  color: var(--text);
  border-color: var(--border);
}

body.poxy-sky-app-active #pxSkyOpen .box-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(80% 60% at 50% 0, color-mix(in srgb, var(--b1) 18%, transparent), transparent 70%);
  pointer-events: none;
}

body.poxy-sky-app-active #pxSkyOpen .box-card:hover {
  transform: translateY(-4px);
  border-color: var(--b1);
}

body.poxy-sky-app-active #pxSkyOpen .box-card:hover .box-lid {
  transform: translateY(-4px) rotateX(18deg);
}

@media (prefers-reduced-motion: reduce) {
  #pxSkyRitual .gen-frame.run .gen-reveal,
  #pxSkyRitual .gen-frame.run .gen-sweep {
    animation: none !important;
  }
  #pxSkyRitual .gen-frame.run .gen-reveal {
    opacity: 1 !important;
    clip-path: inset(0 0 0 0) !important;
  }
}
`;

const outDir = path.join(__dirname, '../assets/poxy-sky/screens');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, 'open.css'),
  '/* POXY Sky Open ritual — Stage 7 from poxy-dashboard.html */\n' + extracted + manual + '\n'
);
console.log('assets/poxy-sky/screens/open.css built');
