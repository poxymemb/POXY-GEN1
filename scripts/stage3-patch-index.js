/**
 * Stage 3 — inject Sky app shell into index.html, trim legacy CSS list.
 */
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../index.html');
let index = fs.readFileSync(indexPath, 'utf8').replace(/\r\n/g, '\n');

const shellReplacement = `<!-- POXY Sky app shell (Stage 3) -->
<div id="poxyAppShell" class="px-sky-app" style="display:none">
<aside class="rail" id="pxSkyRail" aria-label="Main navigation">
  <button type="button" class="logo" id="pxSkyRailLogo" aria-label="POXY WORLD home"><span class="mk"></span></button>
  <button type="button" class="rail-btn active" data-nav="home"><span class="tip">Home</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg></button>
  <button type="button" class="rail-btn" data-nav="open"><span class="tip">Open boxes</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5 12 3l9 4.5v9L12 21 3 16.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/></svg></button>
  <button type="button" class="rail-btn" data-nav="collection"><span class="tip">Collection</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></button>
  <button type="button" class="rail-btn" data-nav="market"><span class="tip">Market</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16l-1 4H5z"/><path d="M5 11v8h14v-8M9 19v-4h6v4"/></svg></button>
  <button type="button" class="rail-btn" data-nav="collections"><span class="tip">All collections</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 9h17"/></svg></button>
  <button type="button" class="rail-btn" data-nav="store"><span class="tip">Store</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9M3 9v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M3 9h18M8 13h8"/></svg></button>
  <button type="button" class="rail-btn" data-nav="community"><span class="tip">Community</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.4"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5M15 20c0-2.2 1.3-3.5 3-3.7"/></svg></button>
  <button type="button" class="rail-btn" data-nav="messenger"><span class="tip">Messages</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4V6a1 1 0 0 1 1-1z"/></svg></button>
  <button type="button" class="rail-btn" data-nav="events"><span class="tip">Events</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l2.6 5.5 6 .8-4.3 4.2 1 6L12 17l-5.3 2.9 1-6L3.4 9.8l6-.8z"/></svg></button>
  <button type="button" class="rail-btn" data-nav="quests"><span class="tip">Quests</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg></button>
  <button type="button" class="rail-btn" data-nav="levels"><span class="tip">Levels</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 14h6M10 14v4M14 14v4M8 21h8"/></svg></button>
  <div class="rail-spacer"></div>
  <button type="button" class="rail-btn" data-nav="profile"><span class="tip">Profile</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/></svg></button>
  <button type="button" class="rail-btn" data-nav="settings"><span class="tip">Settings</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5H9.4l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4.2l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z"/></svg></button>
</aside>
<div class="main" id="pxSkyMain">
<header class="topbar" id="pxSkyTopbar">
  <div class="greet">Welcome back, <span class="at" id="pxSkyGreetUser">@Player</span></div>
  <div class="top-right">
    <div class="st-xp-hud" id="stXpHud" aria-label="Experience progress">
      <div class="st-xp-hud-level" id="stXpLevel">LVL 0</div>
      <div class="st-xp-hud-track" aria-hidden="true"><div class="st-xp-hud-fill" id="stXpFill"></div></div>
      <div class="st-xp-hud-balance" id="stXpBalance">0 XP</div>
    </div>
    <div class="st-wallet-capsule balance-badge st-balance" id="balanceBadgeGroup">
      <button type="button" class="st-wallet-body" id="balanceBadge" onclick="openTopUpModal()" aria-label="Wallet balance">
        <span class="st-wallet-icon material-symbols-outlined" aria-hidden="true">account_balance_wallet</span>
        <span class="st-wallet-amount" id="stBalanceText">0 PX</span>
      </button>
      <button type="button" class="st-wallet-plus-btn" id="balanceTopUpBtn" onclick="openTopUpModal()" aria-label="Add funds">
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
      </button>
    </div>
    <button type="button" class="st-nav-icon-btn" id="stNavNotify" aria-label="Notifications" onclick="openNotifyHub()">
      <span class="material-symbols-outlined">notifications</span>
      <span class="st-nav-badge poxy-notify-dot" id="notifyBellDot" hidden aria-hidden="true"></span>
    </button>
    <button type="button" class="st-nav-icon-btn" id="stNavSupport" aria-label="Support" onclick="openSupportPanel()">
      <span class="material-symbols-outlined">support_agent</span>
      <span class="st-nav-badge" id="supportTicketBadge" hidden aria-hidden="true">0</span>
    </button>
    <button type="button" class="st-nav-icon-btn" id="stNavGrid" aria-label="Site preview" onclick="openPoxyLandingPreview()">
      <span class="material-symbols-outlined">grid_view</span>
    </button>
    <button type="button" class="top-icon" id="pxSkyThemeBtn" aria-label="Theme">◐</button>
  </div>
</header>
<div class="stage" id="pxSkyStage">
<nav class="st-nav st-nav--global px-legacy-nav" id="stGlobalNav" aria-hidden="true" hidden>
  <div class="st-nav-inner px-legacy-nav-inner">
    <button type="button" id="psdNavBrand" hidden></button>
    <button type="button" id="psdNavNews" hidden></button>
    <button type="button" id="psdNavVerify" hidden></button>
    <button type="button" id="psdNavWhitepaper" hidden></button>
    <button type="button" id="psdNavTelemetry" hidden></button>
    <button type="button" id="psdNavGens" hidden></button>
    <button type="button" id="psdNavExplore" hidden></button>
    <button type="button" id="psdNavRarity" hidden></button>
    <button type="button" class="st-nav-pill" id="psdNavDashboard" hidden></button>
    <button type="button" class="st-nav-pill" id="psdNavMarket" hidden></button>
    <button type="button" class="st-nav-pill" id="psdNavClub" hidden></button>
    <button type="button" class="st-nav-pill" id="psdNavRanks" hidden></button>
    <button type="button" class="st-nav-pill" id="psdNavCollection" hidden></button>
    <button type="button" class="st-nav-pill" id="psdNavStore" hidden></button>
    <button type="button" class="st-nav-pill" id="psdNavLuminaOs" hidden></button>
    <div class="user-bar" id="userBar" hidden aria-hidden="true">
      <div id="userUsernameEl">Player</div>
      <div id="userRoleEl"></div>
      <div id="userAccountHash"></div>
      <span id="userEmailEl" style="display:none"></span>
      <div id="userBarAvatarWrap"><span id="userBarAvatar">🎭</span></div>
    </div>
    <button type="button" id="hamburgerBtn" hidden></button>
    <button type="button" id="stNavChat" hidden></button>
  </div>
</nav>
`;

