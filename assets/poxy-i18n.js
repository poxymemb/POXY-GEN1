/**
 * POXY / Lumina OS — UI locale (en | ru).
 */
(function (global) {
  const PREFS_KEY = 'poxy_settings_prefs_v1';
  const SUPPORTED = ['en', 'ru'];

  const STRINGS = {
    en: {
      'settings.title': 'Settings',
      'settings.breadcrumb': 'Settings',
      'settings.profileLink': 'View showcase & stats profile',
      'settings.tabs.account.short': 'Account',
      'settings.tabs.security.short': 'Security',
      'settings.tabs.notifications.short': 'Alerts',
      'settings.tabs.display.short': 'Display',
      'settings.tabs.account.nav': 'Your Account',
      'settings.tabs.security.nav': 'Security & Account Access',
      'settings.tabs.notifications.nav': 'Notifications',
      'settings.tabs.display.nav': 'Display & Interface',
      'settings.tabs.account.title': 'Your Account',
      'settings.tabs.account.desc':
        'Username, email, password, language, and account status.',
      'settings.tabs.security.title': 'Security & Account Access',
      'settings.tabs.security.desc': '2FA, sessions, and login history.',
      'settings.tabs.notifications.title': 'Notifications',
      'settings.tabs.notifications.desc':
        'Mentions, trades, news, and delivery channels.',
      'settings.tabs.display.title': 'Display & Interface',
      'settings.tabs.display.desc': 'Theme, accent, typography, and performance.',
      'settings.account.info': 'Account Information',
      'settings.account.username': 'Username',
      'settings.account.email': 'Email',
      'settings.account.save': 'Save changes',
      'settings.language.title': 'Language',
      'settings.language.desc':
        'Interface language for POXY WORLD and Lumina OS. Saved on this device.',
      'settings.language.en': 'English',
      'settings.language.ru': 'Русский',
      'settings.password.title': 'Change Password',
      'settings.password.current': 'Current Password',
      'settings.password.new': 'New Password',
      'settings.password.confirm': 'Confirm New Password',
      'settings.password.update': 'Update Password',
      'settings.danger.title': 'Danger Zone',
      'settings.danger.deactivate': 'Deactivate Account',
      'settings.danger.desc':
        'Temporary deactivation can be reversed within 30 days. Contact support to process a full account closure.',
      'settings.danger.btn': 'Deactivate',
      'settings.joined': 'Joined',
      'lo.nav.messages': 'Messages',
      'lo.nav.friends': 'Friends',
      'lo.nav.squads': 'Squads',
      'lo.nav.activity': 'Activity',
      'lo.nav.notifications': 'Notifications',
      'lo.nav.settings': 'Settings',
      'lo.nav.exit': 'Exit to POXY',
      'lo.nav.help': 'Help',
      'lo.nav.logout': 'Logout',
      'lo.nav.darkMode': 'Dark mode',
      'lo.nav.lightMode': 'Light mode',
      'lo.nav.searchConv': 'Search conversations…',
      'lo.nav.searchSettings': 'Search settings...',
      'lo.status.online': 'Online',
      'lo.settings.title': 'Global Settings',
      'lo.settings.subtitle':
        'Manage your ecosystem preferences and account security.',
      'lo.settings.editProfile': 'Edit Profile',
      'lo.settings.displayName': 'Display Name',
      'lo.settings.timezone': 'Timezone',
      'lo.settings.language': 'Language',
      'lo.settings.security': 'Security Pulse',
      'lo.settings.2fa': '2FA Enabled',
      'lo.settings.2faSub': 'Protecting your data',
      'lo.settings.recovery': 'Recovery Key',
      'lo.settings.recoverySub': 'Not yet backed up',
      'lo.settings.lastActivity': 'Last activity: 2 hours ago from NYC',
      'lo.settings.appearance': 'Appearance',
      'lo.settings.theme.light': 'Light',
      'lo.settings.theme.dark': 'Dark',
      'lo.settings.theme.system': 'System',
      'lo.settings.smartNotif': 'Smart Notifications',
      'lo.settings.alerts': 'System Alerts',
      'lo.settings.alertsSub': 'Major OS updates and warnings',
      'lo.settings.marketing': 'Marketing Emails',
      'lo.settings.marketingSub': 'Special offers and ecosystem news',
      'lo.settings.enterSend': 'Enter to send',
      'lo.settings.enterSendSub': 'Send messages with Enter key',
      'lo.settings.privacy': 'Privacy & Data',
      'lo.settings.storage': 'Data Storage Limit',
      'lo.settings.storagePct': '85% Full',
      'lo.settings.storageMeta': '17.2 GB of 20 GB used',
      'lo.settings.manageStorage': 'Manage Storage',
      'lo.settings.exportData': 'Export Data',
      'lo.settings.cloud': 'Cloud Synchronization',
      'lo.settings.cloudDesc':
        'Sync settings across all Lumina devices seamlessly.',
      'lo.settings.discard': 'Discard Changes',
      'lo.settings.save': 'Save All Changes',
      'lo.toast.saved': 'Settings saved.',
      'lo.toast.discarded': 'Changes discarded.',
      'lo.toast.locale': 'Language updated.',
    },
    ru: {
      'settings.title': 'Настройки',
      'settings.breadcrumb': 'Настройки',
      'settings.profileLink': 'Профиль и статистика',
      'settings.tabs.account.short': 'Аккаунт',
      'settings.tabs.security.short': 'Безопасность',
      'settings.tabs.notifications.short': 'Уведомления',
      'settings.tabs.display.short': 'Интерфейс',
      'settings.tabs.account.nav': 'Ваш аккаунт',
      'settings.tabs.security.nav': 'Безопасность и доступ',
      'settings.tabs.notifications.nav': 'Уведомления',
      'settings.tabs.display.nav': 'Интерфейс и отображение',
      'settings.tabs.account.title': 'Ваш аккаунт',
      'settings.tabs.account.desc':
        'Имя, email, пароль, язык и статус аккаунта.',
      'settings.tabs.security.title': 'Безопасность и доступ',
      'settings.tabs.security.desc': '2FA, сессии и история входов.',
      'settings.tabs.notifications.title': 'Уведомления',
      'settings.tabs.notifications.desc':
        'Упоминания, обмены, новости и каналы доставки.',
      'settings.tabs.display.title': 'Интерфейс и отображение',
      'settings.tabs.display.desc': 'Тема, акцент, шрифт и производительность.',
      'settings.account.info': 'Данные аккаунта',
      'settings.account.username': 'Имя пользователя',
      'settings.account.email': 'Email',
      'settings.account.save': 'Сохранить',
      'settings.language.title': 'Язык',
      'settings.language.desc':
        'Язык интерфейса POXY WORLD и Lumina OS. Сохраняется на этом устройстве.',
      'settings.language.en': 'English',
      'settings.language.ru': 'Русский',
      'settings.password.title': 'Сменить пароль',
      'settings.password.current': 'Текущий пароль',
      'settings.password.new': 'Новый пароль',
      'settings.password.confirm': 'Подтвердите пароль',
      'settings.password.update': 'Обновить пароль',
      'settings.danger.title': 'Опасная зона',
      'settings.danger.deactivate': 'Деактивировать аккаунт',
      'settings.danger.desc':
        'Временную деактивацию можно отменить в течение 30 дней. Для полного удаления — support@poxy.world.',
      'settings.danger.btn': 'Деактивировать',
      'settings.joined': 'Регистрация',
      'lo.nav.messages': 'Сообщения',
      'lo.nav.friends': 'Друзья',
      'lo.nav.squads': 'Отряды',
      'lo.nav.activity': 'Активность',
      'lo.nav.notifications': 'Уведомления',
      'lo.nav.settings': 'Настройки',
      'lo.nav.exit': 'В POXY',
      'lo.nav.help': 'Помощь',
      'lo.nav.logout': 'Выйти',
      'lo.nav.darkMode': 'Тёмная тема',
      'lo.nav.lightMode': 'Светлая тема',
      'lo.nav.searchConv': 'Поиск диалогов…',
      'lo.nav.searchSettings': 'Поиск в настройках...',
      'lo.status.online': 'В сети',
      'lo.settings.title': 'Глобальные настройки',
      'lo.settings.subtitle':
        'Параметры экосистемы и безопасность аккаунта.',
      'lo.settings.editProfile': 'Редактировать профиль',
      'lo.settings.displayName': 'Отображаемое имя',
      'lo.settings.timezone': 'Часовой пояс',
      'lo.settings.language': 'Язык',
      'lo.settings.security': 'Безопасность',
      'lo.settings.2fa': '2FA включена',
      'lo.settings.2faSub': 'Данные под защитой',
      'lo.settings.recovery': 'Ключ восстановления',
      'lo.settings.recoverySub': 'Резервная копия не создана',
      'lo.settings.lastActivity': 'Активность: 2 ч. назад, NYC',
      'lo.settings.appearance': 'Оформление',
      'lo.settings.theme.light': 'Светлая',
      'lo.settings.theme.dark': 'Тёмная',
      'lo.settings.theme.system': 'Системная',
      'lo.settings.smartNotif': 'Уведомления',
      'lo.settings.alerts': 'Системные оповещения',
      'lo.settings.alertsSub': 'Обновления и предупреждения ОС',
      'lo.settings.marketing': 'Рассылка',
      'lo.settings.marketingSub': 'Акции и новости экосистемы',
      'lo.settings.enterSend': 'Enter — отправить',
      'lo.settings.enterSendSub': 'Отправка сообщения по Enter',
      'lo.settings.privacy': 'Конфиденциальность',
      'lo.settings.storage': 'Лимит хранилища',
      'lo.settings.storagePct': '85% занято',
      'lo.settings.storageMeta': '17,2 ГБ из 20 ГБ',
      'lo.settings.manageStorage': 'Хранилище',
      'lo.settings.exportData': 'Экспорт данных',
      'lo.settings.cloud': 'Облачная синхронизация',
      'lo.settings.cloudDesc':
        'Синхронизация настроек между устройствами Lumina.',
      'lo.settings.discard': 'Отменить',
      'lo.settings.save': 'Сохранить всё',
      'lo.toast.saved': 'Настройки сохранены.',
      'lo.toast.discarded': 'Изменения отменены.',
      'lo.toast.locale': 'Язык изменён.',
    },
  };

  let locale = 'en';

  function mergeExtraCatalog() {
    const extra = global.POXY_I18N_EXTRA;
    if (!extra) return;
    SUPPORTED.forEach((loc) => {
      if (extra[loc]) Object.assign(STRINGS[loc], extra[loc]);
    });
  }

  mergeExtraCatalog();

  function readPrefs() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writePrefsLocale(loc) {
    try {
      const p = readPrefs();
      p.locale = loc;
      localStorage.setItem(PREFS_KEY, JSON.stringify(p));
    } catch (e) {}
  }

  function normalizeLocale(loc) {
    if (!loc) return null;
    const s = String(loc).toLowerCase().slice(0, 2);
    return SUPPORTED.indexOf(s) >= 0 ? s : null;
  }

  function detectDefault() {
    const saved = normalizeLocale(readPrefs().locale);
    if (saved) return saved;
    const nav =
      (global.navigator &&
        (global.navigator.language || global.navigator.userLanguage)) ||
      'en';
    return String(nav).toLowerCase().startsWith('ru') ? 'ru' : 'en';
  }

  function t(key, vars) {
    const table = STRINGS[locale] || STRINGS.en;
    let out = table[key];
    if (out == null) out = (STRINGS.en && STRINGS.en[key]) || key;
    if (vars && typeof out === 'string') {
      Object.keys(vars).forEach((k) => {
        out = out.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
      });
    }
    return out;
  }

  function translateToast(msg) {
    if (typeof msg !== 'string') return msg;
    const map = global.POXY_I18N_TOAST_KEYS || {};
    const key = map[msg];
    if (key) return t(key);
    if (msg.indexOf('Friend added:') === 0) {
      return t('toast.friends.added', { name: msg.slice('Friend added:'.length).trim() });
    }
    return msg;
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const val = t(key);
      if (el.hasAttribute('data-i18n-placeholder')) el.placeholder = val;
      else el.textContent = val;
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.placeholder = t(key);
    });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (key) el.title = t(key);
    });
    root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      if (key) el.setAttribute('aria-label', t(key));
    });
  }

  function applyLuminaChrome() {
    const root = document.getElementById('luminaOsRoot');
    if (!root) return;
    apply(root);
    const map = {
      messages: 'lo.nav.messages',
      friends: 'lo.nav.friends',
      squads: 'lo.nav.squads',
      activity: 'lo.nav.activity',
      notifications: 'lo.nav.notifications',
      settings: 'lo.nav.settings',
    };
    root.querySelectorAll('.lc-nav-item[data-nav]').forEach((btn) => {
      const key = map[btn.dataset.nav];
      const label = btn.querySelector('.lo-nav-label');
      if (key && label) label.textContent = t(key);
    });
    if (global.LuminaOSApp && typeof global.LuminaOSApp.syncThemeToggleLabel === 'function') {
      global.LuminaOSApp.syncThemeToggleLabel();
    }
  }

  function applySettingsNav() {
    const page = document.getElementById('settingsPage');
    if (!page) return;
    apply(page);
    syncLangButtons();
  }

  function applyApp() {
    apply(document.getElementById('authOverlay'));
    apply(document.getElementById('poxyAppShell'));
    apply(document.getElementById('sidebarPanel'));
    apply(document.getElementById('bottomNav'));
    apply(document.getElementById('huntPage'));
    applyLuminaChrome();
    applySettingsNav();
  }

  function refreshUi() {
    applyApp();
    try {
      if (typeof global.refreshStitchDashboardChrome === 'function') {
        global.refreshStitchDashboardChrome();
      }
      if (typeof global.renderColContent === 'function') {
        const col = document.getElementById('collectionPage');
        if (col && col.classList.contains('visible')) global.renderColContent();
      }
      if (typeof global.renderMarket === 'function') {
        const mp = document.getElementById('marketPage');
        if (mp && mp.classList.contains('visible')) global.renderMarket();
      }
      if (typeof global.renderSettingsPage === 'function') {
        const sp = document.getElementById('settingsPage');
        if (sp && sp.classList.contains('visible')) {
          global.renderSettingsPage();
          if (typeof global.applySettingsPrefsUi === 'function') {
            global.applySettingsPrefsUi();
          }
          if (typeof global.switchSettingsTab === 'function' && typeof global.getActiveSettingsTab === 'function') {
            global.switchSettingsTab(global.getActiveSettingsTab());
          }
        }
      }
      if (global.LuminaOSStore && global.LuminaOSPanels) {
        const st = global.LuminaOSStore.getState();
        const nav = st && st.activeNav;
        if (nav && nav !== 'messages' && global.LuminaOSPanels.render) {
          global.LuminaOSPanels.render(nav);
        }
      }
      if (typeof global.syncNavUsernameLabels === 'function') {
        global.syncNavUsernameLabels();
      }
      if (typeof global.updateAuthModeUi === 'function') global.updateAuthModeUi();
    } catch (e) {
      console.warn('i18n refreshUi', e);
    }
  }

  function syncLangButtons() {
    document.querySelectorAll('.poxy-settings-lang-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.locale === locale);
    });
    document.querySelectorAll('.lo-lang-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.locale === locale);
    });
  }

  function settingsTabCopy(tab) {
    const key = tab || 'account';
    return {
      title: t('settings.tabs.' + key + '.title'),
      desc: t('settings.tabs.' + key + '.desc'),
    };
  }

  function setLocale(loc, opts) {
    opts = opts || {};
    const next = normalizeLocale(loc) || 'en';
    if (next === locale && !opts.force) return next;
    locale = next;
    document.documentElement.lang = locale;
    document.documentElement.setAttribute('data-locale', locale);
    if (opts.persist !== false) writePrefsLocale(locale);
    refreshUi();
    try {
      global.dispatchEvent(
        new CustomEvent('poxy:locale-change', { detail: { locale: next } })
      );
    } catch (e) {}
    return next;
  }

  function getLocale() {
    return locale;
  }

  function bootstrap() {
    locale = detectDefault();
    document.documentElement.lang = locale;
    document.documentElement.setAttribute('data-locale', locale);
    mergeExtraCatalog();
  }

  bootstrap();

  const PoxyI18n = {
    t,
    apply,
    applyApp,
    refreshUi,
    translateToast,
    getLocale,
    setLocale,
    bootstrap,
    applyLuminaChrome,
    applySettingsNav,
    settingsTabCopy,
    syncLangButtons,
    SUPPORTED,
  };

  global.PoxyI18n = PoxyI18n;
  global.t = t;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyApp());
  } else {
    setTimeout(applyApp, 0);
  }
})(window);
