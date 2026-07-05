const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const mock = fs.readFileSync(path.join(root, 'design/v2/poxy-landing.html'), 'utf8');
const cssMatch = mock.match(/<style>([\s\S]*?)<\/style>/);
if (!cssMatch) throw new Error('style block not found');

let css = cssMatch[1];
css = css.replace(/:root\{[\s\S]*?\}/, '');
css = css.replace(/\[data-theme="light"\]\{[\s\S]*?\}/, '');
css = css.replace(/\[data-theme="dark"\]\{[\s\S]*?\}/, '');
css = css.replace(/\*\{box-sizing:border-box;margin:0;padding:0\}/, '');
css = css.replace(/html\{[\s\S]*?\}/, '');
css = css.replace(/body\{[\s\S]*?overflow-x:hidden\}/, '');

const header = `/* POXY Sky — landing (Stage 1) scoped to #poxyLanding */
#poxyLanding {
  --cardmask: var(--px-cardmask);
  --bg: var(--px-bg);
  --bg-2: var(--px-bg-2);
  --glass: var(--px-glass);
  --glass-strong: var(--px-glass-strong);
  --border: var(--px-border);
  --text: var(--px-text);
  --text-dim: var(--px-text-dim);
  --text-faint: var(--px-text-faint);
  --text-strong: var(--px-text-strong);
  --shadow: var(--px-shadow);
  --btn-bg: var(--px-btn-bg);
  --btn-text: var(--px-btn-text);
  --link: var(--px-link);
  --hero-glow: var(--px-hero-glow);
  --font: var(--px-font);
  --mono: var(--px-mono);
  --ease: var(--px-ease);
  --maxw: var(--px-maxw);
  --r-sm: var(--px-r-sm);
  --r: var(--px-r);
  --r-lg: var(--px-r-lg);
}
`;

const shell = `body.poxy-landing-active {
  background: var(--px-bg) !important;
  color: var(--px-text) !important;
  overflow-x: hidden;
}
body.poxy-landing-active #poxyLanding {
  display: flex !important;
  flex-direction: column;
  position: relative;
  z-index: 1;
  min-height: 100vh;
  min-height: 100dvh;
  font-family: var(--px-font);
  color: var(--px-text);
  background: var(--px-bg);
}
#poxyLanding[hidden] { display: none !important; }
body.poxy-landing-preview { overflow: hidden; }
body.poxy-landing-preview #poxyLanding {
  display: block !important;
  position: fixed;
  inset: 0;
  z-index: 360;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
body.poxy-landing-preview #plPreviewBack { display: inline-flex !important; }
#poxyLanding .foot-col .foot-link {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  font: inherit;
  padding: 0;
  margin-bottom: 8px;
  color: var(--link);
  cursor: pointer;
}
#poxyLanding .foot-col .foot-link:hover { filter: brightness(1.15); }
#poxyLanding .nav-logo {
  border: none;
  padding: 0;
}
#poxyLanding .wrap { max-width: var(--px-maxw); margin: 0 auto; padding: 0 24px; }
#poxyLanding a { color: inherit; text-decoration: none; }
@media (max-width: 780px) { #poxyLanding .steps { grid-template-columns: 1fr; } }
`;

css = css.replace(/\[data-theme="dark"\]/g, 'html[data-theme="dark"] #poxyLanding');

