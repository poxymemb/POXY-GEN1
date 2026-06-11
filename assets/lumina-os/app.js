/**
 * Lumina OS — communication workspace (embedded SPA).
 */
(function (global) {
  const U = global.LuminaChatUtil;
  const Store = global.LuminaOSStore;
  const Router = global.LuminaOSRouter;

  const runtime = {
    profile: null,
    friends: [],
    conversations: [],
    messages: [],
    selectedId: null,
    presence: {},
    dmChannel: null,
    bound: false,
  };

  function sb() {
    const client = global.sb;
    if (!client) {
      throw new Error('Supabase client not ready (window.sb missing)');
    }
    return client;
  }

  function currentUser() {
    return global.currentUser;
  }

  function toast(msg) {
    const t = U.$('lcToast');
    if (!t) {
      if (typeof global.showToast === 'function') global.showToast(msg);
      return;
    }
    t.textContent = msg;
    t.classList.add('is-show');
    clearTimeout(toast._tm);
    toast._tm = setTimeout(() => t.classList.remove('is-show'), 2800);
  }

  function peerFromFriend(f) {
    return {
      id: f.id,
      username: f.username,
      avatar_url: f.avatar_url,
      is_club_member: f.is_club_member,
      displayName: U.displayNameFromProf(f),
      handle: U.handleFromUsername(f.username),
    };
  }

  async function loadProfile() {
    const user = currentUser();
    if (!user) return;
    const { data } = await sb()
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    runtime.profile = data || {
      id: user.id,
      username: '',
      avatar_url: '👾',
      is_club_member: false,
    };
    renderNavUser();
  }

  async function loadFriends() {
    const user = currentUser();
    const { data: rows, error } = await sb()
      .from('friendships')
      .select('*')
      .or('user_a_id.eq.' + user.id + ',user_b_id.eq.' + user.id);
    if (error) throw error;
    if (!rows?.length) {
      runtime.friends = [];
      runtime.conversations = [];
      return;
    }
    const ids = rows.map((r) =>
      r.user_a_id === user.id ? r.user_b_id : r.user_a_id
    );
    const { data: profs } = await sb()
      .from('profiles')
      .select(
        'id,username,avatar_url,is_club_member,club_privacy,is_verified_employee,email'
      )
      .in('id', ids);
    runtime.friends = (profs || []).map(peerFromFriend);
    await hydrateLastMessages();
  }

  async function hydrateLastMessages() {
    const user = currentUser();
    const { data, error } = await sb()
      .from('poxy_dm')
      .select('from_id,to_id,content,created_at')
      .or('from_id.eq.' + user.id + ',to_id.eq.' + user.id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return;
    const lastByPeer = {};
    (data || []).forEach((m) => {
      const peer = m.from_id === user.id ? m.to_id : m.from_id;
      if (!lastByPeer[peer]) lastByPeer[peer] = m;
    });
    runtime.conversations = runtime.friends.map((f) => {
      const last = lastByPeer[f.id];
      return {
        ...f,
        lastText: last?.content || 'Start a conversation',
        lastAt: last?.created_at || null,
      };
    });
    runtime.conversations.sort((a, b) => {
      const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
      const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
      return tb - ta;
    });
  }

  function renderNavUser() {
    const av = U.$('lcNavUserAv');
    const name = U.$('lcNavUserName');
    const status = U.$('lcNavUserStatus');
    const statusBtn = U.$('lcUserStatusBtn');
    const st = Store.getState();
    if (!av || !runtime.profile) return;
    if (runtime.profile.avatar_url?.startsWith('http')) {
      av.innerHTML =
        '<img src="' +
        U.sanitizeText(U.avatarUrl(runtime.profile.avatar_url)) +
        '" alt="">';
    } else av.textContent = runtime.profile.avatar_url || '👾';
    if (name) name.textContent = U.displayNameFromProf(runtime.profile);
    if (status) {
      const labels = {
        online: 'Online',
        away: 'Away',
        busy: 'Busy',
        invisible: 'Invisible',
      };
      status.textContent = labels[st.userStatus] || 'Online';
      if (statusBtn) statusBtn.dataset.status = st.userStatus || 'online';
    }
  }

  function renderConvList(filter) {
    const list = U.$('lcConvList');
    if (!list) return;
    const q = (filter || '').toLowerCase();
    const items = runtime.conversations.filter(
      (c) =>
        !q ||
        c.displayName.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q)
    );
    if (!items.length) {
      list.innerHTML =
        '<p class="lc-empty-hint">No conversations yet. Add friends on POXY.</p>';
      return;
    }
    list.innerHTML = '';
    items.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'lc-conv-item' + (runtime.selectedId === c.id ? ' is-active' : '');
      const avHtml = c.avatar_url?.startsWith('http')
        ? '<img src="' +
          U.sanitizeText(U.avatarUrl(c.avatar_url)) +
          '" alt="">'
        : U.sanitizeText(c.avatar_url || '👾');
      const online = runtime.presence[c.id] === 'online';
      btn.innerHTML =
        '<div class="lc-conv-av">' +
        avHtml +
        (online ? '<span class="lc-conv-online"></span>' : '') +
        '</div><div class="lc-conv-body"><div class="lc-conv-name">' +
        U.sanitizeText(c.displayName) +
        '</div><div class="lc-conv-preview">' +
        U.sanitizeText(c.lastText) +
        '</div></div><span class="lc-conv-time">' +
        (c.lastAt ? U.timeShort(c.lastAt) : '') +
        '</span>';
      btn.onclick = () => selectConversation(c.id);
      list.appendChild(btn);
    });
  }

  function renderContext(peer) {
    if (!peer) return;
    const av = U.$('lcContextAv');
    const dn = U.$('lcContextDisplay');
    const h = U.$('lcContextHandle');
    const title = U.$('lcContextTitle');
    if (av) {
      if (peer.avatar_url?.startsWith('http')) {
        av.innerHTML =
          '<img src="' +
          U.sanitizeText(U.avatarUrl(peer.avatar_url)) +
          '" alt="">';
      } else av.textContent = peer.avatar_url || '👾';
    }
    if (dn) dn.textContent = peer.displayName;
    if (h) h.textContent = '@' + peer.handle;
    if (title) {
      title.textContent = peer.is_club_member
        ? 'Elite Lumina Member'
        : 'POXY Member';
    }
    const vault = Store.getState().vaultLevel || 1;
    const vaultEl = U.$('lcVaultText');
    if (vaultEl) {
      vaultEl.textContent =
        'Access granted to level ' + vault + ' encrypted threads.';
    }
    const act = U.$('lcContextActivity');
    if (act) {
      act.innerHTML =
        '<div class="lc-activity-item"><span class="material-symbols-outlined">schedule</span> Last seen recently</div>';
    }
  }

  function renderThreadHeader(peer) {
    if (!peer) return;
    const av = U.$('lcThreadAv');
    const dn = U.$('lcThreadDisplay');
    const h = U.$('lcThreadHandle');
    const sub = U.$('lcThreadSubtitle');
    if (av) {
      if (peer.avatar_url?.startsWith('http')) {
        av.innerHTML =
          '<img src="' +
          U.sanitizeText(U.avatarUrl(peer.avatar_url)) +
          '" alt="">';
      } else av.textContent = peer.avatar_url || '👾';
    }
    if (dn) dn.textContent = peer.displayName;
    if (h) {
      h.innerHTML =
        '<span class="lc-at">@</span>' + U.sanitizeText(peer.handle);
    }
    if (sub) {
      const st = runtime.presence[peer.id] || 'offline';
      sub.textContent =
        st === 'online'
          ? 'Online now'
          : st === 'inventory'
            ? 'In inventory'
            : 'Offline';
    }
    renderContext(peer);
  }

  function renderMessages() {
    const box = U.$('lcMessages');
    const empty = U.$('lcThreadEmpty');
    const thread = U.$('lcThreadPanel');
    if (!box) return;
    if (!runtime.selectedId) {
      if (empty) empty.classList.remove('lc-hidden');
      if (thread) thread.classList.add('lc-hidden');
      return;
    }
    if (empty) empty.classList.add('lc-hidden');
    if (thread) thread.classList.remove('lc-hidden');
    box.innerHTML = '';
    let lastDay = '';
    const W = global.LuminaWidgets;
    runtime.messages.forEach((m, i) => {
      const day = m.created_at ? m.created_at.slice(0, 10) : '';
      if (day && day !== lastDay) {
        lastDay = day;
        const div = document.createElement('div');
        div.className = 'lc-date-divider';
        div.textContent = U.dateDivider(m.created_at);
        box.appendChild(div);
      }
      const mine = m.from_id === currentUser().id;
      const row = document.createElement('div');
      row.className = 'lc-msg-row ' + (mine ? 'is-mine' : 'is-theirs');
      row.style.animationDelay = Math.min(i * 0.03, 0.3) + 's';
      const bubble = document.createElement('div');
      bubble.className = 'lc-bubble';
      const msgType = m.type || 'text';

      if (msgType === 'image') {
        bubble.classList.add('lc-bubble--image');
        const imgSrc = (m.meta?.url) || m.content;
        bubble.innerHTML = '<img class="lc-image-bubble" src="' + U.sanitizeText(imgSrc) + '" alt="Image" loading="lazy" data-action="open-lightbox" data-src="' + U.sanitizeText(imgSrc) + '">';
      } else if (msgType === 'trade_widget' && W) {
        bubble.classList.add('lc-bubble--trade');
        bubble.innerHTML = W.renderTradeCard(m, currentUser().id);
      } else if (msgType === 'duel_widget' && W) {
        bubble.classList.add('lc-bubble--duel');
        bubble.innerHTML = W.renderDuelCard(m, currentUser().id);
        if (m.meta?.status === 'completed' && m.meta?.winner_id) {
          const capturedBubble = bubble;
          const capturedMeta = m.meta;
          requestAnimationFrame(() => {
            const card = capturedBubble.querySelector('.lf-duel-card');
            if (card) W.runDuelAnimation(card, capturedMeta);
          });
        }
      } else if (msgType === 'voice') {
        bubble.classList.add('lc-bubble--voice');
        bubble.innerHTML =
          '<button type="button" class="lc-voice-play" aria-label="Play"><span class="material-symbols-outlined">play_arrow</span></button><div class="lc-voice-wave"></div><span class="lc-voice-dur">0:42</span>';
      } else {
        bubble.textContent = m.content;
      }

      row.appendChild(bubble);
      const meta = document.createElement('div');
      meta.className = 'lc-msg-meta';
      meta.innerHTML =
        U.timeShort(m.created_at) +
        (mine
          ? ' <span class="material-symbols-outlined lc-read">done_all</span>'
          : '');
      row.appendChild(meta);
      box.appendChild(row);
    });
    box.scrollTop = box.scrollHeight;
  }

  async function loadThread(peerId) {
    const user = currentUser();
    const { data, error } = await sb()
      .from('poxy_dm')
      .select('*')
      .or(
        'and(from_id.eq.' +
          user.id +
          ',to_id.eq.' +
          peerId +
          '),and(from_id.eq.' +
          peerId +
          ',to_id.eq.' +
          user.id +
          ')'
      )
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) throw error;
    runtime.messages = data || [];
    renderMessages();
  }

  async function selectConversation(peerId) {
    if (!U.isUuid(peerId)) return;
    runtime.selectedId = peerId;
    Store.setState({ selectedChatId: peerId });
    const peer =
      runtime.conversations.find((c) => c.id === peerId) ||
      runtime.friends.find((f) => f.id === peerId);
    if (!peer) return;
    document.querySelector('#luminaOsRoot .lc-shell')?.classList.add('conv-open');
    renderConvList(U.$('lcConvSearch')?.value);
    renderThreadHeader(peer);
    const input = U.$('lcComposeInput');
    if (input) {
      input.value = Store.getDraft(peerId);
      U.$('lcComposeSend').disabled = !input.value.trim();
    }
    const box = U.$('lcMessages');
    if (box) {
      box.innerHTML =
        '<p class="lc-loading">Loading…</p>';
    }
    try {
      await loadThread(peerId);
      subscribeDm(peerId);
    } catch (e) {
      toast('Could not load messages.');
    }
  }

  async function sendMessage() {
    const input = U.$('lcComposeInput');
    const content = input?.value.trim();
    if (!content || !runtime.selectedId) return;
    input.disabled = true;
    try {
      const { error } = await sb().from('poxy_dm').insert({
        from_id: currentUser().id,
        to_id: runtime.selectedId,
        content,
      });
      if (error) throw error;
      input.value = '';
      Store.setDraft(runtime.selectedId, '');
      U.$('lcComposeSend').disabled = true;
      await loadThread(runtime.selectedId);
      await hydrateLastMessages();
      renderConvList(U.$('lcConvSearch')?.value);
      if (typeof global.bumpQuest === 'function') {
        global.bumpQuest('send_chat', 1);
      }
    } catch (e) {
      toast('Send failed: ' + (e.message || 'error'));
    }
    input.disabled = false;
    input.focus();
  }

  function subscribeDm(peerId) {
    if (runtime.dmChannel) {
      try {
        sb().removeChannel(runtime.dmChannel);
      } catch (e) {}
      runtime.dmChannel = null;
    }
    const user = currentUser();
    runtime.dmChannel = sb()
      .channel('lo-dm-' + user.id)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'poxy_dm' },
        (payload) => {
          const m = payload.new;
          if (!m) return;
          const relevant =
            (m.from_id === user.id && m.to_id === peerId) ||
            (m.from_id === peerId && m.to_id === user.id);
          if (relevant && runtime.selectedId === peerId) {
            loadThread(peerId);
            hydrateLastMessages().then(() =>
              renderConvList(U.$('lcConvSearch')?.value)
            );
          }
        }
      )
      .subscribe();
  }

  function applyContextCollapsed() {
    const collapsed = Store.getState().contextCollapsed;
    document
      .querySelector('#luminaOsRoot .lc-shell')
      ?.classList.toggle('context-collapsed', collapsed);
  }

  function setNav(nav) {
    Store.setState({ activeNav: nav });
    document.querySelectorAll('#luminaOsRoot .lc-nav-item').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.nav === nav);
    });
    if (global.LuminaOSPanels) {
      global.LuminaOSPanels.render(nav);
    }
    try {
      const hash = global.LuminaOSRouter.buildHash({
        nav: nav,
        user: runtime.selectedId || undefined,
      });
      if (global.location.hash !== hash) {
        global.history.replaceState(
          { layout: 'lumina-os', nav: nav },
          '',
          (global.LuminaOSRouter.homePath
            ? global.LuminaOSRouter.homePath()
            : '/') + hash.replace(/^#/, '')
        );
      }
    } catch (e) {}
  }

  function openMessagesWith(userId) {
    setNav('messages');
    if (userId && U.isUuid(userId)) {
      selectConversation(userId);
    }
  }

  function bindClick(id, fn) {
    const el = U.$(id);
    if (el) el.onclick = fn;
  }

  /** Upgrade cached Lumina HTML from older deploys without a full page reload. */
  function migrateLuminaShellDom() {
    const root = document.getElementById('luminaOsRoot');
    if (!root) return;

    document.getElementById('lcEscapeBar')?.remove();
    root.querySelector('[data-nav="calls"]')?.remove();

    const tier = document.getElementById('lcNavUserTier');
    if (tier) {
      const next = tier.nextSibling;
      if (next && next.nodeType === 3 && /·/.test(next.textContent || '')) {
        next.remove();
      }
      tier.remove();
    }

    const statusBtn = document.getElementById('lcUserStatusBtn');
    const statusLabel = document.getElementById('lcNavUserStatus');
    if (statusBtn && !statusBtn.querySelector('.lc-status-dot')) {
      const text = (statusLabel && statusLabel.textContent) || 'Online';
      statusBtn.innerHTML =
        '<span class="lc-status-dot" aria-hidden="true"></span><span id="lcNavUserStatus">' +
        U.sanitizeText(text) +
        '</span>';
    }

    if (!document.getElementById('lcNavHelp')) {
      const nav = root.querySelector('.lc-nav');
      const userBlock = root.querySelector('.lc-nav-user');
      const logout = document.getElementById('lcNavLogout');
      if (nav && userBlock && logout) {
        const footer = document.createElement('div');
        footer.className = 'lc-nav-footer';
        const help = document.createElement('button');
        help.type = 'button';
        help.className = 'lc-nav-footer-btn';
        help.id = 'lcNavHelp';
        help.innerHTML =
          '<span class="material-symbols-outlined">help</span><span>Help</span>';
        footer.appendChild(help);
        if (logout.parentElement === userBlock) {
          logout.className = 'lc-nav-footer-btn lc-nav-footer-btn--logout';
          logout.innerHTML =
            '<span class="material-symbols-outlined">logout</span><span>Logout</span>';
          footer.appendChild(logout);
        }
        nav.insertBefore(footer, userBlock);
      }
    }

    const attach = document.getElementById('lcComposeAttach');
    if (attach) {
      attach.style.background = 'transparent';
      attach.style.boxShadow = 'none';
    }
  }

  function bindUi() {
    migrateLuminaShellDom();
    if (runtime.bound) return;
    runtime.bound = true;
    document.querySelectorAll('#luminaOsRoot .lc-nav-item').forEach((btn) => {
      btn.onclick = () => setNav(btn.dataset.nav);
    });
    const convSearch = U.$('lcConvSearch');
    if (convSearch) {
      convSearch.addEventListener('input', (e) => {
        renderConvList(e.target.value);
      });
    }
    const composeInput = U.$('lcComposeInput');
    const composeSend = U.$('lcComposeSend');
    if (composeInput) {
      composeInput.addEventListener('input', (e) => {
        const v = e.target.value;
        if (runtime.selectedId) Store.setDraft(runtime.selectedId, v);
        if (composeSend) composeSend.disabled = !v.trim();
        const typing = U.$('lcTyping');
        if (typing) typing.textContent = v ? 'You are typing…' : '';
      });
      composeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
    }
    bindClick('lcComposeSend', sendMessage);
    bindClick('lcComposeGif', () => toast('GIF picker — coming soon.'));
    bindClick('lcComposeEmoji', () => {
      const inp = U.$('lcComposeInput');
      if (inp) {
        inp.value += ' ✨';
        inp.dispatchEvent(new Event('input'));
        inp.focus();
      }
    });
    bindClick('lcComposeVoice', () => toast('Hold to record — coming soon.'));
    bindClick('lcComposeAttach', () => toast('Attachments — coming soon.'));

    // Widget buttons — Trade & Duel
    bindClick('lcWidgetTrade', async () => {
      if (!runtime.selectedId) return;
      const W = global.LuminaWidgets;
      if (!W) { toast('Widget engine loading…'); return; }
      const user = currentUser();
      const peer = runtime.friends.find((f) => f.id === runtime.selectedId);
      const { data: poxy } = await sb().from('user_poxy').select('id,poxy_tier').eq('user_id', user.id).limit(12);
      W.showTradeComposer(runtime.selectedId, peer?.displayName || 'Friend', user.id, poxy || []);
    });

    bindClick('lcWidgetDuel', async () => {
      if (!runtime.selectedId) return;
      const W = global.LuminaWidgets;
      if (!W) { toast('Widget engine loading…'); return; }
      const user = currentUser();
      const peer = runtime.friends.find((f) => f.id === runtime.selectedId);
      const { data: poxy } = await sb().from('user_poxy').select('id,poxy_tier').eq('user_id', user.id).limit(12);
      global._lcProfile = runtime.profile;
      W.showDuelComposer(runtime.selectedId, peer?.displayName || 'Friend', user.id, poxy || []);
    });
    bindClick('lcThreadBack', () => {
      document.querySelector('#luminaOsRoot .lc-shell')?.classList.remove('conv-open');
    });
    bindClick('lcToggleContext', () => {
      document.querySelector('#luminaOsRoot .lc-shell')?.classList.toggle('context-open');
    });
    bindClick('lcCollapseContext', () => {
      const next = !Store.getState().contextCollapsed;
      Store.setState({ contextCollapsed: next });
      applyContextCollapsed();
    });
    bindClick('lcExitOs', () => Router.exit());
    bindClick('lcNavHelp', () => {
      Router.exit();
      if (typeof global.showStitchTab === 'function') {
        global.showStitchTab('explore');
      } else {
        toast('Open POXY World → Explore for help and support.');
      }
    });
    bindClick('lcNavLogout', async () => {
      await sb().auth.signOut();
    });
    bindClick('lcUserStatusBtn', () => {
      const order = ['online', 'away', 'busy', 'invisible'];
      const cur = Store.getState().userStatus || 'online';
      const next = order[(order.indexOf(cur) + 1) % order.length];
      Store.setState({ userStatus: next });
      renderNavUser();
    });
    Store.subscribe(() => applyContextCollapsed());
    const themeBtn = U.$('lcThemeToggle');
    if (themeBtn) {
      themeBtn.onclick = () => {
        if (global.toggleTheme) global.toggleTheme();
        if (global.LuminaOSTheme) {
          Store.setState({ theme: global.LuminaOSTheme.getTheme() });
        }
        syncThemeToggleLabel();
      };
    }
    if (global.LuminaOSTheme) {
      global.LuminaOSTheme.subscribe(() => syncThemeToggleLabel());
    }
  }

  function syncThemeToggleLabel() {
    const btn = U.$('lcThemeToggle');
    if (!btn || !global.LuminaOSTheme) return;
    const r = global.LuminaOSTheme.getResolvedTheme();
    const icon = btn.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = r === 'dark' ? 'light_mode' : 'dark_mode';
    const label = btn.querySelector('.lo-theme-toggle-label');
    if (label) {
      const I = global.PoxyI18n;
      label.textContent = I
        ? I.t(r === 'dark' ? 'lo.nav.lightMode' : 'lo.nav.darkMode')
        : r === 'dark'
          ? 'Light mode'
          : 'Dark mode';
    }
  }

  async function mount(opts) {
    opts = opts || {};
    const user = currentUser();
    if (!user) return;
    Store.setUserId(user.id);
    if (global.LuminaOSPanels) global.LuminaOSPanels.ensureSeeded();
    const st0 = Store.getState();
    if (global.PoxyI18n) {
      const loc =
        (st0.preferences && st0.preferences.locale) || global.PoxyI18n.getLocale();
      if (loc && loc !== global.PoxyI18n.getLocale()) {
        global.PoxyI18n.setLocale(loc, {
          persist: false,
          rerenderSettings: false,
        });
      } else {
        global.PoxyI18n.applyLuminaChrome();
      }
    }
    if (global.LuminaOSTheme) {
      const mode =
        st0.theme === 'dark' ||
        st0.theme === 'light' ||
        st0.theme === 'system'
          ? st0.theme
          : global.LuminaOSTheme.getTheme();
      global.LuminaOSTheme.setTheme(mode);
      if (st0.theme !== mode) Store.setState({ theme: mode });
    }
    bindUi();
    syncThemeToggleLabel();
    const st = Store.getState();
    const nav = opts.nav || Router.parseQuery().nav || st.activeNav || 'messages';
    setNav(nav);
    applyContextCollapsed();
    await loadProfile();
    try {
      await loadFriends();
    } catch (e) {
      toast('Could not load friends.');
    }
    renderConvList();
    const shell = U.$('lcShell');
    if (shell) shell.classList.add('is-ready');
    const target =
      (opts.user && U.isUuid(opts.user) ? opts.user : null) ||
      Router.parseQuery().user ||
      st.selectedChatId;
    if (target && runtime.friends.some((f) => f.id === target)) {
      await selectConversation(target);
    }
  }

  function activate(opts) {
    opts = opts || {};
    if (opts.user && U.isUuid(opts.user)) selectConversation(opts.user);
    if (opts.nav) setNav(opts.nav);
  }

  function deactivate() {
    if (runtime.dmChannel) {
      try {
        sb().removeChannel(runtime.dmChannel);
      } catch (e) {}
      runtime.dmChannel = null;
    }
    runtime.selectedId = null;
  }

  global.LuminaOSApp = {
    mount,
    activate,
    deactivate,
    selectConversation,
    setNav,
    openMessagesWith,
    getRuntime: () => runtime,
    toast,
    syncThemeToggleLabel,
  };

  global.openLuminaOS = function (userId, nav) {
    if (!currentUser()) {
      toast('Sign in to open Lumina OS.');
      return;
    }
    Router.enter({ user: userId, nav: nav });
  };
  global.openLuminaChatApp = global.openLuminaOS;

  if (global._luminaOsPending) {
    const p = global._luminaOsPending;
    global._luminaOsPending = null;
    global.openLuminaOS(p.user, p.nav);
  }
})(window);
