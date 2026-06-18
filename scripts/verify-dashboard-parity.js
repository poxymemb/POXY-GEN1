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
const openCss = path.join(root, 'assets/poxy-sky/screens/open.css');
const openSkyJs = path.join(root, 'assets/js/ui/poxy-open-sky.js');
const collectionCss = path.join(root, 'assets/poxy-sky/screens/collection.css');
const collectionSkyJs = path.join(root, 'assets/js/ui/poxy-collection-sky.js');
const marketCss = path.join(root, 'assets/poxy-sky/screens/market.css');
const marketSkyJs = path.join(root, 'assets/js/ui/poxy-market-sky.js');
const storeCss = path.join(root, 'assets/poxy-sky/screens/store.css');
const storeSkyJs = path.join(root, 'assets/js/ui/poxy-store-sky.js');
const settingsCss = path.join(root, 'assets/poxy-sky/screens/settings.css');
const settingsSkyJs = path.join(root, 'assets/js/ui/poxy-settings-sky.js');

const mock = fs.readFileSync(mockPath, 'utf8');
const index = fs.readFileSync(indexPath, 'utf8');
const shellCss = fs.readFileSync(appShellCss, 'utf8');
const homeCssText = fs.readFileSync(homeCss, 'utf8');
const openCssText = fs.readFileSync(openCss, 'utf8');
const openSkyJsText = fs.readFileSync(openSkyJs, 'utf8');
const collectionCssText = fs.readFileSync(collectionCss, 'utf8');
const collectionSkyJsText = fs.readFileSync(collectionSkyJs, 'utf8');
const marketCssText = fs.readFileSync(marketCss, 'utf8');
const marketSkyJsText = fs.readFileSync(marketSkyJs, 'utf8');
const storeCssText = fs.readFileSync(storeCss, 'utf8');
const storeSkyJsText = fs.readFileSync(storeSkyJs, 'utf8');
const settingsCssText = fs.readFileSync(settingsCss, 'utf8');
const settingsSkyJsText = fs.readFileSync(settingsSkyJs, 'utf8');

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

// Rail structure — flat mockup + rail-spacer (DESIGN PX)
has(index, 'class="rail-spacer"', 'Rail has rail-spacer');
has(index, 'data-nav="profile"', 'Rail profile button');
has(index, 'data-nav="settings"', 'Rail settings button');
lacks(index, 'class="rail-body"', 'No rail-body wrapper');
lacks(index, 'class="rail-foot"', 'No rail-foot wrapper');
lacks(index, 'class="rail-scroll"', 'No rail-scroll wrapper');
const railIdx = index.indexOf('class="rail-spacer"');
const profileIdx = index.indexOf('data-nav="profile"');
const settingsIdx = index.indexOf('data-nav="settings"');
if (railIdx !== -1 && profileIdx > railIdx && settingsIdx > profileIdx) {
  pass('Profile and settings after rail-spacer');
} else {
  fail('Profile and settings after rail-spacer', 'rail order');
}

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

// Open screen (Phase A)
has(index, '<h1>Open a box</h1><p>Pick a tier. The box opens, then your figure forms on a full screen.</p>', 'Open page-head copy');
has(index, 'id="pxSkyOpenBoxes" class="boxes"', 'Open boxes grid container');
has(index, 'id="pxOpenHooksPreserve"', 'Open hooks preserve block');
has(index, 'id="btnOpen"', 'btnOpen hook preserved');
has(index, 'id="stSpinMount"', 'stSpinMount hook preserved');
has(index, 'poxy-open-sky.js', 'Open sky script linked');
if (/body\.poxy-sky-app-active #pxOpenHooksPreserve[\s\S]*display:\s*none/.test(openCssText)) {
  pass('Legacy open hooks hidden in sky mode');
} else {
  fail('Legacy open hooks hidden in sky mode', 'open.css rule missing');
}
has(mock, 'id="sc-open"', 'Mockup has sc-open');
if (/function frogHTML|renderFrogForTier/.test(openSkyJsText) && /#pxSkyRitual \.frog/.test(openCssText)) {
  pass('Open ritual frog generation');
} else {
  fail('Open ritual frog generation', 'poxy-open-sky.js / open.css');
}

// Collection functional (Phase A)
has(index, 'poxy-collection-sky.js', 'Collection sky script linked');
has(index, 'matchColSkySearch', 'Collection search filter hook');
has(collectionSkyJsText, 'global.matchColSkySearch', 'Collection search exported');
has(collectionSkyJsText, "input.placeholder = 'Search figures'", 'Collection search input wired');
if (/body\.poxy-sky-app-active #collectionPage \.poxy-col-view-tabs[\s\S]*display:\s*none/.test(collectionCssText)) {
  pass('Collection legacy view tabs hidden');
} else {
  fail('Collection legacy view tabs hidden', 'collection.css rule missing');
}
if (/body\.poxy-sky-app-active #collectionPage #pxSkyColMiles/.test(collectionCssText)) {
  pass('Collection miles panel styled');
} else {
  fail('Collection miles panel styled');
}
has(mock, 'id="sc-collection"', 'Mockup has sc-collection');

