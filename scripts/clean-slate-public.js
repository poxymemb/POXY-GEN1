/**
 * Clean slate: extract legacy inline CSS, rebuild Sky landing 1:1 from mockup.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const mockPath = path.join(root, 'design/v2/poxy-landing.html');

let index = fs.readFileSync(indexPath, 'utf8');
const mock = fs.readFileSync(mockPath, 'utf8');

// 1) Extract inline legacy style block → external file
const inlineRe = /<style>\s*\/\*[\s\S]*?Session C1[\s\S]*?<\/style>/;
const inlineMatch = index.match(inlineRe);
if (!inlineMatch) throw new Error('legacy inline style block not found');
const inlineCss = inlineMatch[0].replace(/^<style>\s*/, '').replace(/<\/style>$/, '');
fs.writeFileSync(path.join(root, 'assets/poxy-sky/legacy-app-inline.css'), inlineCss.trim() + '\n');

// 2) Build landing.css 1:1 from mockup <style>
const cssMatch = mock.match(/<style>([\s\S]*?)<\/style>/);
if (!cssMatch) throw new Error('mockup style not found');
let landingCss = cssMatch[1];

// Drop mockup :root + theme blocks (live in tokens.css)
landingCss = landingCss.replace(/:root\{[\s\S]*?\}/, '');
landingCss = landingCss.replace(/\[data-theme="light"\]\{[\s\S]*?\}/, '');
landingCss = landingCss.replace(/\[data-theme="dark"\]\{[\s\S]*?\}/, '');

// Mask @keyframes
const kf = [];
landingCss = landingCss.replace(/@keyframes\s+[^{]+\{(?:[^{}]|\{[^{}]*\})*\}/g, (block) => {
  const id = `__KF${kf.length}__`;
  kf.push(block);
  return id;
});

function prefixRule(sel) {
  return sel
    .split(',')
    .map((s) => {
      s = s.trim();
      if (!s) return s;
      if (s.startsWith('html[data-theme')) return s;
      if (s.startsWith('html')) return 'html';
      if (s.startsWith('body')) return 'body.poxy-landing-active';
      if (s.includes('#poxyLanding')) return s;
      return '#poxyLanding ' + s;
    })
    .join(', ');
}

landingCss = landingCss.replace(/(^|\})([^{@]+)\{/gm, (m, brace, sel) => {
  const t = sel.trim();
  if (!t || t.startsWith('@') || t.includes('__KF')) return m;
  return `${brace}${prefixRule(t)}{`;
});

kf.forEach((block, i) => {
  landingCss = landingCss.replace(`__KF${i}__`, block);
});

const landingHeader = `/* POXY Sky landing — 1:1 from design/v2/poxy-landing.html */
html { scroll-behavior: smooth; transition: background 0.4s var(--ease); }
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
#poxyLanding, #poxyLanding * { box-sizing: border-box; }
#poxyLanding { margin: 0; padding: 0; }
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
body.poxy-landing-active #poxyAppShell,
body.poxy-landing-active #sidebarPanel,
body.poxy-landing-active #sidebarBackdrop,
body.poxy-landing-active #bottomNav,
body.poxy-landing-active #userBar {
  display: none !important;
}
#plPreviewBack[hidden] { display: none !important; }
body.poxy-landing-preview #plPreviewBack { display: inline-flex !important; }
#poxyLanding .foot-col .foot-link {
  display: block; width: 100%; text-align: left; background: none; border: none;
  font: inherit; padding: 0; margin-bottom: 8px; color: var(--link); cursor: pointer;
}
#poxyLanding .nav-logo { border: none; padding: 0; background: var(--btn-bg); }
`;

fs.writeFileSync(path.join(root, 'assets/poxy-sky/landing.css'), landingHeader + landingCss);

// 3) Update tokens.css to use mockup var names 1:1
const tokensMatch = mock.match(/<style>([\s\S]*?)<\/style>/);
const mockStyle = tokensMatch[1];
function extractBlock(name) {
  const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]+)\\}');
  const m = mockStyle.match(re);
  return m ? m[1].trim() : '';
}
const rootVars = extractBlock(':root');
const lightVars = extractBlock('[data-theme="light"]');
const darkVars = extractBlock('[data-theme="dark"]');

const tokensCss = `/* POXY Sky tokens — 1:1 from poxy-landing.html mockup */
:root {
  ${rootVars}
  --px-cardmask: url("logo-card.png");
  --cardmask: var(--px-cardmask);
}
html, html[data-theme="light"] {
  ${lightVars}
}
html[data-theme="dark"] {
  ${darkVars}
}
`;
fs.writeFileSync(path.join(root, 'assets/poxy-sky/tokens.css'), tokensCss);

// 4) Build landing HTML from mockup body
const bodyStart = mock.indexOf('<nav>');
const bodyEnd = mock.indexOf('<script>');
let html = mock.slice(bodyStart, bodyEnd).trim();

