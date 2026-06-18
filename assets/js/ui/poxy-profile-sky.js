/**

 * POXY Sky Profile screen (Stage 10).

 */

(function (global) {

  'use strict';



  var COLOR_KEY = 'poxy-sky-profile-color';



  var FREE_COLORS = [

    { id: 'sky', hex: '#60C2E0', label: 'Sky' },

    { id: 'ember', hex: '#E0563A', label: 'Ember' },

    { id: 'royal', hex: '#9B8FE0', label: 'Royal' },

    { id: 'mint', hex: '#7BE0C0', label: 'Mint' },

    { id: 'gold', hex: '#E5C84F', label: 'Gold' },

    { id: 'graphite', hex: '#3A4046', label: 'Graphite' },

  ];



  function $(id) {

    return document.getElementById(id);

  }



  function isSkyProfileVisible() {

    return (

      document.body.classList.contains('poxy-sky-app-active') &&

      $('profilePage') &&

      $('profilePage').classList.contains('visible')

    );

  }



  function ensurePageHead() {

    if (!global.PoxyScreensSky) return;

    global.PoxyScreensSky.ensureHead('profile');

    var head = document.querySelector('#profilePage .px-sky-page-head');

    if (head) {

      var p = head.querySelector('p');

      if (p) {

        p.textContent =

          'How others see you. Personalize it free, or unlock full customization with Plus.';

      }

    }

  }



  function ensureChrome() {

    var page = $('profilePage');

    if (!page || $('pxSkyProfileChrome')) return;

    var chrome = document.createElement('div');

    chrome.id = 'pxSkyProfileChrome';

    chrome.className = 'px-sky-profile-chrome';

    chrome.innerHTML =

      '<div class="prof-banner" id="pxSkyProfBanner"><button type="button" class="prof-edit" id="pxSkyProfEditBanner">Edit banner</button></div>' +

      '<div class="prof-card">' +

      '<div class="prof-av" id="pxSkyProfAv">Y</div>' +

      '<div class="prof-name" id="pxSkyProfName">Your Name</div>' +

      '<div class="prof-handle" id="pxSkyProfHandle">@yourname · Level 1</div>' +

      '<div class="prof-stats">' +

      '<div class="prof-stat"><div class="v" id="pxSkyProfFigures">0</div><div class="l">Figures</div></div>' +

      '<div class="prof-stat"><div class="v" id="pxSkyProfSeasons">0</div><div class="l">Seasons</div></div>' +

      '<div class="prof-stat"><div class="v" id="pxSkyProfComplete">0%</div><div class="l">Complete</div></div>' +

      '</div></div>' +

      '<div class="prof-section"><h3>Profile colour · free</h3><div class="pthemes" id="pxSkyProfThemes"></div></div>' +

      '<div class="prof-section"><h3>Full customization</h3>' +

      '<div class="pro-lock">' +

      '<span class="pl-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span>' +

      '<div class="pl-txt"><div class="t">Unlock with POXY Plus</div><div class="d">Image or GIF banner, animated avatar, profile music, and full colour control.</div></div>' +

      '<button type="button" class="btn btn-primary" id="pxSkyProfPlusBtn">See Plus</button>' +

      '</div></div>';

    var shell = page.querySelector('.idhub-shell');

    if (shell) page.insertBefore(chrome, shell);

    else page.appendChild(chrome);



    $('pxSkyProfEditBanner').addEventListener('click', function () {

      if (typeof global.openProfileSettings === 'function') global.openProfileSettings();

    });

    $('pxSkyProfPlusBtn').addEventListener('click', function () {

      if (typeof global.showStitchTab === 'function') global.showStitchTab('store');

      if (typeof global.switchStoreCategory === 'function') global.switchStoreCategory('vip');

    });



    var themes = $('pxSkyProfThemes');

    FREE_COLORS.forEach(function (c) {

      var btn = document.createElement('button');

      btn.type = 'button';

      btn.className = 'ptheme';

      btn.style.setProperty('--pc', c.hex);

      btn.dataset.color = c.hex;

      btn.title = c.label;

      btn.addEventListener('click', function () {

        applyProfileColor(c.hex);

        document.querySelectorAll('#pxSkyProfThemes .ptheme').forEach(function (el) {

          el.classList.toggle('sel', el.dataset.color === c.hex);

        });

      });

      themes.appendChild(btn);

    });

  }



  function applyProfileColor(hex) {

    var banner = $('pxSkyProfBanner');

    var av = $('pxSkyProfAv');

    if (banner) {

      banner.style.setProperty('--pc', hex);

      banner.style.background =

        'linear-gradient(135deg,' + hex + ',color-mix(in srgb,' + hex + ' 40%,#1c2a30))';

    }

    if (av) av.style.setProperty('--pc', hex);

    try {

      localStorage.setItem(COLOR_KEY, hex);

    } catch (e) {}

  }



  function loadSavedColor() {

    var hex = '#60C2E0';

    try {

      hex = localStorage.getItem(COLOR_KEY) || hex;

    } catch (e) {}

    applyProfileColor(hex);

    document.querySelectorAll('#pxSkyProfThemes .ptheme').forEach(function (el) {

      el.classList.toggle('sel', el.dataset.color === hex);

    });

  }



  function syncChrome() {

    if (!isSkyProfileVisible()) return;

    var name = $('profileDisplayName');

    var handle = $('profileDisplayHandle');

    var bigAv = $('profileBigAvatar');

    if ($('pxSkyProfName') && name) {

      $('pxSkyProfName').textContent = name.textContent || 'Your Name';

    }

    if ($('pxSkyProfHandle')) {

      var h = handle ? handle.textContent : '@yourname';

      var figText = $('statTotal') ? $('statTotal').textContent : '0';

      var figNum = parseInt(String(figText).replace(/,/g, ''), 10) || 0;

      $('pxSkyProfHandle').textContent = h + ' · Level ' + (figNum > 0 ? '1' : '0');

    }

    if ($('pxSkyProfAv') && bigAv) {

      $('pxSkyProfAv').innerHTML = bigAv.innerHTML;

    }

    var figures = $('statTotal');

    if ($('pxSkyProfFigures') && figures) {

      $('pxSkyProfFigures').textContent = figures.textContent || '0';

    }

    var seasons = 0;

    var figText2 = $('statTotal') ? $('statTotal').textContent : '0';

    if ((parseInt(String(figText2).replace(/,/g, ''), 10) || 0) > 0) seasons = 1;

    if ($('pxSkyProfSeasons')) $('pxSkyProfSeasons').textContent = String(seasons);

    var ms = $('milestonesCount');

    if ($('pxSkyProfComplete') && ms && ms.textContent) {

      var m = ms.textContent.match(/(\d+)\s*\/\s*(\d+)/);

      if (m) {

        var pct = Math.round((Number(m[1]) / Number(m[2])) * 100);

        $('pxSkyProfComplete').textContent = pct + '%';

      }

    }

    loadSavedColor();

  }



  function wrapRenderProfilePage() {

    if (wrapRenderProfilePage.done || typeof global.renderProfilePage !== 'function') return;

    var orig = global.renderProfilePage;

    global.renderProfilePage = function () {

      orig();

      syncChrome();

    };

    wrapRenderProfilePage.done = true;

  }



  function wrapRenderProfileStats() {

    if (wrapRenderProfileStats.done || typeof global.renderProfileStats !== 'function') return;

    var orig = global.renderProfileStats;

    global.renderProfileStats = async function () {

      await orig();

      syncChrome();

    };

    wrapRenderProfileStats.done = true;

  }



  function wrapRenderMilestones() {

    if (wrapRenderMilestones.done || typeof global.renderMilestones !== 'function') return;

    var orig = global.renderMilestones;

    global.renderMilestones = async function () {

      await orig();

      syncChrome();

    };

    wrapRenderMilestones.done = true;

  }



  function prepProfilePanel() {

    if (typeof global.hideHuntPageShell === 'function') global.hideHuntPageShell();

    var main = $('pxSkyMain');

    if (main) main.scrollTop = 0;

    try {

      window.scrollTo(0, 0);

    } catch (e) {}

  }



  function onShow() {

    if (!document.body.classList.contains('poxy-sky-app-active')) return;

    prepProfilePanel();

    ensurePageHead();

    ensureChrome();

    wrapRenderProfilePage();

    wrapRenderProfileStats();

    wrapRenderMilestones();

    syncChrome();

  }



  global.PoxyProfileSky = {

    onShow: onShow,

    syncChrome: syncChrome,

    applyProfileColor: applyProfileColor,

  };



  if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', function () {

      wrapRenderProfilePage();

      wrapRenderProfileStats();

      wrapRenderMilestones();

    });

  } else {

    wrapRenderProfilePage();

    wrapRenderProfileStats();

    wrapRenderMilestones();

  }

})(window);

