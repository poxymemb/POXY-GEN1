/**
 * Stages 5–11 — Sky page heads + navigation chrome for app screens.
 */
(function (global) {
  'use strict';

  var PAGE_HEADS = {
    collection: {
      el: 'collectionPage',
      title: 'Collection',
      subtitle: 'Everything you own, on your shelf.',
    },
    market: { el: 'marketPage', title: 'Market', subtitle: 'Buy, sell, and resell figures with coins.' },
    store: { el: 'storePage', title: 'Store', subtitle: 'Themes, boosters, and coin packs.' },
    settings: {
      el: 'settingsPage',
      title: 'Settings',
      subtitle: 'Your account and everything around it.',
    },
    profile: { el: 'profilePage', title: 'Profile', subtitle: 'Your showcase and stats.' },
  };

  function $(id) {
    return document.getElementById(id);
  }

  function ensureHead(key) {
    var cfg = PAGE_HEADS[key];
    if (!cfg) return;
    var page = $(cfg.el);
    if (!page) return;
    if (page.querySelector('.px-sky-page-head')) return;
    var head = document.createElement('div');
    head.className = 'px-sky-page-head page-head';
    head.innerHTML =
      '<h1>' + cfg.title + '</h1><p>' + cfg.subtitle + '</p>';
    page.insertBefore(head, page.firstChild);
  }

  function onPage(page) {
    if (!document.body.classList.contains('poxy-sky-app-active')) return;
    if (page === 'collection') {
      if (global.PoxyCollectionSky) global.PoxyCollectionSky.onShow();
      else ensureHead('collection');
    }
    if (page === 'settings') {
      if (global.PoxySettingsSky) global.PoxySettingsSky.onShow();
      else ensureHead('settings');
    }
    if (page === 'profile') {
      if (global.PoxyProfileSky) global.PoxyProfileSky.onShow();
      else ensureHead('profile');
    }
  }

  function onTab(tab) {
    if (!document.body.classList.contains('poxy-sky-app-active')) return;
    if (tab === 'market') {
      if (global.PoxyMarketSky) global.PoxyMarketSky.onShow();
      else ensureHead('market');
    }
    if (tab === 'store') {
      if (global.PoxyStoreSky) global.PoxyStoreSky.onShow();
      else ensureHead('store');
    }
    if (tab === 'tierlist' && global.PoxyCollectionsSky) global.PoxyCollectionsSky.onShow();
    if (tab === 'club' && global.PoxyCommunitySky) global.PoxyCommunitySky.onShow();
    if (tab === 'messenger' && global.PoxyMessengerSky) global.PoxyMessengerSky.onShow();
    if (tab === 'events' && global.PoxyEventsSky) global.PoxyEventsSky.onShow();
    if (tab === 'quests' && global.PoxyQuestsSky) global.PoxyQuestsSky.onShow();
    if (tab === 'ranks' && global.PoxyLevelsSky) global.PoxyLevelsSky.onShow();
  }

  function initAll() {
    if (!document.body.classList.contains('poxy-sky-app-active')) return;
    Object.keys(PAGE_HEADS).forEach(function (k) {
      ensureHead(k);
    });
  }

  global.PoxyScreensSky = {
    ensureHead: ensureHead,
    onPage: onPage,
    onTab: onTab,
    initAll: initAll,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})(window);
