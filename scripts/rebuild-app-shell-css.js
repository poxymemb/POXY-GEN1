/**
 * Stage 3 — Sky app shell CSS from poxy-dashboard.html (layout chrome only).
 */
const fs = require('fs');
const path = require('path');

const mock = fs.readFileSync(path.join(__dirname, '../design/v2/poxy-dashboard.html'), 'utf8');
const cssMatch = mock.match(/<style>([\s\S]*?)<\/style>/);
if (!cssMatch) throw new Error('mockup style not found');

const mockStyle = cssMatch[1];

function extractBlock(name) {
  const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]+)\\}');
  const m = mockStyle.match(re);
  return m ? m[1].trim() : '';
}

const lightDash = extractBlock('[data-theme="light"]');
const darkDash = extractBlock('[data-theme="dark"]');

const shellRules = [];
const lines = mockStyle.split('\n');
let capture = false;
for (const line of lines) {
  if (/^\s*\/\* RAIL \*\//.test(line)) capture = true;
  if (/^\s*\/\* ===== FROG/.test(line)) break;
  if (!capture) continue;
  if (/^\s*@keyframes/.test(line)) continue;
  shellRules.push(line);
}

function scopeShellCss(css) {
  let s = css.replace(/^(\s*)(\.[\w.-][^{]*)\{/gm, (m, indent, sel) => {
    const t = sel.trim();
    if (t.startsWith('#poxyAppShell')) return m;
    return indent + '#poxyAppShell ' + t + '{';
  });
  s = s.replace(/\}(\s*)(\.[\w.-][^{]*)\{/g, '}$1#poxyAppShell $2{');
  return s.replace(/animation:fade/g, 'animation:pxSkyFade');
}

const extra = `
  #poxyAppShell .xp-badge{display:inline-flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--border);border-radius:999px;padding:5px 12px 5px 5px}
  #poxyAppShell .xp-lvl{width:28px;height:28px;border-radius:50%;background:linear-gradient(165deg,var(--sky-400),var(--sky-600));color:#fff;font-weight:700;font-size:12px;display:grid;place-items:center;flex-shrink:0}
  #poxyAppShell .xp-bar{width:60px;height:5px;border-radius:3px;background:var(--border);overflow:hidden}
  #poxyAppShell .xp-bar i{display:block;height:100%;background:var(--sky-500);width:64%}
  @keyframes pxSkyFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  @media(max-width:820px){#poxyAppShell .topbar{padding:12px 16px}}
  @media(max-width:560px){
    #poxyAppShell .rail{position:fixed;bottom:0;top:auto;width:100%;height:auto;flex-direction:row;border-right:none;border-top:1px solid var(--border);padding:8px;z-index:40;justify-content:space-around}
    #poxyAppShell .rail .logo,#poxyAppShell .rail-spacer,#poxyAppShell .rail-btn .tip{display:none}
    #poxyAppShell .main{padding-bottom:70px}
    #poxyAppShell .stage{padding:18px 16px 30px}
  }
`;

const header = `/* POXY Sky app shell — Stage 3 from poxy-dashboard.html */
html[data-theme="light"] body.poxy-sky-app-active {
  ${lightDash}
}
html[data-theme="dark"] body.poxy-sky-app-active {
  ${darkDash}
}
body.poxy-sky-app-active {
  font-family: var(--font);
  background: var(--bg) !important;
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}
body.poxy-sky-app-active.poxy-landing-active #poxyAppShell:not(.px-sky-app--open) {
  display: none !important;
}
body.poxy-sky-app-active #poxyLanding {
  display: none !important;
}
#poxyAppShell.px-sky-app {
  display: none;
  min-height: 100dvh;
  width: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  --rail-w: 74px;
}
#poxyAppShell.px-sky-app.px-sky-app--open {
  display: flex !important;
  position: fixed;
  inset: 0;
  z-index: 40;
  overflow: hidden;
}
#poxyAppShell.px-sky-app--open .main {
  overflow: auto;
  min-height: 0;
}
#poxyAppShell .px-legacy-nav {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}
body.poxy-sky-app-active #bottomNav,
body.poxy-sky-app-active #sidebarPanel,
body.poxy-sky-app-active #sidebarBackdrop {
  display: none !important;
}
#poxyAppShell #userBar {
  display: none !important;
}
body.poxy-sky-app-active #poxyAppShell .dsh-hero-header,
body.poxy-sky-app-active #poxyAppShell .dsh-ambient-fog {
  display: none !important;
}
#poxyAppShell .st-xp-hud {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 5px 12px 5px 8px;
  font-size: 12px;
}
#poxyAppShell .st-xp-hud-level {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(165deg, var(--sky-400), var(--sky-600));
  color: #fff;
  font-weight: 700;
  font-size: 11px;
  display: grid;
  place-items: center;
}
#poxyAppShell .st-xp-hud-track {
  width: 60px;
  height: 5px;
  border-radius: 3px;
  background: var(--border);
  overflow: hidden;
}
#poxyAppShell .st-xp-hud-fill {
  height: 100%;
  background: var(--sky-500);
}
#poxyAppShell .st-wallet-capsule,
#poxyAppShell .balance-badge {
  display: inline-flex !important;
  align-items: center;
  gap: 8px;
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  border-radius: 999px !important;
  padding: 7px 12px 7px 8px !important;
  box-shadow: none !important;
  max-width: none !important;
}
#poxyAppShell .st-wallet-body {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: none !important;
  border: none !important;
  padding: 0 !important;
  color: var(--text-strong) !important;
  font-weight: 700 !important;
  font-size: 15px !important;
}
#poxyAppShell .st-wallet-icon {
  display: none !important;
}
#poxyAppShell .st-wallet-plus-btn {
  width: 28px !important;
  height: 28px !important;
  border-radius: 50% !important;
  border: 1px solid var(--border) !important;
  background: var(--glass-strong) !important;
  color: var(--text) !important;
  padding: 0 !important;
}
#poxyAppShell .st-nav-icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: transform 0.15s;
  position: relative;
}
#poxyAppShell .st-nav-icon-btn:hover {
  transform: translateY(-1px);
}
#poxyAppShell .st-nav-icon-btn .material-symbols-outlined {
  font-size: 20px;
}
#poxyAppShell .st-nav-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 17px;
  height: 17px;
  border-radius: 9px;
  background: #e0563a;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: grid;
  place-items: center;
  padding: 0 4px;
  border: 2px solid var(--bg);
}
#poxyAppShell .stage .page,
#poxyAppShell .stage .st-spa-panel,
#poxyAppShell .stage #huntPage {
  background: transparent;
}
#poxyAppShell .poxy-stitch-dash {
  background: transparent !important;
}
body.poxy-sky-app-active.poxy-app-dark,
body.poxy-sky-app-active.poxy-stitch-dash {
  background: var(--bg) !important;
}

`;

const scopedShell = scopeShellCss(shellRules.join('\n'));

fs.writeFileSync(
  path.join(__dirname, '../assets/poxy-sky/app-shell.css'),
  header + scopedShell + extra + '\n'
);
console.log('app-shell.css built');
