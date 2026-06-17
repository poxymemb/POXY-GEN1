/**
 * Stage 4 — Sky Home + Open screens in dashboard panel.
 */
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../index.html');
let index = fs.readFileSync(indexPath, 'utf8').replace(/\r\n/g, '\n');

if (!index.includes('id="pxSkyHome"')) {
  const coinSvg =
    '<span class="coin-sm" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="20" fill="url(#pxCoinGrad)"/><circle cx="24" cy="24" r="20" stroke="#8BE3FF" stroke-width="2.5"/><circle cx="24" cy="24" r="14" stroke="#0E3A48" stroke-width="2" stroke-opacity="0.45"/><path d="M24 14 L24 34 M18.5 19 Q24 14.5 29.5 19 M18.5 29 Q24 33.5 29.5 29" stroke="#0E3A48" stroke-width="3" stroke-linecap="round" stroke-opacity="0.8"/><defs><radialGradient id="pxCoinGrad" cx="0.4" cy="0.32" r="0.85"><stop offset="0" stop-color="#A6E9FF"/><stop offset="0.55" stop-color="#60C2E0"/><stop offset="1" stop-color="#2E9CC0"/></radialGradient></defs></svg></span>';

  const skyShell =
    '<!-- POXY Sky Home (Stage 4) -->\n' +
    '<div id="pxSkyHome" class="px-sky-screen px-sky-screen--active" hidden>\n' +
    '  <div class="page-head"><h1>Home</h1><p>Your world at a glance.</p></div>\n' +
    '  <div class="panel panel-pad px-home-welcome">\n' +
    '    <div class="px-home-welcome-main">\n' +
    '      <div class="panel-h" style="margin-bottom:8px">Welcome to POXY</div>\n' +
    '      <p class="px-home-lead">Open your first box to start a collection. Everything you own lives on your shelf, with its own passport.</p>\n' +
    '      <div class="px-home-actions">\n' +
    '        <button type="button" class="btn btn-primary" id="pxSkyHomeOpenBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5 12 3l9 4.5v9L12 21 3 16.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/></svg> Open a box</button>\n' +
    '        <button type="button" class="btn btn-glass" id="pxSkyHomeColBtn">My collection</button>\n' +
    '      </div>\n' +
    '    </div>\n' +
    '    <div class="px-home-stats">\n' +
    '      <div class="px-stat-chip"><div class="px-stat-val" id="pxSkyHomeFigures">0</div><div class="px-stat-lbl">Figures</div></div>\n' +
    '      <div class="px-stat-chip"><div class="px-stat-val">' +
    coinSvg +
    '<span id="pxSkyHomeBalanceNum">0</span></div><div class="px-stat-lbl">Balance</div></div>\n' +
    '    </div>\n' +
    '  </div>\n' +
    '  <div class="px-home-col-section">\n' +
    '    <div class="panel-h">Recent on your shelf</div>\n' +
    '    <div class="cards" id="pxSkyHomeColGrid"></div>\n' +
    '    <button type="button" class="btn btn-glass px-home-view-all" onclick="showPage(\'collection\')">View full collection →</button>\n' +
    '  </div>\n' +
    '</div>\n' +
    '<div id="pxSkyOpen" class="px-sky-screen" hidden>\n' +
    '  <div class="page-head"><h1>Open a box</h1><p>Pick a tier. The box opens, then your figure forms on a full screen.</p></div>\n' +
    '  <div class="px-open-spin-host">\n';

  const mainOpen = '<main class="st-main">';
  const mainIdx = index.indexOf(mainOpen);
  if (mainIdx < 0) throw new Error('st-main not found');
  index = index.slice(0, mainIdx + mainOpen.length) + '\n' + skyShell + index.slice(mainIdx + mainOpen.length);

  const spinStart = index.indexOf('<!-- ══ SPIN BLOCK ═════════════════════════════════════════════════ -->');
  if (spinStart < 0) throw new Error('spin block not found');
  const colStart = index.indexOf('<section class="st-glass-surface st-collection-block">', spinStart);
  if (colStart < 0) throw new Error('collection block not found');
  const spinBlock = index.slice(spinStart, colStart);
  index = index.slice(0, spinStart) + index.slice(colStart);

  const hostTag = '<div class="px-open-spin-host">';
  const hostIdx = index.indexOf(hostTag);
  if (hostIdx < 0) throw new Error('px-open-spin-host not found');
  const hostEnd = hostIdx + hostTag.length;
  index =
    index.slice(0, hostEnd) +
    '\n' +
    spinBlock +
    '  </div><!-- /px-open-spin-host -->\n' +
    '</div><!-- /pxSkyOpen -->\n' +
    index.slice(hostEnd);

  const heroMarker = '      <!-- ══ HERO IDENTITY HEADER (Obsidian Gold) ══════════════════════ -->';
  const heroIdx = index.indexOf(heroMarker);
  if (heroIdx < 0) throw new Error('hero marker not found');
  index =
    index.slice(0, heroIdx) +
    '<div class="px-legacy-dash" aria-hidden="true" hidden>\n' +
    index.slice(heroIdx);

  const bottomMarker = index.indexOf('<div class="st-bottom"></div>');
  if (bottomMarker < 0) throw new Error('st-bottom not found');
  index =
    index.slice(0, bottomMarker) +
    '</div><!-- /px-legacy-dash -->\n      ' +
    index.slice(bottomMarker);
}

if (!index.includes('home.css')) {
  index = index.replace(
    '<link rel="stylesheet" href="assets/poxy-sky/app-shell.css?v=2">',
    '<link rel="stylesheet" href="assets/poxy-sky/app-shell.css?v=2">\n<link rel="stylesheet" href="assets/poxy-sky/home.css?v=1">'
  );
}
if (!index.includes('poxy-home-sky.js')) {
  index = index.replace(
    '<script src="assets/poxy-app-shell.js?v=1" defer></script>',
    '<script src="assets/poxy-app-shell.js?v=1" defer></script>\n<script src="assets/poxy-home-sky.js?v=1" defer></script>'
  );
}
if (!index.includes('PoxyHomeSky.sync')) {
  index = index.replace(
    '  renderDashStreakChip();\n}',
    '  renderDashStreakChip();\n  if(window.PoxyHomeSky){PoxyHomeSky.sync();PoxyHomeSky.renderColPreview();}\n}'
  );
}
if (!index.includes('PoxyHomeSky.showHome()')) {
  index = index.replace(
    `  if(next==='dashboard'){
    refreshStitchDashboardChrome();
    renderDashColPreview();
    renderTopUpPaths();
  }`,
    `  if(next==='dashboard'){
    refreshStitchDashboardChrome();
    renderDashColPreview();
    renderTopUpPaths();
    if(window.PoxyHomeSky)PoxyHomeSky.showHome();
  }`
  );
}
if (!index.includes('pxSkyHome.hidden=false')) {
  index = index.replace(
    `  document.body.classList.add('poxy-sky-app-active');
  const shellEl=$('poxyAppShell');if(shellEl)shellEl.classList.add('px-sky-app--open');`,
    `  document.body.classList.add('poxy-sky-app-active');
  const shellEl=$('poxyAppShell');if(shellEl)shellEl.classList.add('px-sky-app--open');
  const skyHome=$('pxSkyHome');if(skyHome){skyHome.hidden=false;skyHome.classList.add('px-sky-screen--active');}
  if(window.PoxyHomeSky)PoxyHomeSky.showHome();`
  );
}

fs.writeFileSync(indexPath, index);
console.log('Stage 4 index patch applied');
