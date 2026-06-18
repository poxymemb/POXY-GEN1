/**
 * Structural smoke gate — 13 in-app routes + landing/auth + core boot hooks.
 * Run: node scripts/smoke-gate.js
 * Pair with: node scripts/verify-dashboard-parity.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexPath = path.join(root, 'index.html');

const index = fs.readFileSync(indexPath, 'utf8');
const stage11Path = path.join(root, 'assets/js/ui/poxy-stage11-sky.js');
const collectionSkyPath = path.join(root, 'assets/js/ui/poxy-collection-sky.js');
const marketSkyPath = path.join(root, 'assets/js/ui/poxy-market-sky.js');
const stage11 = fs.existsSync(stage11Path) ? fs.readFileSync(stage11Path, 'utf8') : '';
const collectionSky = fs.existsSync(collectionSkyPath) ? fs.readFileSync(collectionSkyPath, 'utf8') : '';
const marketSky = fs.existsSync(marketSkyPath) ? fs.readFileSync(marketSkyPath, 'utf8') : '';
const checks = [];

function pass(name) {
  checks.push({ name, ok: true });
}
function fail(name, detail) {
  checks.push({ name, ok: false, detail });
}

function hasIn(text, needle, label) {
  if (text.includes(needle)) pass(label);
  else fail(label, 'missing: ' + needle.slice(0, 72));
}

function hasRegex(text, re, label) {
  if (re.test(text)) pass(label);
  else fail(label, 'pattern not found');
}

function lacks(needle, label) {
  if (!index.includes(needle)) pass(label);
  else fail(label, 'still present: ' + needle.slice(0, 72));
}

function fileExists(rel, label) {
  const p = path.join(root, rel);
  if (fs.existsSync(p)) pass(label);
  else fail(label, 'file not found: ' + rel);
}

// Core boot — must never regress
hasRegex(index, /function bootApp\b/, 'bootApp defined');
hasRegex(index, /window\.showStitchTab\s*=\s*function/, 'showStitchTab defined');
hasRegex(index, /window\.showPage\s*=\s*function/, 'showPage defined');
hasIn(index, 'supabase.createClient', 'Supabase client');
hasIn(index, 'id="poxyAppShell"', 'App shell root');

// Pre-login surfaces
hasIn(index, 'id="poxyLanding"', 'Landing hook');
hasIn(index, 'poxy-landing-page.js', 'Landing script');
hasIn(index, 'id="authOverlay"', 'Auth overlay');
hasIn(index, 'id="authEmail"', 'Auth email input');
hasIn(index, 'poxy-auth-sky.js', 'Auth Sky script');

// Shared passport module (collection + market modals)
fileExists('assets/js/ui/poxy-passport-sky.js', 'Passport Sky module file');
hasIn(index, 'poxy-passport-sky.js', 'Passport Sky script tag');

// 13 in-app routes (rail + Sky layers)
const ROUTES = [
  { label: 'Home', indexNeedles: ['data-nav="home"', 'id="pxSkyHome"', 'poxy-home-sky.js'] },
  { label: 'Open', indexNeedles: ['data-nav="open"', 'id="pxSkyOpen"', 'poxy-open-sky.js'] },
  {
    label: 'Collection',
    indexNeedles: ['data-nav="collection"', 'id="collectionPage"', 'poxy-collection-sky.js'],
  },
  {
    label: 'Market',
    indexNeedles: ['data-nav="market"', 'id="marketPage"', 'poxy-market-sky.js'],
  },
  {
    label: 'All collections',
    indexNeedles: ['data-nav="collections"', 'poxy-stage11-sky.js'],
    stageNeedles: ['PoxyCollectionsSky', 'global.PoxyCollectionsSky'],
  },
  { label: 'Store', indexNeedles: ['data-nav="store"', 'poxy-store-sky.js'] },
  {
    label: 'Community',
    indexNeedles: ['data-nav="community"'],
    stageNeedles: ['PoxyCommunitySky', 'global.PoxyCommunitySky'],
  },
  {
    label: 'Messenger',
    indexNeedles: ['data-nav="messenger"'],
    stageNeedles: ['PoxyMessengerSky', 'global.PoxyMessengerSky'],
  },
  {
    label: 'Events',
    indexNeedles: ['data-nav="events"'],
    stageNeedles: ['PoxyEventsSky', 'global.PoxyEventsSky'],
  },
  {
    label: 'Quests',
    indexNeedles: ['data-nav="quests"'],
    stageNeedles: ['PoxyQuestsSky', 'global.PoxyQuestsSky'],
  },
  {
    label: 'Levels',
    indexNeedles: ['data-nav="levels"'],
    stageNeedles: ['PoxyLevelsSky', 'global.PoxyLevelsSky'],
  },
  { label: 'Profile', indexNeedles: ['data-nav="profile"', 'poxy-profile-sky.js'] },
  {
    label: 'Settings',
    indexNeedles: ['data-nav="settings"', 'id="settingsPage"', 'poxy-settings-sky.js'],
  },
];

ROUTES.forEach((route) => {
  (route.indexNeedles || []).forEach((needle) => {
    hasIn(index, needle, route.label + ' — ' + needle.slice(0, 40));
  });
  (route.stageNeedles || []).forEach((needle) => {
    hasIn(stage11, needle, route.label + ' — ' + needle.slice(0, 40));
  });
});

// Overlays / modals
hasIn(index, 'poxy-topup-sky.js', 'Top-up Sky script');
hasIn(index, 'poxy-notify-sky.js', 'Notify Sky script');
hasIn(index, 'poxy-support-sky.js', 'Support Sky script');
hasRegex(collectionSky, /pxSkyFigureModal/, 'Collection figure modal hook');
hasRegex(marketSky, /pxSkyMarketFigureModal/, 'Market figure modal hook');

// Cleanup proof — legacy mount removed
lacks('PoxyLegacyStyles', 'No PoxyLegacyStyles in index');
lacks('legacy-styles.js', 'No legacy-styles.js link');

// Theme default
if (/data-theme="light"/.test(index) || /poxy-sky-theme/.test(index)) {
  pass('Sky theme wiring present');
} else {
  fail('Sky theme wiring present', 'light theme / poxy-sky-theme');
}

const passportJs = fs.readFileSync(path.join(root, 'assets/js/ui/poxy-passport-sky.js'), 'utf8');
if (/PoxyPassportSky/.test(passportJs) && /normalizeFromMarket/.test(marketSky)) {
  pass('Market uses shared passport helpers');
} else {
  fail('Market uses shared passport helpers', 'wire PoxyPassportSky in market modal');
}

const failed = checks.filter((c) => !c.ok);
console.log('Smoke gate (13 routes) — ' + (failed.length ? 'FAIL' : 'PASS'));
checks.forEach((c) => {
  console.log((c.ok ? '  ✓ ' : '  ✗ ') + c.name + (c.detail ? ' — ' + c.detail : ''));
});
process.exit(failed.length ? 1 : 0);
