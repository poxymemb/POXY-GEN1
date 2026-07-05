/**
 * Rebuild auth.css 1:1 from design/v2/poxy-auth.html (scoped to #authOverlay).
 */
const fs = require('fs');
const path = require('path');

const mock = fs.readFileSync(path.join(__dirname, '../design/v2/poxy-auth.html'), 'utf8');
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
      if (s === '*') return '#authOverlay, #authOverlay *';
      if (s === 'html') return 'html';
      if (s === 'body') return 'body.poxy-auth-modal-open';
      if (/^\[data-theme=/.test(s)) {
        return 'html' + s.replace(/^(\[data-theme="(?:light|dark)"\])/, '$1 #authOverlay');
      }
      if (s.startsWith('#authOverlay')) return s;
      return '#authOverlay ' + s;
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
    return (
      mq +
      '{\n' +
      splitTopLevelRules(stripComments(inner))
        .map(transformRule)
        .filter(Boolean)
        .join('\n') +
      '\n}'
    );
  }
  const open = trimmed.indexOf('{');
  if (open < 0) return trimmed;
  const sel = trimmed.slice(0, open).trim();
  const body = trimmed.slice(open);
  if (sel === '*') {
    return '#authOverlay, #authOverlay * { box-sizing: border-box; }';
  }
  if (sel === 'html' || sel === 'body' || sel === 'body::before') return '';
  return prefixSelector(sel) + body;
}

const scoped = splitTopLevelRules(stripComments(css))
  .map(transformRule)
  .filter(Boolean)
  .join('\n\n');

const themeVars = `html, html[data-theme="light"] {
  --auth-card: rgba(255,255,255,.72);
  --auth-field: #fff;
  --auth-border-strong: rgba(0,0,0,.16);
  --auth-glow: radial-gradient(50% 40% at 50% 22%,rgba(96,194,224,.28),transparent 70%);
}
html[data-theme="dark"] {
  --auth-card: rgba(255,255,255,.05);
  --auth-field: rgba(255,255,255,.06);
  --auth-border-strong: rgba(255,255,255,.22);
  --auth-glow: radial-gradient(50% 40% at 50% 22%,rgba(96,194,224,.18),transparent 70%);
}
html[data-theme="light"] #authOverlay {
  --card: var(--auth-card);
  --field: var(--auth-field);
  --border-strong: var(--auth-border-strong);
  --glow: var(--auth-glow);
  --r-sm: 11px;
  --r: 16px;
  --r-lg: 24px;
}
html[data-theme="dark"] #authOverlay {
  --card: var(--auth-card);
  --field: var(--auth-field);
  --border-strong: var(--auth-border-strong);
  --glow: var(--auth-glow);
  --r-sm: 11px;
  --r: 16px;
  --r-lg: 24px;
}
`;

const header = `/* POXY Sky auth — 1:1 from design/v2/poxy-auth.html */
${themeVars}
.poxy-auth-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--bg) !important;
  color: var(--text);
  font-family: var(--font);
  pointer-events: none;
}
.poxy-auth-overlay.poxy-auth-overlay--open,
body.poxy-auth-modal-open #authOverlay {
  display: flex !important;
  pointer-events: auto;
}
.poxy-auth-overlay.hidden {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
#authOverlay::before {
  content: "";
  position: fixed;
  inset: 0;
  background: var(--glow);
  pointer-events: none;
  z-index: 0;
}
#authOverlay .auth-msg {
  margin-top: 12px;
  font-size: 13px;
  min-height: 0;
  line-height: 1.45;
  text-align: center;
}
#authOverlay .auth-msg:not(:empty) { min-height: 18px; }
#authOverlay .auth-msg.error { color: #E0606A; }
#authOverlay .auth-msg.success { color: #3DBE8B; }

`;

const isolation = `
/* ── Auth isolation (must load after scoped rules + runtime.css) ── */
#authOverlay .btn {
  width: 100% !important;
  font-family: var(--font) !important;
  font-weight: 600 !important;
  box-shadow: none !important;
  background-image: none !important;
  -webkit-appearance: none;
  appearance: none;
  letter-spacing: normal !important;
  text-transform: none !important;
}
#authOverlay .btn-primary {
  background: var(--btn-bg) !important;
  color: var(--btn-text) !important;
  border: 1px solid var(--btn-bg) !important;
  border-radius: var(--r-sm) !important;
  padding: 13px !important;
  font-size: 15px !important;
}
#authOverlay .btn-primary:hover {
  transform: none !important;
  filter: brightness(1.08) !important;
}
#authOverlay .btn-primary:active {
  transform: scale(0.985) !important;
}
#authOverlay .btn-auth-alt {
  background: var(--card) !important;
  color: var(--text) !important;
  border-color: var(--border) !important;
}
#authOverlay .btn-auth-alt:hover {
  filter: brightness(1.04) !important;
}
#authOverlay .divider span {
  display: none;
}
`;

fs.writeFileSync(
  path.join(__dirname, '../assets/poxy-sky/auth.css'),
  header + scoped + isolation + '\n'
);
console.log('auth.css rebuilt');
