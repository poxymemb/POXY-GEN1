/**
 * Lumina OS — Syndicate (Clan) System
 * Creation gate, role hierarchy, module page, right panel dashboard
 */
(function () {
  'use strict';

  const U = window.LuminaChatUtil;
  const CFG = window.LUMINA_CHAT;

  /* ─── Role hierarchy ──────────────────────────────────────────────────── */
  const ROLES = {
    leader:  { ru: 'Глава',         en: 'Leader',  rank: 4, color: '#ff008a' },
    deputy:  { ru: 'Заместитель',   en: 'Deputy',  rank: 3, color: '#a855f7' },
    veteran: { ru: 'Ветеран',       en: 'Veteran', rank: 2, color: '#f59e0b' },
    member:  { ru: 'Участник',      en: 'Member',  rank: 1, color: '#60a5fa' },
  };

  const BANNER_COLORS = [
    '#ff008a','#a855f7','#ec4899','#6366f1','#22c55e',
    '#f59e0b','#60a5fa','#f97316','#14b8a6','#e11d48',
  ];

  const CLAN_EMOJIS = [
    '⚔️','🛡️','🔥','⚡','💎','👑','🌟','🦅','🐉','🌙',
    '☠️','🎯','🌊','🦁','🔮','🗡️','🦊','🌺','❄️','🎭',
    '🏆','🌑','💀','🦋','🐺','🌈','⭐','🔱','🕷️','🦂',
  ];

  function getSb() {
    if (window._lf_sb) return window._lf_sb;
    window._lf_sb = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage },
    });
    return window._lf_sb;
  }

  function showToast(msg) {
    const t = document.getElementById('lcToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-show');
    clearTimeout(showToast._tm);
    showToast._tm = setTimeout(() => t.classList.remove('is-show'), 2800);
  }

  /* ─── canManage: can actor manage target role? ────────────────────────── */
  function canManage(actorRole, targetRole) {
    if (actorRole === 'leader') return true;
    if (actorRole === 'deputy') return ROLES[targetRole]?.rank < ROLES.deputy.rank;
    return false;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     CREATION MODAL
     ═══════════════════════════════════════════════════════════════════════ */
  async function showCreateModal(currentUserId) {
    const prev = document.getElementById('lfClanModal');
    if (prev) { prev.remove(); return; }

    const sb = getSb();
    // Fetch current balance
    const { data: prof } = await sb.from('profiles').select('balance').eq('id', currentUserId).maybeSingle();
    const balance = Math.floor(prof?.balance || 0);
    const canAfford = balance >= 1000;

    let selectedEmoji = '⚔️';
    let selectedColor = BANNER_COLORS[0];

    const overlay = document.createElement('div');
    overlay.className = 'lf-modal-overlay';
    overlay.id = 'lfClanModal';

    overlay.innerHTML = `
      <div class="lf-modal" role="dialog" aria-modal="true" aria-label="Create Syndicate">
        <div class="lf-modal-header">
          <div>
            <div class="lf-modal-title">Found a Syndicate</div>
            <div class="lf-modal-subtitle">Build your clan. Command loyalty. Dominate.</div>
          </div>
          <button type="button" class="lf-modal-close" id="lfClanModalClose">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="lf-modal-body" id="lfClanModalBody">
          <!-- Cost gate -->
          <div class="lf-cost-gate">
            <span class="lf-cost-gate-icon">💰</span>
            <div class="lf-cost-gate-text">
              <div class="lf-cost-gate-label">Founding cost</div>
              <div class="lf-cost-gate-amount">1,000 PC</div>
            </div>
            <div class="lf-cost-gate-bal">${balance.toLocaleString()} PC available</div>
          </div>

          <!-- Avatar + color picker -->
          <div class="lf-clan-avatar-row">
            <div class="lf-clan-avatar-picker" id="lfEmojiPickerToggle" title="Pick emoji">
              <span id="lfSelectedEmoji">${selectedEmoji}</span>
            </div>
            <div>
              <p class="lf-label" style="margin-bottom:8px">Banner Color</p>
              <div class="lf-clan-color-row" id="lfColorRow">
                ${BANNER_COLORS.map((c, i) => `
                  <div class="lf-color-swatch ${i === 0 ? 'is-active' : ''}"
                    data-color="${c}" style="background:${c};box-shadow:0 0 8px ${c}44"
                    title="${c}"></div>`).join('')}
              </div>
            </div>
          </div>

          <!-- Emoji grid (collapsed by default) -->
          <div class="lf-emoji-grid" id="lfEmojiGrid" style="display:none">
            ${CLAN_EMOJIS.map((e) => `
              <button type="button" class="lf-emoji-btn" data-emoji="${e}">${e}</button>`).join('')}
          </div>

          <!-- Name + Tag -->
          <div class="lf-field-row">
            <div class="lf-field">
              <label class="lf-label" for="lfClanName">Syndicate Name</label>
              <input type="text" class="lf-input" id="lfClanName"
                placeholder="e.g. Neon Wolves" maxlength="30" autocomplete="off">
            </div>
            <div class="lf-field">
              <label class="lf-label" for="lfClanTag">Tag (2–6 chars)</label>
              <input type="text" class="lf-input" id="lfClanTag"
                placeholder="e.g. NW" maxlength="6" autocomplete="off"
                style="text-transform:uppercase">
              <span class="lf-input-hint">Letters & numbers only, uppercase</span>
            </div>
          </div>

          <!-- Description -->
          <div class="lf-field">
            <label class="lf-label" for="lfClanDesc">Description</label>
            <textarea class="lf-input lf-textarea" id="lfClanDesc"
              placeholder="What is your syndicate about?" maxlength="300"></textarea>
          </div>

          <!-- Privacy toggle -->
          <div class="lf-toggle-row">
            <div class="lf-toggle-label">
              <span class="lf-toggle-label-main">Public Syndicate</span>
              <span class="lf-toggle-label-sub">Anyone can discover and request to join</span>
            </div>
            <label class="lf-toggle">
              <input type="checkbox" id="lfClanPublic" checked>
              <span class="lf-toggle-track"></span>
            </label>
          </div>
        </div>
        <div class="lf-modal-footer">
          <div class="lf-modal-error" id="lfClanError"></div>
          <button type="button" class="lf-btn-primary" id="lfClanCreateBtn" ${!canAfford ? 'disabled' : ''}>
            <span class="material-symbols-outlined">diversity_3</span>
            ${canAfford ? 'Found Syndicate — 1,000 PC' : 'Insufficient POXY Coins'}
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    // Color swatches
    overlay.querySelectorAll('.lf-color-swatch').forEach((sw) => {
      sw.onclick = () => {
        overlay.querySelectorAll('.lf-color-swatch').forEach((s) => s.classList.remove('is-active'));
        sw.classList.add('is-active');
        selectedColor = sw.dataset.color;
        const av = overlay.querySelector('#lfEmojiPickerToggle');
        if (av) av.style.borderColor = selectedColor + '88';
      };
    });

    // Emoji picker toggle
    const emojiGrid = overlay.querySelector('#lfEmojiGrid');
    overlay.querySelector('#lfEmojiPickerToggle').onclick = () => {
      emojiGrid.style.display = emojiGrid.style.display === 'none' ? 'grid' : 'none';
    };
    emojiGrid.querySelectorAll('.lf-emoji-btn').forEach((btn) => {
      btn.onclick = () => {
        selectedEmoji = btn.dataset.emoji;
        overlay.querySelector('#lfSelectedEmoji').textContent = selectedEmoji;
        emojiGrid.style.display = 'none';
      };
    });

    // Tag auto-uppercase
    const tagInput = overlay.querySelector('#lfClanTag');
    tagInput?.addEventListener('input', () => {
      tagInput.value = tagInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });

    // Close
    const closeModal = () => {
      overlay.classList.add('is-closing');
      setTimeout(() => overlay.remove(), 180);
    };
    overlay.querySelector('#lfClanModalClose').onclick = closeModal;
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

    // Create
    if (canAfford) {
      overlay.querySelector('#lfClanCreateBtn').onclick = async () => {
        const name = overlay.querySelector('#lfClanName')?.value.trim();
        const tag  = overlay.querySelector('#lfClanTag')?.value.trim().toUpperCase();
        const desc = overlay.querySelector('#lfClanDesc')?.value.trim();
        const isPublic = overlay.querySelector('#lfClanPublic')?.checked ?? true;
        const errEl = overlay.querySelector('#lfClanError');

        if (!name || name.length < 2) { errEl.textContent = 'Name must be at least 2 characters.'; return; }
        if (!tag  || !/^[A-Z0-9]{2,6}$/.test(tag)) { errEl.textContent = 'Tag must be 2–6 uppercase letters/numbers.'; return; }
        errEl.textContent = '';

        const btn = overlay.querySelector('#lfClanCreateBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined">hourglass_top</span> Founding…';

        try {
          const { data } = await getSb().rpc('create_clan', {
            p_name: name,
            p_tag: tag,
            p_description: desc || null,
            p_avatar_emoji: selectedEmoji,
            p_banner_color: selectedColor,
            p_is_public: isPublic,
          });
          if (!data?.ok) throw new Error(data?.error || 'Unknown error');
          closeModal();
          showToast(`Syndicate "${name}" [${tag}] founded! 1,000 PC deducted.`);
          // Re-render squads module if it's active
          if (window.LuminaChatOS_setNav) window.LuminaChatOS_setNav('squads');
        } catch (e) {
          errEl.textContent = e.message || 'Failed to create clan.';
          btn.disabled = false;
          btn.innerHTML = '<span class="material-symbols-outlined">diversity_3</span> Found Syndicate — 1,000 PC';
        }
      };
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     CLAN MODULE PAGE (renders inside lcModuleHost for 'squads' nav)
     ═══════════════════════════════════════════════════════════════════════ */
  async function renderClanModule(currentUserId) {
    const container = document.getElementById('lcModuleHost');
    if (!container) return;

    container.innerHTML = `
      <div class="lf-clan-module" id="lfClanModuleRoot">
        <div class="lf-clan-module-topbar">
          <div>
            <div class="lf-clan-module-title">Syndicates</div>
            <div class="lf-clan-module-sub">Join or found a clan. Build your legacy.</div>
          </div>
          <button type="button" class="lf-btn-create-clan" id="lfOpenCreateClan">
            <span class="material-symbols-outlined">add</span> Found Syndicate
          </button>
        </div>
        <div id="lfMyClanSection"></div>
        <div id="lfExploreClanSection">
          <p class="lf-section-title">Explore Syndicates</p>
          <div style="text-align:center;padding:32px;color:rgba(255,255,255,0.3);font-size:13px">Loading…</div>
        </div>
      </div>`;

    container.querySelector('#lfOpenCreateClan').onclick = () => showCreateModal(currentUserId);

    const sb = getSb();

    // My clan
    const { data: myMembership } = await sb
      .from('clan_members')
      .select('role, clan:clans(*)')
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (myMembership?.clan) {
      const clan = myMembership.clan;
      const role = myMembership.role;
      const { count } = await sb.from('clan_members').select('*', { count: 'exact', head: true }).eq('clan_id', clan.id);
      const myClanHtml = `
        <div>
          <p class="lf-section-title">My Syndicate</p>
          <div class="lf-my-clan-card" style="border-color:${clan.banner_color}22">
            <div class="lf-my-clan-av" style="background:${clan.banner_color}22;border:2px solid ${clan.banner_color}44">
              ${clan.avatar_emoji || '⚔️'}
            </div>
            <div>
              <div class="lf-my-clan-name">${U.sanitizeText(clan.name)}</div>
              <div class="lf-my-clan-tag">[${U.sanitizeText(clan.tag)}]
                <span class="lf-role-badge" data-role="${role}" style="margin-left:6px">${ROLES[role]?.ru || role}</span>
              </div>
              ${clan.description ? `<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:4px">${U.sanitizeText(clan.description)}</div>` : ''}
            </div>
            <div class="lf-my-clan-stats">
              <div class="lf-clan-stat">
                <span class="lf-clan-stat-val">${count || 0}</span>
                <span class="lf-clan-stat-label">Members</span>
              </div>
              <div class="lf-clan-stat">
                <span class="lf-clan-stat-val">${clan.level}</span>
                <span class="lf-clan-stat-label">Level</span>
              </div>
            </div>
          </div>
        </div>`;
      const sec = document.getElementById('lfMyClanSection');
      if (sec) sec.innerHTML = myClanHtml;

      // Render member list below
      await renderMemberList(clan.id, currentUserId, role, sec);
    }

    // Explore public clans
    const { data: publicClans } = await sb
      .from('clans')
      .select('id,name,tag,description,avatar_emoji,banner_color,level,is_public')
      .eq('is_public', true)
      .order('level', { ascending: false })
      .limit(24);

    const exploreSection = document.getElementById('lfExploreClanSection');
    if (exploreSection && publicClans?.length) {
      exploreSection.innerHTML = `
        <p class="lf-section-title">Explore Syndicates</p>
        <div class="lf-clan-grid">
          ${publicClans.map((c) => `
            <div class="lf-clan-card" data-clan-id="${c.id}" style="--accent:${c.banner_color}">
              <div class="lf-clan-card-top">
                <div class="lf-clan-card-av" style="background:${c.banner_color}22;border:1px solid ${c.banner_color}44">
                  ${c.avatar_emoji || '⚔️'}
                </div>
                <div>
                  <div class="lf-clan-card-name">${U.sanitizeText(c.name)}</div>
                  <div class="lf-clan-card-tag">[${U.sanitizeText(c.tag)}] · Lvl ${c.level}</div>
                </div>
              </div>
              <div class="lf-clan-card-desc">${U.sanitizeText(c.description || 'No description.')}</div>
              <div class="lf-clan-card-footer">
                <span>${c.is_public ? '🌐 Public' : '🔒 Private'}</span>
                <span>View →</span>
              </div>
            </div>`).join('')}
        </div>`;

      exploreSection.querySelectorAll('.lf-clan-card').forEach((card) => {
        card.onclick = () => openClanDetailModal(card.dataset.clanId, currentUserId);
      });
    } else if (exploreSection) {
      exploreSection.innerHTML = `
        <p class="lf-section-title">Explore Syndicates</p>
        <div style="text-align:center;padding:40px 24px">
          <div style="font-size:36px;margin-bottom:12px">⚔️</div>
          <p style="color:rgba(255,255,255,0.4);font-size:14px">No public syndicates yet. Be the first to found one.</p>
        </div>`;
    }
  }

  /* ─── Member list inside My Clan card ────────────────────────────────── */
  async function renderMemberList(clanId, currentUserId, myRole, appendTo) {
    const sb = getSb();
    const { data: members } = await sb
      .from('clan_members')
      .select('user_id, role, joined_at, profile:profiles(username, avatar_url)')
      .eq('clan_id', clanId)
      .order('joined_at');

    if (!members?.length) return;

    const listHtml = members.map((m) => {
      const name = m.profile?.username || 'Unknown';
      const av   = m.profile?.avatar_url?.startsWith('http') ? `<img src="${U.sanitizeText(m.profile.avatar_url)}" style="width:36px;height:36px;border-radius:10px;object-fit:cover">` : (m.profile?.avatar_url || '👾');
      const roleMeta = ROLES[m.role] || ROLES.member;
      const isSelf = m.user_id === currentUserId;
      const canChange = !isSelf && canManage(myRole, m.role);

      const roleControl = canChange ? `
        <select class="lf-role-select" data-member-id="${m.user_id}" data-clan-id="${clanId}">
          ${Object.entries(ROLES).filter(([k]) => k !== 'leader').map(([k, v]) =>
            `<option value="${k}" ${m.role === k ? 'selected' : ''}>${v.ru}</option>`
          ).join('')}
        </select>` : `<span class="lf-role-badge" data-role="${m.role}">${roleMeta.ru}</span>`;

      return `
        <div class="lf-member-row">
          <div class="lf-member-av">${av}</div>
          <span class="lf-member-name">${U.sanitizeText(name)}${isSelf ? ' <span style="color:rgba(255,255,255,0.3);font-size:10px">(you)</span>' : ''}</span>
          <span class="lf-member-joined">${new Date(m.joined_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          ${roleControl}
        </div>`;
    }).join('');

    const memberSection = document.createElement('div');
    memberSection.innerHTML = `
      <p class="lf-section-title" style="margin-top:20px">Members (${members.length})</p>
      <div class="lf-member-list">${listHtml}</div>`;
    appendTo.appendChild(memberSection);

    // Role change handlers
    memberSection.querySelectorAll('.lf-role-select').forEach((sel) => {
      sel.onchange = async () => {
        const newRole = sel.value;
        const memberId = sel.dataset.memberId;
        const cId = sel.dataset.clanId;
        await getSb().from('clan_members').update({ role: newRole }).eq('clan_id', cId).eq('user_id', memberId);
        showToast(`Role updated to ${ROLES[newRole]?.ru || newRole}.`);
      };
    });
  }

  /* ─── Clan detail modal (from explore card click) ─────────────────────── */
  async function openClanDetailModal(clanId, currentUserId) {
    const prev = document.getElementById('lfClanDetailModal');
    if (prev) prev.remove();

    const sb = getSb();
    const { data: clan } = await sb.from('clans').select('*').eq('id', clanId).maybeSingle();
    if (!clan) return;

    const { count } = await sb.from('clan_members').select('*', { count: 'exact', head: true }).eq('clan_id', clanId);
    const { data: myMem } = await sb.from('clan_members').select('role').eq('clan_id', clanId).eq('user_id', currentUserId).maybeSingle();
    const isMember = !!myMem;

    const overlay = document.createElement('div');
    overlay.className = 'lf-modal-overlay';
    overlay.id = 'lfClanDetailModal';
    overlay.innerHTML = `
      <div class="lf-modal" style="max-width:460px">
        <div class="lf-modal-header">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:52px;height:52px;border-radius:14px;background:${clan.banner_color}22;border:1px solid ${clan.banner_color}44;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">
              ${clan.avatar_emoji}
            </div>
            <div>
              <div class="lf-modal-title">${U.sanitizeText(clan.name)}</div>
              <div class="lf-modal-subtitle">[${U.sanitizeText(clan.tag)}] · Level ${clan.level} · ${count || 0} members</div>
            </div>
          </div>
          <button type="button" class="lf-modal-close" id="lfClanDetailClose">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="lf-modal-body">
          ${clan.description ? `<p style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.6">${U.sanitizeText(clan.description)}</p>` : ''}
          <div id="lfDetailMemberList" style="max-height:280px;overflow-y:auto">
            <p class="lf-section-title">Loading members…</p>
          </div>
        </div>
        <div class="lf-modal-footer">
          <div class="lf-modal-error" id="lfClanDetailErr"></div>
          ${!isMember ? `<button type="button" class="lf-btn-primary" id="lfJoinClanBtn" style="background:linear-gradient(135deg,${clan.banner_color},#a855f7)">
            <span class="material-symbols-outlined">group_add</span> Request to Join
          </button>` : `<div style="text-align:center;font-size:13px;color:#22c55e;font-weight:700">✓ You are a member</div>`}
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const closeDetail = () => {
      overlay.classList.add('is-closing');
      setTimeout(() => overlay.remove(), 180);
    };
    overlay.querySelector('#lfClanDetailClose').onclick = closeDetail;
    overlay.onclick = (e) => { if (e.target === overlay) closeDetail(); };

    if (!isMember) {
      overlay.querySelector('#lfJoinClanBtn')?.addEventListener('click', async () => {
        const btn = overlay.querySelector('#lfJoinClanBtn');
        btn.disabled = true;
        const { error } = await sb.from('clan_members').insert({ clan_id: clanId, user_id: currentUserId, role: 'member' });
        if (error) {
          overlay.querySelector('#lfClanDetailErr').textContent = error.message || 'Could not join.';
          btn.disabled = false;
        } else {
          btn.outerHTML = `<div style="text-align:center;font-size:13px;color:#22c55e;font-weight:700">✓ Joined!</div>`;
          showToast(`Joined ${clan.name}!`);
        }
      });
    }

    // Load members
    const { data: members } = await sb
      .from('clan_members')
      .select('user_id, role, joined_at, profile:profiles(username, avatar_url)')
      .eq('clan_id', clanId)
      .order('joined_at')
      .limit(20);

    const memberListEl = overlay.querySelector('#lfDetailMemberList');
    if (memberListEl && members?.length) {
      memberListEl.innerHTML = `
        <p class="lf-section-title">Members (${members.length})</p>
        <div class="lf-member-list">
          ${members.map((m) => {
            const name = m.profile?.username || '?';
            const av = m.profile?.avatar_url?.startsWith('http') ? `<img src="${U.sanitizeText(m.profile.avatar_url)}" style="width:36px;height:36px;border-radius:10px;object-fit:cover">` : (m.profile?.avatar_url || '👾');
            const roleMeta = ROLES[m.role] || ROLES.member;
            return `<div class="lf-member-row">
              <div class="lf-member-av">${av}</div>
              <span class="lf-member-name">${U.sanitizeText(name)}</span>
              <span class="lf-role-badge" data-role="${m.role}">${roleMeta.ru}</span>
            </div>`;
          }).join('')}
        </div>`;
    }
  }

  /* ─── Right panel: Clan dashboard view ───────────────────────────────── */
  async function renderClanRightPanel(clanId, currentUserId) {
    const context = document.getElementById('lcContext');
    if (!context) return;

    const sb = getSb();
    const { data: clan } = await sb.from('clans').select('*').eq('id', clanId).maybeSingle();
    if (!clan) return;

    const { count } = await sb.from('clan_members').select('*', { count: 'exact', head: true }).eq('clan_id', clanId);
    const { data: myMem } = await sb.from('clan_members').select('role').eq('clan_id', clanId).eq('user_id', currentUserId).maybeSingle();

    const boostsHtml = [
      { icon: 'speed', label: 'XP Boost', val: '+25%', active: clan.level >= 3 },
      { icon: 'inventory', label: 'Drop Rate', val: '+10%', active: clan.level >= 5 },
      { icon: 'shield', label: 'Trade Shield', val: 'ON', active: clan.level >= 7 },
    ].map((b) => `
      <div class="lf-vault-stat" style="opacity:${b.active ? 1 : 0.35}">
        <span class="lf-vault-stat-icon material-symbols-outlined" style="color:${b.active ? '#22c55e' : '#9ca3af'}">${b.icon}</span>
        <div>
          <p class="lf-vault-stat-label">${b.label}</p>
          <p class="lf-vault-stat-val" style="color:${b.active ? '#22c55e' : '#9ca3af'}">${b.active ? b.val : 'Locked'}</p>
        </div>
      </div>`).join('');

    const panelHtml = `
      <div class="lf-clan-panel">
        <div class="lf-clan-panel-hero">
          <div class="lf-clan-panel-av" style="background:${clan.banner_color}22;border:2px solid ${clan.banner_color}55">
            ${clan.avatar_emoji}
          </div>
          <div class="lf-clan-panel-name">${U.sanitizeText(clan.name)}</div>
          <div class="lf-clan-panel-tag">[${U.sanitizeText(clan.tag)}]</div>
          ${clan.description ? `<div class="lf-clan-panel-desc">${U.sanitizeText(clan.description)}</div>` : ''}
        </div>
        <!-- Stats section -->
        <div class="lc-context-section">
          <h4 class="lc-ctx-section-title"><span class="material-symbols-outlined">bar_chart</span>Stats</h4>
          <div class="lc-rel-list">
            <div class="lc-rel-row">
              <span class="material-symbols-outlined lc-rel-icon">star</span>
              <span class="lc-rel-label">Level</span>
              <span class="lc-rel-val">${clan.level}</span>
            </div>
            <div class="lc-rel-row">
              <span class="material-symbols-outlined lc-rel-icon">group</span>
              <span class="lc-rel-label">Members</span>
              <span class="lc-rel-val">${count || 0}</span>
            </div>
            <div class="lc-rel-row">
              <span class="material-symbols-outlined lc-rel-icon">lock</span>
              <span class="lc-rel-label">Type</span>
              <span class="lc-rel-val">${clan.is_public ? 'Public' : 'Private'}</span>
            </div>
            ${myMem ? `<div class="lc-rel-row">
              <span class="material-symbols-outlined lc-rel-icon">badge</span>
              <span class="lc-rel-label">My Role</span>
              <span class="lc-rel-val" style="color:${ROLES[myMem.role]?.color || '#fff'}">${ROLES[myMem.role]?.ru || myMem.role}</span>
            </div>` : ''}
          </div>
        </div>
        <!-- Active boosts -->
        <div class="lc-context-section lc-context-section--vault">
          <h4 class="lc-ctx-section-title"><span class="material-symbols-outlined">bolt</span>Clan Boosts</h4>
          <div class="lc-vault-grid">${boostsHtml}</div>
        </div>
      </div>`;

    // Prepend the clan panel before the normal profile header
    const profileHeader = context.querySelector('.lc-context-profile');
    if (profileHeader) {
      profileHeader.insertAdjacentHTML('beforebegin', panelHtml);
    } else {
      context.innerHTML = panelHtml;
    }
  }

  /* ─── Expose ──────────────────────────────────────────────────────────── */
  window.LuminaClanSystem = {
    showCreateModal,
    renderClanModule,
    renderClanRightPanel,
    openClanDetailModal,
    ROLES,
  };

})();
