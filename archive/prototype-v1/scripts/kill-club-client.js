/**
 * Remove legacy POXY Club / VIP case client surface from index.html.
 * Run: node scripts/kill-club-client.js
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../index.html');
let html = fs.readFileSync(file, 'utf8');
const origLen = html.length;

function cutBetween(startMarker, endMarker, label) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  if (start === -1 || end === -1) {
    console.warn('SKIP:', label, '(markers not found)');
    return;
  }
  html = html.slice(0, start) + html.slice(end);
  console.log('OK:', label);
}

function replaceOnce(from, to, label) {
  if (!html.includes(from)) {
    console.warn('SKIP:', label);
    return;
  }
  html = html.replace(from, to);
  console.log('OK:', label);
}

function replaceAll(from, to, label) {
  if (!html.includes(from)) {
    console.warn('SKIP:', label);
    return;
  }
  html = html.split(from).join(to);
  console.log('OK:', label);
}

// ── HTML: legacy club page + overlays (~525 lines) ──
cutBetween(
  '<!-- POXY CLUB v2',
  '<!-- ═══════════════════════════════════════════════════════════════════════════\n     POXY CRYPTO TRANSPARENCY OVERLAY',
  'club HTML block'
);

replaceOnce(
  '    <section class="st-spa-panel" id="stPanelClub" data-st-tab="club" hidden></section>',
  '    <section class="st-spa-panel" id="stPanelCommunity" data-st-tab="community" hidden></section>',
  'community SPA panel'
);

replaceOnce(
  '  <button class="nav-btn club-tab" id="navClub" onclick="showPage(\'club\')" data-i18n="nav.legacy.club">CLUB</button>\n',
  '',
  'legacy navClub'
);

replaceOnce(
  '    <button type="button" class="st-nav-pill" id="psdNavClub" hidden></button>\n',
  '',
  'psdNavClub'
);

replaceOnce(
  '      <div id="mythicClubTracker"><div id="mctBarFill"></div><p id="mctStatus"></p></div>\n',
  '',
  'mythicClubTracker'
);

replaceOnce(
  `            <div class="st-vip-pity-bar" id="stVipPityBar" aria-live="polite">
              <div>PITY TRACKER · VIP case</div>
`,
  '',
  'stVipPityBar (partial)'
);

// Remove rest of stVipPityBar if still present
html = html.replace(
  /\s*<div class="st-vip-pity-bar" id="stVipPityBar"[\s\S]*?<\/div>\s*/m,
  '\n'
);

replaceOnce(
  `              <div class="poxy-settings-toggle-row">
                <div class="poxy-settings-toggle-info"><p class="poxy-settings-toggle-title">Club feed tags</p></div>
                <label class="poxy-settings-switch"><input type="checkbox" id="settingsNotifMentionsClub" onchange="saveSettingsPrefsFromUi()"><span class="poxy-settings-switch-slider"></span></label>
              </div>\n`,
  '',
  'settingsNotifMentionsClub row'
);

replaceOnce(
  `            <button type="button" class="poxy-settings-btn-primary" onclick="clubSignOutAllDevices()">Log out of all other devices</button>`,
  `            <button type="button" class="poxy-settings-btn-primary" onclick="signOutAllDevices()">Log out of all other devices</button>`,
  'settings signOutAllDevices'
);

// ── JS: club experience block ──
cutBetween('function enterClubExperience(){', '// ── NEWS FEED (Stitch Global News layout) ──', 'club JS block');

// ── Economy: VIP case pool (keep tier defs for legacy item labels) ──
replaceOnce(
  `const ALL_TIERS = TIERS.concat(VIP_TIERS);
const TIER_BY_ID = {};ALL_TIERS.forEach(t=>{TIER_BY_ID[t.id]=t;});`,
  `const ALL_TIERS = TIERS;
const TIER_BY_ID = {};
TIERS.forEach((t) => {
  TIER_BY_ID[t.id] = t;
});
VIP_TIERS.forEach((t) => {
  TIER_BY_ID[t.id] = t;
});`,
  'TIER_BY_ID: standard tiers only for rolls'
);

replaceOnce(
  `const PREMIUM_CASES = [
  {id:'vip',     label:'VIP Case',     price:VIP_CASE_PRICE,     icon:'💠', gbp:'7.50'},
  {id:'genesis', label:'Genesis Case', price:GENESIS_CASE_PRICE, icon:'🔮', gbp:'15.00'},
  {id:'mythic',  label:'Mythic Case',  price:MYTHIC_CASE_PRICE,  icon:'💎', gbp:'25.00'},
  {id:'legend',  label:'Legend Case',  price:LEGEND_CASE_PRICE,  icon:'🌟', gbp:'75.00'}
];`,
  `const PREMIUM_CASES = [
  {id:'genesis', label:'Genesis Case', price:GENESIS_CASE_PRICE, icon:'🔮', gbp:'15.00'},
  {id:'mythic',  label:'Mythic Case',  price:MYTHIC_CASE_PRICE,  icon:'💎', gbp:'25.00'},
  {id:'legend',  label:'Legend Case',  price:LEGEND_CASE_PRICE,  icon:'🌟', gbp:'75.00'}
];`,
  'PREMIUM_CASES without VIP case'
);

replaceOnce(
  `function isClubMember(){return!!(currentProfile&&(currentProfile.is_club_member||hasMythic));}`,
  `function isClubMember(){return false;}`,
  'isClubMember stub'
);

