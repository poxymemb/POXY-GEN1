/**
 * Remove craft + burn UI and client logic from index.html (one-time patch).
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../index.html');
let html = fs.readFileSync(file, 'utf8');

function replaceOnce(src, from, to, label) {
  if (!html.includes(from)) {
    console.warn('SKIP (not found):', label);
    return;
  }
  html = html.replace(from, to);
  console.log('OK:', label);
}

// ── HTML: collection console burn/craft row + craft zone ──
replaceOnce(
  html,
  `      <button type="button" class="poxy-col-bulk-burn" id="btnBulkDust" data-i18n="col.bulk.burnAll">Burn All Selected</button>\n`,
  '',
  'bulk burn button'
);

replaceOnce(
  html,
  `        <!-- ROW 2: telemetry (left) + primary actions (right) -->
        <div class="poxy-col-console-row poxy-col-console-row--bottom">
          <div class="poxy-col-burn-panel">
            <div class="poxy-col-burn-label">
              <span class="material-symbols-outlined" aria-hidden="true">local_fire_department</span>
              <span>BURN <span class="material-symbols-outlined poxy-col-arrow-icon" aria-hidden="true">arrow_forward</span> PX</span>
            </div>
            <div class="poxy-col-burn-rates">
              <span class="poxy-col-burn-chip"><span class="poxy-burn-chip-key">COMMON</span><span class="poxy-burn-chip-val">2</span></span>
              <span class="poxy-col-burn-chip"><span class="poxy-burn-chip-key">MYTHIC</span><span class="poxy-burn-chip-val">2500</span></span>
              <span class="poxy-col-burn-chip"><span class="poxy-burn-chip-key">SECRET</span><span class="poxy-burn-chip-val">2500</span></span>
            </div>
          </div>
          <div class="poxy-col-actions">
            <button type="button" class="poxy-col-capsule poxy-col-capsule-burn" id="btnColBurnCapsule" disabled>
              <span class="material-symbols-outlined" aria-hidden="true">local_fire_department</span>
              BURN
            </button>
            <button type="button" class="poxy-col-capsule poxy-col-capsule-craft" id="btnColCraftCapsule">
              CRAFT <span class="poxy-craft-sep">|</span> [5X CMN <span class="material-symbols-outlined poxy-col-arrow-icon" aria-hidden="true">arrow_forward</span> 1X UNC]
            </button>
          </div>
        </div>
`,
  '',
  'collection burn/craft console row'
);

replaceOnce(
  html,
  `      <div class="poxy-col-craft-zone" id="colCraftZone" aria-hidden="true">
        <div class="poxy-col-craft-zone-head">
          <div>
            <h2>Alchemical Processing Zone</h2>
            <p>Drag 5 Common POXY from the grid into the sockets below.</p>
          </div>
          <button type="button" class="poxy-col-craft-close" id="btnColCraftClose" aria-label="Close craft zone">✕</button>
        </div>
        <div class="poxy-col-craft-sockets" id="colCraftSockets"></div>
        <button type="button" class="poxy-col-craft-execute" id="btnCraftExecute" disabled>CRAFT</button>
      </div>
`,
  '',
  'craft zone'
);

// Modals
replaceOnce(
  html,
  `<!-- CRAFT MODAL (5 Common → 1 Uncommon) -->
<div class="modal-overlay hidden" id="craftModal">
  <div class="modal-card" style="max-width:360px">
    <div class="modal-title">Craft Upgrade</div>
    <div class="modal-sub">Pick exactly 5 Common POXY to fuse into 1 Uncommon. <span id="craftSelectCount" style="color:#f9abff;font-weight:800">0 / 5</span></div>
    <div id="craftPool" style="max-height:300px;overflow-y:auto;margin:14px 0"></div>
    <div class="modal-btns">
      <button class="btn-modal-ok" id="btnCraftDoIt" onclick="tryPerformCraft()">Craft Now</button>
      <button class="btn-modal-cancel" onclick="closeCraftModal()">Cancel</button>
    </div>
  </div>
</div>

`,
  '',
  'craft modal'
);

replaceOnce(
  html,
  `<!-- Craft DNA trait picker -->
<div id="craftTraitModal" class="poxy-modal-backdrop" role="dialog" aria-modal="true" aria-label="Inherit DNA trait" hidden>
  <div class="poxy-econ-modal">
    <h3>Inherit DNA trait</h3>
    <p id="craftTraitSub">Pick one trait category from your 5 forge dragons.</p>
    <div class="poxy-craft-trait-grid" id="craftTraitGrid"></div>
    <div class="poxy-econ-modal-actions">
      <button type="button" class="poxy-econ-btn poxy-econ-btn--primary" onclick="confirmCraftTrait()">Craft with selection</button>
      <button type="button" class="poxy-econ-btn poxy-econ-btn--ghost" onclick="confirmCraftTrait()">Skip inheritance</button>
    </div>
  </div>
</div>
`,
  '',
  'craft trait modal'
);

// Club forge blocks
replaceOnce(
  html,
  `            <div class="poxy-club-grid-2">
              <div class="poxy-club-glass club-forge"><h2 class="poxy-club-kicker">Alchemist's Forge</h2><p class="poxy-club-muted">Burn duplicate commons → guaranteed tier-up roll.</p><div id="clubForgeGrid" class="club-forge-grid"></div><button type="button" class="poxy-club-btn-gold" id="btnClubForge" onclick="runClubForge()">Transmute selection</button></div>
              <div class="poxy-club-glass"><h2 class="poxy-club-kicker">Elite bounties</h2><div id="clubBountiesList" class="poxy-club-bounties-list"></div></div>
            </div>
`,
  `            <div class="poxy-club-glass"><h2 class="poxy-club-kicker">Elite bounties</h2><div id="clubBountiesList" class="poxy-club-bounties-list"></div></div>
`,
  'club lounge forge'
);

replaceOnce(
  html,
  `              <section class="club-forge-panel club-chamfer-edge">
                <span class="material-symbols-outlined club-forge-bg">local_fire_department</span>
                <h2>The Forge</h2>
                <p>Burn 5 identical assets to forge 1 next-tier artifact.</p>
                <div class="club-forge-slots" id="clubOtcForgeSlots"></div>
                <button type="button" class="club-forge-init" onclick="switchClubSubTab('lounge')">Initialize Burn</button>
              </section>
`,
  '',
  'club OTC forge panel'
);

replaceOnce(
  html,
  `          <div id="greatBurnCounter" hidden aria-hidden="true">🔥 The Great Burn — 0 POXY</div>\n`,
  '',
  'great burn counter'
);

replaceOnce(
  html,
  `          <div class="avm-data-row" id="avmForgeRow">
            <span class="avm-data-key">FORGE</span>
            <span class="avm-data-val avm-val-forge">IN SYNDICATE FORGE</span>
          </div>
`,
  '',
  'avm forge row'
);

replaceOnce(
  html,
  `        <button type="button" class="avm-sec-btn avm-sec-danger" id="avmBurnBtn" title="Burn for dust">
          <span class="material-symbols-outlined">local_fire_department</span>
          <span>Burn</span>
        </button>
`,
  '',
  'avm burn button'
);

// State vars
html = html.replace(/const CRAFT_INHERIT_LS = 'poxy_craft_inherit_trait';\n/, '');
html = html.replace(/let pendingCraftTrait=null;\n/, '');
html = html.replace(/let colMultiSelectMode=false, colSortPreset='default', colCraftZoneOpen=false;\n/, "let colMultiSelectMode=false, colSortPreset='default';\n");
html = html.replace(/let craftSockets=\[null,null,null,null,null\];\n/, '');
html = html.replace(/let craftSelection=new Set\(\); \/\* legacy modal; forge uses craftSockets \*\/\n/, '');
html = html.replace(/let greatBurnTotal=0;\n/, '');

html = html.replace(
  /await Promise\.all\(\[checkMythic\(\),refreshPremiumFrame\(\),loadGreatBurnTotal\(\)\]\);/,
  'await Promise.all([checkMythic(),refreshPremiumFrame()]);'
);

html = html.replace(
  /colFilter='all';colSortPreset='default';colMultiSelectMode=false;colCraftZoneOpen=false;\n    selectedForDust=new Set\(\);selectedItems=selectedForDust;colLastSelectIndex=-1;\n    resetCraftSockets\(false\);closeColSortMenu\(\);syncColMultiToggleUi\(\);setColCraftZoneOpen\(false\);/,
  "colFilter='all';colSortPreset='default';colMultiSelectMode=false;\n    selectedForDust=new Set();selectedItems=selectedForDust;colLastSelectIndex=-1;\n    closeColSortMenu();syncColMultiToggleUi();"
);

// Replace craft/burn function block with stubs
const craftBurnStub = `function estimateBurnPayout(){return 0;}
function resetCraftSockets(){}
function getCraftSocketIds(){return [];}
function setColCraftZoneOpen(){}
function renderCraftSockets(){}
function clearCraftSocket(){}
function findCraftSocketForItem(){return -1;}
function onColItemDragStart(e){e.preventDefault();}
function onColItemDragEnd(){}
function onCraftSocketDragOver(e){e.preventDefault();}
function onCraftSocketDragLeave(){}
function onCraftSocketDrop(e){e.preventDefault();}
function updateColActionCapsules(){updateBulkBar();}
`;

const craftStart = 'function estimateBurnPayout(ids){';
const craftEnd = 'function syncColMultiToggleUi(){';
const i1 = html.indexOf(craftStart);
const i2 = html.indexOf(craftEnd);
if (i1 >= 0 && i2 > i1) {
  html = html.slice(0, i1) + craftBurnStub + html.slice(i2);
  console.log('OK: craft/burn function block → stubs');
} else {
  console.warn('SKIP: craft function block boundaries');
}

// Card menu burn item
html = html.replace(
  /    '<button type="button" class="col-card-menu-item danger" data-action="burn" data-id="'\+item\.id\+'" role="menuitem"><span class="ic">🔥<\/span>'\+tr\('col\.menu\.burn'\)+'<\/button>'\n/,
  ''
);

// buildCollectionCard forge bits
html = html.replace(/  const inForge=findCraftSocketForItem\(item\.id\)>=0;\n/, '');
html = html.replace(/    \(inForge\?' col-inv-in-forge':''\)\+/g, '');
html = html.replace(
  /  \/\/ ── Status layer: forge drag ──\n  if\(colCraftZoneOpen&&item\.poxy_tier==='common'&&!lockedView&&!inForge\)\{\n    card\.draggable=true;\n    card\.dataset\.dragKind='grid';\n    card\.addEventListener\('dragstart',onColItemDragStart\);\n    card\.addEventListener\('dragend',onColItemDragEnd\);\n  \}\n\n/,
  ''
);

// handleColMenuItem burn
html = html.replace(/    if\(action==='burn'\)\{burnPoxySecure\(item\.id,card\);return;\}\n/, '');

// collection click craft toast
html = html.replace(
  /      if\(colCraftZoneOpen&&card\.dataset\.tier==='common'\)\{\n        showToast\('Drag this Common into a forge socket\.'\);\n        return;\n      \}\n/,
  ''
);

// burn/craft action functions → stubs
const burnStub = `function runColBulkBurn(){}
function fillCraftFromSelection(){}
async function burnPoxySecure(){}
`;

const burnStart = 'function runColBulkBurn(){';
const burnEnd = 'const UUID_RE=';
const b1 = html.indexOf(burnStart);
const b2 = html.indexOf(burnEnd);
if (b1 >= 0 && b2 > b1) {
  html = html.slice(0, b1) + burnStub + html.slice(b2);
  console.log('OK: burnPoxySecure block → stubs');
}

// Remove bulk burn listener block
html = html.replace(/\$\('btnBulkDust'\)\.addEventListener\('click',[\s\S]*?updateColActionCapsules\(\);\n\}\);\n\n/, '');

// initCollectionArchiveUi craft listeners
html = html.replace(
  /  \$\('btnColCraftMode'\)\?\.addEventListener\('click',[\s\S]*?\}\);\n  \$\('btnCraftExecute'\)\?\.addEventListener\('click',tryPerformCraft\);\n/,
  ''
);
html = html.replace(
  /  \$\('btnColCraftClose'\)\?\.addEventListener\('click',\(\)=>setColCraftZoneOpen\(false\)\);\n  \$\('btnColBurnCapsule'\)\?\.addEventListener\('click',runColBulkBurn\);\n  \$\('btnColCraftCapsule'\)\?\.addEventListener\('click',[\s\S]*?\}\);\n/,
  ''
);

// asset viewer wiring
html = html.replace(
  /  const forgeRow = \$\('avmForgeRow'\);\n  if\(forgeRow\) forgeRow\.hidden = typeof findCraftSocketForItem !== 'function' \|\| findCraftSocketForItem\(item\.id\) < 0;\n/,
  ''
);
html = html.replace(
  /  const burnBtn = \$\('avmBurnBtn'\);\n  if\(burnBtn\)\{ burnBtn\.onclick = \(\)=>\{ closeAssetViewerModal\(\); const card=document\.querySelector\('\.col-card\[data-id="'+CSS\.escape\(String\(item\.id\)\)+'"\]'\); burnPoxySecure\(item\.id, card\); \}; \}\n\n/,
  ''
);

// club forge stubs
html = html.replace(
  /function renderClubForge\(\)\{[\s\S]*?\}\nwindow\.runClubForge=function\(\)\{[\s\S]*?\};\n/,
  'function renderClubForge(){}\nwindow.runClubForge=function(){};\n'
);
html = html.replace(/  renderClubForge\(\);\n/, '');

// great burn + craft system stubs
html = html.replace(
  /\/\/ ── PHASE 11 — THE GREAT BURN counter[\s\S]*?function updateGreatBurnUI\(\)\{[\s\S]*?\}\n\n/,
  ''
);

html = html.replace(
  /\/\/ ── PHASE 11 — CRAFTING[\s\S]*?function renderCraftPool\(\)\{[\s\S]*?  const sel=\$\('craftSelectCount'\);if\(sel\)sel\.textContent=craftSelection\.size\+' \/ 5';\n\}\n\n/,
  `// craft/burn removed
function tryPerformCraft(){}
function openCraftTraitModal(){}
window.closeCraftTraitModal=function(){};
window.confirmCraftTrait=async function(){};
async function performCraft(){}
window.openCraftModal=function(){};
window.closeCraftModal=function(){}
function renderCraftPool(){}

`
);

html = html.replace(/updateGreatBurnUI\(\);\n\nfunction setupGlobalEscapeClose/, 'function setupGlobalEscapeClose');
html = html.replace(/    if\(colCraftZoneOpen\)\{setColCraftZoneOpen\(false\);return;\}\n/, '');
html = html.replace(/    if\(\$\('craftModal'\)[\s\S]*?closeCraftModal\(\);return;\}\n/, '');
html = html.replace(/    const craftTrait=\$\('craftTraitModal'\);[\s\S]*?closeCraftTraitModal\(\);return;\}\n/, '');

fs.writeFileSync(file, html);
console.log('Wrote', file);
