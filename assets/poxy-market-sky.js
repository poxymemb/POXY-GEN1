/**
 * POXY Sky Market screen (Stage 6).
 */
(function (global) {
  'use strict';

  var COIN_SVG =
    '<span class="coin-sm" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="20" fill="url(#pxMktCoinGrad)"/><circle cx="24" cy="24" r="20" stroke="#8BE3FF" stroke-width="2.5"/><circle cx="24" cy="24" r="14" stroke="#0E3A48" stroke-width="2" stroke-opacity="0.45"/><path d="M24 14 L24 34 M18.5 19 Q24 14.5 29.5 19 M18.5 29 Q24 33.5 29.5 29" stroke="#0E3A48" stroke-width="3" stroke-linecap="round" stroke-opacity="0.8"/><defs><radialGradient id="pxMktCoinGrad" cx="0.4" cy="0.32" r="0.85"><stop offset="0" stop-color="#A6E9FF"/><stop offset="0.55" stop-color="#60C2E0"/><stop offset="1" stop-color="#2E9CC0"/></radialGradient></defs></svg></span>';

  var SORT_CHIPS = [
    { id: 'all', label: 'All', sort: 'newest', rarity: 'all' },
    { id: 'trending', label: 'Trending', sort: 'newest', stub: true },
    { id: 'new', label: 'New listings', sort: 'newest' },
    { id: 'asc', label: 'Price ↑', sort: 'price_asc' },
    { id: 'desc', label: 'Price ↓', sort: 'price_desc' },
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function isSkyMarketVisible() {
    return (
      document.body.classList.contains('poxy-sky-app-active') &&
      ($('stPanelMarket') && !$('stPanelMarket').hidden)
    );
  }

  function ensureSortChips() {
    var toolbar = $('marketToolbar');
    if (!toolbar || $('pxSkyMarketSortChips')) return;
    var sortEl = $('marketSort');
    var sortWrap = sortEl && sortEl.closest ? sortEl.closest('.poxy-market-field') : null;
    if (sortWrap) sortWrap.classList.add('poxy-market-field--sort-native');
    var row = document.createElement('div');
    row.id = 'pxSkyMarketSortChips';
    row.className = 'px-sky-market-sort-chips';
    SORT_CHIPS.forEach(function (chip) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-sky-market-chip chip-filter';
      btn.dataset.chip = chip.id;
      btn.textContent = chip.label;
      if (chip.stub) {
        btn.disabled = true;
        btn.title = 'Coming soon';
        // TODO Stage 6: trending filter stub — no backend sort yet
      }
      btn.addEventListener('click', function () {
        if (chip.stub) return;
        applySortChip(chip);
      });
      row.appendChild(btn);
    });
    toolbar.insertBefore(row, toolbar.firstChild);
  }

  function ensureSellButton() {
    var toolbar = $('marketToolbar');
    if (!toolbar || $('pxSkyMarketSellBtn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary';
    btn.id = 'pxSkyMarketSellBtn';
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18M9 3 7 9l5 12 5-12-2-6"/></svg> Sell a figure';
    btn.addEventListener('click', function () {
      if (typeof global.showPage === 'function') global.showPage('collection');
    });
    toolbar.appendChild(btn);
  }

  function syncSortChipUi() {
    var sort = $('marketSort');
    var val = sort ? sort.value : global.marketSort || 'newest';
    var rarity = $('marketRarityFilter');
    var rarityVal = rarity ? rarity.value : 'all';
    document.querySelectorAll('#pxSkyMarketSortChips .px-sky-market-chip').forEach(function (btn) {
      var chip = SORT_CHIPS.find(function (c) {
        return c.id === btn.dataset.chip;
      });
      if (!chip || chip.stub) {
        btn.classList.remove('on');
        return;
      }
      var on =
        chip.id === 'all'
          ? val === 'newest' && rarityVal === 'all'
          : chip.sort === val && (chip.rarity ? rarityVal === chip.rarity : true);
      btn.classList.toggle('on', on);
    });
  }

  function applySortChip(chip) {
    var sort = $('marketSort');
    var rarity = $('marketRarityFilter');
    if (chip.rarity && rarity) {
      rarity.value = chip.rarity;
      if (typeof global.onMarketRarityChange === 'function') global.onMarketRarityChange();
    } else if (chip.id === 'all' && rarity) {
      rarity.value = 'all';
      if (typeof global.onMarketRarityChange === 'function') global.onMarketRarityChange();
    }
    if (sort) {
      sort.value = chip.sort;
      if (typeof global.onMarketSortChange === 'function') global.onMarketSortChange();
    } else {
      global.marketSort = chip.sort;
      if (typeof global.loadMarket === 'function') global.loadMarket();
    }
    syncSortChipUi();
  }

  function relabelMarketPrices() {
    if (!isSkyMarketVisible()) return;
    document.querySelectorAll('#marketContent .poxy-market-card-price').forEach(function (el) {
      var text = (el.textContent || '').replace(/\s*PX\s*$/i, '').trim();
      if (!text) return;
      el.innerHTML = COIN_SVG + text;
    });
    var buy = $('mTabBuy');
    var sell = $('mTabSell');
    if (buy && buy.textContent === 'Buy') buy.textContent = 'Browse';
    if (sell && sell.textContent === 'My Listings') sell.textContent = 'My listings';
  }

  function wrapLoadMarket() {
    if (wrapLoadMarket.done || typeof global.loadMarket !== 'function') return;
    var orig = global.loadMarket;
    global.loadMarket = async function () {
      await orig.apply(this, arguments);
      syncSortChipUi();
      relabelMarketPrices();
    };
    wrapLoadMarket.done = true;
  }

  function wrapSwitchMarketTab() {
    if (wrapSwitchMarketTab.done || typeof global.switchMarketTab !== 'function') return;
    var orig = global.switchMarketTab;
    global.switchMarketTab = function (tab) {
      orig(tab);
      syncSortChipUi();
      relabelMarketPrices();
    };
    wrapSwitchMarketTab.done = true;
  }

  function onShow() {
    if (!document.body.classList.contains('poxy-sky-app-active')) return;
    if (global.PoxyScreensSky) global.PoxyScreensSky.ensureHead('market');
    wrapLoadMarket();
    wrapSwitchMarketTab();
    ensureSortChips();
    ensureSellButton();
    syncSortChipUi();
    relabelMarketPrices();
  }

  global.PoxyMarketSky = {
    onShow: onShow,
    relabelMarketPrices: relabelMarketPrices,
    syncSortChipUi: syncSortChipUi,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      wrapLoadMarket();
      wrapSwitchMarketTab();
    });
  } else {
    wrapLoadMarket();
    wrapSwitchMarketTab();
  }
})(window);
