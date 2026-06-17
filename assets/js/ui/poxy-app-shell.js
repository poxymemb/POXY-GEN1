/**
 * POXY Sky app shell — left rail + topbar navigation (Stage 3).
 */
(function (global) {
  'use strict';

  var SKY_THEME_KEY = 'poxy-sky-theme';

  var TAB_TO_RAIL = {
    dashboard: 'home',
    open: 'open',
    hunt: 'open',
    store: 'store',
    market: 'market',
    collection: 'collection',
    club: 'community',
    ranks: 'levels',
    tierlist: 'collections',
    rarity: 'collections',
    gens: 'collections',
    profile: 'profile',
    settings: 'settings',
    friends: 'messenger',
    messenger: 'messenger',
    events: 'events',
    quests: 'quests',
    news: 'home',
    verify: 'home',
    whitepaper: 'home',
    telemetry: 'home',
    explore: 'home',
  };

  var RAIL_ACTIONS = {
    home: function () {
      if (global.PoxyHomeSky) global.PoxyHomeSky.showHome();
      else global.showStitchTab('dashboard');
    },
    open: function () {
      if (global.PoxyHomeSky) global.PoxyHomeSky.showOpen();
      else global.showStitchTab('dashboard');
    },
    collection: function () {
      global.showPage('collection');
    },
    market: function () {
      global.showStitchTab('market');
    },
    collections: function () {
      global.showStitchTab('tierlist');
    },
    store: function () {
      global.showStitchTab('store');
    },
    community: function () {
      global.showStitchTab('club');
    },
    messenger: function () {
      global.showStitchTab('messenger');
    },
    events: function () {
      global.showStitchTab('events');
    },
    quests: function () {
      global.showStitchTab('quests');
    },
    levels: function () {
      global.showStitchTab('ranks');
    },
    profile: function () {
      global.showPage('profile');
    },
    settings: function () {
      global._allowSettingsPage = true;
      global.showPage('settings');
    },
  };

  function $(id) {
    return document.getElementById(id);
  }

  function syncRail(active) {
    var tab = active === 'hunt' ? 'dashboard' : active === 'tierlist' ? 'tierlist' : active;
    var railKey = TAB_TO_RAIL[tab] || 'home';
    document.querySelectorAll('#pxSkyRail .rail-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-nav') === railKey);
    });
  }

  function syncGreet() {
    var el = $('pxSkyGreetUser');
    if (!el) return;
    var name =
      (global.currentProfile && global.currentProfile.username) ||
      ($('userUsernameEl') && $('userUsernameEl').textContent) ||
      'Player';
    el.textContent = '@' + String(name).replace(/^@/, '');
  }

  function applyTheme(theme) {
    var t = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    try {
      localStorage.setItem(SKY_THEME_KEY, t);
    } catch (e) {}
    var btn = $('pxSkyThemeBtn');
    if (btn) btn.textContent = t === 'light' ? '◐' : '◑';
  }

  function bindRail() {
    document.querySelectorAll('#pxSkyRail .rail-btn[data-nav]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-nav');
        var fn = RAIL_ACTIONS[key];
        if (fn) fn();
      });
    });
    var logo = $('pxSkyRailLogo');
    if (logo) {
      logo.addEventListener('click', function () {
        RAIL_ACTIONS.home();
      });
    }
  }

  function bindTheme() {
    var btn = $('pxSkyThemeBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var next =
        document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      var landingBtn = $('plThemeBtn');
      if (landingBtn) landingBtn.textContent = next === 'light' ? '◐' : '◑';
      var authBtn = $('authThemeBtn');
      if (authBtn) authBtn.textContent = next === 'light' ? '◐' : '◑';
    });
  }

  function init() {
    bindRail();
    bindTheme();
    syncGreet();
  }

  global.PoxyAppShell = {
    syncRail: syncRail,
    syncGreet: syncGreet,
    applyTheme: applyTheme,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
