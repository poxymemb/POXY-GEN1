/* Lumina Chatting OS — shared boot config (isolated from main site shell) */
window.LUMINA_CHAT = {
  SUPABASE_URL: 'https://rbrtjkfawdnomvvyxwvp.supabase.co',
  SUPABASE_KEY: 'sb_publishable_T3fYPzogYoTqzrYY2q9eBg_CjO1QFPG',
  STORAGE_PREFIX: 'lumina_os_v1',
  FOUNDER_EMAIL: 'worldpoxy@gmail.com',
  MAIN_APP: '/',
  LUMINA_OS_PATH: '/lumina-os',
  CHAT_APP: '/lumina-os',
};

window.LuminaChatUtil = {
  $(id) { return document.getElementById(id); },
  sanitizeText(s) {
    const d = document.createElement('div');
    d.textContent = String(s ?? '');
    return d.innerHTML;
  },
  isUuid(v) {
    return !!(
      v &&
      typeof v === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
    );
  },
  avatarUrl(url, cacheV) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return url;
    const base = url.split('#')[0].replace(/([?&])v=\d+/g, '').replace(/[?&]$/, '');
    const v = cacheV || window._avatarCacheV || 1;
    return base + (base.includes('?') ? '&' : '?') + 'v=' + v;
  },
  timeShort(iso) {
    if (!iso) return '';
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return 'now';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  },
  dateDivider(iso) {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  },
  handleFromUsername(username) {
    return String(username || 'user').replace(/^@/, '').trim() || 'user';
  },
  displayNameFromProf(prof) {
    let dn = '';
    try {
      const priv =
        typeof prof?.club_privacy === 'string'
          ? JSON.parse(prof.club_privacy)
          : prof?.club_privacy;
      if (priv?.display_name) dn = String(priv.display_name).trim();
      else if (priv?.displayName) dn = String(priv.displayName).trim();
    } catch (e) {}
    const handle = LuminaChatUtil.handleFromUsername(prof?.username);
    return dn || handle;
  },
  storageKey(userId) {
    return LUMINA_CHAT.STORAGE_PREFIX + '_' + (userId || 'anon');
  },
};
