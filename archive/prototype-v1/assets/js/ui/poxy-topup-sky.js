/**
 * POXY Sky top-up modal — relabel legacy Treasury UI without touching payment hooks.
 */
(function (global) {
  'use strict';

  var COIN_SVG =
    '<span class="coin-sm" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="20" fill="url(#pxTopupCoinGrad)"/><circle cx="24" cy="24" r="20" stroke="#8BE3FF" stroke-width="2.5"/><circle cx="24" cy="24" r="14" stroke="#0E3A48" stroke-width="2" stroke-opacity="0.45"/><path d="M24 14 L24 34 M18.5 19 Q24 14.5 29.5 19 M18.5 29 Q24 33.5 29.5 29" stroke="#0E3A48" stroke-width="3" stroke-linecap="round" stroke-opacity="0.8"/><defs><radialGradient id="pxTopupCoinGrad" cx="0.4" cy="0.32" r="0.85"><stop offset="0" stop-color="#A6E9FF"/><stop offset="0.55" stop-color="#60C2E0"/><stop offset="1" stop-color="#2E9CC0"/></radialGradient></defs></svg></span>';

  var GIFT_AMOUNTS = [100, 250, 500, 1000];

  function $(id) {
    return document.getElementById(id);
  }

  function isSky() {
    return document.body.classList.contains('poxy-sky-app-active');
  }

  function ensureSkyHead() {
    var right = document.querySelector('#topUpModal .tum-right');
    if (!right || right.querySelector('.px-sky-topup-head')) return;
    var head = document.createElement('div');
    head.className = 'px-sky-topup-head';
    head.innerHTML =
      '<h2>Coins</h2>' +
      '<p class="px-sky-topup-bal">Balance: <strong id="pxSkyTopupBal">0</strong></p>';
    right.insertBefore(head, right.firstChild);
  }

  function ensureSkyTabs() {
    var right = document.querySelector('#topUpModal .tum-right');
    if (!right || right.querySelector('.px-sky-topup-tabs')) return;

    var head = right.querySelector('.px-sky-topup-head');
    var topupPanel = document.createElement('div');
    topupPanel.id = 'pxSkyTopupPanel';
    topupPanel.className = 'px-sky-topup-panel';

    var node = head ? head.nextSibling : right.firstChild;
    while (node) {
      var next = node.nextSibling;
      if (node.nodeType === 1 && !node.classList.contains('px-sky-topup-tabs')) {
        topupPanel.appendChild(node);
      }
      node = next;
    }

    var tabs = document.createElement('div');
    tabs.className = 'px-sky-topup-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.innerHTML =
      '<button type="button" class="px-sky-topup-tab on" data-px-topup-tab="topup" role="tab" aria-selected="true">Top up</button>' +
      '<button type="button" class="px-sky-topup-tab" data-px-topup-tab="gift" role="tab" aria-selected="false">Gift</button>';

    var giftPanel = document.createElement('div');
    giftPanel.id = 'pxSkyGiftPanel';
    giftPanel.className = 'px-sky-gift-panel';
    giftPanel.hidden = true;
    giftPanel.setAttribute('role', 'tabpanel');
    giftPanel.innerHTML =
      '<div class="px-sky-gift-field"><label for="pxSkyGiftUser">Send to</label>' +
      '<input class="px-sky-gift-input" id="pxSkyGiftUser" type="text" placeholder="@username" autocomplete="off"></div>' +
      '<div class="px-sky-gift-field"><label>Amount</label>' +
      '<div class="px-sky-gift-amts" id="pxSkyGiftAmts">' +
      GIFT_AMOUNTS.map(function (n, i) {
        return (
          '<button type="button" class="px-sky-gift-amt' +
          (i === 0 ? ' sel' : '') +
          '" data-amt="' +
          n +
          '">' +
          COIN_SVG +
          Number(n).toLocaleString() +
          '</button>'
        );
      }).join('') +
      '</div></div>' +
      '<button type="button" class="px-sky-gift-send" id="pxSkyGiftSend">Send gift</button>' +
      '<p class="px-sky-gift-note">Gifts arrive instantly. The recipient gets a notification.</p>';

    if (head) {
      head.after(tabs);
      tabs.after(topupPanel);
      topupPanel.after(giftPanel);
    } else {
      right.prepend(giftPanel);
      right.prepend(topupPanel);
      right.prepend(tabs);
    }

    tabs.querySelectorAll('.px-sky-topup-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setTopupTab(btn.getAttribute('data-px-topup-tab') || 'topup');
      });
    });

    giftPanel.querySelectorAll('.px-sky-gift-amt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        giftPanel.querySelectorAll('.px-sky-gift-amt').forEach(function (b) {
          b.classList.remove('sel');
        });
        btn.classList.add('sel');
      });
    });

    var sendBtn = $('pxSkyGiftSend');
    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        var user = ($('pxSkyGiftUser') && $('pxSkyGiftUser').value.trim()) || '';
        var sel = giftPanel.querySelector('.px-sky-gift-amt.sel');
        var amt = sel ? sel.getAttribute('data-amt') : '100';
        if (!user) {
          if (typeof global.showToast === 'function') {
            global.showToast('Enter a username to send a gift.');
          }
          return;
        }
        if (typeof global.showToast === 'function') {
          global.showToast(
            'Gift of ' + Number(amt).toLocaleString() + ' coins to ' + user + ' is coming soon.'
          );
        }
      });
    }
  }

  function setTopupTab(tab) {
    var topup = $('pxSkyTopupPanel');
    var gift = $('pxSkyGiftPanel');
    document.querySelectorAll('.px-sky-topup-tab').forEach(function (btn) {
      var on = btn.getAttribute('data-px-topup-tab') === tab;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (topup) topup.hidden = tab !== 'topup';
    if (gift) gift.hidden = tab !== 'gift';
  }

  function syncSkyBalance() {
    var pxBal = typeof global.getPxBalance === 'function' ? global.getPxBalance() : 0;
    var bal = $('pxSkyTopupBal');
    if (bal) {
      bal.textContent =
        typeof global.formatCoinBalance === 'function'
          ? global.formatCoinBalance(pxBal)
          : String(pxBal);
    }
  }

  function applySkyTopupLabels() {
    if (!isSky()) return;
    ensureSkyHead();
    ensureSkyTabs();
    syncSkyBalance();

    var title = document.querySelector('#topUpModal .tum-title');
    if (title) title.textContent = 'Coins';

    var eyebrow = document.querySelector('#topUpModal .tum-eyebrow');
    if (eyebrow) eyebrow.textContent = 'POXY WORLD';

    document.querySelectorAll('#topUpModal .tum-section-label').forEach(function (el) {
      var t = (el.textContent || '').trim().toUpperCase();
      if (t === 'PX PACKAGES') el.textContent = 'Coin packs';
      if (t === 'CUSTOM GBP') el.textContent = 'Custom amount';
      if (t === 'PAYMENT METHOD') el.textContent = 'Payment method';
    });

    document.querySelectorAll('#topUpModal .tum-field-label').forEach(function (el) {
      var t = (el.textContent || '').trim().toUpperCase();
      if (t === 'CARD NUMBER') el.textContent = 'Card number';
      if (t === 'EXPIRY') el.textContent = 'Expiry';
      if (t === 'CVV') el.textContent = 'CVV';
    });

    var pathA = document.querySelector('#topUpModal .tum-path-a');
    if (pathA && pathA.textContent.indexOf('Standard Case') !== -1) {
      pathA.innerHTML =
        '<span class="material-symbols-outlined">lock_open</span> Open 1 standard box — £2.50';
    }

    var cta = $('btnPayCard');
    if (cta && !cta.dataset.skyLabel) {
      cta.dataset.skyLabel = '1';
      cta.innerHTML = '<span class="material-symbols-outlined">lock</span> Pay with card';
    }

    var legal = document.querySelector('#topUpModal .tum-legal');
    if (legal) {
      legal.textContent =
        'Pay securely with card. Coins are added instantly in test mode.';
    }

    var refEyebrow = document.querySelector('#topUpModal .tum-ref-eyebrow');
    if (refEyebrow) refEyebrow.textContent = 'Referral link';

    var refHint = $('tumRefHint');
    if (refHint && refHint.textContent.indexOf('REFERRAL') === -1) {
      refHint.textContent =
        'Friends get bonus coins and XP. You earn commission on their purchases.';
    }
  }

  function wrapOpenTopUpModal() {
    if (typeof global.openTopUpModal !== 'function' || global.openTopUpModal._pxSkyWrapped) return;
    var orig = global.openTopUpModal;
    global.openTopUpModal = function () {
      orig.apply(this, arguments);
      applySkyTopupLabels();
      setTopupTab('topup');
    };
    global.openTopUpModal._pxSkyWrapped = true;
  }

  function wrapCloseTopUpModal() {
    if (typeof global.closeTopUpModal !== 'function' || global.closeTopUpModal._pxSkyWrapped) return;
    var orig = global.closeTopUpModal;
    global.closeTopUpModal = function () {
      orig.apply(this, arguments);
      setTopupTab('topup');
    };
    global.closeTopUpModal._pxSkyWrapped = true;
  }

  function wrapRenderTopUpPaths() {
    if (typeof global.renderTopUpPaths !== 'function' || global.renderTopUpPaths._pxSkyWrapped) return;
    var orig = global.renderTopUpPaths;
    global.renderTopUpPaths = function () {
      orig.apply(this, arguments);
      applySkyTopupLabels();
    };
    global.renderTopUpPaths._pxSkyWrapped = true;
  }

  function init() {
    wrapOpenTopUpModal();
    wrapCloseTopUpModal();
    wrapRenderTopUpPaths();
  }

  global.PoxyTopupSky = {
    apply: applySkyTopupLabels,
    setTab: setTopupTab,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