html = html
  .replace(/onclick="go\('([^']+)'\)"/g, 'data-px-tab="$1"')
  .replace(/onclick="article\('([^']+)'\)"/g, 'data-px-article="$1"')
  .replace(/<a class="btn btn-primary cta-nav" href="#"[^>]*>/, '<button type="button" class="btn btn-primary cta-nav" data-pl-auth>')
  .replace(/<\/a>(\s*<button class="icon-btn" id="themeBtn")/, '</button>$1')
  .replace(/<a class="btn btn-primary btn-lg" href="#">Start collecting<\/a>/, '<button type="button" class="btn btn-primary btn-lg" data-pl-auth>Start collecting</button>')
  .replace(/<a class="btn btn-primary btn-lg" href="#">Create your account<\/a>/, '<button type="button" class="btn btn-primary btn-lg" data-pl-auth>Create your account</button>')
  .replace(/<a class="btn btn-glass btn-lg" href="#">Log in<\/a>/, '<button type="button" class="btn btn-glass btn-lg" data-pl-auth>Log in</button>')
  .replace(/<div class="nav-logo" onclick="go\('main'\)"><\/div>/, '<button type="button" class="nav-logo" data-px-tab="main" aria-label="POXY WORLD home"></button>')
  .replace(/<div class="nav-logo" data-px-tab="main"><\/div>/, '<button type="button" class="nav-logo" data-px-tab="main" aria-label="POXY WORLD home"></button>')
  .replace(/<button class="nav-tab/g, '<button type="button" class="nav-tab')
  .replace(/<button class="read-more"/g, '<button type="button" class="read-more"')
  .replace(/<button class="back-link"/g, '<button type="button" class="back-link"')
  .replace(/<button class="icon-btn" id="themeBtn"/, '<button type="button" class="icon-btn" id="plThemeBtn"')
  .replace(/<button class="icon-btn" id="langBtn2"/, '<button type="button" class="icon-btn" id="plLangBtn"')
  .replace(/id="langMenu"/, 'id="plLangMenu"')
  .replace(/id="goup"/, 'id="plGoup"')
  .replace(
    /<button class="btn btn-glass btn-lg" onclick="scrollTo\(\{top:document\.getElementById\('how'\)\.offsetTop-60,behavior:'smooth'\}\)">/,
    '<button type="button" class="btn btn-glass btn-lg" id="plScrollHow">'
  );

html = html.replace(
  '<div class="nav-right">',
  '<div class="nav-right"><button type="button" class="btn btn-glass" id="plPreviewBack" hidden>Back to app</button><button type="button" class="btn btn-glass" id="plSignInNav" data-pl-auth>Sign in</button>'
);

['faq', 'policy', 'about', 'news'].forEach((tab) => {
  html = html.replace(new RegExp(`<a data-px-tab="${tab}">`, 'g'), `<button type="button" class="foot-link" data-px-tab="${tab}">`);
  html = html.replace(new RegExp(`</a>(?=([^<]*<\\/div>\\s*<div class="foot-col">|[^<]*<\\/div>\\s*<\\/div>\\s*<\\/footer))`), '</button>');
});

// Fix footer link replacements more safely
html = html.replace(/<a data-px-tab="faq">FAQ<\/a>/g, '<button type="button" class="foot-link" data-px-tab="faq">FAQ</button>');
html = html.replace(/<a data-px-tab="policy">Policy<\/a>/g, '<button type="button" class="foot-link" data-px-tab="policy">Policy</button>');
html = html.replace(/<a data-px-tab="about">About<\/a>/g, '<button type="button" class="foot-link" data-px-tab="about">About</button>');
html = html.replace(/<a data-px-tab="news">News<\/a>/g, '<button type="button" class="foot-link" data-px-tab="news">News</button>');

const landingBlock = `<!-- POXY Sky landing (clean slate 1:1) -->\n<div id="poxyLanding" hidden aria-label="POXY World">\n${html}\n</div>`;

const landStart = index.indexOf('<!-- POXY World — Sky landing');
const landEnd = index.indexOf('<!-- AUTH —');
if (landStart < 0 || landEnd < 0) throw new Error('landing markers not found');
index = index.slice(0, landStart) + landingBlock + '\n\n' + index.slice(landEnd);

// 5) Replace head: remove legacy CSS links + inline style, add clean public head
const legacyLinks = [
  'assets/frames.css',
  'assets/stitch-dashboard.css?v=18',
  'assets/poxy-theme.css?v=2',
  'assets/poxy-spa-nav.css?v=6',
  'assets/poxy-identity.css?v=3',
  'assets/poxy-quick-profile.css?v=6',
  'assets/poxy-ranks-page.css?v=8',
  'assets/poxy-rarity-page.css?v=5',
  'assets/poxy-club-page.css?v=2',
  'assets/poxy-club-gold.css?v=2',
  'assets/poxy-market-page.css?v=6',
  'assets/poxy-store-page.css?v=2',
  'assets/poxy-explore-page.css?v=4',
  'assets/poxy-gens-page.css?v=4',
  'assets/poxy-profile-page.css?v=7',
  'assets/poxy-collection-page.css?v=21',
  'assets/poxy-friends-page.css?v=3',
  'assets/poxy-news-page.css?v=4',
  'assets/poxy-settings-page.css?v=7',
  'assets/poxy-notify-hub.css?v=3',
  'assets/poxy-support-panel.css?v=5',
  'assets/poxy-chat-social.css?v=1',
  'assets/lumina-chat-os.css?v=15',
  'assets/lumina-os/design-system.css?v=15',
  'assets/lumina-os-overrides.css?v=15',
  'assets/lumina-features.css?v=1',
  'assets/poxy-auth-page.css?v=2',
  'assets/poxy-topup-modal.css?v=1',
  'assets/poxy-dash-hero.css?v=1',
  'assets/poxy-card-engine.css?v=6',
  'assets/poxy-asset-viewer.css?v=13',
  'assets/poxy-dna-traits.css?v=1',
  'assets/poxy-lore.css?v=1',
  'assets/poxy-passport-extras.css?v=1',
  'assets/poxy-discovery-feed.css?v=1',
  'assets/poxy-season-atlas.css?v=1',
  'assets/poxy-museum-mode.css?v=1',
  'assets/poxy-milestones.css?v=1',
  'assets/poxy-certificate.css?v=1',
  'assets/poxy-share-preview.css?v=1',
  'assets/poxy-crypto-docs.css?v=1',
  'assets/poxy-trust-motion.css?v=1',
  'assets/poxy-news-lumina.css?v=3',
  'assets/poxy-telemetry.css?v=4',
  'assets/poxy-whitepaper.css?v=6',
  'assets/poxy-verify-terminal.css?v=12',
  'assets/poxy-obsidian-reskin.css?v=5',
  'assets/poxy-obsidian-ambient.css?v=1',
  'assets/poxy-onboarding.css?v=2',
];

fs.writeFileSync(
  path.join(root, 'assets/poxy-sky/legacy-styles.js'),
  `'use strict';
window.PoxyLegacyStyles=(function(){
  var SHEETS=${JSON.stringify(legacyLinks.concat(['assets/poxy-sky/legacy-app-inline.css?v=1']))};
  var ICONS='https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap';
  var mounted=false;
  function link(href){var l=document.createElement('link');l.rel='stylesheet';l.href=href;l.dataset.poxyLegacy='1';document.head.appendChild(l);return l;}
  return {
    mount:function(){
      if(mounted)return;
      SHEETS.forEach(link);
      link(ICONS);
      mounted=true;
    },
    unmount:function(){
      document.querySelectorAll('link[data-poxy-legacy]').forEach(function(n){n.remove();});
      mounted=false;
    },
    isMounted:function(){return mounted;}
  };
})();\n`
);

legacyLinks.forEach((href) => {
  index = index.replace(new RegExp(`<link rel="stylesheet" href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">\\n?`, 'g'), '');
});

index = index.replace(/<link rel="preload" href="assets\/poxy-theme\.css[^"]*" as="style">\n?/g, '');
index = index.replace(/<link rel="preload" href="assets\/stitch-dashboard\.css[^"]*" as="style">\n?/g, '');
index = index.replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Material\+Symbols[^"]*" rel="stylesheet">\n?/g, '');

index = index.replace(inlineRe, '');

// Remove legacy theme killer script
index = index.replace(
  /<script>\n\/\* Remove legacy light-theme toggle[\s\S]*?<\/script>\n/,
  ''
);

// Update public CSS links
index = index.replace(
  '<link rel="stylesheet" href="assets/poxy-sky/tokens.css?v=1">',
  '<link rel="stylesheet" href="assets/poxy-sky/tokens.css?v=2">'
);
index = index.replace(
  '<link rel="stylesheet" href="assets/poxy-sky/components.css?v=1">\n',
  ''
);
index = index.replace(
  '<link rel="stylesheet" href="assets/poxy-sky/landing.css?v=2">',
  '<link rel="stylesheet" href="assets/poxy-sky/landing.css?v=3">'
);

if (!index.includes('legacy-styles.js')) {
  index = index.replace(
    '<script src="assets/poxy-landing-page.js?v=3" defer></script>',
    '<script src="assets/poxy-sky/legacy-styles.js?v=1"></script>\n<script src="assets/poxy-landing-page.js?v=4" defer></script>'
  );
} else {
  index = index.replace(
    '<script src="assets/poxy-landing-page.js?v=3" defer></script>',
    '<script src="assets/poxy-landing-page.js?v=4" defer></script>'
  );
}

// Wire legacy mount in setLoggedInUI / unmount optional
if (!index.includes('PoxyLegacyStyles.mount')) {
  index = index.replace(
    "document.body.classList.add('poxy-app-dark','poxy-stitch-dash');",
    "if(window.PoxyLegacyStyles)PoxyLegacyStyles.mount();\n  document.body.classList.add('poxy-app-dark','poxy-stitch-dash');"
  );
}

fs.writeFileSync(indexPath, index);
fs.writeFileSync(path.join(root, 'design/v2/landing-fragment.html'), landingBlock + '\n');
console.log('Clean slate public layer applied');
