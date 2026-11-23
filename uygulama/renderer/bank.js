'use strict';
// Otomatik soru / senaryo getirme ve arşiv.
//  - Çevrimiçi: Firebase'deki güncel arşiv (updates/desktop/parts/bank~1) + Oxford kelimelerinden çeviriyle anlık soru üretimi
//  - Çevrimdışı: son indirilen arşiv (cihazda saklanır) ya da programla gelen yerleşik arşiv
//  - Benim arşivim: kullanıcının kaydettiği soru/senaryolar (bilgisayarda dosya + yedek)
(function () {
  Object.assign(window.I18N, {
    autoQ: ['🎲 Otomatik soru getir', '🎲 Auto-fetch questions', '🎲 جلب أسئلة تلقائياً'],
    autoS: ['🎲 Otomatik senaryo getir', '🎲 Auto-fetch scenarios', '🎲 جلب سيناريوهات تلقائياً'],
    archiveQ: ['📚 Soru arşivi', '📚 Question archive', '📚 أرشيف الأسئلة'],
    archiveS: ['📚 Senaryo arşivi', '📚 Scenario archive', '📚 أرشيف السيناريوهات'],
    bkTabAuto: ['🎲 Otomatik getir', '🎲 Auto-fetch', '🎲 جلب تلقائي'],
    bkTabArch: ['📚 Arşiv', '📚 Archive', '📚 الأرشيف'],
    bkLevel: ['Seviye', 'Level', 'المستوى'],
    bkL1: ['Öğrenci (temel)', 'Student (basic)', 'طالب (أساسي)'],
    bkL2: ['Orta', 'Intermediate', 'متوسط'],
    bkL3: ['İleri', 'Advanced', 'متقدم'],
    bkLAll: ['Tüm seviyeler', 'All levels', 'كل المستويات'],
    bkTopic: ['Konu', 'Topic', 'الموضوع'],
    bkTuav: ['İHA / Havacılık', 'UAV / Aviation', 'الطائرات المسيّرة / الطيران'],
    bkTeng: ['İngilizce', 'English', 'اللغة الإنجليزية'],
    bkTengR: ['İngilizce okuma', 'English reading', 'قراءة باللغة الإنجليزية'],
    bkTvocab: ['Kelime listemden', 'From my word list', 'من قائمة كلماتي'],
    bkToxf: ['Oxford kelimeleri (internet)', 'Oxford words (online)', 'كلمات أكسفورد (إنترنت)'],
    bkTmine: ['Benim arşivim', 'My archive', 'أرشيفي'],
    bkTall: ['Tüm konular', 'All topics', 'كل المواضيع'],
    bkCount: ['Adet', 'Count', 'العدد'],
    bkPts: ['Soru başına puan', 'Points per question', 'الدرجة لكل سؤال'],
    bkFetch: ['Getir', 'Fetch', 'جلب'],
    bkRefetch: ['🔄 Başkalarını getir', '🔄 Fetch others', '🔄 جلب غيرها'],
    bkAdd: ['Seçilenleri sınava ekle ({n})', 'Add selected to exam ({n})', 'أضف المحدد إلى الاختبار ({n})'],
    bkOnline: ['🟢 Çevrimiçi: güncel arşiv kullanılıyor (sürüm {v})', '🟢 Online: using the latest archive (version {v})', '🟢 متصل: يُستخدم أحدث أرشيف (إصدار {v})'],
    bkCache: ['🟠 Çevrimdışı: son indirilen arşiv kullanılıyor (sürüm {v})', '🟠 Offline: using the last downloaded archive (version {v})', '🟠 غير متصل: يُستخدم آخر أرشيف محمّل (إصدار {v})'],
    bkBuiltin: ['🟠 İnternet yok: programla gelen arşiv kullanılıyor (sürüm {v})', '🟠 No internet: using the built-in archive (version {v})', '🟠 لا يوجد إنترنت: يُستخدم الأرشيف المدمج (إصدار {v})'],
    bkBuiltinOn: ['🟢 Çevrimiçi: arşiv güncel, programla gelen sürüm kullanılıyor (sürüm {v})', '🟢 Online: archive is up to date, using the built-in version (version {v})', '🟢 متصل: الأرشيف محدّث، يُستخدم الإصدار المدمج (إصدار {v})'],
    bkChecking: ['İnternet denetleniyor…', 'Checking the internet…', 'جارٍ التحقق من الإنترنت…'],
    bkPool: ['Bu seçimde arşivde {n} öğe var, {u} tanesi daha önce getirilmedi.', '{n} items match in the archive, {u} not fetched before.', 'يوجد {n} عنصراً مطابقاً في الأرشيف، منها {u} لم تُجلب من قبل.'],
    bkNone: ['Bu seçime uygun içerik bulunamadı.', 'Nothing matches this selection.', 'لا يوجد محتوى مطابق لهذا الاختيار.'],
    bkNeedVocab: ['Kelime listesinde anlamı dolu en az 5 kelime olmalı.', 'The word list needs at least 5 words with meanings.', 'يجب أن تحتوي قائمة الكلمات على 5 كلمات على الأقل مع معانيها.'],
    bkNeedNet: ['Oxford kelimelerinden soru üretmek için internet gerekir.', 'Generating questions from Oxford words needs the internet.', 'يتطلب توليد الأسئلة من كلمات أكسفورد اتصالاً بالإنترنت.'],
    bkGen: ['Sorular hazırlanıyor… {d}/{t}', 'Preparing questions… {d}/{t}', 'جارٍ إعداد الأسئلة… {d}/{t}'],
    bkAdded: ['{n} öğe eklendi.', '{n} items added.', 'تمت إضافة {n} عنصراً.'],
    bkVocabQ: ['"{w}" kelimesinin anlamı nedir?', 'What does "{w}" mean?', 'ما معنى كلمة "{w}"؟'],
    bkSearch: ['Ara… (soru, seçenek, konu)', 'Search… (question, option, topic)', 'بحث… (سؤال، خيار، موضوع)'],
    sub_vocab: ['Kelime', 'Vocabulary', 'مفردات'], sub_term: ['Terim', 'Term', 'مصطلح'], sub_synonym: ['Eş anlam', 'Synonym', 'مرادف'], sub_antonym: ['Zıt anlam', 'Antonym', 'ضد'],
    sub_tense: ['Zaman', 'Tense', 'الأزمنة'], sub_question: ['Soru cümlesi', 'Question form', 'صيغة السؤال'], sub_negative: ['Olumsuz', 'Negative', 'النفي'], sub_passive: ['Edilgen', 'Passive', 'المبني للمجهول'],
    sub_comparative: ['Karşılaştırma', 'Comparative', 'المقارنة'], sub_superlative: ['En üstünlük', 'Superlative', 'التفضيل'], sub_plural: ['Çoğul', 'Plural', 'الجمع'], sub_article: ['Tanımlık', 'Article', 'أدوات التعريف'],
    sub_preposition: ['Edat', 'Preposition', 'حروف الجر'], sub_modal: ['Kiplik', 'Modal', 'الأفعال الناقصة'], sub_conditional: ['Koşul', 'Conditional', 'الشرط'], sub_tag: ['Soru eki', 'Question tag', 'الأسئلة الذيلية'],
    sub_quantity: ['Miktar', 'Quantifier', 'الكمية'], sub_conjunction: ['Bağlaç', 'Conjunction', 'أدوات الربط'], sub_gerund: ['-ing / to', 'Gerund / infinitive', 'المصدر'], sub_relative: ['İlgi cümlesi', 'Relative clause', 'جمل الوصل'],
    sub_reported: ['Dolaylı anlatım', 'Reported speech', 'الكلام المنقول'], sub_pronoun: ['Zamir', 'Pronoun', 'الضمائر'], sub_be: ['Be fiili', 'Verb "be"', 'فعل be'], sub_adverb: ['Zarf', 'Adverb', 'الظرف'],
    sub_inversion: ['Devrik yapı', 'Inversion', 'القلب'], sub_collocation: ['Eşdizim', 'Collocation', 'المتلازمات'], sub_phrasal: ['Deyimsel fiil', 'Phrasal verb', 'الأفعال المركبة'],
    bkSource: ['Kaynak', 'Source', 'المصدر'],
    bkSrcAll: ['Hepsi', 'All', 'الكل'],
    bkSrcBank: ['Hazır arşiv', 'Ready archive', 'الأرشيف الجاهز'],
    bkSaveExam: ['💾 Bu sınavdakileri arşivime kaydet', '💾 Save this exam\'s items to my archive', '💾 حفظ عناصر هذا الاختبار في أرشيفي'],
    bkSaved: ['{n} öğe arşivinize kaydedildi ({s} tanesi zaten vardı).', '{n} items saved to your archive ({s} were already there).', 'تم حفظ {n} عنصراً في أرشيفك ({s} موجودة مسبقاً).'],
    bkSaveLvl: ['Kaydedilecek seviye', 'Level to save as', 'المستوى عند الحفظ'],
    bkDelMine: ['Arşivimden sil', 'Delete from my archive', 'حذف من أرشيفي'],
    bkShown: ['{n} öğe gösteriliyor', '{n} items shown', 'يُعرض {n} عنصراً'],
    bkMore: ['… ve {n} öğe daha (aramayı daraltın)', '… and {n} more (narrow the search)', '… و{n} عناصر أخرى (ضيّق البحث)'],
    bkUsed: ['daha önce getirildi', 'fetched before', 'جُلب من قبل'],
    bkInExam: ['sınavda var', 'already in exam', 'موجود في الاختبار'],
    bkAutoSaved: ['İnternetten üretilen {n} soru arşivinize de kaydedildi; internet yokken de kullanabilirsiniz.', '{n} questions generated online were also saved to your archive for offline use.', 'تم حفظ {n} سؤالاً مولّداً عبر الإنترنت في أرشيفك لاستخدامها دون اتصال.'],
    bkHintS: ['Daha önce getirilen senaryolar, yenileri bitene kadar tekrar gelmez.', 'Scenarios fetched before are not repeated until new ones run out.', 'لا تتكرر السيناريوهات المجلوبة سابقاً حتى تنفد الجديدة.'],
    bkHint: ['Seçenekler sınava eklenirken karıştırılır. Daha önce getirilenler, yenileri bitene kadar tekrar gelmez.', 'Options are shuffled when added. Items fetched before are not repeated until new ones run out.', 'تُخلط الخيارات عند الإضافة. لا تتكرر العناصر المجلوبة سابقاً حتى تنفد الجديدة.'],
    // kelime seviyeleri
    vlvlTitle: ['Seviye:', 'Level:', 'المستوى:'],
    vlvlOther: ['Diğer', 'Other', 'أخرى'],
    vlvlOtherTip: ['Oxford 3000/5000 ve C2 listesinde olmayan kelimeler (uzmanlık terimleri vb.)', 'Words not in the Oxford 3000/5000 or C2 lists (technical terms, etc.)', 'كلمات غير موجودة في قوائم أكسفورد 3000/5000 ولا في قائمة C2 (مصطلحات تخصصية، إلخ)'],
    c2Tip: ['C2 kelimesi (Octanove C1/C2 listesi) · "{w}"', 'C2 word (Octanove C1/C2 list) · "{w}"', 'كلمة من المستوى C2 (قائمة Octanove C1/C2) · "{w}"'],
    vlvlOnly: ['Diğer seviyeleri kapat', 'Turn other levels off', 'إيقاف المستويات الأخرى'],
    vlvlTip: ['{l}: {a}/{n} kelime aktif. Tıklayınca bu seviyedeki kelimeler aktif olur.', '{l}: {a}/{n} words active. Click to activate the words of this level.', '{l}: {a}/{n} كلمة مفعّلة. انقر لتفعيل كلمات هذا المستوى.'],
    vlvlDone: ['{l}: {n} kelime aktif edildi.', '{l}: {n} words activated.', '{l}: تم تفعيل {n} كلمة.'],
    vlvlOff: ['{l}: {n} kelime kapatıldı.', '{l}: {n} words turned off.', '{l}: تم إيقاف {n} كلمة.'],
    vlvlAll: ['Tümü', 'All', 'الكل'],
    vlvlNote: ['A1–C1 Oxford listelerinden, C2 Octanove C2 listesinden gelir; ikisinde de olmayanlar "Diğer"dedir.', 'A1–C1 come from the Oxford lists, C2 from the Octanove C2 list; words in neither are under "Other".', 'المستويات A1–C1 من قوائم أكسفورد، وC2 من قائمة Octanove؛ والكلمات خارجها ضمن "أخرى".'],
  });

  // 1.9.2: çevrimiçi soru arşivi GitHub'dan gelir (yöneticinin Firebase kotası harcanmasın).
  const BANK_URL = 'https://raw.githubusercontent.com/departures-mil/sinav-hazirlama/main/guncelleme/bank.json';
  const LS_CACHE = 'bank.online', LS_USED = 'bank.used', LS_MINE = 'bank.mine';
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  };
  const valid = (b) => b && Array.isArray(b.questions) && Array.isArray(b.scenarios) && b.v;
  const newer = (a, b) => String(a.v) > String(b.v);

  let state = null; // { bank, source, v }
  async function fetchTimeout(url, ms) {
    const ac = new AbortController();
    const tm = setTimeout(() => ac.abort(), ms);
    try { return await fetch(url, { signal: ac.signal, cache: 'no-store' }); } finally { clearTimeout(tm); }
  }
  // Arşivi yükler: çevrimiçi sürüm varsa onu indirip saklar; yoksa saklanan ya da yerleşik olan
  async function load(force) {
    if (state && !force) return state;
    // 1.9.4: yerleşik arşiv = el yazımı (bank-data, bank-data2) + üretilmiş (bank-gen)
    const b0 = window.QBANK_BUILTIN;
    const gen = window.QBANK_GEN;
    const builtin = gen ? { v: String(b0.v) > String(gen.v) ? b0.v : gen.v, questions: b0.questions.concat(gen.questions), scenarios: b0.scenarios } : b0;
    let cache = ls.get(LS_CACHE, null);
    if (!valid(cache)) cache = null;
    let online = false;
    try {
      if (navigator.onLine === false) throw new Error('offline');
      const r = await fetchTimeout(BANK_URL + '?t=' + Math.floor(Date.now() / 3600000), 7000);
      online = r.ok || r.status === 404; // sunucuya ulaşıldı
      if (r.ok) {
        const j = await r.json();
        const d = j && j.fields && j.fields.d && j.fields.d.stringValue;
        const b = d ? JSON.parse(d) : (j && j.questions ? j : null);
        if (valid(b)) { cache = b; ls.set(LS_CACHE, b); }
      }
    } catch { /* çevrimdışı */ }
    let bank = builtin, source = 'builtin';
    if (cache && !newer(builtin, cache)) { bank = cache; source = online ? 'online' : 'cache'; }
    state = { bank, source, v: bank.v, online };
    return state;
  }
  // internet var mı (çeviri servisi için)
  const isOnline = () => !!(state && state.online);

  /* ---- daha önce getirilenler ---- */
  const usedSet = () => new Set(ls.get(LS_USED, []));
  function markUsed(ids) {
    const s = usedSet(); ids.forEach((i) => s.add(i));
    ls.set(LS_USED, [...s].slice(-5000));
  }

  /* ---- benim arşivim (bilgisayarda dosya; yoksa yerel depo) ---- */
  let mineCache = null;
  async function getMine() {
    if (mineCache) return mineCache;
    let d = null;
    try { if (window.api && window.api.archiveRead) d = await window.api.archiveRead(); } catch { /* yok */ }
    if (!d) d = ls.get(LS_MINE, null);
    mineCache = { questions: (d && d.questions) || [], scenarios: (d && d.scenarios) || [] };
    return mineCache;
  }
  async function saveMine() {
    const d = { app: 'sinav-hazirlama-arsiv', saved: new Date().toISOString(), ...mineCache };
    ls.set(LS_MINE, d);
    try { if (window.api && window.api.archiveWrite) await window.api.archiveWrite(d); } catch (e) { console.error('arşiv yazılamadı', e); }
  }
  const norm = (s) => String(s || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
  const sig = (ml) => norm(ml && (ml.en || ml.tr || ml.ar));
  const sigAll = (ml) => ['tr', 'en', 'ar'].map((k) => norm(ml && ml[k])).filter(Boolean);
  // aynı metin zaten varsa eklemez; dönen: [eklenen, zaten olan]
  async function addMine(kind, items) {
    const m = await getMine();
    const list = kind === 's' ? m.scenarios : m.questions;
    // aynı öğe: sorularda soru metni, senaryolarda metin + ilk sorusu (herhangi bir dilde) aynıysa
    const keysOf = (x) => kind === 's'
      ? sigAll(x.text).map((k) => k + '|' + sig(x.questions && x.questions[0] && x.questions[0].text))
      : sigAll(x.text);
    const have = new Set(list.flatMap(keysOf));
    let added = 0, skip = 0;
    items.forEach((it) => {
      const keys = keysOf(it);
      if (!keys.length || keys.some((k) => have.has(k))) { skip++; return; }
      const x = JSON.parse(JSON.stringify(it));
      x.id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      x.src = 'mine'; x.added = new Date().toISOString();
      list.push(x); keys.forEach((k) => have.add(k)); added++;
    });
    if (added) await saveMine();
    return [added, skip];
  }
  async function delMine(kind, id) {
    const m = await getMine();
    const k = kind === 's' ? 'scenarios' : 'questions';
    m[k] = m[k].filter((x) => x.id !== id);
    await saveMine();
  }

  /* ---- seçim ---- */
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // havuzdan önce hiç getirilmemişler, sonra eskiler; sınavda zaten olanlar hariç
  function pick(pool, count, examSigs) {
    const used = usedSet();
    const fresh = pool.filter((x) => !examSigs.has(sig(x.text)));
    const a = shuffle(fresh.filter((x) => !used.has(x.id)));
    const b = shuffle(fresh.filter((x) => used.has(x.id)));
    return a.concat(b).slice(0, count);
  }

  /* ---- kelime sorusu üretimi ---- */
  const LVL_CEFR = { 1: ['A1', 'A2'], 2: ['B1', 'B2'], 3: ['B2', 'C1', 'C2'] };
  // items: [{ term, ar, tr }] — her kelime için doğru anlam + diğer kelimelerin anlamlarından 4 çeldirici
  // cand: soru yapılacak kelimeler (verilmezse hepsi); çeldiriciler her zaman tüm listeden
  function vocabQuestions(items, count, cand) {
    const ok = items.filter((x) => x.term && (x.ar || x.tr));
    if (ok.length < 5) return [];
    const used = usedSet();
    const c = (cand || ok).filter((x) => ok.includes(x));
    const order = shuffle(c.filter((x) => !used.has('v' + norm(x.term)))).concat(shuffle(c.filter((x) => used.has('v' + norm(x.term)))));
    return order.slice(0, count).map((it) => {
      const seen = new Set([norm(it.ar || it.tr)]);
      const others = shuffle(ok.filter((o) => o !== it)).filter((o) => { const k = norm(o.ar || o.tr); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 4);
      const opt = (o) => ({ tr: o.tr || o.ar || '', en: o.ar || o.tr || '', ar: o.ar || o.tr || '' });
      return {
        id: 'v' + norm(it.term), lvl: it.lvl || 0, topic: it.topic || 'vocab',
        text: { tr: window.t('bkVocabQ', { w: it.term }, 'tr'), en: window.t('bkVocabQ', { w: it.term }, 'en'), ar: window.t('bkVocabQ', { w: it.term }, 'ar') },
        options: [opt(it), ...others.map(opt)], correct: 0,
      };
    }).filter((q) => q.options.length === 5);
  }
  // Oxford listesinden seviyeye uygun kelimeleri internetten çevirerek soru üretir
  async function oxfordQuestions(lvl, count, langs, onProgress) {
    const L = window.OXFORD_LISTS || {};
    const want = LVL_CEFR[lvl] || ['B1'];
    let words = [];
    Object.keys(L).forEach((k) => { if (want.includes(k.slice(1))) words = words.concat(L[k].split('|')); });
    words = shuffle(words.filter((w) => /^[a-z][a-z -]{2,}$/.test(w)));
    const used = usedSet();
    words = words.filter((w) => !used.has('v' + w)).concat(words.filter((w) => used.has('v' + w)));
    const n = Math.max(5, count + 4); // çeldirici için fazladan
    const pickW = words.slice(0, n);
    const out = [];
    let done = 0;
    const tr1 = async (w, to) => { try { return ((window.Ceviri ? await window.Ceviri.translate(w, 'en', to) : await window.api.translate({ text: w, from: 'en', to })) || '').trim(); } catch { return ''; } };
    const queue = pickW.slice();
    const worker = async () => {
      while (queue.length) {
        const w = queue.shift();
        const it = { term: w, lvl, topic: 'oxf' };
        for (const lg of langs) it[lg] = await tr1(w, lg);
        if ((it.ar || it.tr) && norm(it.ar || it.tr) !== norm(w)) out.push(it);
        done++; if (onProgress) onProgress(done, pickW.length);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    const ord = new Map(pickW.map((w, i) => [w, i]));
    out.sort((a, b) => ord.get(a.term) - ord.get(b.term));
    // ilk "count" kelime soru olur, hepsi çeldirici havuzunda
    return vocabQuestions(out, count, out.slice(0, count));
  }

  window.Bank = { load, isOnline, getMine, addMine, delMine, markUsed, usedSet, pick, vocabQuestions, oxfordQuestions, sig, LVL_CEFR, shuffle };
})();
