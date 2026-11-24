/* Sınav Hazırlama — ortak çekirdek kabuğu (cekirdek/fc-core.js).
   Burada: sağ üst sıra (Eşitle · Wi-Fi · Güncelle · tema · dil | Küçült · Orta · Tam ekran · Kapat), "klasik" renk şeması
   (1.9.x'in eski renkleri), Ayarlar'daki çekirdek kartları (Görünüm, Eşitleme, Kullanım Limitleri, hata raporu, Hakkında ve
   EN SONDA "Admin ile iletişim"), ilk açılış rehberi (Firebase + yapay zekâ adımlarıyla), "neler yeni", duyurular ve
   Wi-Fi eşitleme penceresi (aynı ağdaki bilgisayarlar, PIN ile eşleşme; birleştirme kuralı çekirdeğin lan-sync-merge'ü).
   app.js'ten ÖNCE yüklenir (app.js modül olduğu için sonra çalışır); uygulamaya window.__app üzerinden ulaşır. */
(function () {
  'use strict';
  var REL = window.APP_RELEASE || { version: '0.0.0', notes: {} };
  var VER = REL.version;
  var ui = FC.ui;
  var api = window.api || {};
  var A = function () { return window.__app || {}; };
  var t = function (k, v) { return window.t(k, v); };
  var esc = ui.esc;

  /* ---------- metinler (uygulama sözlüğü: [tr, en, ar]) ---------- */
  Object.assign(window.I18N, {
    kbSync: ['Eşitleme', 'Sync', 'المزامنة'],
    kbSyncDesc: ['Sınavlar iki yoldan eşitlenir: kendi Firebase hesabınız (internet) ve aynı modeme bağlı bilgisayarlar arasında Wi-Fi. Hiçbir sınav silinmez; çakışmada eski hâl yedeklenir.', 'Exams sync two ways: your own Firebase account (internet) and Wi-Fi between computers on the same router. No exam is ever deleted; on a conflict the older version is backed up.', 'تتم مزامنة الاختبارات بطريقتين: حساب Firebase الخاص بك (عبر الإنترنت) وWi-Fi بين الحواسيب على الموجّه نفسه. لا يُحذف أي اختبار؛ وعند التعارض تُحفظ النسخة الأقدم.'],
    kbCloudOn: ['Bulut: {p} projesine bağlı', 'Cloud: connected to project {p}', 'السحابة: متصل بمشروع {p}'],
    kbCloudOff: ['Bulut: bağlı değil', 'Cloud: not connected', 'السحابة: غير متصل'],
    kbCloudBtn: ['Bulut hesabı ve sınavlar', 'Cloud account and exams', 'حساب السحابة والاختبارات'],
    kbWifiOn: ['Wi-Fi: açık · {n} eşleşmiş cihaz', 'Wi-Fi: on · {n} paired device(s)', 'Wi-Fi: مفعّل · {n} جهاز مقترن'],
    kbWifiOff: ['Wi-Fi: kapalı', 'Wi-Fi: off', 'Wi-Fi: متوقف'],
    kbWifiBtn: ['Wi-Fi eşitleme', 'Wi-Fi sync', 'مزامنة Wi-Fi'],
    kbBackups: ['Yedek klasörü', 'Backup folder', 'مجلد النسخ الاحتياطية'],
    lanTitle: ['Wi-Fi eşitleme (aynı ağ)', 'Wi-Fi sync (same network)', 'مزامنة Wi-Fi (الشبكة نفسها)'],
    lanIntro: ['Aynı modeme / Wi-Fi ağına bağlı iki bilgisayar internet olmadan sınavlarını eşitler. Bir kez PIN ile eşleşin; sonra eşitleme kendiliğinden ya da "Şimdi eşitle" ile olur. Veriler ağda şifreli gider.', 'Two computers on the same router / Wi-Fi network sync their exams without the internet. Pair once with a PIN; afterwards sync runs by itself or with "Sync now". Data travels encrypted.', 'يزامن حاسوبان متصلان بالموجّه أو شبكة Wi-Fi نفسها اختباراتهما دون إنترنت. اقرن الجهازين مرة واحدة برمز PIN؛ ثم تعمل المزامنة تلقائياً أو عبر «زامن الآن». تنتقل البيانات مشفّرة.'],
    lanThis: ['Bu bilgisayar', 'This computer', 'هذا الحاسوب'],
    lanOpenLbl: ['Wi-Fi eşitleme açık (diğer bilgisayar bu bilgisayara bağlanabilir)', 'Wi-Fi sync on (the other computer can connect to this one)', 'مزامنة Wi-Fi مفعّلة (يمكن للحاسوب الآخر الاتصال بهذا الحاسوب)'],
    lanFirewall: ['Windows güvenlik duvarı ilk seferde izin isteyebilir: "Özel ağlar" için izin verin.', 'Windows Firewall may ask the first time: allow it for "Private networks".', 'قد يطلب جدار حماية Windows الإذن في المرة الأولى: اسمح به لـ«الشبكات الخاصة».'],
    lanPaired: ['Eşleşmiş bilgisayarlar', 'Paired computers', 'الحواسيب المقترنة'],
    lanNoPairs: ['Henüz eşleşmiş bilgisayar yok.', 'No paired computers yet.', 'لا توجد حواسيب مقترنة بعد.'],
    lanLast: ['son eşitleme: {d}', 'last sync: {d}', 'آخر مزامنة: {d}'],
    lanNever: ['henüz eşitlenmedi', 'not synced yet', 'لم تتم المزامنة بعد'],
    lanSyncNow: ['Şimdi eşitle', 'Sync now', 'زامن الآن'],
    lanUnpair: ['Eşleşmeyi kaldır', 'Unpair', 'إلغاء الاقتران'],
    lanUnpairAsk: ['"{n}" ile eşleşme kaldırılsın mı? Sınavlar silinmez; yalnız bu iki bilgisayar artık eşitlenmez.', 'Unpair "{n}"? No exam is deleted; these two computers just stop syncing.', 'إلغاء الاقتران مع «{n}»؟ لا يُحذف أي اختبار؛ فقط يتوقف هذان الحاسوبان عن المزامنة.'],
    lanNew: ['Yeni bilgisayar eşleştir', 'Pair a new computer', 'اقتران حاسوب جديد'],
    lanShowPin: ['Bu bilgisayarda PIN göster', 'Show a PIN on this computer', 'عرض رمز PIN على هذا الحاسوب'],
    lanConnect: ['Diğer bilgisayara bağlan', 'Connect to the other computer', 'الاتصال بالحاسوب الآخر'],
    lanPinIs: ['Diğer bilgisayarda "Diğer bilgisayara bağlan" deyin ve bu PIN\'i girin (5 dakika geçerli):', 'On the other computer choose "Connect to the other computer" and enter this PIN (valid for 5 minutes):', 'على الحاسوب الآخر اختر «الاتصال بالحاسوب الآخر» وأدخل رمز PIN هذا (صالح لمدة 5 دقائق):'],
    lanWaiting: ['Bekleniyor…', 'Waiting…', 'بانتظار…'],
    lanSearch: ['Ağda ara', 'Search the network', 'البحث في الشبكة'],
    lanSearching: ['Aranıyor…', 'Searching…', 'جارٍ البحث…'],
    lanNoneFound: ['Ağda Sınav Hazırlama açık bir bilgisayar bulunamadı. Diğer bilgisayarda "PIN göster"e basıp tekrar arayın ya da adresini elle yazın.', 'No computer running Exam Builder was found. Press "Show a PIN" on the other computer and search again, or type its address.', 'لم يُعثر على حاسوب يعمل عليه البرنامج. اضغط «عرض رمز PIN» على الحاسوب الآخر وابحث مجدداً أو اكتب عنوانه.'],
    lanAddr: ['Adres (IP)', 'Address (IP)', 'العنوان (IP)'],
    lanPin: ['PIN (6 hane)', 'PIN (6 digits)', 'رمز PIN (6 أرقام)'],
    lanPair: ['Eşleş', 'Pair', 'اقتران'],
    lanPairedOk: ['"{n}" ile eşleşildi. İlk eşitleme başlıyor…', 'Paired with "{n}". First sync is starting…', 'تم الاقتران مع «{n}». تبدأ المزامنة الأولى…'],
    lanSynced: ['Wi-Fi eşitleme tamam: {n} sınav güncellendi.', 'Wi-Fi sync done: {n} exam(s) updated.', 'اكتملت مزامنة Wi-Fi: حُدّث {n} اختبار.'],
    lanSyncedNone: ['Wi-Fi eşitleme tamam: her şey güncel.', 'Wi-Fi sync done: everything is up to date.', 'اكتملت مزامنة Wi-Fi: كل شيء محدّث.'],
    lanConflicts: ['{n} çakışmada eski hâl yedeklendi.', '{n} conflict(s): the older version was backed up.', '{n} تعارض: حُفظت النسخة الأقدم.'],
    lanOpenedNewer: ['Açık sınavın daha yeni hâli Wi-Fi ile geldi ({d}); önceki hâl yedeklendi.', 'A newer version of the open exam arrived via Wi-Fi ({d}); the previous version was backed up.', 'وصلت نسخة أحدث من الاختبار المفتوح عبر Wi-Fi ({d})؛ وحُفظت النسخة السابقة.'],
    lanExams: ['Wi-Fi eşitleme deposundaki sınavlar', 'Exams in the Wi-Fi sync store', 'الاختبارات في مخزن مزامنة Wi-Fi'],
    lanExamsHint: ['Bu bilgisayarda açılan ve diğer bilgisayardan gelen sınavlar. Hiçbiri silinmez; çakışma yedekleri "Yedek klasörü"ndedir.', 'Exams opened on this computer and received from the other one. None are deleted; conflict backups are in the "Backup folder".', 'الاختبارات المفتوحة على هذا الحاسوب والواردة من الآخر. لا يُحذف أي منها؛ نسخ التعارض في «مجلد النسخ الاحتياطية».'],
    lanOpen: ['Aç', 'Open', 'فتح'],
    lanCurrent: ['açık', 'open', 'مفتوح'],
    lanArchived: ['arşivlendi', 'archived', 'مؤرشف'],
    lanQ: ['{n} soru', '{n} questions', '{n} سؤال'],
    lanErr_BAD_PIN: ['PIN yanlış ya da süresi doldu.', 'Wrong or expired PIN.', 'رمز PIN خاطئ أو منتهي الصلاحية.'],
    lanErr_NO_PIN: ['Diğer bilgisayarda önce "PIN göster"e basın.', 'Press "Show a PIN" on the other computer first.', 'اضغط أولاً «عرض رمز PIN» على الحاسوب الآخر.'],
    lanErr_NOT_FOUND: ['Bu adreste Sınav Hazırlama bulunamadı.', 'Exam Builder was not found at this address.', 'لم يُعثر على البرنامج في هذا العنوان.'],
    lanErr_REFUSED: ['Bağlantı reddedildi: diğer bilgisayarda Wi-Fi eşitleme kapalı olabilir.', 'Connection refused: Wi-Fi sync may be off on the other computer.', 'رُفض الاتصال: قد تكون مزامنة Wi-Fi متوقفة على الحاسوب الآخر.'],
    lanErr_NET: ['Diğer bilgisayara ulaşılamadı (açık mı, aynı ağda mı?).', 'Could not reach the other computer (is it on, on the same network?).', 'تعذّر الوصول إلى الحاسوب الآخر (هل هو قيد التشغيل وعلى الشبكة نفسها؟).'],
    lanErr_TIMEOUT: ['Diğer bilgisayar yanıt vermedi.', 'The other computer did not answer.', 'لم يستجب الحاسوب الآخر.'],
    lanErr_AUTH: ['Eşleşme geçersiz: diğer bilgisayarda eşleşme kaldırılmış olabilir. Yeniden eşleştirin.', 'Pairing is not valid: it may have been removed on the other computer. Pair again.', 'الاقتران غير صالح: ربما أُلغي على الحاسوب الآخر. أعد الاقتران.'],
    lanErr_PORT: ['Wi-Fi eşitleme portu açılamadı.', 'Could not open the Wi-Fi sync port.', 'تعذّر فتح منفذ مزامنة Wi-Fi.'],
    lanErr_BUSY: ['Eşitleme zaten sürüyor.', 'A sync is already running.', 'المزامنة جارية بالفعل.'],
    lanErrGeneric: ['Wi-Fi eşitleme hatası: {e}', 'Wi-Fi sync error: {e}', 'خطأ في مزامنة Wi-Fi: {e}'],
    kbUsageAiOr: ['OpenRouter kullanımı da kendi hesabınızdan sayılır; sınırları openrouter.ai/settings/credits sayfasındadır.', 'OpenRouter usage also counts against your own account; see openrouter.ai/settings/credits for limits.', 'يُحتسب استخدام OpenRouter أيضاً على حسابك؛ الحدود في صفحة openrouter.ai/settings/credits.']
  });
  function lanErr(code) { return window.I18N['lanErr_' + code] ? t('lanErr_' + code) : t('lanErrGeneric', { e: code || '?' }); }
  var unwrap = function (p) { return Promise.resolve(p).then(function (r) { if (r && r.ok) return r.data; var e = new Error((r && r.error) || 'ERR'); e.code = (r && r.error) || 'ERR'; throw e; }); };
  var fmtDate = function (ms) { try { return new Date(ms).toLocaleString(FC.i18n.lang() === 'ar' ? 'ar-u-nu-latn' : FC.i18n.lang()); } catch (e) { return ''; } };

  /* ---------- "klasik" şema: 1.9.x'in styles.css renkleri (açık = eski görünüm; koyu = aynı mavi tonların koyu karşılığı) ---------- */
  var KL = {
    '--bg': '#eef1f6', '--bg-grid': '#0000', '--panel': '#ffffff', '--panel-solid': '#ffffff', '--panel-hover': '#f3f5f9',
    '--border': '#dde2ec', '--border-strong': '#1f5fbf80', '--border-w': '1px', '--text': '#1d2433', '--muted': '#66708a', '--label': '#3b4560',
    '--nav-text': '#1d2433', '--nav-title': '#66708a', '--accent': '#1f5fbf', '--accent-2': '#174a96', '--on-accent': '#ffffff',
    '--primary-1': '#1f5fbf', '--primary-2': '#174a96', '--active-1': '#1f5fbf29', '--active-2': '#1f5fbf14', '--active-line': '#1f5fbf',
    '--accent-soft': '#e3ecfa', '--accent-line': '#9db7e0', '--focus': '#1f5fbf', '--focus-w': '2px', '--focus-ring': '#b8cff280',
    '--danger': '#c0392b', '--warn': '#b26a00', '--ok': '#1e7b34', '--ok-text': '#1e7b34', '--danger-text': '#a8322a', '--warn-text': '#7a5200',
    '--ok-soft': '#dff3e3', '--ok-line': '#9fd3ab', '--danger-soft': '#fdecea', '--danger-line': '#f2c0bb', '--warn-soft': '#fff3dc', '--warn-line': '#e3b341',
    '--sidebar-bg': '#ffffff', '--topbar-bg': '#1f5fbf', '--modal-bg': '#ffffff', '--modal-border': '#dde2ec', '--backdrop': '#0f192d73',
    '--toast-bg': '#1d2433', '--toast-text': '#ffffff', '--toast-line': '#1d2433', '--toast-err-bg': '#a8322a', '--toast-err-text': '#ffffff', '--toast-err-line': '#a8322a',
    '--badge-text': '#174a96', '--badge-bg': '#e3ecfa', '--badge-line': '#b8cff2', '--on-badge': '#ffffff',
    '--bar-track': '#dde2ec', '--scroll-thumb': '#9aa6bd80', '--glow-1': '#0000', '--glow-2': '#0000',
    '--shadow-pop': '0 6px 20px #14285033', '--shadow-modal': '0 20px 60px #0000004d', '--shadow-toast': '0 6px 20px #00000040',
    '--tb-bg': 'linear-gradient(90deg,#163f7e,#1f5fbf)', '--tb-text': '#ffffff', '--tb-btn': '#ffffff1a', '--tb-btn-line': '#ffffff40', '--tb-btn-hover': '#ffffff38',
    '--tb-primary-bg': '#ffffff', '--tb-primary-text': '#174a96', '--shadow': '0 1px 3px #141e3c14, 0 4px 14px #141e3c0d'
  };
  var KD = Object.assign({}, KL, {
    '--bg': '#111827', '--panel': '#1a2234', '--panel-solid': '#1a2234', '--panel-hover': '#222c42', '--border': '#2e3a55', '--text': '#e6eaf2',
    '--muted': '#9aa6bd', '--label': '#c4cbd8', '--nav-text': '#e6eaf2', '--accent': '#6c9fe8', '--accent-2': '#8fb0e6', '--active-1': '#6c9fe833',
    '--accent-soft': '#1f5fbf33', '--accent-line': '#1f5fbf80', '--focus': '#8fb0e6', '--focus-ring': '#1f5fbf4d',
    '--danger': '#f07167', '--warn': '#f2b544', '--ok': '#5cc477', '--ok-text': '#7cc58c', '--danger-text': '#f4a39b', '--warn-text': '#f2c66d',
    '--ok-soft': '#1e7b3433', '--ok-line': '#1e7b3480', '--danger-soft': '#c0392b33', '--danger-line': '#c0392b80', '--warn-soft': '#b26a0033', '--warn-line': '#b26a0080',
    '--sidebar-bg': '#1a2234', '--modal-bg': '#1a2234', '--modal-border': '#2e3a55', '--backdrop': '#000000a6', '--toast-bg': '#0b1220', '--toast-line': '#2e3a55',
    '--badge-text': '#c9d8f5', '--badge-bg': '#1f5fbf40', '--badge-line': '#1f5fbf80', '--bar-track': '#2e3a55', '--tb-bg': 'linear-gradient(90deg,#0f2a55,#174a96)',
    '--shadow': '0 1px 3px #0006'
  });
  FC.look.registerScheme('klasik', { light: KL, dark: KD, label: { tr: 'Klasik (eski görünüm)', en: 'Classic (previous look)', ar: 'الكلاسيكي (المظهر السابق)' } });

  /* ---------- dil: uygulamanın tercihi ↔ çekirdek ---------- */
  var prefs0 = {}; try { prefs0 = JSON.parse(localStorage.getItem('prefs') || '{}') || {}; } catch (e) { prefs0 = {}; }
  // 1.9.x'ten gelen kullanıcı mı? (eski tercihler, bulut ya da yapay zekâ ayarı var)
  var upgraded = !!prefs0.uiLang || !!localStorage.getItem('cloud.cfg') || !!localStorage.getItem('ai.cfg');
  if (!FC.storage.get('lang', null) && prefs0.uiLang) FC.i18n.set(prefs0.uiLang);
  // ilk kurulum: uygulamanın dili çekirdeğin seçtiği (sistem) dille başlar; rehberin ilk adımında değiştirilebilir
  if (!prefs0.uiLang) { try { var L0 = FC.i18n.lang(); localStorage.setItem('prefs', JSON.stringify(Object.assign(prefs0, { uiLang: L0, contentLang: prefs0.contentLang || L0 }))); } catch (e) { /* yok */ } }
  window.UI_LANG = FC.i18n.lang();
  FC.i18n.onChange(function (l) { window.UI_LANG = l; if (A().setUiLang) A().setUiLang(l); });

  /* ---------- çekirdeği başlat ---------- */
  // 1.9.x'ten gelen kullanıcı: "neler yeni" ilk açılışta gösterilir; zaten bulut ve yapay zekâ ayarlıysa rehber açılmaz
  try {
    if (upgraded && FC.storage.get('whatsnew.seen', null) == null) FC.storage.set('whatsnew.seen', '1.9.10');
    var ai0 = {}; try { ai0 = JSON.parse(localStorage.getItem('ai.cfg') || '{}') || {}; } catch (e) { ai0 = {}; }
    if (upgraded && localStorage.getItem('cloud.cfg') && localStorage.getItem('cloud.cfg') !== 'null' && ai0.key) FC.storage.set('onboarding.done', true);
  } catch (e) { /* yok */ }
  window.__shErrors = [];
  window.addEventListener('error', function (e) { if (e && e.message) window.__shErrors.push(String(e.message)); });
  FC.init({ app: 'sinav-hazirlama', repo: 'sinav-hazirlama', version: VER, setupChannel: 'win-setup', announcements: true, whatsnew: false, onboarding: false });
  FC.usage.wrapFetch();
  try { if (window.Cloud && Cloud.ready) FC.usage.setProject(Cloud.config.projectId); } catch (e) { /* yok */ }
  FC.updater.subscribe(function (s) { if (s.status === 'installing' && A().flushForUpdate) A().flushForUpdate(); });

  /* ---------- ilk açılış rehberi: dil → görünüm → kendi Firebase'iniz → kendi yapay zekâ anahtarınız ---------- */
  var OB = {
    store: false,
    onFirebase: function (c) { if (c && c.apiKey && c.projectId && A().setCloudConfig) A().setCloudConfig({ apiKey: c.apiKey, projectId: c.projectId }); },
    onAi: function (v) {
      if (!v || !v.key || !window.AI) return;
      var cur = window.AI.get() || {};
      window.AI.set(Object.assign({}, cur, { provider: v.provider, key: v.key, model: cur.provider === v.provider ? cur.model : '' }));
    }
  };

  /* ---------- üst çubuk ---------- */
  var tb = null, lanState = 'off';
  function mountTopbar() {
    var bar = document.querySelector('header.topbar');
    if (!bar || tb) return;
    tb = FC.topbar.mount(bar, {
      before: [FC.announcements.button()],
      sync: { state: 'off', onClick: function () { if (A().syncNow) A().syncNow(); } },
      lan: { state: 'off', onClick: function () { lanModal(); } }
    });
    tb.setSync('off');
  }
  function cloudState(st, offline) {
    if (!tb) return;
    var m = { off: 'off', ok: 'idle', busy: 'syncing', error: offline ? 'offline' : 'error', pending: offline ? 'offline' : 'idle' };
    tb.setSync(m[st] || 'off', st === 'pending' ? 1 : 0);
  }
  function setLan(s) { lanState = s; if (tb) tb.setLan(s); }

  /* ---------- Ayarlar: çekirdek kartları (iletişim kartı EN SONDA) ---------- */
  function syncCard() {
    var c = ui.card({ key: 'sync', title: t('kbSync'), icon: 'sync' });
    c.appendChild(ui.el('p.card-desc', { text: t('kbSyncDesc') }));
    var cl = ui.el('div.notice'), wf = ui.el('div.notice');
    c.appendChild(cl); c.appendChild(wf);
    var cfg = A().cloudConfig ? A().cloudConfig() : null, ready = A().cloudReady && A().cloudReady();
    cl.className = 'notice ' + (ready ? 'ok' : 'info');
    cl.textContent = ready && cfg ? t('kbCloudOn', { p: cfg.projectId }) : t('kbCloudOff');
    wf.className = 'notice info'; wf.textContent = t('kbWifiOff');
    if (api.lan) unwrap(api.lan.status()).then(function (s) { wf.className = 'notice ' + (s.open ? 'ok' : 'info'); wf.textContent = s.open || s.pairs.length ? t('kbWifiOn', { n: s.pairs.length }) : t('kbWifiOff'); }, function () {});
    var row = ui.el('div.fc-row', { style: 'margin-top:12px' });
    row.appendChild(ui.el('button.btn.small', { type: 'button', html: ui.icon('cloud') + esc(t('kbCloudBtn')), onclick: function () { if (A().cloudModal) A().cloudModal(); } }));
    row.appendChild(ui.el('button.btn.small', { type: 'button', html: ui.icon('wifi') + esc(t('kbWifiBtn')), onclick: function () { lanModal(); } }));
    if (api.openBackups) row.appendChild(ui.el('button.btn.small', { type: 'button', html: ui.icon('box') + esc(t('kbBackups')), onclick: function () { api.openBackups(); } }));
    c.appendChild(row);
    return c;
  }
  function settingsGrid() {
    var wrap = ui.el('div.kb-settings');
    FC.settings.build(wrap, { cards: [syncCard()], usage: { project: function () { var c = A().cloudConfig && A().cloudConfig(); return A().cloudReady && A().cloudReady() && c ? c.projectId : ''; } }, about: { version: VER }, onboarding: OB });
    return wrap;
  }

  /* ---------- Wi-Fi eşitleme ---------- */
  var lanTimer = null, lanAutoBusy = false;
  async function lanRefreshState() {
    if (!api.lan) { setLan('off'); return null; }
    try { var s = await unwrap(api.lan.status()); setLan(s.busy ? 'busy' : s.open ? 'on' : 'off'); return s; } catch (e) { setLan('off'); return null; }
  }
  // Wi-Fi'den gelen kayıtlar açık sınavı ilgilendiriyorsa daha yeni hâli editöre alınır (önceki hâl yedeklenir)
  async function lanApply(ids) {
    var app = A(); if (!app.exam || !ids || ids.indexOf(String(app.exam.id)) < 0) return false;
    var rec; try { rec = await unwrap(api.lan.get(app.exam.id)); } catch (e) { return false; }
    if (!rec || !rec.exam || JSON.stringify(rec.exam) === JSON.stringify(app.exam)) return false;
    await app.openExamObject(rec.exam, 'wifi-once');
    app.toast(t('lanOpenedNewer', { d: fmtDate(rec.updatedAt) }), 'ok', [], 8000);
    return true;
  }
  async function lanSync(peerId, quiet) {
    if (!api.lan) return null;
    var app = A();
    try { if (app.exam) await unwrap(api.lan.put(app.exam)); } catch (e) { /* yok */ }
    setLan('busy');
    var r;
    try { r = await unwrap(api.lan.sync(peerId || null)); } catch (e) { await lanRefreshState(); if (!quiet) app.toast(lanErr(e.code), 'err', [], 8000); return null; }
    await lanRefreshState();
    await lanApply(r.changed);
    var bad = r.results.filter(function (x) { return !x.ok; });
    var conf = r.results.reduce(function (n, x) { return n + (x.conflicts || 0); }, 0);
    if (!quiet || r.changed.length) {
      if (bad.length && !quiet) app.toast(bad.map(function (x) { return x.peer.name + ': ' + lanErr(x.error); }).join(' · '), 'warn', [], 9000);
      else if (r.results.length) app.toast((r.changed.length ? t('lanSynced', { n: r.changed.length }) : t('lanSyncedNone')) + (conf ? ' ' + t('lanConflicts', { n: conf }) : ''), 'ok');
    }
    return r;
  }
  function lanAuto() {
    clearInterval(lanTimer);
    lanTimer = setInterval(async function () {
      if (lanAutoBusy || document.hidden) return;
      var s = await lanRefreshState(); if (!s || !s.pairs.length || s.busy) return;
      lanAutoBusy = true; try { await lanSync(null, true); } finally { lanAutoBusy = false; }
    }, 3 * 60000);
    setTimeout(async function () { var s = await lanRefreshState(); if (s && s.pairs.length) lanSync(null, true); }, 15000);
  }
  function lanModal() {
    if (!api.lan) return;
    var body = ui.el('div.lanbox'), pinTimer = null, m = null;
    async function draw() {
      var s; try { s = await unwrap(api.lan.status()); } catch (e) { body.textContent = lanErr(e.code); return; }
      setLan(s.busy ? 'busy' : s.open ? 'on' : 'off');
      body.innerHTML = '';
      body.appendChild(ui.el('p.muted', { text: t('lanIntro') }));
      var me = ui.el('div.notice.info', null, [ui.el('span', { html: ui.icon('wifi') }), ui.el('span', { text: t('lanThis') + ': ' + s.name + (s.addrs.length ? ' · ' + s.addrs.join(', ') : '') + (s.port ? ' · ' + s.port : '') })]);
      body.appendChild(me);
      var chk = ui.el('input', { type: 'checkbox' }); chk.checked = s.open;
      chk.addEventListener('change', async function () { try { await unwrap(api.lan.setOpen(chk.checked)); } catch (e) { A().toast(lanErr(e.code), 'err'); } draw(); });
      body.appendChild(ui.el('label.check', null, [chk, ui.el('span', { text: t('lanOpenLbl') })]));
      body.appendChild(ui.el('p.field-hint', { text: t('lanFirewall') }));

      body.appendChild(ui.el('h4.section-title', { text: t('lanPaired') }));
      if (!s.pairs.length) body.appendChild(ui.el('p.muted', { text: t('lanNoPairs') }));
      s.pairs.forEach(function (p) {
        var row = ui.el('div.lanrow');
        row.appendChild(ui.el('div.lantxt', null, [ui.el('b', { text: p.name }), ui.el('small.muted', { text: p.host + ' · ' + (p.last ? t('lanLast', { d: fmtDate(p.last) }) : t('lanNever')) })]));
        var bs = ui.el('div.fc-row');
        bs.appendChild(ui.el('button.btn.small.primary', { type: 'button', html: ui.icon('sync') + esc(t('lanSyncNow')), onclick: async function (e) { e.currentTarget.disabled = true; await lanSync(p.id); draw(); } }));
        bs.appendChild(ui.el('button.btn.small', { type: 'button', text: t('lanUnpair'), onclick: async function () { if (!(await A().confirmBox(t('lanUnpairAsk', { n: p.name })))) return; await unwrap(api.lan.unpair(p.id)).catch(function () {}); draw(); } }));
        row.appendChild(bs); body.appendChild(row);
      });

      body.appendChild(ui.el('h4.section-title', { text: t('lanNew') }));
      var pairBox = ui.el('div.lanpair');
      var b1 = ui.el('button.btn.small', { type: 'button', html: ui.icon('key') + esc(t('lanShowPin')) });
      var b2 = ui.el('button.btn.small', { type: 'button', html: ui.icon('globe') + esc(t('lanConnect')) });
      var pane = ui.el('div.lanpane');
      b1.addEventListener('click', async function () {
        var p; try { p = await unwrap(api.lan.pinShow()); } catch (e) { pane.textContent = lanErr(e.code); return; }
        pane.innerHTML = '';
        pane.appendChild(ui.el('p', { text: t('lanPinIs') }));
        pane.appendChild(ui.el('div.lanpin', { text: p.code.slice(0, 3) + ' ' + p.code.slice(3), dir: 'ltr' }));
        var st = ui.el('p.muted', { text: t('lanWaiting') }); pane.appendChild(st);
        clearInterval(pinTimer);
        pinTimer = setInterval(async function () {
          var left = Math.max(0, Math.round((p.until - Date.now()) / 1000));
          st.textContent = t('lanWaiting') + ' ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
          var s2; try { s2 = await unwrap(api.lan.status()); } catch (e) { return; }
          if (!s2.pin || left <= 0) { clearInterval(pinTimer); draw(); }
        }, 1000);
      });
      b2.addEventListener('click', function () {
        pane.innerHTML = '';
        var found = ui.el('div.lanfound'), addr = ui.el('input', { type: 'text', dir: 'ltr', placeholder: '192.168.1.20' }), pin = ui.el('input', { type: 'text', dir: 'ltr', inputmode: 'numeric', maxlength: '7', placeholder: '123 456' });
        var chosen = { id: '', port: 0 }, msg = ui.el('p.field-hint');
        var search = ui.el('button.btn.small', { type: 'button', html: ui.icon('sync') + esc(t('lanSearch')) });
        async function doSearch() {
          found.textContent = t('lanSearching'); search.disabled = true;
          var list = []; try { list = await unwrap(api.lan.discover()); } catch (e) { list = []; }
          search.disabled = false; found.innerHTML = '';
          if (!list.length) { found.appendChild(ui.el('p.muted', { text: t('lanNoneFound') })); return; }
          list.forEach(function (p) {
            var b = ui.el('button.btn.small' + (p.pairing ? '.primary' : ''), { type: 'button', text: p.name + ' · ' + p.host });
            b.addEventListener('click', function () { addr.value = p.host; chosen = { id: p.id, port: p.port }; pin.focus(); });
            found.appendChild(b);
          });
          if (list.length === 1) { addr.value = list[0].host; chosen = { id: list[0].id, port: list[0].port }; }
        }
        search.addEventListener('click', doSearch);
        var go = ui.el('button.btn.small.primary', { type: 'button', html: ui.icon('check') + esc(t('lanPair')) });
        go.addEventListener('click', async function () {
          go.disabled = true; msg.textContent = '';
          try {
            var host = addr.value.trim();
            var peer = await unwrap(api.lan.pair({ host: host, port: chosen.id && host ? chosen.port : 0, pin: pin.value, id: chosen.id && host ? chosen.id : '' }));
            A().toast(t('lanPairedOk', { n: peer.name }), 'ok');
            await lanSync(peer.id);
            lanAuto(); draw();
          } catch (e) { msg.textContent = lanErr(e.code); go.disabled = false; }
        });
        pane.appendChild(ui.el('div.fc-row', null, [search])); pane.appendChild(found);
        pane.appendChild(ui.el('div.lanform', null, [ui.el('label.field', null, [ui.el('span.field-label', { text: t('lanAddr') }), addr]), ui.el('label.field', null, [ui.el('span.field-label', { text: t('lanPin') }), pin])]));
        pane.appendChild(ui.el('div.fc-row', { style: 'margin-top:10px' }, [go])); pane.appendChild(msg);
        doSearch();
      });
      pairBox.appendChild(ui.el('div.fc-row', null, [b1, b2])); pairBox.appendChild(pane);
      if (s.pin) { setTimeout(function () { b1.click(); }, 0); }
      body.appendChild(pairBox);

      body.appendChild(ui.el('h4.section-title', { text: t('lanExams') }));
      body.appendChild(ui.el('p.field-hint', { text: t('lanExamsHint') }));
      var listBox = ui.el('div.lanlist'); body.appendChild(listBox);
      var items = []; try { items = await unwrap(api.lan.list()); } catch (e) { items = []; }
      var cur = A().exam && String(A().exam.id);
      items.slice(0, 200).forEach(function (r) {
        var row = ui.el('div.lanrow' + (r.id === cur ? '.cur' : ''));
        row.appendChild(ui.el('div.lantxt', null, [ui.el('b', { text: r.name || t('untitled'), dir: 'auto' }), ui.el('small.muted', { text: t('lanQ', { n: r.q }) + ' · ' + fmtDate(r.updatedAt) + (r.archived ? ' · ' + t('lanArchived') : '') + (r.id === cur ? ' · ' + t('lanCurrent') : '') })]));
        if (r.id !== cur) row.appendChild(ui.el('button.btn.small', { type: 'button', text: t('lanOpen'), onclick: async function () { var rec = await unwrap(api.lan.get(r.id)).catch(function () { return null; }); if (rec && rec.exam) { await A().openExamObject(rec.exam, 'acmadan-once'); if (m) m.close(); } } }));
        listBox.appendChild(row);
      });
      var foot = ui.el('div.fc-row', { style: 'margin-top:10px' });
      foot.appendChild(ui.el('button.btn.small', { type: 'button', html: ui.icon('box') + esc(t('kbBackups')), onclick: function () { api.lan.openBackups(); } }));
      body.appendChild(foot);
    }
    m = ui.modal({ title: t('lanTitle'), icon: 'wifi', body: body, cls: 'lanmodal', buttons: [{ label: t('close'), cls: 'primary' }], onClose: function () { clearInterval(pinTimer); api.lan.pinHide().catch(function () {}); lanRefreshState(); } });
    draw();
  }
  if (api.lan) {
    api.lan.onChanged(function (d) { lanApply(d && d.ids).catch(function () {}); lanRefreshState(); });
    api.lan.onPaired(function (p) { A().toast && A().toast(t('lanPairedOk', { n: p.name }), 'ok'); lanRefreshState(); lanAuto(); });
  }

  /* ---------- açılış ---------- */
  mountTopbar();
  lanRefreshState();
  lanAuto();
  setTimeout(function () {
    var wn = FC.whatsnew.start({ version: VER, notes: function (v) { return v === VER ? REL.notes : null; } });
    if (!wn) setTimeout(function () { FC.onboarding.maybeStart(OB); }, 700);
    if (A().contactFlush) A().contactFlush().catch(function () {});
  }, 1200);

  window.Kabuk = { ready: true, cloudState: cloudState, settingsGrid: settingsGrid, lanModal: lanModal, lanSync: lanSync, OB: OB };
})();
