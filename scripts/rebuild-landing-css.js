/**
 * Rebuild landing.css 1:1 from mockup with safe CSS scoping.
 */
const fs = require('fs');
const path = require('path');

const mock = fs.readFileSync(path.join(__dirname, '../design/v2/poxy-landing.html'), 'utf8');
const cssMatch = mock.match(/<style>([\s\S]*?)<\/style>/);
if (!cssMatch) throw new Error('mockup style not found');

let css = cssMatch[1];
css = css.replace(/:root\{[\s\S]*?\}/, '');
css = css.replace(/\[data-theme="light"\]\{[\s\S]*?\}/, '');
css = css.replace(/\[data-theme="dark"\]\{[\s\S]*?\}/, '');

function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '');
}

function splitTopLevelRules(s) {
  const rules = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') {
      depth--;
      if (depth === 0) {
        rules.push(s.slice(start, i + 1).trim());
        start = i + 1;
      }
    }
  }
  return rules.filter(Boolean);
}

function prefixSelector(sel) {
  return sel
    .split(',')
    .map((s) => {
      s = s.trim();
      if (!s) return s;
      if (s === '*') return '#poxyLanding, #poxyLanding *';
      if (s === 'html') return 'html';
      if (s === 'body') return 'body.poxy-landing-active';
      if (/^\[data-theme=/.test(s)) {
        return 'html' + s.replace(/^(\[data-theme="(?:light|dark)"\])/, '$1 #poxyLanding');
      }
      if (s.startsWith('#poxyLanding')) return s;
      return '#poxyLanding ' + s;
    })
    .join(', ');
}

function transformRule(rule) {
  const trimmed = rule.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('@keyframes')) return trimmed;
  if (trimmed.startsWith('@media')) {
    const open = trimmed.indexOf('{');
    const close = trimmed.lastIndexOf('}');
    const mq = trimmed.slice(0, open).trim();
    const inner = trimmed.slice(open + 1, close);
    const innerRules = splitTopLevelRules(stripComments(inner))
      .map(transformRule)
      .filter(Boolean)
      .join('\n');
    return mq + '{\n' + innerRules + '\n}';
  }
  const open = trimmed.indexOf('{');
  if (open < 0) return trimmed;
  const sel = trimmed.slice(0, open).trim();
  const body = trimmed.slice(open);
  if (sel === '*') {
    return '#poxyLanding, #poxyLanding * { box-sizing: border-box; }';
  }
  if (sel === 'html') {
    return '';
  }
  if (sel === 'body') {
    return (
      'body.poxy-landing-active {' +
      body
        .slice(1, -1)
        .replace(/font-family:var\(--font\)/, 'font-family:var(--font)')
        .trim() +
      '}'
    );
  }
  return prefixSelector(sel) + body;
}

const scoped = splitTopLevelRules(stripComments(css))
  .map(transformRule)
  .filter(Boolean)
  .join('\n\n');

const header = `/* POXY Sky landing — 1:1 scoped from design/v2/poxy-landing.html */
html { scroll-behavior: smooth; transition: background 0.4s var(--ease); }
html:has(body.poxy-landing-active),
html:has(body.poxy-landing-preview) { background: var(--bg) !important; }
body.poxy-landing-active {
  font-family: var(--font);
  background: var(--bg) !important;
  color: var(--text);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  transition: background 0.4s, color 0.4s;
  overflow-x: hidden;
  margin: 0;
}
#poxyLanding[hidden] { display: none !important; }
body.poxy-landing-active #poxyLanding {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  position: relative;
  z-index: 2;
}
body.poxy-landing-preview { overflow: hidden; }
body.poxy-landing-preview #poxyLanding {
  display: block !important;
  position: fixed;
  inset: 0;
  z-index: 360;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
body.poxy-landing-active:not(.poxy-auth-modal-open) #authOverlay {
  display: none !important;
  pointer-events: none !important;
}
body.poxy-landing-active.poxy-auth-modal-open #authOverlay {
  display: flex !important;
  pointer-events: auto !important;
}
body.poxy-landing-active #poxyAppShell,
body.poxy-landing-active #sidebarPanel,
body.poxy-landing-active #sidebarBackdrop,
body.poxy-landing-active #bottomNav,
body.poxy-landing-active #userBar {
  display: none !important;
}
#plPreviewBack[hidden] { display: none !important; }
body.poxy-landing-preview #plPreviewBack { display: inline-flex !important; }
#poxyLanding .nav-logo { border: none; padding: 0; cursor: pointer; background: var(--btn-bg); }
#poxyLanding .foot-col .foot-link {
  display: block; width: 100%; text-align: left; background: none; border: none;
  font: inherit; padding: 0; margin-bottom: 8px; color: var(--link); cursor: pointer;
}
#poxyLanding .foot-col .foot-link:hover { filter: brightness(1.15); }
#plLangMenu {
  position: fixed; top: 58px; right: 22px; z-index: 90; min-width: 170px;
  background: var(--bg-2); border: 1px solid var(--border); border-radius: 14px;
  padding: 7px; box-shadow: 0 20px 50px rgba(0,0,0,.3); display: flex;
  flex-direction: column; gap: 2px; max-height: 300px; overflow-y: auto;
}
#plLangMenu[hidden] { display: none !important; }
#poxyLanding .lang-opt {
  display: block; width: 100%; text-align: left; padding: 9px 12px; border: none;
  background: none; font: 600 13px var(--font); color: var(--text); border-radius: 9px; cursor: pointer;
}
#poxyLanding .lang-opt:hover { background: var(--glass-strong); }

`;