// Strip block comments
css = css.replace(/\/\*[\s\S]*?\*\//g, '');

const keyframes = [];
function maskKeyframes(input) {
  let out = '';
  let i = 0;
  while (i < input.length) {
    if (input.slice(i, i + 10) === '@keyframes') {
      let depth = 0;
      const start = i;
      while (i < input.length) {
        const ch = input[i];
        if (ch === '{') depth++;
        if (ch === '}') {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
        i++;
      }
      const id = `__KF${keyframes.length}__`;
      keyframes.push(input.slice(start, i));
      out += id;
    } else {
      out += input[i++];
    }
  }
  return out;
}
css = maskKeyframes(css);

function scopeSelectors(cssText) {
  return cssText.replace(/(^|\})([^{@]+)\{/gm, (m, brace, sel) => {
    const trimmed = sel.trim();
    if (!trimmed || trimmed.startsWith('@')) return m;
    if (trimmed.includes('__KF')) return m;
    const scoped = trimmed
      .split(',')
      .map((s) => {
        s = s.trim();
        if (!s) return s;
        if (s.startsWith('html[data-theme')) return s;
        if (s.includes('#poxyLanding')) return s;
        return '#poxyLanding ' + s;
      })
      .join(', ');
    return `${brace}${scoped}{`;
  });
}

for (let n = 0; n < 6; n++) css = scopeSelectors(css);
const cssFixes = [
  [/\n  \.hero\{/g, '\n#poxyLanding .hero{'],
  [/\n  \.hero h1\{/g, '\n#poxyLanding .hero h1{'],
  [/\n  \.v-gen/g, '\n#poxyLanding .v-gen'],
  [/\n  \.final\{/g, '\n#poxyLanding .final{'],
  [/\n  footer\{/g, '\n#poxyLanding footer{'],
  [/@media\(max-width:720px\)\{\.nav-tab/g, '@media(max-width:720px){#poxyLanding .nav-tab'],
  [/@media\(max-width:780px\)\{\.why\{/g, '@media(max-width:780px){#poxyLanding .why{'],
  [/@media\(max-width:780px\)\{\.trust-grid\{/g, '@media(max-width:780px){#poxyLanding .trust-grid{'],
  [/@media\(max-width:780px\)\{\.foot-grid/g, '@media(max-width:780px){#poxyLanding .foot-grid'],
  [/#poxyLanding \}/g, '}'],
];
cssFixes.forEach(([re, rep]) => {
  css = css.replace(re, rep);
});
keyframes.forEach((block, i) => {
  css = css.replace(`__KF${i}__`, block);
});

function scopeRules(block) {
  return block;
}

fs.writeFileSync(path.join(root, 'assets/poxy-sky/landing.css'), header + shell + css);

// Build landing HTML fragment
const bodyStart = mock.indexOf('<nav>');
const bodyEnd = mock.indexOf('<script>');
let html = mock.slice(bodyStart, bodyEnd).trim();

html = html
  .replace(/onclick="go\('([^']+)'\)"/g, 'data-px-tab="$1"')
  .replace(/onclick="article\('([^']+)'\)"/g, 'data-px-article="$1"')
  .replace(
    /<a class="btn btn-primary cta-nav" href="#"[^>]*>Get started<\/a>/,
    '<button type="button" class="btn btn-primary cta-nav" data-pl-auth>Get started</button>'
  )
  .replace(
    /<a class="btn btn-primary btn-lg" href="#">Start collecting<\/a>/,
    '<button type="button" class="btn btn-primary btn-lg" data-pl-auth>Start collecting</button>'
  )
  .replace(
    /<a class="btn btn-primary btn-lg" href="#">Create your account<\/a>/,
    '<button type="button" class="btn btn-primary btn-lg" data-pl-auth>Create your account</button>'
  )
  .replace(
    /<a class="btn btn-glass btn-lg" href="#">Log in<\/a>/,
    '<button type="button" class="btn btn-glass btn-lg" data-pl-auth>Log in</button>'
  )
  .replace(
    /<div class="nav-logo" data-px-tab="main"><\/div>/,
    '<button type="button" class="nav-logo" data-px-tab="main" aria-label="POXY WORLD home"></button>'
  )
  .replace(/<button class="nav-tab/g, '<button type="button" class="nav-tab')
  .replace(
    /<button class="read-more" data-px-article="/g,
    '<button type="button" class="read-more" data-px-article="'
  )
  .replace(/<button class="back-link"/g, '<button type="button" class="back-link"')
  .replace(/<button class="icon-btn" id="themeBtn"/, '<button type="button" class="icon-btn" id="plThemeBtn"')
  .replace(/<button class="icon-btn" id="langBtn2"/, '<button type="button" class="icon-btn" id="plLangBtn"')
  .replace(/id="langMenu"/, 'id="plLangMenu"')
  .replace(/id="goup"/, 'id="plGoup"')
  .replace(
    /<button type="button" class="btn btn-glass btn-lg" onclick="scrollTo\(\{top:document\.getElementById\('how'\)\.offsetTop-60,behavior:'smooth'\}\)">/,
    '<button type="button" class="btn btn-glass btn-lg" id="plScrollHow">'
  );

html = html.replace(
  '<div class="nav-right">',
  '<div class="nav-right"><button type="button" class="btn btn-glass" id="plPreviewBack" hidden data-i18n="landing.nav.back">Back to app</button><button type="button" class="btn btn-glass" id="plSignInNav" data-pl-auth data-i18n="landing.nav.signIn">Sign in</button>'
);
html = html.replace(/<a data-px-tab="faq">FAQ<\/a>/g, '<button type="button" class="foot-link" data-px-tab="faq">FAQ</button>');
html = html.replace(/<a data-px-tab="policy">Policy<\/a>/g, '<button type="button" class="foot-link" data-px-tab="policy">Policy</button>');
html = html.replace(/<a data-px-tab="about">About<\/a>/g, '<button type="button" class="foot-link" data-px-tab="about">About</button>');
html = html.replace(/<a data-px-tab="news">News<\/a>/g, '<button type="button" class="foot-link" data-px-tab="news">News</button>');

// preview back + sign in in nav
html = html.replace(
  '<div class="nav-spacer"></div>\n    <div class="nav-spacer"></div><div class="nav-right">',
  '<div class="nav-spacer"></div>\n    <div class="nav-right">'
);

const wrapped = `<!-- POXY World — Sky landing (Stage 1) -->
<div id="poxyLanding" hidden aria-label="POXY World">
${html}
</div>`;

fs.writeFileSync(path.join(root, 'design/v2/landing-fragment.html'), wrapped);
console.log('Wrote landing.css and landing-fragment.html');
