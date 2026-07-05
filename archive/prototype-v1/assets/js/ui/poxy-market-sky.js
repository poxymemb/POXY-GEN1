/**
 * POXY Sky Market screen (Stage 6 / Phase A-functional).
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

  var RARITY_CHIPS = [
    { id: 'all', label: 'All tiers', rarity: 'all' },
    { id: 'legendary', label: 'Legendary', rarity: 'legendary' },
    { id: 'epic', label: 'Epic', rarity: 'epic' },
    { id: 'rare', label: 'Rare', rarity: 'rare' },
    { id: 'common', label: 'Common', rarity: 'common' },
  ];

  var SKY_RAR_COLOR = {
    common: '#8A8F98',
    uncommon: '#8A8F98',
    rare: '#60C2E0',
    epic: '#456DB0',
    legendary: '#E0A23C',
    mythic: '#D9744F',
    obsidian: '#8A8F98',
    cursed: '#456DB0',
    souvenir: '#60C2E0',
    stellar: '#60C2E0',
    diamond: '#60C2E0',
    secret: '#D9744F',
  };

  var FROG_BY_TIER = {
    common: { c1: '#6FD66F', c2: '#3AA83A' },
    uncommon: { c1: '#7BE0C0', c2: '#3AA888' },
    rare: { c1: '#8FD7E5', c2: '#46A8C0' },
    epic: { c1: '#9B8FE0', c2: '#5B4FB0' },
    legendary: { c1: '#7BE0A0', c2: '#3AA85F' },
    mythic: { c1: '#E58F6F', c2: '#C0552F' },
    obsidian: { c1: '#556872', c2: '#37474F' },
    cursed: { c1: '#9B8FE0', c2: '#7E57C2' },
    souvenir: { c1: '#5ec4b8', c2: '#26A69A' },
    stellar: { c1: '#6eb8f5', c2: '#42A5F5' },
    diamond: { c1: '#a8eef5', c2: '#80DEEA' },
    secret: { c1: '#ff9a7a', c2: '#FF6E40' },
  };

  var _skyMarketCtx = null;

  function $(id) {
    return document.getElementById(id);
  }

  function isSkyMarketVisible() {
    return (
      document.body.classList.contains('poxy-sky-app-active') &&
      $('stPanelMarket') &&
      !$('stPanelMarket').hidden
    );
  }

  function tierFromId(id) {
    return (global.TIER_BY_ID && global.TIER_BY_ID[id]) || (global.TIERS && global.TIERS[0]) || { id: 'common', label: 'Common', color: '#8A8F98' };
  }

  function tierRarColor(tier) {
    if (!tier || !tier.id) return '#60C2E0';
    return SKY_RAR_COLOR[tier.id] || tier.color || '#60C2E0';
  }

  function frogHTML(c1, c2) {
    return (
      '<div class="frog px-sky-mkt-frog" style="--c1:' +
      c1 +
      ';--c2:' +
      c2 +
      ';--belly:#c0344d"><div class="fb"></div><div class="fe l"></div><div class="fe r"></div><div class="fm"></div></div>'
    );
  }

  function renderFrogForTier(tier) {
    var pal = FROG_BY_TIER[tier.id] || { c1: tier.color || '#60C2E0', c2: tier.color || '#40ABCC' };
    return frogHTML(pal.c1, pal.c2);
  }

  function formatCoinPrice(amount) {
    if (typeof global.formatCoinBalance === 'function') return global.formatCoinBalance(amount);
    var n = parseInt(amount, 10);
    if (isNaN(n)) return '0';
    return String(n);
  }

  function prepMarketPanel() {
    if (typeof global.mountSpaPanels === 'function') global.mountSpaPanels();
    var main = $('pxSkyMain');
    if (main) main.scrollTop = 0;
    if (typeof global.showHuntPageShell === 'function') global.showHuntPageShell();
  }

  function ensureSortChips() {
    var toolbar = $('marketToolbar');
    if (!toolbar || $('pxSkyMarketSortChips')) return;
    var sortEl = $('marketSort');
    var sortWrap = sortEl && sortEl.closest ? sortEl.closest('.poxy-market-field') : null;
    if (sortWrap) sortWrap.classList.add('poxy-market-field--sort-native');
    var rarityEl = $('marketRarityFilter');
    var rarityWrap = rarityEl && rarityEl.closest ? rarityEl.closest('.poxy-market-field') : null;
    if (rarityWrap) rarityWrap.classList.add('poxy-market-field--rarity-native');
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
      }
      btn.addEventListener('click', function () {
        if (chip.stub) return;
        applySortChip(chip);
      });
      row.appendChild(btn);
    });
    toolbar.insertBefore(row, toolbar.firstChild);
  }

  function ensureRarityChips() {
    var toolbar = $('marketToolbar');
    if (!toolbar || $('pxSkyMarketRarityChips')) return;
    var row = document.createElement('div');
    row.id = 'pxSkyMarketRarityChips';
    row.className = 'px-sky-market-rarity-chips';
    RARITY_CHIPS.forEach(function (chip) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-sky-market-chip px-sky-market-rarity-chip chip-filter';
      btn.dataset.rarity = chip.rarity;
      btn.textContent = chip.label;
      btn.addEventListener('click', function () {
        applyRarityChip(chip);
      });
      row.appendChild(btn);
    });
    var sortRow = $('pxSkyMarketSortChips');
    if (sortRow && sortRow.nextSibling) toolbar.insertBefore(row, sortRow.nextSibling);
    else toolbar.appendChild(row);
  }

  function ensureSellButton() {
    var toolbar = $('marketToolbar');
    if (!toolbar || $('pxSkyMarketSellBtn')) return;
    var spacer = document.createElement('div');
    spacer.className = 'tb-spacer px-sky-market-tb-spacer';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary px-sky-market-sell-btn';
    btn.id = 'pxSkyMarketSellBtn';
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18M9 3 7 9l5 12 5-12-2-6"/></svg> Sell a figure';
    btn.addEventListener('click', function () {
      if (typeof global.showPage === 'function') {
        global.showPage('collection');
        if (typeof global.showToast === 'function') {
          global.showToast('Tap a figure, then choose Sell on market.');
        }
      }
    });
    toolbar.appendChild(spacer);
    toolbar.appendChild(btn);
  }

  function syncSortChipUi() {
    var sort = $('marketSort');
    var val = sort ? sort.value : global.marketSort || 'newest';
    var rarity = $('marketRarityFilter');
    var rarityVal = rarity ? rarity.value : global.marketRarityFilter || 'all';
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
    document.querySelectorAll('#pxSkyMarketRarityChips .px-sky-market-rarity-chip').forEach(function (btn) {
      btn.classList.toggle('on', btn.dataset.rarity === rarityVal);
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

  function applyRarityChip(chip) {
    var rarity = $('marketRarityFilter');
    if (rarity) {
      rarity.value = chip.rarity;
      if (typeof global.onMarketRarityChange === 'function') global.onMarketRarityChange();
    } else {
      global.marketRarityFilter = chip.rarity;
      if (typeof global.loadMarket === 'function') global.loadMarket();
    }
    syncSortChipUi();
  }

  function ensureMarketFigureModal() {
    if ($('pxSkyMarketFigureModal')) return;
    var el = document.createElement('div');
    el.id = 'pxSkyMarketFigureModal';
    el.className = 'modal px-sky-market-figure-modal';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Market listing');
    el.innerHTML =
      '<div class="modal-card" id="pxSkyMarketFigureCard">' +
      '<div class="modal-frame" id="pxSkyMarketFigureFrame"><div id="pxSkyMarketFigureArt"></div></div>' +
      '<div class="modal-body">' +
      '<h3 id="pxSkyMarketFigureTitle">POXY</h3>' +
      '<div class="mrar" id="pxSkyMarketFigureRar">Rare</div>' +
      '<div class="modal-passport">' +
      '<div class="mp-row"><span class="k">Serial</span><span class="v" id="pxSkyMarketFigureSerial">—</span></div>' +
      '<div class="mp-row"><span class="k">Edition</span><span class="v" id="pxSkyMarketFigureEdition">—</span></div>' +
      '<div class="mp-row"><span class="k">Season</span><span class="v" id="pxSkyMarketFigureSeason">01</span></div>' +
      '<div class="mp-row" id="pxSkyMarketFigurePriceRow"><span class="k">Market price</span><span class="v" id="pxSkyMarketFigurePrice">—</span></div>' +
      '<div class="mp-row px-sky-mkt-status-row" id="pxSkyMarketFigureStatusRow" hidden><span class="k">Status</span><span class="v" id="pxSkyMarketFigureStatus">—</span></div>' +
      '</div>' +
      '<div class="modal-actions">' +
      '<button type="button" class="btn btn-primary" id="pxSkyMarketFigurePrimary">Buy</button>' +
      '<button type="button" class="btn btn-glass" id="pxSkyMarketFigureClose">Close</button>' +
      '</div></div></div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      if (e.target === el) closeSkyMarketModal();
    });
    $('pxSkyMarketFigureClose').addEventListener('click', closeSkyMarketModal);
    $('pxSkyMarketFigurePrimary').addEventListener('click', onSkyMarketPrimary);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && el.classList.contains('open')) closeSkyMarketModal();
    });
  }

  function openSkyMarketModal(item, opts, meta) {
    if (!item || !opts) return;
    ensureMarketFigureModal();
    _skyMarketCtx = { item: item, opts: opts, meta: meta || {} };
    var tier = meta.tier || tierFromId(item.user_poxy && item.user_poxy.poxy_tier);
    var rc = meta.rc || tierRarColor(tier);
    var poxy = global.PoxyPassportSky
      ? global.PoxyPassportSky.normalizeFromMarket(item)
      : item.user_poxy || item;
    var frame = $('pxSkyMarketFigureFrame');
    var art = $('pxSkyMarketFigureArt');
    var title = $('pxSkyMarketFigureTitle');
    var rar = $('pxSkyMarketFigureRar');
    var serial = $('pxSkyMarketFigureSerial');
    var edition = $('pxSkyMarketFigureEdition');
    var season = $('pxSkyMarketFigureSeason');
    var priceRow = $('pxSkyMarketFigurePriceRow');
    var price = $('pxSkyMarketFigurePrice');
    var statusRow = $('pxSkyMarketFigureStatusRow');
    var status = $('pxSkyMarketFigureStatus');
    var primary = $('pxSkyMarketFigurePrimary');
    var priceText = meta.priceText || formatCoinPrice(item.price);
    var passport = global.PoxyPassportSky;

    if (frame) frame.style.setProperty('--mr', rc);
    if (art) art.innerHTML = renderFrogForTier(tier);
    if (title) {
      title.textContent = passport
        ? passport.figureTitle(poxy, tier)
        : meta.name || 'POXY';
    }
    if (rar) {
      rar.textContent = tier.label;
      rar.style.color = rc;
    }
    if (serial) serial.textContent = passport ? passport.passportSerial(poxy) : '—';
    if (edition) edition.textContent = passport ? passport.passportEdition(poxy, tier) : '—';
    if (season) season.textContent = passport ? passport.passportSeason(poxy) : '01';
    if (price) price.innerHTML = COIN_SVG + priceText;
    if (priceRow) priceRow.hidden = global.marketTab === 'sell' && !item.price;
    if (statusRow && status) {
      var showStatus = global.marketTab === 'sell' && !!opts.statusLabel;
      statusRow.hidden = !showStatus;
      if (showStatus) status.textContent = opts.statusLabel;
    }
    if (primary) {
      if (global.marketTab === 'sell' && opts.onCancel && item.status === 'active') {
        primary.textContent = 'Cancel listing';
        primary.hidden = false;
      } else if (opts.onQuickBuy || opts.onDetails) {
        primary.textContent = 'Buy for ' + priceText;
        primary.hidden = false;
        primary.disabled = false;
      } else {
        primary.hidden = true;
      }
    }
    $('pxSkyMarketFigureModal').classList.add('open');
    document.body.classList.add('px-sky-market-modal-open');
  }

  function closeSkyMarketModal() {
    var modal = $('pxSkyMarketFigureModal');
    if (modal) modal.classList.remove('open');
    document.body.classList.remove('px-sky-market-modal-open');
    _skyMarketCtx = null;
  }

  function onSkyMarketPrimary() {
    var ctx = _skyMarketCtx;
    if (!ctx) return;
    closeSkyMarketModal();
    if (global.marketTab === 'sell' && ctx.opts.onCancel) {
      ctx.opts.onCancel();
      return;
    }
    if (ctx.opts.onDetails) {
      ctx.opts.onDetails();
      return;
    }
    if (ctx.opts.onQuickBuy) ctx.opts.onQuickBuy(null);
  }

  function reskinMarketCard(card) {
    if (!isSkyMarketVisible() || card.dataset.skyReskin === '1') return;
    var item = card._skyMarketItem;
    var opts = card._skyMarketOpts || {};
    if (!item) return;

    var tier = tierFromId(card.dataset.tier || (item.user_poxy && item.user_poxy.poxy_tier));
    var rc = tierRarColor(tier);
    var serialEl = card.querySelector('.poxy-market-card-serial');
    var priceEl = card.querySelector('.poxy-market-card-price');
    var name = serialEl ? serialEl.textContent.trim() : 'POXY';
    var priceText = formatCoinPrice(item.price);

    card.style.setProperty('--ring', rc);
    card.classList.add('px-sky-mkt-card', 'cards-cell');

    var frame = document.createElement('div');
    frame.className = 'cell-frame';
    frame.innerHTML = renderFrogForTier(tier);

    var meta = document.createElement('div');
    meta.className = 'cell-meta';
    meta.innerHTML =
      '<div class="cell-name"></div>' +
      '<div class="cell-row">' +
      '<span class="cell-rar"></span>' +
      '<span class="cell-price"></span>' +
      '</div>';
    meta.querySelector('.cell-name').textContent = name;
    var rarEl = meta.querySelector('.cell-rar');
    rarEl.textContent = tier.label;
    rarEl.style.color = rc;
    meta.querySelector('.cell-price').innerHTML = COIN_SVG + priceText;

    var stash = document.createElement('div');
    stash.className = 'px-sky-mkt-stash';
    stash.hidden = true;
    while (card.firstChild) stash.appendChild(card.firstChild);

    card.appendChild(frame);
    card.appendChild(meta);
    card.appendChild(stash);
    card.dataset.skyReskin = '1';

    card.addEventListener('click', function (e) {
      if (!isSkyMarketVisible()) return;
      e.preventDefault();
      e.stopPropagation();
      openSkyMarketModal(item, opts, { name: name, tier: tier, priceText: priceText, rc: rc });
    });
  }

  function reskinMarketCards() {
    if (!isSkyMarketVisible()) return;
    document.querySelectorAll('#marketContent .poxy-market-card').forEach(reskinMarketCard);
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

  function wrapBuildMarketCard() {
    if (wrapBuildMarketCard.done || typeof global.buildMarketCard !== 'function') return;
    var orig = global.buildMarketCard;
    global.buildMarketCard = function (item, opts) {
      var card = orig(item, opts);
      if (document.body.classList.contains('poxy-sky-app-active')) {
        card._skyMarketItem = item;
        card._skyMarketOpts = opts || {};
      }
      return card;
    };
    wrapBuildMarketCard.done = true;
  }

  function wrapLoadMarket() {
    if (wrapLoadMarket.done || typeof global.loadMarket !== 'function') return;
    var orig = global.loadMarket;
    global.loadMarket = async function () {
      await orig.apply(this, arguments);
      syncSortChipUi();
      relabelMarketPrices();
      reskinMarketCards();
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
      reskinMarketCards();
    };
    wrapSwitchMarketTab.done = true;
  }

  function onShow() {
    if (!document.body.classList.contains('poxy-sky-app-active')) return;
    prepMarketPanel();
    if (global.PoxyScreensSky) global.PoxyScreensSky.ensureHead('market');
    wrapBuildMarketCard();
    wrapLoadMarket();
    wrapSwitchMarketTab();
    ensureSortChips();
    ensureRarityChips();
    ensureSellButton();
    if (typeof global.initMarketFilters === 'function') global.initMarketFilters();
    syncSortChipUi();
    relabelMarketPrices();
    reskinMarketCards();
  }

  global.PoxyMarketSky = {
    onShow: onShow,
    onHide: closeSkyMarketModal,
    relabelMarketPrices: relabelMarketPrices,
    syncSortChipUi: syncSortChipUi,
    reskinMarketCards: reskinMarketCards,
    openSkyMarketModal: openSkyMarketModal,
    closeSkyMarketModal: closeSkyMarketModal,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      wrapBuildMarketCard();
      wrapLoadMarket();
      wrapSwitchMarketTab();
    });
  } else {
    wrapBuildMarketCard();
    wrapLoadMarket();
    wrapSwitchMarketTab();
  }
})(window);
