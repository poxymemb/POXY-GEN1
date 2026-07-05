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
    #poxyAppShell .rail{position:fixed;bottom:0;top:auto;left:0;width:100%;height:auto;max-height:none;flex-direction:row;border-right:none;border-top:1px solid var(--border);padding:8px;z-index:40;justify-content:space-around;overflow:visible}
    #poxyAppShell.px-sky-app--open .main{margin-left:0!important;width:100%!important;padding-bottom:70px}
    #poxyAppShell .rail .logo,#poxyAppShell .rail-spacer,#poxyAppShell .rail-btn .tip{display:none}
    #poxyAppShell .stage{padding:18px 16px 30px}
  }

  /* ── Shell open: mockup flex row (sticky rail + scrolling main) ── */
  #poxyAppShell.px-sky-app--open {
    flex-direction: row !important;
    align-items: stretch !important;
    width: 100% !important;
    min-height: 100dvh !important;
  }
  #poxyAppShell.px-sky-app--open .main {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto !important;
    min-width: 0 !important;
    min-height: 0 !important;
    margin-left: 0 !important;
    width: auto !important;
  }

  /* ── Rail 1:1 DESIGN PX — sticky column, spacer pins profile/settings ── */
  #poxyAppShell.px-sky-app--open .rail {
    position: sticky !important;
    top: 0 !important;
    align-self: flex-start !important;
    width: var(--rail-w) !important;
    flex-shrink: 0 !important;
    height: 100vh !important;
    height: 100svh !important;
    max-height: 100svh !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    z-index: 35 !important;
  }
  #poxyAppShell .rail-spacer {
    flex: 1 1 auto !important;
    min-height: 8px !important;
    width: 100% !important;
  }
  #poxyAppShell #pxSkyTopbar {
    flex-shrink: 0;
  }
  #poxyAppShell #pxSkyStage {
    flex: 1;
    min-height: 0;
  }
  /* Legacy spin .stage must not break sky stage (mockup .stage metrics) */
  #poxyAppShell #pxSkyStage.stage {
    width: 100% !important;
    max-width: 1120px !important;
    height: auto !important;
    min-height: 0 !important;
    display: block !important;
    margin: 0 auto !important;
    flex: 1 !important;
    overflow: visible !important;
    padding: 28px 26px 40px !important;
    box-sizing: border-box !important;
    align-items: initial !important;
    justify-content: initial !important;
    position: relative !important;
  }
  body.poxy-sky-app-active #pxSkyStage > .st-win-reveal:not(.is-open) {
    display: none !important;
  }

  /* ── Dashboard 1:1 overrides (mockup rail + topbar) ── */
  #poxyAppShell .rail .logo {
    width: 38px !important;
    height: 38px !important;
    border-radius: 11px !important;
    margin-bottom: 12px !important;
    flex-shrink: 0 !important;
  }
  #poxyAppShell .rail-btn {
    width: 46px !important;
    height: 46px !important;
    min-width: 46px !important;
    min-height: 46px !important;
    max-width: 46px !important;
    max-height: 46px !important;
    border-radius: 14px !important;
  }
  #poxyAppShell .top-icon {
    position: relative;
  }
  #poxyAppShell .top-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 17px;
    height: 17px;
    border-radius: 9px;
    background: #E0563A;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    display: grid;
    place-items: center;
    padding: 0 4px;
    border: 2px solid var(--bg);
  }
  #poxyAppShell #balanceBadgeGroup.balance {
    padding: 7px 15px 7px 8px !important;
  }
  body.poxy-sky-app-active #poxyAppShell .btn {
    width: auto !important;
    font-family: var(--font) !important;
    font-weight: 600 !important;
    box-shadow: none !important;
    background-image: none !important;
    letter-spacing: normal !important;
    text-transform: none !important;
    border-radius: 12px !important;
  }
  body.poxy-sky-app-active #poxyAppShell .btn-primary {
    background: var(--btn-bg) !important;
    color: var(--btn-text) !important;
    border: 1px solid var(--btn-bg) !important;
    padding: 11px 18px !important;
    font-size: 14px !important;
  }
  body.poxy-sky-app-active #poxyAppShell .btn-primary:hover {
    transform: none !important;
    filter: brightness(1.08) !important;
  }
  body.poxy-sky-app-active #poxyAppShell .btn-glass {
    background: var(--glass-strong) !important;
    color: var(--text) !important;
    border: 1px solid var(--border) !important;
  }
  body.poxy-sky-app-active #poxyAppShell .balance.visible {
    display: inline-flex !important;
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
html:has(body.poxy-sky-app-active) {
  zoom: 1 !important;
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
  --r-lg: 24px;
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
