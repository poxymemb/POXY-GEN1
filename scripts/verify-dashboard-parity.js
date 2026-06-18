/**
 * Structural parity check: production index.html vs poxy-dashboard.html mockup.
 * Run: node scripts/verify-dashboard-parity.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const mockPath = path.join(root, 'design/v2/poxy-dashboard.html');
const indexPath = path.join(root, 'index.html');
const appShellCss = path.join(root, 'assets/poxy-sky/app-shell.css');
const homeCss = path.join(root, 'assets/poxy-sky/screens/home.css');

const mock = fs.readFileSync(mockPath, 'utf8');
const index = fs.readFileSync(indexPath, 'utf8');
const shellCss = fs.readFileSync(appShellCss, 'utf8');
const homeCssText = fs.readFileSync(homeCss, 'utf8');

const checks = [];

function pass(name) {
  checks.push({ name, ok: true });
}
function fail(name, detail) {
  checks.push({ name, ok: false, detail });
}

function has(html, needle, label) {
  if (html.includes(needle)) pass(label);
  else fail(label, 'missing: ' + needle.slice(0, 80));
}

function lacks(html, needle, label) {
  if (!html.includes(needle)) pass(label);
  else fail(label, 'should not contain: ' + needle.slice(0, 80));
}

// Rail structure (mockup flat rail + rail-spacer)
has(index, 'class="rail-spacer"', 'Rail has rail-spacer');
has(index, 'data-nav="profile"', 'Rail profile button');
has(index, 'data-nav="settings"', 'Rail settings button');
lacks(index, 'class="rail-body"', 'No rail-body wrapper');
lacks(index, 'class="rail-foot"', 'No rail-foot wrapper');
lacks(index, 'class="rail-scroll"', 'No rail-scroll wrapper');

// Topbar matches mockup (no profile/settings in topbar)
lacks(index, 'id="pxSkyProfileBtn"', 'No topbar profile button');
lacks(index, 'id="pxSkySettingsBtn"', 'No topbar settings button');
has(index, 'id="pxSkyMailBtn" aria-label="Mail"', 'Mail button aria-label');
has(index, 'class="top-badge" id="pxSkyMailBadge"', 'Mail badge hook');
has(index, 'class="top-badge" id="notifyBellDot"', 'Notify badge uses top-badge');

// Home screen copy
has(index, '<h1>Home</h1><p>Your world at a glance.</p>', 'Home page-head copy');
has(index, 'Welcome to POXY', 'Welcome panel title');
has(index, 'id="pxSkyHomeOpenBtn"', 'Open a box CTA');
has(index, 'id="pxSkyHomeColBtn">My collection', 'My collection CTA');
lacks(index, 'id="pxSkyHome" class="px-sky-screen px-sky-screen--active" hidden', 'Home not hidden by attribute');

// Open: legacy spin hidden in sky CSS
if (/body\.poxy-sky-app-active #pxSkyOpen \.px-open-spin-host[\s\S]*display:\s*none/.test(homeCssText)) {
  pass('Legacy spin host hidden in sky open');
} else {
  fail('Legacy spin host hidden in sky open', 'home.css rule missing');
}

// Shell tokens
if (shellCss.includes('--r-lg: 24px')) pass('Shell --r-lg 24px');
else fail('Shell --r-lg 24px', 'app-shell.css');

if (shellCss.includes('.top-badge')) pass('top-badge styles in app-shell');
else fail('top-badge styles in app-shell');

if (shellCss.includes('#poxyAppShell .top-icon') && shellCss.includes('position: relative')) {
  pass('top-icon position relative');
} else {
  fail('top-icon position relative');
}

// Stat chip: no extra label margin
if (homeCssText.includes('.px-stat-lbl') && !/px-stat-lbl[\s\S]*margin-top:\s*4px/.test(homeCssText)) {
  pass('Stat label without margin-top');
} else {
  fail('Stat label without margin-top', 'remove margin-top from px-stat-lbl');
}

// showStitchTab dashboard must not recurse into showHome
if (!/if\(next==='dashboard'\)\{[\s\S]*?PoxyHomeSky\.showHome/.test(index)) {
  pass('No showHome recursion in showStitchTab');
} else {
  fail('No showHome recursion in showStitchTab', 'showStitchTab still calls PoxyHomeSky.showHome');
}
has(mock, 'id="sc-home"', 'Mockup has sc-home');
has(mock, 'rail-spacer', 'Mockup has rail-spacer');

const failed = checks.filter((c) => !c.ok);
console.log('Dashboard parity — ' + (failed.length ? 'FAIL' : 'PASS'));
checks.forEach((c) => {
  console.log((c.ok ? '  ✓ ' : '  ✗ ') + c.name + (c.detail ? ' — ' + c.detail : ''));
});
process.exit(failed.length ? 1 : 0);