if (index.includes('id="pxSkyRail"')) {
  console.log('Stage 3 shell already present — skipping HTML shell patch');
} else {
  const startRe =
    /<!-- STITCH app shell: global top nav stays on every page -->\s*<div id="poxyAppShell" style="display:none">\s*<nav class="st-nav st-nav--global" id="stGlobalNav" aria-label="POXY World">/;
  const startIdx = index.search(startRe);
  if (startIdx < 0) throw new Error('poxyAppShell marker not found');

  const navEndMatch = index.match(/\s*<\/nav>\s*<div class="st-win-reveal"/);
  if (!navEndMatch) throw new Error('nav end not found');
  const navEnd = navEndMatch.index;
  const navEndLen = navEndMatch[0].indexOf('<div');

  index = index.slice(0, startIdx) + shellReplacement + index.slice(navEnd + navEndLen);

  const cryptoIdx = index.indexOf('POXY CRYPTO TRANSPARENCY OVERLAY');
  if (cryptoIdx < 0) throw new Error('crypto marker not found');
  const insertAt = index.lastIndexOf('<!--', cryptoIdx);
  const beforeCrypto = index.slice(0, insertAt).replace(/\n<\/div>\s*$/, '');
  index =
    beforeCrypto +
    '\n</div><!-- /pxSkyStage -->\n</div><!-- /pxSkyMain -->\n</div><!-- /poxyAppShell -->\n' +
    index.slice(insertAt);
}

