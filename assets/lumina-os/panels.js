/**
 * Lumina OS — module panels (Friends, Squads, Activity, Notifications, Settings).
 */
(function (global) {
  const C = global.LuminaOSComponents;
  const Store = global.LuminaOSStore;
  const Data = global.LuminaOSData;
  const U = global.LuminaChatUtil;

  function host() {
    return document.getElementById('lcModuleHost');
  }

  function toast(msg) {
    if (global.LuminaOSApp && global.LuminaOSApp.toast) {
      global.LuminaOSApp.toast(msg);
    } else if (typeof global.showToast === 'function') {
      global.showToast(msg);
    }
  }

  function getFriends() {
    const rt = global.LuminaOSApp && global.LuminaOSApp.getRuntime
      ? global.LuminaOSApp.getRuntime()
      : { friends: [] };
    return rt.friends || [];
  }

  function renderFriends() {
    const root = host();
    if (!root) return;
    const st = Store.getState();
    const q = (st.friendsSearch || '').toLowerCase();
    const friends = getFriends().filter(
      (f) =>
        !q ||
        (f.displayName || '').toLowerCase().includes(q) ||
        (f.handle || '').toLowerCase().includes(q)
    );
    const online = friends.length;

    root.innerHTML = '';
    const scroll = C.el('div', 'lo-module-scroll');

    const head = C.el('header', 'lo-module-head');
    head.appendChild(C.el('h2', 'lo-module-title', { text: 'Friends Hub' }));
    head.appendChild(
      C.el('p', 'lo-module-sub', {
        text: 'Connect, trade, and message your inner circle.',
      })
    );
    const searchRow = C.el('div', 'lo-module-toolbar');
    const search = C.glassCard(null, { inset: true });
    search.classList.add('lo-search-inset');
    search.innerHTML =
      '<span class="material-symbols-outlined">search</span><input type="search" id="loFriendsSearch" placeholder="Search friends or @username…" autocomplete="off" value="' +
      U.sanitizeText(st.friendsSearch || '') +
      '">';
    searchRow.appendChild(search);
    searchRow.appendChild(
      C.el('span', 'lo-online-pill', {
        text: online + ' friends · ' + (st.onlineFriendsCount || online) + ' online',
      })
    );
    scroll.appendChild(head);
    scroll.appendChild(searchRow);

    const grid = C.el('div', 'lo-friends-grid');
    friends.forEach((f) => {
      const card = C.glassCard(null, {});
      card.classList.add('lo-friend-passport');
      card.appendChild(C.avatar(f.avatar_url, { lg: true, status: 'online' }));
      card.appendChild(
        C.el('h3', 'lo-friend-name', { text: f.displayName || f.handle })
      );
      card.appendChild(
        C.el('p', 'lo-friend-handle', {
          html: '<span class="lo-handle-at">@</span>' + U.sanitizeText(f.handle),
        })
      );
      const actions = C.el('div', 'lo-friend-actions');
      actions.appendChild(
        C.secondaryButton('Message', {
          small: true,
          onClick: () => {
            Store.setState({ activeNav: 'messages' });
            if (global.LuminaOSApp && global.LuminaOSApp.openMessagesWith) {
              global.LuminaOSApp.openMessagesWith(f.id);
            }
          },
        })
      );
      actions.appendChild(
        C.secondaryButton('Profile', {
          small: true,
          onClick: () => {
            if (typeof global.openFriendProfileView === 'function') {
              global.openFriendProfileView(f.id);
            } else toast('Open profile from POXY Friends page.');
          },
        })
      );
      actions.appendChild(
        C.secondaryButton('Trade', {
          small: true,
          onClick: () => toast('Trade flow opens from POXY Market.'),
        })
      );
      card.appendChild(actions);
      grid.appendChild(card);
    });

    const addCard = C.glassCard(null, { inset: true });
    addCard.classList.add('lo-friend-add');
    addCard.innerHTML =
      '<span class="material-symbols-outlined">person_add</span><h3>Add New Friend</h3><p>Expand your network on POXY</p>';
    addCard.onclick = () => {
      if (typeof global.showPage === 'function') {
        global.LuminaOSRouter.exit();
        global.showPage('friends');
      }
    };
    grid.appendChild(addCard);
    scroll.appendChild(grid);

    const feedSec = C.el('section', 'lo-activity-bento');
    feedSec.appendChild(C.el('h3', 'lo-bento-title', { text: 'Recent Activity' }));
    const feedList = C.el('div', 'lo-feed-list');
    (st.activityFeed || []).slice(0, 3).forEach((item) => {
      const row = C.glassCard(null, { inset: true });
      row.classList.add('lo-feed-row');
      row.innerHTML =
        '<span class="material-symbols-outlined">' +
        U.sanitizeText(item.icon || 'bolt') +
        '</span><div><p class="lo-feed-title">' +
        U.sanitizeText(item.title) +
        '</p><p class="lo-feed-time">' +
        U.sanitizeText(item.time) +
        '</p></div>';
      feedList.appendChild(row);
    });
    feedSec.appendChild(feedList);
    const world = C.glassCard(null, {});
    world.innerHTML =
      '<span class="material-symbols-outlined lo-world-icon">public</span><p class="lo-world-count">' +
      (st.onlineFriendsCount || 1204) +
      '</p><p class="lo-world-label">Friends Online Globally</p>';
    feedSec.appendChild(world);
    scroll.appendChild(feedSec);

    root.appendChild(scroll);
    const inp = document.getElementById('loFriendsSearch');
    if (inp) {
      inp.oninput = (e) => {
        Store.setState({ friendsSearch: e.target.value });
        renderFriends();
      };
    }
  }

  function renderSquads() {
    const root = host();
    if (!root) return;
    const st = Store.getState();
    let squads = st.squads || [];
    if (!squads.length && Data) squads = Data.seedSquads();

    root.innerHTML = '';
    const scroll = C.el('div', 'lo-module-scroll');
    const head = C.el('header', 'lo-module-head');
    head.appendChild(C.el('h2', 'lo-module-title', { text: 'Tactical Squads' }));
    head.appendChild(
      C.el('p', 'lo-module-sub', {
        text: 'Coordinate, dominate, and climb the global leaderboards.',
      })
    );
    const toolbar = C.el('div', 'lo-module-toolbar');
    toolbar.appendChild(
      C.secondaryButton(st.squadsFilter === 'all' ? 'All Regions' : st.squadsFilter, {
        onClick: () => {
          const order = ['all', 'EU-WEST', 'NA-EAST', 'APAC'];
          const i = order.indexOf(st.squadsFilter || 'all');
          Store.setState({ squadsFilter: order[(i + 1) % order.length] });
          renderSquads();
        },
      })
    );
    toolbar.appendChild(
      C.secondaryButton('Sort: ' + (st.squadsSort || 'winRate'), {
        onClick: () => {
          Store.setState({
            squadsSort: st.squadsSort === 'winRate' ? 'totalPc' : 'winRate',
          });
          renderSquads();
        },
      })
    );
    scroll.appendChild(head);
    scroll.appendChild(toolbar);

    const filtered =
      st.squadsFilter && st.squadsFilter !== 'all'
        ? squads.filter((s) => s.region === st.squadsFilter)
        : squads;
    const sorted = filtered.slice().sort((a, b) => {
      if (st.squadsSort === 'totalPc') return b.totalPc - a.totalPc;
      return b.winRate - a.winRate;
    });

    const grid = C.el('div', 'lo-squads-grid');
    sorted.forEach((sq) => {
      const card = C.glassCard(null, {});
      card.classList.add('lo-squad-card');
      const top = C.el('div', 'lo-squad-top');
      top.innerHTML =
        '<div class="lo-squad-icon"><span class="material-symbols-outlined">' +
        U.sanitizeText(sq.icon) +
        '</span></div><div class="lo-squad-meta"><span class="lo-squad-league">' +
        U.sanitizeText(sq.league) +
        '</span><span class="lo-squad-active">' +
        sq.active +
        '/' +
        sq.capacity +
        ' ACTIVE</span></div>';
      card.appendChild(top);
      card.appendChild(C.el('h3', 'lo-squad-name', { text: sq.name }));
      card.appendChild(C.el('p', 'lo-squad-motto', { text: '"' + sq.motto + '"' }));
      const stats = C.el('div', 'lo-squad-stats');
      const w1 = C.glassCard(null, { inset: true });
      w1.innerHTML =
        '<span class="lo-stat-label">Win Rate</span><span class="lo-stat-val lo-stat-val--primary">' +
        sq.winRate +
        '%</span>';
      w1.appendChild(C.winRateChart(sq.winRate));
      const w2 = C.glassCard(null, { inset: true });
      w2.innerHTML =
        '<span class="lo-stat-label">Total PC</span><span class="lo-stat-val">' +
        sq.totalPc.toLocaleString() +
        '</span>';
      stats.appendChild(w1);
      stats.appendChild(w2);
      card.appendChild(stats);
      const foot = C.el('div', 'lo-squad-foot');
      const avRow = C.el('div', 'lo-squad-avatars');
      (sq.members || []).forEach((m) => {
        avRow.appendChild(C.avatar(m, { sm: true }));
      });
      foot.appendChild(avRow);
      const req = (st.squadRequests || {})[sq.id] || sq.joinState || 'idle';
      let btnLabel = 'Join Squad';
      let disabled = false;
      if (sq.active >= sq.capacity) {
        btnLabel = 'Squad Full';
        disabled = true;
      } else if (req === 'pending') btnLabel = 'Pending…';
      else if (req === 'accepted') btnLabel = 'Joined';
      else if (req === 'rejected') {
        btnLabel = 'Request Denied';
        disabled = true;
      }
      const joinBtn = C.primaryButton(btnLabel, {
        small: true,
        disabled: disabled,
        onClick: () => {
          if (disabled || req === 'pending' || req === 'accepted') return;
          const next = { ...(st.squadRequests || {}) };
          next[sq.id] = 'pending';
          Store.setState({ squadRequests: next });
          toast('Join request sent to ' + sq.name);
          setTimeout(() => {
            const n2 = { ...Store.getState().squadRequests };
            n2[sq.id] = 'accepted';
            Store.setState({ squadRequests: n2 });
            renderSquads();
          }, 1400);
          renderSquads();
        },
      });
      foot.appendChild(joinBtn);
      card.appendChild(foot);
      grid.appendChild(card);
    });

    const createCard = C.glassCard(null, { inset: true });
    createCard.classList.add('lo-squad-create');
    createCard.innerHTML =
      '<span class="material-symbols-outlined">add</span><h3>Form New Squad</h3><p>Gather your friends and climb the ranks.</p>';
    createCard.onclick = () => openCreateSquadModal();
    grid.appendChild(createCard);
    scroll.appendChild(grid);
    root.appendChild(scroll);
  }

  function openCreateSquadModal() {
    const form = C.el('div', 'lo-form');
    const nameInp = C.el('input', 'lo-input', {
      type: 'text',
      placeholder: 'Squad name',
      maxlength: '32',
    });
    nameInp.id = 'loSquadName';
    const mottoInp = C.el('input', 'lo-input', {
      type: 'text',
      placeholder: 'Squad motto',
      maxlength: '80',
    });
    form.appendChild(nameInp);
    form.appendChild(mottoInp);
    C.modalBase(
      'Create Tactical Squad',
      form,
      [
        C.secondaryButton('Cancel', {
          onClick: () =>
            document.querySelector('.lo-modal-overlay')?.remove(),
        }),
        C.primaryButton('Create', {
          onClick: () => {
            const name = nameInp.value.trim();
            if (!name) {
              toast('Enter a squad name.');
              return;
            }
            const st = Store.getState();
            const squads = (st.squads || Data.seedSquads()).slice();
            squads.push({
              id: 'sq-custom-' + Date.now(),
              name: name,
              motto: mottoInp.value.trim() || 'Ready when you are.',
              league: 'Open Rank',
              winRate: 0,
              totalPc: 0,
              active: 1,
              capacity: 5,
              icon: 'groups',
              members: ['👾'],
              joinState: 'accepted',
            });
            Store.setState({ squads });
            document.querySelector('.lo-modal-overlay')?.remove();
            toast('Squad "' + name + '" created.');
            renderSquads();
          },
        }),
      ]
    );
  }

  function renderActivity() {
    const root = host();
    if (!root) return;
    const st = Store.getState();
    const items = st.activityFeed && st.activityFeed.length ? st.activityFeed : Data.seedActivity();

    root.innerHTML = '';
    const scroll = C.el('div', 'lo-module-scroll lo-activity-page');
    scroll.appendChild(C.el('h2', 'lo-module-title', { text: 'Recent Activity' }));
    scroll.appendChild(
      C.el('p', 'lo-module-sub', {
        text: 'Tracking your digital evolution in Lumina OS',
      })
    );

    const byDay = {};
    items.forEach((it) => {
      const d = it.day || 'Earlier';
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(it);
    });

    Object.keys(byDay).forEach((day) => {
      const sec = C.el('section', 'lo-timeline-day');
      sec.appendChild(C.el('h3', 'lo-timeline-label', { text: day }));
      const list = C.el('div', 'lo-timeline-list');
      byDay[day].forEach((it) => {
        const card = C.glassCard(null, {});
        card.classList.add('lo-timeline-card');
        card.appendChild(
          C.el('span', 'material-symbols-outlined lo-timeline-icon lo-tone-' + (it.tone || 'primary'), {
            text: it.icon,
          })
        );
        const body = C.el('div', 'lo-timeline-body');
        body.appendChild(C.el('h4', '', { text: it.title }));
        body.appendChild(C.el('p', '', { text: it.body }));
        body.appendChild(C.el('span', 'lo-timeline-time', { text: it.time }));
        if (it.actions) {
          const acts = C.el('div', 'lo-timeline-actions');
          acts.appendChild(C.primaryButton('Accept', { small: true }));
          acts.appendChild(C.secondaryButton('Decline', { small: true }));
          body.appendChild(acts);
        }
        card.appendChild(body);
        list.appendChild(card);
      });
      sec.appendChild(list);
      scroll.appendChild(sec);
    });
    root.appendChild(scroll);
  }

  function renderNotifications() {
    const root = host();
    if (!root) return;
    const st = Store.getState();
    const list = st.notifications && st.notifications.length ? st.notifications : Data.seedNotifications();
    const unread = list.filter((n) => n.unread).length;

    root.innerHTML = '';
    const scroll = C.el('div', 'lo-module-scroll');
    const head = C.el('header', 'lo-module-head lo-notif-head');
    head.appendChild(C.el('h2', 'lo-module-title', { text: 'Notifications' }));
    head.appendChild(
      C.el('p', 'lo-module-sub', {
        html:
          'You have <strong>' +
          unread +
          ' unread</strong> messages across your ecosystem.',
      })
    );
    const tools = C.el('div', 'lo-module-toolbar');
    tools.appendChild(
      C.secondaryButton('Mark as Read', {
        onClick: () => {
          const next = list.map((n) => ({ ...n, unread: false }));
          Store.setState({ notifications: next });
          updateNotifBadge();
          renderNotifications();
        },
      })
    );
    tools.appendChild(
      C.secondaryButton('Clear All', {
        onClick: () => {
          Store.setState({ notifications: [] });
          updateNotifBadge();
          renderNotifications();
        },
      })
    );
    scroll.appendChild(head);
    scroll.appendChild(tools);

    const groups = {};
    list.forEach((n) => {
      const g = n.group || 'Earlier';
      if (!groups[g]) groups[g] = [];
      groups[g].push(n);
    });
    Object.keys(groups).forEach((g) => {
      scroll.appendChild(C.el('h3', 'lo-notif-group', { text: g }));
      groups[g].forEach((n) => {
        const card = C.glassCard(null, { inset: !n.unread });
        card.classList.add('lo-notif-card');
        if (n.unread) card.classList.add('is-unread');
        card.innerHTML =
          '<span class="material-symbols-outlined lo-notif-icon">' +
          U.sanitizeText(n.icon) +
          '</span><div class="lo-notif-body"><h4>' +
          U.sanitizeText(n.title) +
          '</h4><p>' +
          U.sanitizeText(n.body) +
          '</p><span class="lo-notif-time">' +
          U.sanitizeText(n.time) +
          '</span></div>';
        scroll.appendChild(card);
      });
    });
    root.appendChild(scroll);
    updateNotifBadge();
  }

  function updateNotifBadge() {
    const st = Store.getState();
    const list = st.notifications || [];
    const unread = list.filter((n) => n.unread).length;
    const badge = document.getElementById('lcNavNotifBadge');
    if (badge) {
      if (unread > 0) {
        badge.hidden = false;
        badge.textContent = String(unread);
      } else badge.hidden = true;
    }
  }

  function renderSettings() {
    const root = host();
    if (!root) return;
    const st = Store.getState();
    const resolved =
      global.LuminaOSTheme && global.LuminaOSTheme.getResolvedTheme
        ? global.LuminaOSTheme.getResolvedTheme()
        : 'light';

    root.innerHTML = '';
    const scroll = C.el('div', 'lo-module-scroll lo-settings-page');
    scroll.appendChild(C.el('h2', 'lo-module-title', { text: 'Global Settings' }));
    scroll.appendChild(
      C.el('p', 'lo-module-sub', {
        text: 'Manage your ecosystem preferences and Lumina OS appearance.',
      })
    );

    const appearance = C.glassCard(null, {});
    appearance.classList.add('lo-settings-card');
    appearance.appendChild(
      C.el('h3', 'lo-settings-card-title', {
        html: '<span class="material-symbols-outlined">palette</span> Appearance',
      })
    );
    const themeRow = C.el('div', 'lo-theme-picker');
    ['light', 'dark', 'system'].forEach((mode) => {
      const cur =
        global.LuminaOSTheme && global.LuminaOSTheme.getTheme
          ? global.LuminaOSTheme.getTheme()
          : st.theme;
      const btn = C.el('button', 'lo-theme-opt' + (cur === mode ? ' is-active' : ''));
      btn.type = 'button';
      btn.textContent =
        mode === 'light' ? 'SICHA Light' : mode === 'dark' ? 'Lumina Dark' : 'System';
      btn.onclick = () => {
        Store.setState({ theme: mode });
        if (global.setTheme) global.setTheme(mode);
        renderSettings();
      };
      themeRow.appendChild(btn);
    });
    appearance.appendChild(themeRow);
    appearance.appendChild(
      C.primaryButton('Toggle theme', {
        onClick: () => {
          if (global.toggleTheme) global.toggleTheme();
          const r = global.LuminaOSTheme.getResolvedTheme();
          Store.setState({ theme: r });
          renderSettings();
        },
      })
    );
    scroll.appendChild(appearance);

    const prefs = C.glassCard(null, {});
    prefs.classList.add('lo-settings-card');
    prefs.innerHTML = '<h3 class="lo-settings-card-title"><span class="material-symbols-outlined">tune</span> Preferences</h3>';
    const sounds = C.el('label', 'lo-switch-row');
    sounds.innerHTML =
      '<span>HUD sounds</span><input type="checkbox" id="loPrefSounds"' +
      (st.preferences.sounds ? ' checked' : '') +
      '>';
    const enter = C.el('label', 'lo-switch-row');
    enter.innerHTML =
      '<span>Enter to send</span><input type="checkbox" id="loPrefEnter"' +
      (st.preferences.enterToSend ? ' checked' : '') +
      '>';
    prefs.appendChild(sounds);
    prefs.appendChild(enter);
    scroll.appendChild(prefs);

    const link = C.glassCard(null, {});
    link.innerHTML =
      '<p>Account security, password, and POXY profile settings remain on the main app.</p>';
    link.appendChild(
      C.primaryButton('Open POXY Settings', {
        onClick: () => {
          if (typeof global.openProfileSettings === 'function') {
            global.LuminaOSRouter.exit();
            global.openProfileSettings();
          }
        },
      })
    );
    scroll.appendChild(link);
    root.appendChild(scroll);

    const ps = document.getElementById('loPrefSounds');
    const pe = document.getElementById('loPrefEnter');
    if (ps) {
      ps.onchange = () => {
        Store.setState({
          preferences: { ...st.preferences, sounds: ps.checked },
        });
      };
    }
    if (pe) {
      pe.onchange = () => {
        Store.setState({
          preferences: { ...st.preferences, enterToSend: pe.checked },
        });
      };
    }
  }

  function renderCalls() {
    const root = host();
    if (!root) return;
    root.innerHTML = '';
    const scroll = C.el('div', 'lo-module-scroll lo-placeholder-page');
    scroll.appendChild(C.el('h2', 'lo-module-title', { text: 'Calls' }));
    scroll.appendChild(
      C.el('p', 'lo-module-sub', {
        text: 'Voice and video channels — routing ready, media stack coming soon.',
      })
    );
    scroll.appendChild(
      C.glassCard(
        C.el('p', '', {
          text: 'Start a call from Messages using the call buttons in the thread header.',
        })
      )
    );
    root.appendChild(scroll);
  }

  const renderers = {
    messages: null,
    friends: renderFriends,
    squads: renderSquads,
    calls: renderCalls,
    activity: renderActivity,
    notifications: renderNotifications,
    settings: renderSettings,
  };

  function render(nav) {
    const shell = document.getElementById('lcShell');
    const main = document.getElementById('lcMain');
    const ctx = document.getElementById('lcContext');
    const mod = host();
    if (!shell) return;

    const isMessages = nav === 'messages';
    shell.classList.toggle('layout-messages', isMessages);
    shell.classList.toggle('layout-module', !isMessages);
    if (main) main.classList.toggle('lc-hidden', !isMessages);
    if (ctx) ctx.classList.toggle('lc-hidden', !isMessages);
    if (mod) mod.classList.toggle('lc-hidden', isMessages);

    if (!isMessages && renderers[nav]) renderers[nav]();
    updateNotifBadge();
  }

  function ensureSeeded() {
    const st = Store.getState();
    const patch = {};
    if (!st.squads || !st.squads.length) patch.squads = Data.seedSquads();
    if (!st.activityFeed || !st.activityFeed.length)
      patch.activityFeed = Data.seedActivity();
    if (!st.notifications || !st.notifications.length)
      patch.notifications = Data.seedNotifications();
    if (st.onlineFriendsCount == null) patch.onlineFriendsCount = 1204;
    if (Object.keys(patch).length) Store.setState(patch);
  }

  global.LuminaOSPanels = {
    render,
    ensureSeeded,
    updateNotifBadge,
  };
})(window);
