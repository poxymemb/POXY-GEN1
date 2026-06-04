/**
 * Lumina OS — Zustand-style persisted store (vanilla SPA).
 */
(function (global) {
  const CFG = global.LUMINA_CHAT || {};
  const PREFIX = CFG.STORAGE_PREFIX || 'lumina_os_v1';
  const LEGACY_PREFIX = 'lumina_chat_os_v1';

  const initial = {
    selectedChatId: null,
    activeNav: 'messages',
    drafts: {},
    vaultLevel: 1,
    contextCollapsed: false,
    userStatus: 'online',
    theme: 'light',
    friendsSearch: '',
    onlineFriendsCount: 1204,
    squads: [],
    squadRequests: {},
    squadsFilter: 'all',
    squadsSort: 'winRate',
    activityFeed: [],
    notifications: [],
    preferences: { sounds: true, enterToSend: true },
  };

  let state = { ...initial };
  const listeners = new Set();
  let userId = null;

  function storageKey(id) {
    return PREFIX + '_' + (id || userId || 'anon');
  }

  function readRaw(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function migrateLegacy(id) {
    const legacy = readRaw(LEGACY_PREFIX + '_' + id);
    if (!legacy) return null;
    try {
      const parsed = JSON.parse(legacy);
      localStorage.setItem(storageKey(id), legacy);
      return parsed;
    } catch (e) {
      return null;
    }
  }

  const LuminaOSStore = {
    getState() {
      return state;
    },
    setUserId(id) {
      userId = id;
      LuminaOSStore.hydrate();
    },
    hydrate() {
      if (!userId) return;
      let raw = readRaw(storageKey(userId));
      let parsed = null;
      if (raw) {
        try {
          parsed = JSON.parse(raw);
        } catch (e) {}
      }
      if (!parsed) parsed = migrateLegacy(userId);
      state = { ...initial, ...(parsed || {}) };
      listeners.forEach((fn) => fn(state));
    },
    persist() {
      if (!userId) return;
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify(state));
      } catch (e) {}
    },
    setState(patch) {
      state = { ...state, ...patch };
      LuminaOSStore.persist();
      listeners.forEach((fn) => fn(state));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getDraft(peerId) {
      return (state.drafts && state.drafts[peerId]) || '';
    },
    setDraft(peerId, text) {
      const drafts = { ...(state.drafts || {}) };
      if (text) drafts[peerId] = text;
      else delete drafts[peerId];
      LuminaOSStore.setState({ drafts });
    },
  };

  global.LuminaOSStore = LuminaOSStore;
})(window);
