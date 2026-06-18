/**
 * POXY Sky Help center — reskin support panel without touching ticket/FAQ hooks.
 */
(function (global) {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function isSky() {
    return document.body.classList.contains('poxy-sky-app-active');
  }

  function ensureSkySubhead() {
    var head = document.querySelector('.poxy-support-head');
    if (!head || head.querySelector('.px-sky-support-sub')) return;
    var title = $('supportHubTitle');
    if (title) title.textContent = 'Help center';
    var sub = document.createElement('p');
    sub.className = 'px-sky-support-sub';
    sub.textContent = 'Guides, tickets, and support chat';
    if (title && title.parentNode) {
      title.parentNode.insertBefore(sub, title.nextSibling);
    }
  }

  function applySkySupportChrome() {
    if (!isSky()) return;
    var drawer = document.querySelector('.poxy-support-drawer');
    if (drawer) drawer.classList.add('px-sky-support-drawer');
    ensureSkySubhead();
    var faqSearch = $('supportFaqSearch');
    if (faqSearch && faqSearch.placeholder === 'Search FAQ…') {
      faqSearch.placeholder = 'Search guides…';
    }
    var newSubmit = $('supportNewSubmit');
    if (newSubmit && newSubmit.textContent === 'Create ticket') {
      newSubmit.textContent = 'Send ticket';
    }
  }

  function wrapOpenSupportPanel() {
    if (typeof global.openSupportPanel !== 'function' || global.openSupportPanel._pxSkyWrapped) {
      return;
    }
    var orig = global.openSupportPanel;
    global.openSupportPanel = function () {
      orig.apply(this, arguments);
      applySkySupportChrome();
    };
    global.openSupportPanel._pxSkyWrapped = true;
  }

  function wrapSwitchSupportTab() {
    if (typeof global.switchSupportTab !== 'function' || global.switchSupportTab._pxSkyWrapped) {
      return;
    }
    var orig = global.switchSupportTab;
    global.switchSupportTab = function () {
      orig.apply(this, arguments);
      applySkySupportChrome();
    };
    global.switchSupportTab._pxSkyWrapped = true;
  }

  function init() {
    wrapOpenSupportPanel();
    wrapSwitchSupportTab();
  }

  global.PoxySupportSky = {
    apply: applySkySupportChrome,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