if (!index.includes('app-shell.css')) {
  index = index.replace(
    '<link rel="stylesheet" href="assets/poxy-sky/auth.css?v=1">',
    '<link rel="stylesheet" href="assets/poxy-sky/auth.css?v=1">\n<link rel="stylesheet" href="assets/poxy-sky/app-shell.css?v=1">'
  );
}
if (!index.includes('poxy-app-shell.js')) {
  index = index.replace(
    '<script src="assets/poxy-auth-sky.js?v=1" defer></script>',
    '<script src="assets/poxy-auth-sky.js?v=1" defer></script>\n<script src="assets/poxy-app-shell.js?v=1" defer></script>'
  );
}

index = index.replace('<script src="assets/st-nav-right-motion.js?v=1" defer></script>\n', '');

index = index.replace(
  "document.body.classList.add('poxy-app-dark','poxy-stitch-dash');",
  "document.body.classList.add('poxy-sky-app-active');\n  const shellEl=$('poxyAppShell');if(shellEl)shellEl.classList.add('px-sky-app--open');"
);

if (!index.includes('shellOff.classList.remove')) {
  index = index.replace(
    "document.body.classList.remove('poxy-app-dark','poxy-stitch-dash','ranks-tab-active','poxy-auth-modal-open');",
    "document.body.classList.remove('poxy-sky-app-active','poxy-app-dark','poxy-stitch-dash','ranks-tab-active','poxy-auth-modal-open');\n  const shellOff=$('poxyAppShell');if(shellOff){shellOff.classList.remove('px-sky-app--open');shellOff.style.display='none';}"
  );
}

index = index.replace(
  `function showPoxyAppShell(){
  const shell=$('poxyAppShell');
  if(shell)shell.style.display='block';
  requestAnimationFrame(updateStNavOffset);
}`,
  `function showPoxyAppShell(){
  const shell=$('poxyAppShell');
  if(shell){
    shell.style.display='flex';
    shell.classList.add('px-sky-app--open');
  }
  if(window.PoxyAppShell)PoxyAppShell.syncGreet();
  requestAnimationFrame(updateStNavOffset);
}`
);

if (!index.includes('PoxyAppShell.syncRail')) {
  index = index.replace(
    `  else if(tab==='market'||tab==='club'||tab==='ranks'||tab==='collection'||tab==='friends'){}
}`,
    `  else if(tab==='market'||tab==='club'||tab==='ranks'||tab==='collection'||tab==='friends'){}
  if(window.PoxyAppShell)PoxyAppShell.syncRail(tab);
}`
  );
}

if (!index.includes('PoxyAppShell.syncGreet()')) {
  index = index.replace(
    `function syncNavUsernameLabels(){
  const name=currentProfile?.username||'Player';
  const u1=$('userUsernameEl');if(u1)u1.textContent=name;
  updatePsdMemberBadge();
}`,
    `function syncNavUsernameLabels(){
  const name=currentProfile?.username||'Player';
  const u1=$('userUsernameEl');if(u1)u1.textContent=name;
  if(window.PoxyAppShell)PoxyAppShell.syncGreet();
  updatePsdMemberBadge();
}`
  );
}

index = index.replace(
  "  document.body.classList.add('poxy-stitch-dash');",
  "  document.body.classList.add('poxy-sky-app-active');"
);

index = index.replace(
  "  const shell=$('poxyAppShell');if(shell)shell.style.display='block';",
  "  const shell=$('poxyAppShell');if(shell){shell.style.display='flex';shell.classList.add('px-sky-app--open');}"
);

const legacyPath = path.join(__dirname, '../assets/poxy-sky/legacy-styles.js');
let legacy = fs.readFileSync(legacyPath, 'utf8');
[
  'assets/stitch-dashboard.css?v=18',
  'assets/poxy-theme.css?v=2',
  'assets/poxy-spa-nav.css?v=6',
  'assets/poxy-obsidian-reskin.css?v=5',
  'assets/poxy-obsidian-ambient.css?v=1',
  'assets/poxy-dash-hero.css?v=1',
  'assets/lumina-os-overrides.css?v=15',
  'assets/poxy-trust-motion.css?v=1',
].forEach((s) => {
  legacy = legacy.replace(JSON.stringify(s) + ',', '');
  legacy = legacy.replace(',' + JSON.stringify(s), '');
});
legacy = legacy.replace(/,\s*,/g, ',');
fs.writeFileSync(legacyPath, legacy);

fs.writeFileSync(indexPath, index);
console.log('Stage 3 index patch applied');
