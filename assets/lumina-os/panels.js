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

  function loT(key) {
    return global.PoxyI18n ? global.PoxyI18n.t(key) : key;
  }

  function currentLocale() {
    if (global.PoxyI18n) return global.PoxyI18n.getLocale();
    const st = Store.getState();
    return st.preferences && st.preferences.locale ? st.preferences.locale : 'en';
  }

  function setLocale(loc) {
    if (typeof global.selectSettingsLocale === 'function') {
      global.selectSettingsLocale(loc);
      return;
    }
    if (global.PoxyI18n) global.PoxyI18n.setLocale(loc);
    const st = Store.getState();
    Store.setState({
      preferences: { ...st.preferences, locale: loc },
    });
    renderSettings();
  }

  function getFriends() {
    const rt = global.LuminaOSApp && global.LuminaOSApp.getRuntime
      ? global.LuminaOSApp.getRuntime()
      : { friends: [] };
    return rt.friends || [];
  }

  const FRIEND_MOTTOS = [
    '"Always ready for a co-op run!"',
    '"Currently studying the meta…"',
    '"Playing: Lumina Quest IV"',
    '"LF someone to trade rare cores."',
    '"Be right back, grabbing coffee."',
  ];

  function friendMotto(f, index) {
    if (f.statusQuote) return '"' + f.statusQuote + '"';
    return FRIEND_MOTTOS[index % FRIEND_MOTTOS.length];
  }

  function friendPresence(index) {
    if (index % 5 === 4) return 'away';
    if (index % 4 === 1) return 'offline';
    return 'online';
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

    root.innerHTML = '';
    const canvas = C.el('div', 'lo-module-canvas lo-friends-page');
    canvas.appendChild(
      C.moduleTopBar({
        placeholder: 'Search friends or groups...',
        searchId: 'loFriendsSearch',
        searchValue: st.friendsSearch || '',
        onSearch: (v) => {
          Store.setState({ friendsSearch: v });
          renderFriends();
        },
        onNotifications: () => {
          if (global.LuminaOSApp && global.LuminaOSApp.setNav) {
            global.LuminaOSApp.setNav('notifications');
          }
        },
      })
    );

    const scroll = C.el('div', 'lo-module-scroll');
    const pageHead = C.el('div', 'lo-page-header');
    pageHead.appendChild(C.el('h2', 'lo-module-title', { text: 'Friends Hub' }));
    pageHead.appendChild(
      C.el('p', 'lo-module-sub', {
        text: 'Connect, trade, and play with your inner circle.',
      })
    );
    scroll.appendChild(pageHead);

    const grid = C.el('div', 'lo-friends-grid');
    friends.forEach((f, i) => {
      const card = C.glassCard(null, { hover: true });
      card.classList.add('lo-friend-passport');
      card.appendChild(C.passportAvatar(f.avatar_url, friendPresence(i)));
      card.appendChild(
        C.el('h3', 'lo-friend-name', { text: f.displayName || f.handle })
      );
      card.appendChild(
        C.el('p', 'lo-friend-handle', {
          text: '@' + U.sanitizeText(f.handle),
        })
      );
      card.appendChild(
        C.el('p', 'lo-friend-motto', { text: friendMotto(f, i) })
      );
      const actions = C.el('div', 'lo-friend-actions');
      actions.appendChild(
        C.silkIconAction('Message', 'chat_bubble', 'primary', () => {
          if (global.LuminaOSApp && global.LuminaOSApp.openMessagesWith) {
            global.LuminaOSApp.openMessagesWith(f.id);
          }
        })
      );
      actions.appendChild(
        C.silkIconAction('Trade', 'swap_horizontal_circle', 'tertiary', () => {
          toast('Trade flow opens from POXY Market.');
        })
      );
      actions.appendChild(
        C.silkIconAction('Profile', 'person', 'muted', () => {
          if (typeof global.openFriendProfileView === 'function') {
            global.openFriendProfileView(f.id);
          } else toast('Open profile from POXY Friends page.');
        })
      );
      card.appendChild(actions);
      grid.appendChild(card);
    });

    const addCard = C.glassCard(null, { hover: true });
    addCard.classList.add('lo-friend-add');
    const addIcon = C.el('div', 'lo-friend-add-icon lo-silk-inset');
    addIcon.appendChild(C.icon('person_add'));
    addCard.appendChild(addIcon);
    addCard.appendChild(C.el('h3', '', { text: 'Add New Friend' }));
    addCard.appendChild(C.el('p', '', { text: 'Expand your network' }));
    addCard.onclick = () => {
      if (typeof global.showPage === 'function') {
        global.LuminaOSRouter.exit();
        global.showPage('friends');
      }
    };
    grid.appendChild(addCard);
    scroll.appendChild(grid);

    const bento = C.el('section', 'lo-activity-bento');
    const activityPanel = C.glassCard(null, { hover: false });
    activityPanel.classList.add('lo-bento-panel');
    const actTitle = C.el('h3', 'lo-bento-title');
    actTitle.appendChild(C.icon('history'));
    actTitle.appendChild(document.createTextNode(' Recent Activity'));
    activityPanel.appendChild(actTitle);
    const feedList = C.el('div', 'lo-feed-list');
    const feedItems = (st.activityFeed || Data.seedActivity()).slice(0, 2);
    feedItems.forEach((item, idx) => {
      const row = C.glassCard(null, { inset: true });
      row.classList.add('lo-feed-row');
      const main = C.el('div', 'lo-feed-row-main');
      const av = C.el('img', '', { alt: '' });
      av.src =
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDOOC-exFRbZTXSpqxVcQxTosumgzZuqRCDmF92MY7QwLOCP4SMt5QvsVO4IJBp-z_lrvv5OlnkRSvLF2-H1jg9kX7hWp41mfxHiBkHTEDTQrtXpRzWn9kYULPmKAgNKzkY8_EPBrO4TBQs4xHQEPROVixwyN6p7zWiQc3ULufPFGaaefTpoFvj--0u1rjr59O7QILFLyLLNNtdhPRG2eZtC0RZ7frduyc_rbhS3CrWtyjcjx79QabkaNsOf_5JaM9ilIui6Alm7g';
      main.appendChild(av);
      const text = C.el('div', '');
      const title = item.title || 'Activity';
      const parts = title.split(':');
      if (parts.length > 1) {
        text.appendChild(
          C.el('p', 'lo-feed-title', {
            html:
              '<strong>' +
              U.sanitizeText(parts[0].trim()) +
              '</strong> <span>' +
              U.sanitizeText(parts.slice(1).join(':').trim()) +
              '</span>',
          })
        );
      } else {
        text.appendChild(C.el('p', 'lo-feed-title', { text: title }));
      }
      text.appendChild(C.el('p', 'lo-feed-time', { text: item.time || '' }));
      main.appendChild(text);
      row.appendChild(main);
      row.appendChild(
        C.icon(item.icon === 'group_add' ? 'group_add' : 'military_tech', 'lo-tone-' + (item.tone || 'primary'))
      );
      feedList.appendChild(row);
    });
    activityPanel.appendChild(feedList);
    bento.appendChild(activityPanel);

    const worldPanel = C.glassCard(null, {});
    worldPanel.classList.add('lo-bento-panel', 'lo-world-panel');
    worldPanel.appendChild(C.el('h3', 'lo-bento-title', { text: 'World Status' }));
    const iconWrap = C.el('div', 'lo-world-icon-wrap lo-silk-inset');
    iconWrap.appendChild(C.icon('public', 'lo-world-icon'));
    worldPanel.appendChild(iconWrap);
    worldPanel.appendChild(
      C.el('p', 'lo-world-count', {
        text: String(st.onlineFriendsCount || 1204),
      })
    );
    worldPanel.appendChild(
      C.el('p', 'lo-world-label', { text: 'Friends Online Globally' })
    );
    const cta = C.el('button', 'lo-world-cta', { type: 'button', text: 'Join Global Hub' });
    cta.onclick = () => toast('Global hub opens soon.');
    worldPanel.appendChild(cta);
    bento.appendChild(worldPanel);
    scroll.appendChild(bento);

    canvas.appendChild(scroll);
    root.appendChild(canvas);
  }

  function renderSquads() {
    const root = host();
    if (!root) return;
    const st = Store.getState();
    let squads = st.squads || [];
    if (!squads.length && Data) squads = Data.seedSquads();

    root.innerHTML = '';
    const canvas = C.el('div', 'lo-module-canvas lo-squads-page');
    canvas.appendChild(
      C.moduleTopBar({
        placeholder: 'Search squads...',
        onNotifications: () => global.LuminaOSApp?.setNav?.('notifications'),
      })
    );
    const scroll = C.el('div', 'lo-module-scroll');
    const headRow = C.el('div', 'lo-page-header-row');
    const headText = C.el('div', '');
    headText.appendChild(C.el('h2', 'lo-module-title', { text: 'Tactical Squads' }));
    headText.appendChild(
      C.el('p', 'lo-module-sub', {
        text: 'Coordinate, dominate, and climb the global leaderboards with your specialized strike team.',
      })
    );
    headRow.appendChild(headText);
    const filters = C.el('div', 'lo-module-toolbar');
    const chip1 = C.el('button', 'lo-silk-raised lo-filter-chip');
    chip1.type = 'button';
    chip1.appendChild(C.icon('filter_list', ''));
    chip1.appendChild(
      document.createTextNode(st.squadsFilter === 'all' ? 'All Regions' : st.squadsFilter)
    );
    chip1.onclick = () => {
      const order = ['all', 'EU-WEST', 'NA-EAST', 'APAC'];
      const i = order.indexOf(st.squadsFilter || 'all');
      Store.setState({ squadsFilter: order[(i + 1) % order.length] });
      renderSquads();
    };
    const chip2 = C.el('button', 'lo-silk-raised lo-filter-chip');
    chip2.type = 'button';
    chip2.appendChild(C.icon('sort', ''));
    chip2.appendChild(
      document.createTextNode('Win Rate')
    );
    chip2.onclick = () => {
      Store.setState({
        squadsSort: st.squadsSort === 'winRate' ? 'totalPc' : 'winRate',
      });
      renderSquads();
    };
    filters.appendChild(chip1);
    filters.appendChild(chip2);
    headRow.appendChild(filters);
    scroll.appendChild(headRow);

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
      const card = C.glassCard(null, { hover: true });
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
    canvas.appendChild(scroll);
    root.appendChild(canvas);
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
    const canvas = C.el('div', 'lo-module-canvas lo-activity-page');
    canvas.appendChild(
      C.moduleTopBar({
        placeholder: 'Search activities...',
        onNotifications: () => global.LuminaOSApp?.setNav?.('notifications'),
      })
    );
    const scroll = C.el('div', 'lo-module-scroll');
    const headRow = C.el('div', 'lo-page-header-row');
    const headText = C.el('div', '');
    headText.appendChild(C.el('h2', 'lo-module-title', { text: 'Recent Activity' }));
    headText.appendChild(
      C.el('p', 'lo-module-sub', {
        text: 'Tracking your digital evolution in Lumina OS',
      })
    );
    headRow.appendChild(headText);
    const tools = C.el('div', 'lo-module-toolbar');
    tools.appendChild(C.secondaryButton('Filter', { icon: 'filter_list' }));
    tools.appendChild(C.primaryButton('Export', { icon: 'download' }));
    headRow.appendChild(tools);
    scroll.appendChild(headRow);

    const wrap = C.el('div', 'lo-timeline-wrap');
    wrap.appendChild(C.el('div', 'lo-timeline-rail'));

    const byDay = {};
    items.forEach((it) => {
      const d = it.day || 'Earlier';
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(it);
    });

    Object.keys(byDay).forEach((day, dayIdx) => {
      const sec = C.el('section', 'lo-timeline-day');
      const marker = C.el('div', 'lo-timeline-marker');
      const dot = C.el('div', 'lo-timeline-dot' + (dayIdx > 0 ? ' is-muted' : ''));
      marker.appendChild(dot);
      marker.appendChild(C.el('span', 'lo-timeline-label', { text: day }));
      sec.appendChild(marker);
      const list = C.el('div', 'lo-timeline-list');
      byDay[day].forEach((it) => {
        const card = C.glassCard(null, { hover: true });
        card.classList.add('lo-timeline-card');
        const media = C.el('div', 'lo-timeline-media lo-silk-inset');
        if (it.icon === 'emoji_events') {
          const img = C.el('img', '', { alt: '' });
          img.src =
            'https://lh3.googleusercontent.com/aida-public/AB6AXuC5HOloVj_QNHOw5_UR8pqZq-RvKtero697Ckof4gq2fDw2H_sB9QzneMsZE9DmMKheZs1Jtzk7sbdQRsXphQnPcIiEpixcCDQDvaa1MmwyQiPm9Pqy1JHXNG3YYfgUCcP_Ea05DiA3gegUEcWxXhfeVi8QUmC4aAFL0Opde7E2FXWhZcSuYRLQ0pbLsODUjIAdC3KIY3fKPjF-PucSb0T7JxWrSqHggx4-4dlEEKocOG5dQHTbty7rN721LPY5NgBtu5uHz8A4Hw';
          media.appendChild(img);
        } else {
          media.appendChild(
            C.icon(it.icon || 'update', 'lo-timeline-icon')
          );
        }
        card.appendChild(media);
        const body = C.el('div', 'lo-timeline-body');
        const head = C.el('div', 'lo-timeline-head');
        head.appendChild(C.el('h4', '', { text: it.title }));
        head.appendChild(C.el('span', 'lo-timeline-time', { text: it.time }));
        body.appendChild(head);
        body.appendChild(C.el('p', '', { text: it.body }));
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
      wrap.appendChild(sec);
    });
    scroll.appendChild(wrap);
    canvas.appendChild(scroll);
    root.appendChild(canvas);
  }

  function renderNotifications() {
    const root = host();
    if (!root) return;
    const st = Store.getState();
    const list = st.notifications && st.notifications.length ? st.notifications : Data.seedNotifications();
    const unread = list.filter((n) => n.unread).length;

    root.innerHTML = '';
    const canvas = C.el('div', 'lo-module-canvas lo-notif-page');
    canvas.appendChild(
      C.moduleTopBar({
        placeholder: 'Search activities...',
        onNotifications: () => {},
      })
    );
    const scroll = C.el('div', 'lo-module-scroll lo-notif-feed');
    const headRow = C.el('div', 'lo-notif-head-row');
    const headText = C.el('div', '');
    headText.appendChild(C.el('h2', 'lo-module-title', { text: 'Notifications' }));
    headText.appendChild(
      C.el('p', 'lo-module-sub', {
        html:
          'You have <span class="lo-text-primary">' +
          unread +
          ' unread</span> messages across your ecosystem.',
      })
    );
    headRow.appendChild(headText);
    const tools = C.el('div', 'lo-module-toolbar');
    tools.appendChild(
      C.secondaryButton('Mark as Read', {
        icon: 'done_all',
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
        icon: 'delete_sweep',
        onClick: () => {
          Store.setState({ notifications: [] });
          updateNotifBadge();
          renderNotifications();
        },
      })
    );
    headRow.appendChild(tools);
    scroll.appendChild(headRow);

    const groups = {};
    list.forEach((n) => {
      const g = n.group || 'Earlier';
      if (!groups[g]) groups[g] = [];
      groups[g].push(n);
    });
    Object.keys(groups).forEach((g) => {
      const groupRow = C.el('div', 'lo-notif-group-row');
      groupRow.appendChild(C.el('h3', '', { text: g }));
      groupRow.appendChild(C.el('div', 'lo-notif-group-line'));
      scroll.appendChild(groupRow);
      groups[g].forEach((n) => {
        const card = C.glassCard(null, { inset: !n.unread, hover: !!n.unread });
        card.classList.add('lo-notif-card');
        if (n.unread) card.classList.add('is-unread');
        const iconWrap = C.el('div', 'lo-notif-icon-wrap lo-silk-inset');
        iconWrap.appendChild(C.icon(n.icon || 'notifications', 'lo-notif-icon'));
        card.appendChild(iconWrap);
        const body = C.el('div', 'lo-notif-body');
        const head = C.el('div', 'lo-timeline-head');
        const titleParts = (n.title || '').split(' ');
        head.appendChild(
          C.el('h4', '', {
            html: U.sanitizeText(n.title),
          })
        );
        head.appendChild(C.el('span', 'lo-notif-time', { text: n.time }));
        body.appendChild(head);
        body.appendChild(C.el('p', '', { text: n.body }));
        if (n.unread && n.icon === 'chat') {
          const acts = C.el('div', 'lo-notif-actions');
          acts.appendChild(C.secondaryButton('Reply', { small: true }));
          acts.appendChild(C.secondaryButton('Archive', { small: true }));
          body.appendChild(acts);
        }
        card.appendChild(body);
        scroll.appendChild(card);
      });
    });
    canvas.appendChild(scroll);
    root.appendChild(canvas);
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
    const canvas = C.el('div', 'lo-module-canvas lo-settings-page');
    canvas.appendChild(
      C.moduleTopBar({
        placeholder: loT('lo.nav.searchSettings'),
        onNotifications: () => global.LuminaOSApp?.setNav?.('notifications'),
      })
    );
    const scroll = C.el('div', 'lo-module-scroll');
    const pageHead = C.el('div', 'lo-page-header');
    pageHead.appendChild(C.el('h2', 'lo-module-title', { text: loT('lo.settings.title') }));
    pageHead.appendChild(
      C.el('p', 'lo-module-sub', {
        text: loT('lo.settings.subtitle'),
      })
    );
    scroll.appendChild(pageHead);

    const bento = C.el('div', 'lo-settings-bento');

    const profile = C.glassCard(null, {});
    profile.classList.add('lo-settings-card', 'lo-settings-card--8');
    const profileRow = C.el('div', 'lo-settings-profile-row');
    const who = C.el('div', '');
    const rt = global.LuminaOSApp?.getRuntime?.();
    const avUrl = rt?.profile?.avatar_url;
    const avBlock = C.el('div', 'lo-settings-profile-av lo-silk-inset');
    if (avUrl) {
      avBlock.innerHTML =
        '<img src="' + U.sanitizeText(U.avatarUrl(avUrl)) + '" alt="" class="lo-settings-av-img">';
    }
    const meta = C.el('div', '');
    meta.appendChild(
      C.el('h4', 'lo-settings-display-name', {
        text: rt?.profile
          ? U.displayNameFromProf(rt.profile)
          : 'Alex Sterling',
      })
    );
    meta.appendChild(
      C.el('p', 'lo-settings-email', {
        text: rt?.profile?.email || 'alex.sterling@lumina.io',
      })
    );
    const whoInner = C.el('div', 'lo-settings-who');
    whoInner.appendChild(avBlock);
    whoInner.appendChild(meta);
    who.appendChild(whoInner);
    profileRow.appendChild(who);
    profileRow.appendChild(
      C.secondaryButton(loT('lo.settings.editProfile'), {
        onClick: () => {
          if (typeof global.openProfileSettings === 'function') {
            global.LuminaOSRouter.exit();
            global.openProfileSettings();
          }
        },
      })
    );
    profile.appendChild(profileRow);
    const fields = C.el('div', 'lo-settings-fields');
    const f1 = C.el('div', '');
    f1.appendChild(C.el('label', 'lo-field-label', { text: loT('lo.settings.displayName') }));
    f1.appendChild(
      C.el('div', 'lo-field-value lo-silk-inset', {
        text: rt?.profile ? U.displayNameFromProf(rt.profile) : 'Alex Sterling',
      })
    );
    const f2 = C.el('div', '');
    f2.appendChild(C.el('label', 'lo-field-label', { text: loT('lo.settings.timezone') }));
    const tz = C.el('div', 'lo-field-value lo-silk-inset');
    tz.appendChild(document.createTextNode('UTC -05:00 (EST)'));
    tz.appendChild(C.icon('expand_more'));
    f2.appendChild(tz);
    const fLang = C.el('div', 'lo-settings-field-lang');
    fLang.appendChild(C.el('label', 'lo-field-label', { text: loT('lo.settings.language') }));
    const langRow = C.el('div', 'lo-lang-picker');
    const locCur = currentLocale();
    [
      ['en', loT('settings.language.en')],
      ['ru', loT('settings.language.ru')],
    ].forEach(([loc, label]) => {
      const btn = C.el(
        'button',
        'lo-lang-btn lo-silk-raised' + (locCur === loc ? ' active' : '')
      );
      btn.type = 'button';
      btn.dataset.locale = loc;
      btn.textContent = label;
      btn.onclick = () => setLocale(loc);
      langRow.appendChild(btn);
    });
    fLang.appendChild(langRow);
    fields.appendChild(f1);
    fields.appendChild(f2);
    fields.appendChild(fLang);
    profile.appendChild(fields);
    bento.appendChild(profile);

    const security = C.glassCard(null, {});
    security.classList.add('lo-settings-card', 'lo-settings-card--4');
    security.appendChild(C.el('h3', 'lo-settings-card-title', { text: loT('lo.settings.security') }));
    const sec1 = C.el('div', 'lo-security-row');
    const sec1Icon = C.el('div', 'lo-sec-icon-wrap lo-silk-inset');
    sec1Icon.appendChild(C.icon('verified_user', 'lo-sec-icon lo-sec-icon--ok'));
    sec1.appendChild(sec1Icon);
    const s1t = C.el('div', '');
    s1t.appendChild(C.el('p', 'lo-sec-title', { text: loT('lo.settings.2fa') }));
    s1t.appendChild(C.el('p', 'lo-sec-sub', { text: loT('lo.settings.2faSub') }));
    sec1.appendChild(s1t);
    security.appendChild(sec1);
    const sec2 = C.el('div', 'lo-security-row');
    const sec2Icon = C.el('div', 'lo-sec-icon-wrap lo-silk-inset');
    sec2Icon.appendChild(C.icon('report_problem', 'lo-sec-icon lo-sec-icon--warn'));
    sec2.appendChild(sec2Icon);
    const s2t = C.el('div', '');
    s2t.appendChild(C.el('p', 'lo-sec-title', { text: loT('lo.settings.recovery') }));
    s2t.appendChild(C.el('p', 'lo-sec-sub', { text: loT('lo.settings.recoverySub') }));
    sec2.appendChild(s2t);
    security.appendChild(sec2);
    security.appendChild(
      C.el('p', 'lo-sec-foot', { text: loT('lo.settings.lastActivity') })
    );
    bento.appendChild(security);

    const row2 = C.el('div', 'lo-settings-row-2');
    const inner3 = C.el('div', 'lo-settings-inner-3');

    const appearance = C.glassCard(null, {});
    appearance.classList.add('lo-settings-card');
    appearance.appendChild(
      C.el('h3', 'lo-settings-card-title', {
        html:
          '<span class="material-symbols-outlined">palette</span> ' +
          loT('lo.settings.appearance'),
      })
    );
    const themeRow = C.el('div', 'lo-theme-picker');
    const curTheme =
      global.LuminaOSTheme && global.LuminaOSTheme.getTheme
        ? global.LuminaOSTheme.getTheme()
        : st.theme;
    [
      ['light', loT('lo.settings.theme.light')],
      ['dark', loT('lo.settings.theme.dark')],
      ['system', loT('lo.settings.theme.system')],
    ].forEach(([mode, label]) => {
      themeRow.appendChild(
        C.themePreviewOption(mode, label, curTheme === mode, () => {
          Store.setState({ theme: mode });
          if (global.setTheme) global.setTheme(mode);
          renderSettings();
        })
      );
    });
    appearance.appendChild(themeRow);
    inner3.appendChild(appearance);

    const prefs = C.glassCard(null, {});
    prefs.classList.add('lo-settings-card');
    prefs.appendChild(
      C.el('h3', 'lo-settings-card-title', {
        html:
          '<span class="material-symbols-outlined">notifications_active</span> ' +
          loT('lo.settings.smartNotif'),
      })
    );
    const pref1 = C.el('div', 'lo-pref-row');
    const pref1Text = C.el('div', '');
    pref1Text.appendChild(C.el('strong', '', { text: loT('lo.settings.alerts') }));
    pref1Text.appendChild(
      C.el('small', '', { text: loT('lo.settings.alertsSub') })
    );
    pref1.appendChild(pref1Text);
    pref1.appendChild(C.silkSwitch('loPrefSounds', st.preferences.sounds));
    const pref2 = C.el('div', 'lo-pref-row');
    const pref2Text = C.el('div', '');
    pref2Text.appendChild(C.el('strong', '', { text: loT('lo.settings.marketing') }));
    pref2Text.appendChild(
      C.el('small', '', { text: loT('lo.settings.marketingSub') })
    );
    pref2.appendChild(pref2Text);
    pref2.appendChild(
      C.silkSwitch('loPrefMarketing', !!st.preferences.marketingEmails)
    );
    const pref3 = C.el('div', 'lo-pref-row');
    const pref3Text = C.el('div', '');
    pref3Text.appendChild(C.el('strong', '', { text: loT('lo.settings.enterSend') }));
    pref3Text.appendChild(
      C.el('small', '', { text: loT('lo.settings.enterSendSub') })
    );
    pref3.appendChild(pref3Text);
    pref3.appendChild(C.silkSwitch('loPrefEnter', st.preferences.enterToSend));
    prefs.appendChild(pref1);
    prefs.appendChild(pref2);
    prefs.appendChild(pref3);
    inner3.appendChild(prefs);
    row2.appendChild(inner3);
    bento.appendChild(row2);

    const privacy = C.glassCard(null, {});
    privacy.classList.add('lo-settings-card', 'lo-settings-card--12');
    privacy.appendChild(
      C.el('h3', 'lo-settings-card-title', {
        html:
          '<span class="material-symbols-outlined">lock</span> ' + loT('lo.settings.privacy'),
      })
    );
    const privacyGrid = C.el('div', 'lo-settings-privacy-grid');
    const privacyLeft = C.el('div', '');
    const storageHead = C.el('div', 'lo-storage-head');
    storageHead.appendChild(C.el('span', '', { text: loT('lo.settings.storage') }));
    const pctLabel = C.el('span', 'lo-storage-pct', { text: loT('lo.settings.storagePct') });
    storageHead.appendChild(pctLabel);
    privacyLeft.appendChild(storageHead);
    const track = C.el('div', 'lo-storage-track lo-silk-inset');
    const fill = C.el('div', 'lo-storage-fill');
    fill.style.width = '85%';
    track.appendChild(fill);
    privacyLeft.appendChild(track);
    privacyLeft.appendChild(
      C.el('p', 'lo-storage-meta', { text: loT('lo.settings.storageMeta') })
    );
    const storageActions = C.el('div', 'lo-storage-actions');
    storageActions.appendChild(
      C.secondaryButton(loT('lo.settings.manageStorage'), {
        onClick: () => toast('Storage manager — coming soon.'),
      })
    );
    storageActions.appendChild(
      C.secondaryButton(loT('lo.settings.exportData'), {
        onClick: () => toast('Export started — you will receive an email.'),
      })
    );
    privacyLeft.appendChild(storageActions);
    privacyGrid.appendChild(privacyLeft);

    const privacyRight = C.el('div', 'lo-cloud-sync lo-silk-inset');
    privacyRight.appendChild(C.icon('cloud_done'));
    const cloudBody = C.el('div', 'lo-cloud-sync-body');
    cloudBody.appendChild(C.el('p', 'lo-cloud-title', { text: loT('lo.settings.cloud') }));
    cloudBody.appendChild(
      C.el('p', 'lo-cloud-desc', {
        text: loT('lo.settings.cloudDesc'),
      })
    );
    const tags = C.el('div', 'lo-device-tags');
    ['IPHONE', 'MACBOOK PRO', 'LUMINA PAD'].forEach((t) => {
      tags.appendChild(C.el('span', 'lo-device-tag', { text: t }));
    });
    cloudBody.appendChild(tags);
    privacyRight.appendChild(cloudBody);
    privacyGrid.appendChild(privacyRight);
    privacy.appendChild(privacyGrid);
    bento.appendChild(privacy);

    const actions = C.el('div', 'lo-settings-actions');
    actions.appendChild(
      C.secondaryButton(loT('lo.settings.discard'), {
        onClick: () => toast(loT('lo.toast.discarded')),
      })
    );
    actions.appendChild(
      C.primaryButton(loT('lo.settings.save'), {
        onClick: () => toast(loT('lo.toast.saved')),
      })
    );
    bento.appendChild(actions);

    scroll.appendChild(bento);
    canvas.appendChild(scroll);
    root.appendChild(canvas);

    const ps = document.getElementById('loPrefSounds');
    const pm = document.getElementById('loPrefMarketing');
    const pe = document.getElementById('loPrefEnter');
    if (ps) {
      ps.onchange = () => {
        Store.setState({
          preferences: { ...st.preferences, sounds: ps.checked },
        });
      };
    }
    if (pm) {
      pm.onchange = () => {
        Store.setState({
          preferences: { ...st.preferences, marketingEmails: pm.checked },
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

  const renderers = {
    messages: null,
    friends: renderFriends,
    squads: renderSquads,
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