replaceOnce(
  `function pickVipTier(){let r=Math.random(),acc=0;for(const t of VIP_TIERS){acc+=t.prob;if(r<acc)return t;}return VIP_TIERS[VIP_TIERS.length-1];}`,
  '',
  'pickVipTier'
);

replaceOnce(
  `  const cPanel=$('stPanelClub');
  const mPage=$('marketPage');
  const cPage=$('clubPage');
  if(mPanel&&mPage&&mPage.parentElement!==mPanel){
    mPage.classList.add('st-spa-panel-inner','page');
    mPage.classList.remove('visible');
    mPanel.appendChild(mPage);
  }
  if(cPanel&&cPage&&cPage.parentElement!==cPanel){
    cPage.classList.add('st-spa-panel-inner','club-page');
    cPage.classList.remove('visible');
    cPanel.appendChild(cPage);
  }`,
  `  const mPage=$('marketPage');
  if(mPanel&&mPage&&mPage.parentElement!==mPanel){
    mPage.classList.add('st-spa-panel-inner','page');
    mPage.classList.remove('visible');
    mPanel.appendChild(mPage);
  }`,
  'mountSpaPanels without clubPage'
);

replaceOnce(
  `  document.body.classList.remove('dark-club');
  if(next==='club'){
    if(document.body.classList.contains('poxy-sky-app-active')){
      if(window.PoxyCommunitySky)PoxyCommunitySky.onShow();
    }else{
      document.body.classList.add('dark-club');
      enterClubExperience();
    }
  }`,
  `  if(next==='community'||next==='club'){
    if(window.PoxyCommunitySky)PoxyCommunitySky.onShow();
  }`,
  'showStitchTab community only'
);

replaceAll("else if(tab==='market'||tab==='club'||tab==='ranks'", "else if(tab==='market'||tab==='community'||tab==='ranks'", 'tab guard club→community');

replaceOnce(
  `    loadClubVault();
`,
  '',
  'boot loadClubVault'
);

// mythic club tracker
html = html.replace(/\nasync function renderMythicClubTracker\(\)\{[\s\S]*?\n\}/m, '\n');

replaceOnce(
  `  if(isClubMember())badges.add('vip_club');
`,
  '',
  'vip_club badge'
);

replaceOnce(
  `  vip_club:{label:'CLUB ENTRY',icon:'meeting_room',perk:'ALPHA ACCESS',accent:false},
`,
  '',
  'vip_club badge def'
);

replaceOnce(
  "const PROFILE_BADGE_ORDER=['founder','developer','diamond_hunter','platinum_hunter','gold_hunter','awakened','vip_club','collector'",
  "const PROFILE_BADGE_ORDER=['founder','developer','diamond_hunter','platinum_hunter','gold_hunter','awakened','collector'",
  'PROFILE_BADGE_ORDER'
);

// Collection: drop club exclusives section
html = html.replace(
  /\n  if\(splitClubSection&&vipItems\.length\)\{[\s\S]*?\n  \}\n/,
  '\n'
);

replaceOnce(
  `  const splitClubSection=colFilter==='all';
  const normalItems=splitClubSection?filtered.filter(i=>!isVipPoxyItem(i)):filtered;
  const vipItems=splitClubSection?filtered.filter(i=>isVipPoxyItem(i)):[];
`,
  `  const normalItems=filtered;
`,
  'collection without vip split'
);

replaceOnce(
  `function isVipPoxyItem(it){return!!it&&(it.is_vip===true||VIP_TIER_IDS.has(it.poxy_tier));}
`,
  `function isVipPoxyItem(){return false;}
`,
  'isVipPoxyItem stub'
);

// Market: no VIP lock
html = html.replace(
  /vipLocked:isVip&&!isClubMember\(\)/g,
  'vipLocked:false'
);
html = html.replace(
  /if\(pendingBuyItem&&pendingBuyItem\.vipLocked\)extra='[^']*';/,
  ''
);
html = html.replace(
  /if\(ctx\.opts\.vipLocked\)\{[\s\S]*?\}\n/,
  ''
);

// Settings prefs
replaceOnce(
  `  setChk('settingsNotifMentionsClub',p.notifMentionsClub!==false);
`,
  '',
  'load settingsNotifMentionsClub'
);
replaceOnce(
  `  p.notifMentionsChat=g('settingsNotifMentionsChat');p.notifMentionsClub=g('settingsNotifMentionsClub');
`,
  `  p.notifMentionsChat=g('settingsNotifMentionsChat');
`,
  'save settingsNotifMentionsClub'
);

// signOutAllDevices (was clubSignOutAllDevices)
replaceOnce(
  '// ── NEWS FEED (Stitch Global News layout) ──',
  `window.signOutAllDevices=async function(){
  if(!confirm('Sign out on all devices? You will need to log in again everywhere.'))return;
  try{
    await sb.auth.signOut({scope:'global'});
    showToast('Signed out on all devices.');
  }catch(e){
    try{await sb.auth.signOut();showToast('Signed out (this device). Global sign-out may require newer auth.');}catch(e2){showToast('Sign out failed.');}
  }
};

// ── NEWS FEED (Stitch Global News layout) ──`,
  'signOutAllDevices helper'
);

// Nav club visibility
html = html.replace(/\n  const nav=\$\('navClub'\);if\(nav\)nav\.classList\.toggle\('show',has\);/g, '');

fs.writeFileSync(file, html);
console.log('kill-club-client: removed', origLen - html.length, 'chars from index.html');
