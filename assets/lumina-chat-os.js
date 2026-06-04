/**
 * Lumina Chatting OS — isolated DM client
 * Architecture note: main site is vanilla SPA; this module is the ChatLayout equivalent.
 * Future React migration: wrap LuminaChatApp in <Route path="/chat/app" element={<ChatLayout />} />
 */
(function () {
  const U = window.LuminaChatUtil;
  const CFG = window.LUMINA_CHAT;

  const sb = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  });

  const state = {
    currentUser: null,
    profile: null,
    friends: [],
    conversations: [],
    messages: [],
    selectedId: null,
    activeNav: 'messages',
    presence: {},
    dmChannel: null,
    typingTimer: null,
  };

  function loadPersisted() {
    if (!state.currentUser) return {};
    try {
      const raw = localStorage.getItem(U.storageKey(state.currentUser.id));
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function savePersisted(patch) {
    if (!state.currentUser) return;
    const prev = loadPersisted();
    const next = { ...prev, ...patch };
    try {
      localStorage.setItem(U.storageKey(state.currentUser.id), JSON.stringify(next));
    } catch (e) {}
    return next;
  }

  function toast(msg) {
    const t = U.$('lcToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-show');
    clearTimeout(toast._tm);
    toast._tm = setTimeout(() => t.classList.remove('is-show'), 2800);
  }

  function getDraft(peerId) {
    const p = loadPersisted();
    return (p.drafts && p.drafts[peerId]) || '';
  }

  function setDraft(peerId, text) {
    const p = loadPersisted();
    const drafts = { ...(p.drafts || {}) };
    if (text) drafts[peerId] = text;
    else delete drafts[peerId];
    savePersisted({ drafts });
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
    const { data } = await sb.from('profiles').select('*').eq('id', state.currentUser.id).maybeSingle();
    state.profile = data || {
      id: state.currentUser.id,
      username: '',
      avatar_url: '👾',
      is_club_member: false,
    };
    renderNavUser();
  }

  async function loadFriends() {
    const { data: rows, error } = await sb
      .from('friendships')
      .select('*')
      .or('user_a_id.eq.' + state.currentUser.id + ',user_b_id.eq.' + state.currentUser.id);
    if (error) throw error;
    if (!rows?.length) {
      state.friends = [];
      return;
    }
    const ids = rows.map((r) =>
      r.user_a_id === state.currentUser.id ? r.user_b_id : r.user_a_id
    );
    const { data: profs } = await sb
      .from('profiles')
      .select('id,username,avatar_url,is_club_member,club_privacy,is_verified_employee,email')
      .in('id', ids);
    state.friends = (profs || []).map(peerFromFriend);
    await hydrateLastMessages();
  }

  async function hydrateLastMessages() {
    const { data, error } = await sb
      .from('poxy_dm')
      .select('from_id,to_id,content,created_at')
      .or(
        'from_id.eq.' +
          state.currentUser.id +
          ',to_id.eq.' +
          state.currentUser.id
      )
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return;
    const lastByPeer = {};
    (data || []).forEach((m) => {
      const peer =
        m.from_id === state.currentUser.id ? m.to_id : m.from_id;
      if (!lastByPeer[peer]) lastByPeer[peer] = m;
    });
    state.conversations = state.friends.map((f) => {
      const last = lastByPeer[f.id];
      return {
        ...f,
        lastText: last?.content || 'Start a conversation',
        lastAt: last?.created_at || null,
      };
    });
    state.conversations.sort((a, b) => {
      const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
      const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
      return tb - ta;
    });
  }

  function renderNavUser() {
    const av = U.$('lcNavUserAv');
    const name = U.$('lcNavUserName');
    if (!av || !state.profile) return;
    if (state.profile.avatar_url?.startsWith('http')) {
      av.innerHTML =
        '<img src="' +
        U.sanitizeText(U.avatarUrl(state.profile.avatar_url)) +
        '" alt="">';
    } else av.textContent = state.profile.avatar_url || '👾';
    if (name) name.textContent = U.displayNameFromProf(state.profile);
  }

  function renderConvList(filter) {
    const list = U.$('lcConvList');
    if (!list) return;
    const q = (filter || '').toLowerCase();
    const items = state.conversations.filter(
      (c) =>
        !q ||
        c.displayName.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q)
    );
    if (!items.length) {
      list.innerHTML =
        '<p style="padding:16px;color:#9ca3af;font-size:13px;text-align:center">No conversations yet. Add friends on POXY.</p>';
      return;
    }
    list.innerHTML = '';
    items.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'lc-conv-item' + (state.selectedId === c.id ? ' is-active' : '');
      const avHtml = c.avatar_url?.startsWith('http')
        ? '<img src="' +
          U.sanitizeText(U.avatarUrl(c.avatar_url)) +
          '" alt="">'
        : U.sanitizeText(c.avatar_url || '👾');
      const online = state.presence[c.id] === 'online';
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
    const vault = loadPersisted().vaultLevel || 1;
    const vaultEl = U.$('lcVaultText');
    if (vaultEl) {
      vaultEl.textContent =
        'Access granted to level ' + vault + ' encrypted threads.';
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
      const st = state.presence[peer.id] || 'offline';
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
    if (!state.selectedId) {
      if (empty) empty.classList.remove('lc-hidden');
      if (thread) thread.classList.add('lc-hidden');
      return;
    }
    if (empty) empty.classList.add('lc-hidden');
    if (thread) thread.classList.remove('lc-hidden');
    box.innerHTML = '';
    let lastDay = '';
    const W = window.LuminaWidgets;
    state.messages.forEach((m, i) => {
      const day = m.created_at ? m.created_at.slice(0, 10) : '';
      if (day && day !== lastDay) {
        lastDay = day;
        const div = document.createElement('div');
        div.className = 'lc-date-divider';
        div.textContent = U.dateDivider(m.created_at);
        box.appendChild(div);
      }
      const mine = m.from_id === state.currentUser.id;
      const row = document.createElement('div');
      row.className = 'lc-msg-row ' + (mine ? 'is-mine' : 'is-theirs');
      row.style.animationDelay = Math.min(i * 0.03, 0.3) + 's';
      const bubble = document.createElement('div');
      bubble.className = 'lc-bubble';

      const msgType = m.type || 'text';

      if (msgType === 'image') {
        bubble.classList.add('lc-bubble--image');
        const imgSrc = m.meta?.url || m.content;
        bubble.innerHTML = `<img class="lc-image-bubble" src="${U.sanitizeText(imgSrc)}" alt="Image" loading="lazy" data-action="open-lightbox" data-src="${U.sanitizeText(imgSrc)}">`;
      } else if (msgType === 'trade_widget' && W) {
        bubble.classList.add('lc-bubble--trade');
        bubble.innerHTML = W.renderTradeCard(m, state.currentUser.id);
      } else if (msgType === 'duel_widget' && W) {
        bubble.classList.add('lc-bubble--duel');
        bubble.innerHTML = W.renderDuelCard(m, state.currentUser.id);
        // If duel is active/completed, run animation on completed cards
        if (m.meta?.status === 'completed' && m.meta?.winner_id) {
          requestAnimationFrame(() => {
            const card = bubble.querySelector('.lf-duel-card');
            if (card) W.runDuelAnimation(card, m.meta);
          });
        }
      } else if (msgType === 'voice') {
        bubble.classList.add('lc-bubble--voice');
        bubble.innerHTML =
          '<button type="button" class="lc-voice-play" aria-label="Play"><span class="material-symbols-outlined">play_arrow</span></button><div class="lc-voice-wave"></div><span style="font-size:12px;opacity:0.8">0:42</span>';
      } else {
        bubble.textContent = m.content;
      }

      row.appendChild(bubble);
      const metaEl = document.createElement('div');
      metaEl.className = 'lc-msg-meta';
      metaEl.innerHTML =
        U.timeShort(m.created_at) +
        (mine
          ? ' <span class="material-symbols-outlined lc-read">done_all</span>'
          : '');
      row.appendChild(metaEl);
      box.appendChild(row);
    });
    box.scrollTop = box.scrollHeight;
  }

  async function loadThread(peerId) {
    const { data, error } = await sb
      .from('poxy_dm')
      .select('*')
      .or(
        'and(from_id.eq.' +
          state.currentUser.id +
          ',to_id.eq.' +
          peerId +
          '),and(from_id.eq.' +
          peerId +
          ',to_id.eq.' +
          state.currentUser.id +
          ')'
      )
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) throw error;
    state.messages = data || [];
    renderMessages();
  }

  async function selectConversation(peerId) {
    if (!U.isUuid(peerId)) return;
    state.selectedId = peerId;
    savePersisted({ selectedChatId: peerId });
    const peer =
      state.conversations.find((c) => c.id === peerId) ||
      state.friends.find((f) => f.id === peerId);
    if (!peer) return;
    document.querySelector('.lc-shell')?.classList.add('conv-open');
    renderConvList(U.$('lcConvSearch')?.value);
    renderThreadHeader(peer);
    const input = U.$('lcComposeInput');
    if (input) {
      input.value = getDraft(peerId);
      U.$('lcComposeSend').disabled = !input.value.trim();
    }
    U.$('lcMessages').innerHTML =
      '<p style="color:#9ca3af;text-align:center;padding:24px">Loading…</p>';
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
    if (!content || !state.selectedId) return;
    input.disabled = true;
    try {
      const { error } = await sb.from('poxy_dm').insert({
        from_id: state.currentUser.id,
        to_id: state.selectedId,
        content,
      });
      if (error) throw error;
      input.value = '';
      setDraft(state.selectedId, '');
      U.$('lcComposeSend').disabled = true;
      await loadThread(state.selectedId);
      await hydrateLastMessages();
      renderConvList(U.$('lcConvSearch')?.value);
    } catch (e) {
      toast('Send failed: ' + (e.message || 'error'));
    }
    input.disabled = false;
    input.focus();
  }

  function subscribeDm(peerId) {
    if (state.dmChannel) {
      try {
        sb.removeChannel(state.dmChannel);
      } catch (e) {}
      state.dmChannel = null;
    }
    state.dmChannel = sb
      .channel('lc-dm-' + state.currentUser.id)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'poxy_dm',
        },
        (payload) => {
          const m = payload.new;
          if (!m) return;
          const relevant =
            (m.from_id === state.currentUser.id && m.to_id === peerId) ||
            (m.from_id === peerId && m.to_id === state.currentUser.id);
          if (relevant && state.selectedId === peerId) {
            loadThread(peerId);
            hydrateLastMessages().then(() =>
              renderConvList(U.$('lcConvSearch')?.value)
            );
          }
        }
      )
      .subscribe();
  }

  const MODULE_DEFS = {
    friends: {
      icon: 'group',
      title: 'Friends',
      subtitle: 'Your social network',
      desc: 'Your friends list syncs automatically from POXY World. Open a friend\'s profile to start a conversation.',
      action: 'Open Messages',
      actionNav: 'messages',
      accent: '#22c55e',
      badge: null,
    },
    squads: {
      icon: 'diversity_3',
      title: 'Squads',
      subtitle: 'Group spaces — coming soon',
      desc: 'Create and join squads to collaborate, play, and share with groups of friends. Launching in a future update.',
      action: null,
      accent: '#a855f7',
      badge: 'Soon',
    },
    activity: {
      icon: 'bolt',
      title: 'Activity',
      subtitle: 'Recent events',
      desc: 'Track likes, new followers, squad invites, and system alerts all in one place. Activity feed is being built.',
      action: null,
      accent: '#f59e0b',
      badge: 'Soon',
    },
    notifications: {
      icon: 'notifications',
      title: 'Notifications',
      subtitle: 'Your alerts',
      desc: 'Friend requests, mentions, and system alerts will appear here. Notification hub is being built.',
      action: null,
      accent: '#60a5fa',
      badge: 'Soon',
    },
    settings: {
      icon: 'settings',
      title: 'Settings',
      subtitle: 'Preferences & account',
      desc: 'Manage your account, privacy, appearance, and notification settings from the POXY main app.',
      action: 'Open POXY Settings',
      actionExit: true,
      accent: '#9ca3af',
      badge: null,
    },
  };

  function renderModulePage(nav) {
    const def = MODULE_DEFS[nav];
    if (!def) return `<div class="lc-module-placeholder-inner"><p>Unknown module.</p></div>`;
    const accentRgb = def.accent;
    const friends = nav === 'friends' ? state.friends.slice(0, 18) : null;
    const friendsHtml = friends && friends.length
      ? `<div class="lc-module-friends-grid">${friends.map((f) => `
        <button type="button" class="lc-module-friend-card" onclick="window.LuminaChatOS.openChatWith('${f.id}')">
          <div class="lc-module-friend-av">${f.avatar_emoji || '👾'}</div>
          <span class="lc-module-friend-name">${U.esc(f.display_name || f.username || 'Friend')}</span>
          <span class="lc-module-friend-handle">@${U.esc(f.username || '–')}</span>
        </button>`).join('')}</div>`
      : '';
    return `
      <div class="lc-module-placeholder-inner">
        <div class="lc-module-hero-glow" style="--accent:${accentRgb}"></div>
        <div class="lc-module-hero-icon-wrap" style="--accent:${accentRgb}">
          <span class="material-symbols-outlined lc-module-hero-icon">${def.icon}</span>
          ${def.badge ? `<span class="lc-module-hero-badge">${def.badge}</span>` : ''}
        </div>
        <h2 class="lc-module-hero-title">${def.title}</h2>
        <p class="lc-module-hero-sub">${def.subtitle}</p>
        <p class="lc-module-hero-desc">${def.desc}</p>
        ${def.action ? `<button type="button" class="lc-module-hero-action" style="--accent:${accentRgb}" onclick="${def.actionExit ? `document.getElementById('lcExitOs')?.click()` : `window.LuminaChatOS_setNav&&window.LuminaChatOS_setNav('${def.actionNav}')`}">${def.action}</button>` : ''}
        ${friendsHtml}
      </div>`;
  }

  window.LuminaChatOS_setNav = null;

  function setNav(nav) {
    state.activeNav = nav;
    savePersisted({ activeNav: nav });
    document.querySelectorAll('.lc-nav-item').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.nav === nav);
    });
    const main = U.$('lcMain');
    const moduleHost = U.$('lcModuleHost');
    const shell = U.$('lcShell');
    if (nav === 'messages') {
      main?.classList.remove('lc-hidden');
      if (moduleHost) { moduleHost.classList.add('lc-hidden'); moduleHost.innerHTML = ''; }
      shell?.classList.remove('layout-module');
      shell?.classList.add('layout-messages');
    } else {
      main?.classList.add('lc-hidden');
      shell?.classList.remove('layout-messages');
      shell?.classList.add('layout-module');
      if (moduleHost) {
        moduleHost.classList.remove('lc-hidden');
        if (nav === 'squads' && window.LuminaClanSystem) {
          moduleHost.innerHTML = '';
          window.LuminaClanSystem.renderClanModule(state.currentUser?.id || '');
        } else {
          moduleHost.innerHTML = renderModulePage(nav);
        }
        moduleHost.style.animation = 'none';
        requestAnimationFrame(() => {
          moduleHost.style.animation = '';
          moduleHost.classList.add('lc-module-entering');
          setTimeout(() => moduleHost.classList.remove('lc-module-entering'), 350);
        });
      }
    }
    window.LuminaChatOS_setNav = (n) => setNav(n);
  }

  // Expose state for widgets
  window._lcState = state;

  function bindUi() {
    document.querySelectorAll('.lc-nav-item').forEach((btn) => {
      btn.onclick = () => setNav(btn.dataset.nav);
    });

    // Widget compose buttons
    U.$('lcWidgetTrade')?.addEventListener('click', async () => {
      if (!state.selectedId || !state.currentUser) return;
      const W = window.LuminaWidgets;
      if (!W) return;
      const peer = state.friends.find((f) => f.id === state.selectedId);
      // Fetch user poxy for selection
      const { data: poxy } = await sb.from('user_poxy').select('id,poxy_tier').eq('user_id', state.currentUser.id).limit(12);
      W.showTradeComposer(state.selectedId, peer?.displayName || 'Friend', state.currentUser.id, poxy || []);
    });

    U.$('lcWidgetDuel')?.addEventListener('click', async () => {
      if (!state.selectedId || !state.currentUser) return;
      const W = window.LuminaWidgets;
      if (!W) return;
      const peer = state.friends.find((f) => f.id === state.selectedId);
      const { data: poxy } = await sb.from('user_poxy').select('id,poxy_tier').eq('user_id', state.currentUser.id).limit(12);
      W.showDuelComposer(state.selectedId, peer?.displayName || 'Friend', state.currentUser.id, poxy || []);
    });
    U.$('lcConvSearch')?.addEventListener('input', (e) => {
      renderConvList(e.target.value);
    });
    U.$('lcComposeInput')?.addEventListener('input', (e) => {
      const v = e.target.value;
      if (state.selectedId) setDraft(state.selectedId, v);
      U.$('lcComposeSend').disabled = !v.trim();
      const typing = U.$('lcTyping');
      if (typing) {
        typing.textContent = v ? 'You are typing…' : '';
      }
    });
    U.$('lcComposeInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    U.$('lcComposeSend')?.onclick = sendMessage;
    U.$('lcComposeGif')?.onclick = () => toast('GIF picker — coming soon.');
    U.$('lcComposeEmoji')?.onclick = () => {
      const inp = U.$('lcComposeInput');
      if (inp) {
        inp.value += ' ✨';
        inp.dispatchEvent(new Event('input'));
        inp.focus();
      }
    };
    U.$('lcComposeVoice')?.onclick = () => toast('Hold to record — coming soon.');
    U.$('lcComposeAttach')?.onclick = () => toast('Attachments — coming soon.');
    U.$('lcThreadBack')?.onclick = () => {
      document.querySelector('.lc-shell')?.classList.remove('conv-open');
    };
    U.$('lcToggleContext')?.onclick = () => {
      document.querySelector('.lc-shell')?.classList.toggle('context-open');
    };
    U.$('lcOpenMain')?.onclick = () => {
      window.location.href = CFG.MAIN_APP;
    };
    U.$('lcNavLogout')?.onclick = async () => {
      await sb.auth.signOut();
      window.location.href = CFG.MAIN_APP;
    };
  }

  async function boot() {
    const bootEl = U.$('lcBoot');
    const shell = U.$('lcShell');
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) {
      if (bootEl) bootEl.classList.remove('lc-hidden');
      return;
    }
    state.currentUser = session.user;
    await loadProfile();
    try {
      await loadFriends();
    } catch (e) {
      toast('Could not load friends.');
    }
    const persisted = loadPersisted();
    if (persisted.activeNav) setNav(persisted.activeNav);
    else setNav('messages');
    renderConvList();
    if (bootEl) bootEl.classList.add('lc-hidden');
    if (shell) shell.classList.add('is-ready');
    bindUi();
    const params = new URLSearchParams(window.location.search);
    const deepUser = params.get('user') || params.get('with');
    const target = U.isUuid(deepUser)
      ? deepUser
      : persisted.selectedChatId;
    if (target && state.friends.some((f) => f.id === target)) {
      await selectConversation(target);
    }
    sb.auth.onAuthStateChange((event, sess) => {
      if (event === 'SIGNED_OUT' || !sess) {
        window.location.href = CFG.MAIN_APP;
      }
    });
  }

  window.LuminaChatOS = {
    openChatWith(userId) {
      if (state.currentUser && U.isUuid(userId)) selectConversation(userId);
    },
    launchUrl(peerId) {
      const base = CFG.CHAT_APP;
      const q = peerId && U.isUuid(peerId) ? '?user=' + encodeURIComponent(peerId) : '';
      return base + q;
    },
  };

  boot();
})();
