(function PoxyPush() {
  'use strict';

  var LS_PROMPTED = 'poxy_push_prompted';
  var LS_DECLINED = 'poxy_push_declined';

  function $(id) { return document.getElementById(id); }

  function sb() { return window.sb; }

  function getVapidKey() {
    var key = window.POXY_VAPID_PUBLIC_KEY;
    if (!key || typeof key !== 'string') return null;
    return key.trim();
  }

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(base64);
    var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  function supportsPush() {
    return !!(window.Notification && navigator.serviceWorker && window.PushManager);
  }

  function markPrompted() {
    try { localStorage.setItem(LS_PROMPTED, '1'); } catch (e) {}
  }

  function markDeclined() {
    try { localStorage.setItem(LS_DECLINED, '1'); } catch (e) {}
    markPrompted();
  }

  function wasPrompted() {
    try { return localStorage.getItem(LS_PROMPTED) === '1'; } catch (e) { return false; }
  }

  function wasDeclined() {
    try { return localStorage.getItem(LS_DECLINED) === '1'; } catch (e) { return false; }
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    try {
      return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch (e) {
      console.warn('[push] SW register:', e);
      return null;
    }
  }

  async function saveSubscription(subscription) {
    if (!sb() || !window.currentUser) return false;
    var payload = typeof subscription.toJSON === 'function'
      ? subscription.toJSON()
      : subscription;
    var res = await sb().rpc('save_push_subscription', { p_subscription: payload });
    if (res.error) {
      console.error('[push] save:', res.error);
      return false;
    }
    if (res.data && res.data.ok === false) {
      console.error('[push] save:', res.data.error);
      return false;
    }
    return true;
  }

  async function requestPushPermission() {
    if (!supportsPush()) return false;
    if (!window.currentUser) return false;
    if (Notification.permission === 'denied') return false;

    var vapid = getVapidKey();
    if (!vapid) {
      console.warn('[push] POXY_VAPID_PUBLIC_KEY not configured — subscription skipped');
      return false;
    }

    await registerServiceWorker();

    var permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') return false;

    var registration = await navigator.serviceWorker.ready;
    var existing = await registration.pushManager.getSubscription();
    var subscription = existing;
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
    }
    return saveSubscription(subscription);
  }

  function hidePushModal() {
    var modal = $('pobPushModal');
    if (modal) modal.hidden = true;
    if (!$('dailyStreakModal') || $('dailyStreakModal').hidden) {
      if (!$('pobWelcomeModal') || $('pobWelcomeModal').hidden) {
        document.body.style.overflow = '';
      }
    }
  }

  function showPushPromptModal() {
    if (!supportsPush()) return;
    if (wasPrompted() || wasDeclined()) return;
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      markPrompted();
      return;
    }
    var modal = $('pobPushModal');
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function bindPushModal() {
    var enable = $('pobPushEnable');
    var skip = $('pobPushSkip');
    if (enable && !enable._poxyBound) {
      enable._poxyBound = true;
      enable.addEventListener('click', async function () {
        enable.disabled = true;
        enable.textContent = 'Enabling…';
        var ok = await requestPushPermission();
        markPrompted();
        hidePushModal();
        if (ok && window.showToast) window.showToast('Push notifications enabled.');
        else if (!ok && window.showToast) window.showToast('Notifications not enabled.');
        enable.disabled = false;
        enable.textContent = 'ENABLE NOTIFICATIONS';
      });
    }
    if (skip && !skip._poxyBound) {
      skip._poxyBound = true;
      skip.addEventListener('click', function () {
        markDeclined();
        hidePushModal();
      });
    }
  }

  function scheduleAfterOnboarding() {
    setTimeout(function () {
      if (window.PoxyPlayerOB && window.PoxyPlayerOB.isActive && window.PoxyPlayerOB.isActive()) return;
      showPushPromptModal();
    }, 1200);
  }

  function maybePromptReturningUser() {
    if (!window.currentUser) return;
    if (wasPrompted()) return;
    var onboardingDone = false;
    try {
      var uid = window.currentUser && window.currentUser.id;
      onboardingDone = uid
        ? (localStorage.getItem('poxy_onboarding_complete:' + uid) === '1')
        : (localStorage.getItem('poxy_onboarding_complete') === '1');
    } catch (e) {}
    if (!onboardingDone && window.currentProfile && window.currentProfile.metadata) {
      onboardingDone = !!window.currentProfile.metadata.onboarding_done;
    }
    if (!onboardingDone) return;
    setTimeout(showPushPromptModal, 2500);
  }

  async function initPush() {
    bindPushModal();
    if ('serviceWorker' in navigator) {
      registerServiceWorker().catch(function () {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPush);
  } else {
    initPush();
  }

  window.requestPushPermission = requestPushPermission;
  window.PoxyPush = {
    scheduleAfterOnboarding: scheduleAfterOnboarding,
    maybePromptReturningUser: maybePromptReturningUser,
    requestPushPermission: requestPushPermission,
    supportsPush: supportsPush,
  };
})();
