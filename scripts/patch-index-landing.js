const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const fragment = fs.readFileSync(path.join(root, 'design/v2/landing-fragment.html'), 'utf8');

const start = index.indexOf('<!-- POXY World — public landing');
const end = index.indexOf('<!-- AUTH —');
if (start < 0 || end < 0) throw new Error('landing markers not found');

index = index.slice(0, start) + fragment.trim() + '\n\n' + index.slice(end);

const themeScript = `<script>
(function(){
  try{
    var t=localStorage.getItem('poxy-sky-theme')||'light';
    document.documentElement.setAttribute('data-theme',t);
  }catch(e){
    document.documentElement.setAttribute('data-theme','light');
  }
})();
</script>`;

if (!index.includes('poxy-sky-theme')) {
  index = index.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n' + themeScript);
}

index = index.replace(
  '<style id="poxy-critical-fcp">html,body{margin:0;background:#080810;color:#e2e8f0}#poxyLanding,.poxy-app-shell{min-height:100dvh}</style>',
  '<style id="poxy-critical-fcp">html,body{margin:0;background:#F0F0F1;color:#1C1C1E}html[data-theme="dark"],html[data-theme="dark"] body{background:#1C1C1E;color:#F0F0F1}#poxyLanding,.poxy-app-shell{min-height:100dvh}</style>'
);

index = index.replace(
  '<link rel="stylesheet" href="assets/poxy-landing-page.css?v=2">',
  `<link rel="stylesheet" href="assets/poxy-sky/tokens.css?v=1">
<link rel="stylesheet" href="assets/poxy-sky/components.css?v=1">
<link rel="stylesheet" href="assets/poxy-sky/landing.css?v=1">`
);

index = index.replace(
  '<script src="assets/poxy-landing-page.js?v=2" defer></script>',
  '<script src="assets/poxy-landing-page.js?v=3" defer></script>'
);

fs.writeFileSync(path.join(root, 'index.html'), index);
console.log('Patched index.html landing (Stage 1)');
