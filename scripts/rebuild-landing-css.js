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

fs.writeFileSync(path.join(__dirname, '../assets/poxy-sky/landing.css'), header + scoped + '\n');
console.log('landing.css rebuilt:', (header + scoped).length, 'chars');
