/**
 * Stages 5–10 — wire screens.css + page heads + navigation hooks.
 */
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../index.html');
let index = fs.readFileSync(indexPath, 'utf8').replace(/\r\n/g, '\n');

if (!index.includes('screens.css')) {
  index = index.replace(
    '<link rel="stylesheet" href="assets/poxy-sky/home.css?v=1">',
    '<link rel="stylesheet" href="assets/poxy-sky/home.css?v=1">\n<link rel="stylesheet" href="assets/poxy-sky/screens.css?v=1">'
  );
}

if (!index.includes('poxy-screens-sky.js')) {
  index = index.replace(
    '<script src="assets/poxy-home-sky.js?v=1" defer></script>',
    '<script src="assets/poxy-home-sky.js?v=1" defer></script>\n<script src="assets/poxy-screens-sky.js?v=1" defer></script>'
  );
}

if (!index.includes('PoxyScreensSky.onPage')) {
  index = index.replace(
    '  syncPsdTopNav(page);\n  if(page===\'collection\'){',
    '  syncPsdTopNav(page);\n  if(window.PoxyScreensSky)PoxyScreensSky.onPage(page);\n  if(page===\'collection\'){'
  );
}

if (!index.includes('PoxyScreensSky.onTab')) {
  index = index.replace(
    '  if(window.PoxyAppShell)PoxyAppShell.syncRail(tab);\n}',
    '  if(window.PoxyAppShell)PoxyAppShell.syncRail(tab);\n  if(window.PoxyScreensSky)PoxyScreensSky.onTab(tab);\n}'
  );
}

if (!index.includes('PoxyScreensSky.initAll')) {
  index = index.replace(
    '  if(window.PoxyHomeSky)PoxyHomeSky.showHome();',
    '  if(window.PoxyHomeSky)PoxyHomeSky.showHome();\n  if(window.PoxyScreensSky)PoxyScreensSky.initAll();'
  );
}

fs.writeFileSync(indexPath, index);
console.log('Stages 5–10 patch applied');