const isolation = `
/* ── Landing isolation (must load after scoped rules) ── */
body.poxy-landing-active #poxyLanding,
body.poxy-landing-preview #poxyLanding {
  width: 100%;
  max-width: none;
}
body.poxy-landing-active #poxyLanding .page,
body.poxy-landing-preview #poxyLanding .page {
  display: none;
  max-width: none !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  min-height: 0 !important;
  background: transparent !important;
  color: inherit !important;
}
body.poxy-landing-active #poxyLanding .page.active,
body.poxy-landing-preview #poxyLanding .page.active {
  display: block !important;
}
body.poxy-landing-active #poxyLanding > footer,
body.poxy-landing-preview #poxyLanding > footer {
  display: block !important;
  width: 100%;
  margin-top: auto;
  flex-shrink: 0;
}
#poxyLanding .wrap,
#poxyLanding .nav-in {
  margin-left: auto !important;
  margin-right: auto !important;
}

/* Kill legacy runtime .btn-primary (gradient pill, width 100%) */
body.poxy-landing-active #poxyLanding .btn,
body.poxy-landing-preview #poxyLanding .btn {
  width: auto !important;
  font-family: var(--font) !important;
  font-weight: 600 !important;
  box-shadow: none !important;
  -webkit-appearance: none;
  appearance: none;
}
body.poxy-landing-active #poxyLanding .btn-primary,
body.poxy-landing-preview #poxyLanding .btn-primary {
  background: var(--btn-bg) !important;
  color: var(--btn-text) !important;
  border: 1px solid var(--btn-bg) !important;
  border-radius: 14px !important;
  padding: 13px 24px !important;
  font-size: 15px !important;
}
/* Nav CTA — mockup: compact Get started */
body.poxy-landing-active #poxyLanding .btn.btn-primary.cta-nav,
body.poxy-landing-preview #poxyLanding .btn.btn-primary.cta-nav {
  padding: 9px 18px !important;
  font-size: 14px !important;
  width: auto !important;
  border-radius: 14px !important;
}
body.poxy-landing-active #poxyLanding .btn-primary.btn-lg,
body.poxy-landing-preview #poxyLanding .btn-primary.btn-lg {
  padding: 16px 30px !important;
  font-size: 16px !important;
  border-radius: 15px !important;
}
body.poxy-landing-active #poxyLanding .btn-glass,
body.poxy-landing-preview #poxyLanding .btn-glass {
  background: var(--glass-strong) !important;
  color: var(--text) !important;
  border: 1px solid var(--border) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 15px !important;
}
body.poxy-landing-active #poxyLanding .btn-primary:hover,
body.poxy-landing-preview #poxyLanding .btn-primary:hover {
  transform: none !important;
  filter: brightness(1.08) !important;
}
body.poxy-landing-active #poxyLanding .btn-glass:hover,
body.poxy-landing-preview #poxyLanding .btn-glass:hover {
  transform: translateY(-1px) !important;
}

/* Hide app chrome while landing is visible */
body.poxy-landing-active #dmOverlay,
body.poxy-landing-preview #dmOverlay,
body.poxy-landing-active #tradeModal,
body.poxy-landing-preview #tradeModal,
body.poxy-landing-active #poxySupportPanel,
body.poxy-landing-preview #poxySupportPanel,
body.poxy-landing-active #inspectModal,
body.poxy-landing-preview #inspectModal {
  display: none !important;
  pointer-events: none !important;
}
`;

fs.writeFileSync(path.join(__dirname, '../assets/poxy-sky/landing.css'), header + scoped + isolation + '\n');
console.log('landing.css rebuilt:', (header + scoped).length, 'chars');