// Market functional (Phase A)
has(index, 'poxy-market-sky.js', 'Market sky script linked');
has(marketSkyJsText, 'pxSkyMarketRarityChips', 'Market rarity chips wired');
has(marketSkyJsText, 'pxSkyMarketSellBtn', 'Market sell CTA wired');
if (/body\.poxy-sky-app-active #marketPage \.poxy-market-field--rarity-native/.test(marketCssText)) {
  pass('Market native rarity filter hidden in sky mode');
} else {
  fail('Market native rarity filter hidden in sky mode', 'market.css rule missing');
}
if (/body\.poxy-sky-app-active #pxSkyStage:has\(#collectionPage\.visible\) > #huntPage/.test(collectionCssText)) {
  pass('Collection hides huntPage when visible');
} else {
  fail('Collection hides huntPage when visible', 'collection.css :has rule missing');
}
has(index, 'POXY_POXY_SELECT_TIERS', 'Collection tiered select fallback');
if (/body\.poxy-sky-app-active\.poxy-sky-collection-active #huntPage/.test(fs.readFileSync(path.join(root, 'assets/poxy-sky/overlays.css'), 'utf8'))) {
  pass('Collection huntPage suppressed when active');
} else {
  fail('Collection huntPage suppressed when active', 'overlays.css rule missing');
}
has(mock, 'id="sc-market"', 'Mockup has sc-market');

// Store functional (Phase A)
has(index, 'poxy-store-sky.js', 'Store sky script linked');
has(storeSkyJsText, 'pxSkyStoreCatChips', 'Store category chips wired');
has(storeSkyJsText, 'pxSkyStoreMembership', 'Store membership block wired');
has(storeSkyJsText, 'openTopUpModal', 'Store add funds wired');
has(storeSkyJsText, 'subtree: false', 'Store grid observer avoids subtree loop');
if (/body\.poxy-sky-app-active #storePage \.poxy-store-sidenav[\s\S]*display:\s*none/.test(storeCssText)) {
  pass('Store legacy sidenav hidden in sky mode');
} else {
  fail('Store legacy sidenav hidden in sky mode', 'store.css rule missing');
}
if (/body\.poxy-sky-app-active #stPanelStore\.st-spa-panel--active/.test(storeCssText)) {
  pass('Store panel active layout');
} else {
  fail('Store panel active layout', 'store.css stPanelStore rule missing');
}
has(mock, 'id="sc-store"', 'Mockup has sc-store');

// Settings functional (Phase A)
has(index, 'poxy-settings-sky.js', 'Settings sky script linked');
has(settingsSkyJsText, 'pxSkySettingsHub', 'Settings hub wired');
has(settingsSkyJsText, 'prepSettingsPanel', 'Settings panel prep wired');
has(settingsSkyJsText, 'isSkySettingsHub', 'Settings hub guard on tab switch');
has(settingsSkyJsText, 'openTopUpModal', 'Settings top-up wired');
has(settingsSkyJsText, 'toggleTheme', 'Settings theme toggle wired');
if (/body\.poxy-sky-app-active #settingsPage \.poxy-settings-sidebar[\s\S]*display:\s*none/.test(settingsCssText)) {
  pass('Settings legacy sidebar hidden in sky mode');
} else {
  fail('Settings legacy sidebar hidden in sky mode', 'settings.css rule missing');
}
if (/body\.poxy-sky-app-active #settingsPage\.px-sky-settings--hub/.test(settingsCssText)) {
  pass('Settings hub mode layout');
} else {
  fail('Settings hub mode layout', 'settings.css hub rule missing');
}
if (/\.rail-spacer[\s\S]*flex:\s*1/.test(shellCss) && /padding:\s*16px 0/.test(shellCss)) {
  pass('Rail mockup flex + spacer in app shell');
} else {
  fail('Rail mockup flex + spacer in app shell', 'app-shell.css rail rules missing');
}
if (/max-width:\s*1120px/.test(shellCss) && /html:has\(body\.poxy-sky-app-active\)[\s\S]*zoom:\s*1/.test(shellCss)) {
  pass('Sky stage max-width + zoom neutralized');
} else {
  fail('Sky stage max-width + zoom neutralized', 'app-shell.css scale rules');
}
if (/body\.poxy-sky-app-active #profilePage \.idhub-shell[\s\S]*display:\s*none/.test(fs.readFileSync(path.join(root, 'assets/poxy-sky/screens/profile.css'), 'utf8'))) {
  pass('Profile legacy shell hidden in sky mode');
} else {
  fail('Profile legacy shell hidden in sky mode', 'profile.css rule missing');
}
if (/body\.poxy-sky-app-active #settingsPage\.px-sky-settings--hub \.poxy-settings-shell[\s\S]*display:\s*none/.test(settingsCssText)) {
  pass('Settings legacy shell hidden in hub mode');
} else {
  fail('Settings legacy shell hidden in hub mode', 'settings.css rule missing');
}
if (/body\.poxy-sky-app-active #pxSkyStage:has\(#settingsPage\.visible\) > #huntPage/.test(fs.readFileSync(path.join(root, 'assets/poxy-sky/legacy-suppress.css'), 'utf8'))) {
  pass('Settings route hides huntPage shell');
} else {
  fail('Settings route hides huntPage shell', 'legacy-suppress.css rule missing');
}
has(mock, 'id="sc-settings"', 'Mockup has sc-settings');

if (/function isSkyLegacyRarityUi/.test(index) && /if\(isSkyLegacyRarityUi\(\)\)return;[\s\S]*?loadTierListPanel/.test(index)) {
  pass('Sky tierlist skips legacy loadTierListPanel');
} else if (/if\(next==='tierlist'\)\{[\s\S]*?poxy-sky-app-active/.test(index)) {
  pass('Sky tierlist skips legacy loadTierListPanel');
} else {
  fail('Sky tierlist skips legacy loadTierListPanel', 'showStitchTab still loads legacy tier stack in sky mode');
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
