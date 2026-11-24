'use strict';
/* Sınav Hazırlama 1.10.1 — benzer soru taraması, yapay zekâ denetimi (çevrimiçi + çevrimdışı), genel arama, sınav şablonları. */
(function () {
  const A = () => window.__app;
  const t = (...a) => window.t(...a);
  const $ = (s, r = document) => r.querySelector(s);
  const EK = window.EK;
  const esc = EK.esc;
  const LK = ['tr', 'en', 'ar'];

  Object.assign(window.I18N, {
    // benzer sorular
    dupBtn: ['🔁 Benzer soruları bul', '🔁 Find similar questions', '🔁 البحث عن الأسئلة المتشابهة'],
    dupTitle: ['Benzer / aynı sorular', 'Similar / duplicate questions', 'الأسئلة المتشابهة / المكررة'],
    dupScope: ['Nerede', 'Where', 'أين'],
    dupScopeExam: ['Bu sınavda', 'In this exam', 'في هذا الاختبار'],
    dupScopeMine: ['Benim arşivimde', 'In my archive', 'في أرشيفي'],
    dupScopeBoth: ['Bu sınav ↔ tüm arşiv', 'This exam ↔ whole archive', 'هذا الاختبار ↔ كل الأرشيف'],
    dupLevel: ['Benzerlik en az', 'Similarity at least', 'التشابه على الأقل'],
    dupFind: ['Tara', 'Scan', 'فحص'],
    dupNone: ['Benzer soru bulunmadı. 👍', 'No similar questions found. 👍', 'لم يُعثر على أسئلة متشابهة. 👍'],
    dupFound: ['{n} benzer çift bulundu.', '{n} similar pairs found.', 'عُثر على {n} زوجاً متشابهاً.'],
    dupScanning: ['Taranıyor… {p}', 'Scanning… {p}', 'جارٍ الفحص… {p}'],
    dupMerge: ['⇢ Birleştir', '⇢ Merge', '⇢ دمج'],
    dupMergeTip: ['İkinci sorudaki eksik çevirileri, görseli, konuyu ve kaynağı birinciye taşır; ikinci soru hayalet olur (silinmez).', 'Moves missing translations, image, topic and source from the second question into the first; the second becomes a ghost (not deleted).', 'ينقل الترجمات الناقصة والصورة والموضوع والمصدر من السؤال الثاني إلى الأول؛ ويصبح الثاني شبحاً (لا يُحذف).'],
    dupMergeMineTip: ['İkinci kayıttaki eksik çevirileri birinciye taşır ve ikinciyi arşivinizden kaldırır (arşivin önceki hâli yedeklenir).', 'Moves missing translations into the first record and removes the second from your archive (the previous archive is backed up).', 'ينقل الترجمات الناقصة إلى السجل الأول ويحذف الثاني من أرشيفك (تُحفظ نسخة احتياطية من الأرشيف السابق).'],
    dupGhostA: ['👻 1. soruyu hayalet yap', '👻 Ghost the 1st', '👻 اجعل الأول شبحاً'],
    dupGhostB: ['👻 2. soruyu hayalet yap', '👻 Ghost the 2nd', '👻 اجعل الثاني شبحاً'],
    dupKeep: ['Farklı, dokunma', 'Different, keep both', 'مختلفان، أبقِ الاثنين'],
    dupAll: ['Hepsini birleştir ({n})', 'Merge all ({n})', 'دمج الكل ({n})'],
    dupMerged: ['{n} çift birleştirildi.', '{n} pairs merged.', 'دُمج {n} زوجاً.'],
    dupInArch: ['arşivde', 'in archive', 'في الأرشيف'],
    dupAddNo: ['Arşivdekini sınava ekleme (zaten var)', 'Already in the archive', 'موجود في الأرشيف بالفعل'],
    dupSame: ['%{p} benzer', '{p}% similar', 'متشابه بنسبة {p}%'],
    // yapay zekâ denetimi
    auditBtn: ['🤖 Yapay zekâ denetimi', '🤖 AI quality check', '🤖 تدقيق بالذكاء الاصطناعي'],
    auditTitle: ['Soru denetimi', 'Question check', 'تدقيق الأسئلة'],
    auditHelp: ['Önce program kendi kurallarıyla (internetsiz) denetler: cevap anahtarı, boş / aynı şıklar, eksik çeviriler. Yapay zekâ anahtarınız varsa sorular ayrıca yapay zekâya sorulur: doğru cevap gerçekten doğru mu, iki doğru şık var mı, çeviriler aynı anlamı veriyor mu.', 'First the program checks offline: answer key, empty / identical options, missing translations. If you have an AI key, the questions are also checked by AI: is the key really right, are two options correct, do the translations say the same thing.', 'يفحص البرنامج أولاً دون إنترنت: مفتاح الإجابة، الخيارات الفارغة / المتطابقة، الترجمات الناقصة. وإن كان لديك مفتاح ذكاء اصطناعي تُفحص الأسئلة به أيضاً: هل الإجابة صحيحة فعلاً، هل هناك خياران صحيحان، هل تعطي الترجمات المعنى نفسه.'],
    auditScope: ['{n} soru denetlenecek', '{n} questions will be checked', 'سيُفحص {n} سؤالاً'],
    auditRun: ['Denetle', 'Check', 'افحص'],
    auditAiOff: ['Yapay zekâ anahtarı yok ya da internet yok: yalnız çevrimdışı denetim yapıldı. (Ayarlar → Yapay zekâ)', 'No AI key or no internet: only the offline check was done. (Settings → AI)', 'لا يوجد مفتاح ذكاء اصطناعي أو لا يوجد إنترنت: أُجري الفحص دون اتصال فقط. (الإعدادات ← الذكاء الاصطناعي)'],
    auditAiRun: ['Yapay zekâ denetliyor… {d}/{n}', 'AI is checking… {d}/{n}', 'يفحص الذكاء الاصطناعي… {d}/{n}'],
    auditAiErr: ['Yapay zekâ hatası: {e}', 'AI error: {e}', 'خطأ في الذكاء الاصطناعي: {e}'],
    auditOk: ['Sorun bulunmadı', 'No problems found', 'لم تُعثر على مشكلات'],
    auditSum: ['{q} soruda {n} uyarı', '{n} warnings in {q} questions', '{n} تحذيراً في {q} سؤالاً'],
    auditAllOk: ['✅ Denetlenen {n} sorunun hepsi temiz.', '✅ All {n} checked questions are clean.', '✅ كل الأسئلة المفحوصة ({n}) سليمة.'],
    auditGo: ['Soruya git', 'Go to question', 'انتقل إلى السؤال'],
    auditApply: ['Cevabı {l} yap', 'Set answer to {l}', 'اجعل الإجابة {l}'],
    auditStop: ['Durdur', 'Stop', 'إيقاف'],
    au_noKey: ['Doğru cevap işaretlenmemiş.', 'No correct answer is marked.', 'لم تُحدَّد الإجابة الصحيحة.'],
    au_emptyStem: ['Soru metni boş.', 'The question text is empty.', 'نص السؤال فارغ.'],
    au_emptyOpt: ['{l} şıkkı boş.', 'Option {l} is empty.', 'الخيار {l} فارغ.'],
    au_sameOpt: ['{a} ve {b} şıkları aynı.', 'Options {a} and {b} are identical.', 'الخياران {a} و{b} متطابقان.'],
    au_missLang: ['{lang} çevirisi eksik.', '{lang} translation is missing.', 'ترجمة {lang} ناقصة.'],
    au_untr: ['{lang} metni diğer dille aynı (çevrilmemiş olabilir).', '{lang} text is the same as another language (may be untranslated).', 'نص {lang} مطابق للغة أخرى (ربما لم يُترجم).'],
    au_allAbove: ['"Hepsi / hiçbiri" türü şık var; tek doğru cevap ilkesini zorlayabilir.', 'An "all / none of the above" option is used; it may break the single-answer rule.', 'يوجد خيار «جميع ما سبق / لا شيء»؛ قد يخالف مبدأ الإجابة الواحدة.'],
    au_longest: ['Doğru şık diğerlerinden belirgin biçimde uzun; öğrenciye ipucu verebilir.', 'The correct option is clearly longer than the others; it may give a hint.', 'الخيار الصحيح أطول بوضوح من غيره؛ قد يكون تلميحاً.'],
    au_ai_key: ['Yapay zekâ: işaretli cevap yanlış görünüyor; doğrusu {l} olabilir.', 'AI: the marked answer looks wrong; {l} may be correct.', 'الذكاء الاصطناعي: الإجابة المحددة تبدو خاطئة؛ قد تكون {l} الصحيحة.'],
    au_ai_multi: ['Yapay zekâ: birden çok doğru şık olabilir ({l}).', 'AI: more than one option may be correct ({l}).', 'الذكاء الاصطناعي: قد يكون أكثر من خيار صحيحاً ({l}).'],
    au_ai_note: ['Yapay zekâ: {m}', 'AI: {m}', 'الذكاء الاصطناعي: {m}'],
    // genel arama
    srBtn: ['🔎 Genel arama', '🔎 Search everywhere', '🔎 بحث شامل'],
    srTitle: ['Genel arama — tüm sınavlar ve arşiv', 'Search everywhere — all exams and the archive', 'بحث شامل — كل الاختبارات والأرشيف'],
    srPh: ['Aranacak kelime (Türkçe, İngilizce ya da Arapça)…', 'Words to search (Turkish, English or Arabic)…', 'كلمات البحث (بالتركية أو الإنجليزية أو العربية)…'],
    srHelp: ['Bu bilgisayarda açılmış, kaydedilmiş, buluttan ya da Wi-Fi\'dan eşitlenmiş bütün sınavlarda ve soru arşivinde üç dilde birden arar. Büyük/küçük harf, Türkçe karakter ve Arapça hareke fark etmez.', 'Searches every exam opened, saved or synced (cloud / Wi-Fi) on this computer and the question archive, in all three languages. Case, Turkish letters and Arabic diacritics are ignored.', 'يبحث في كل الاختبارات التي فُتحت أو حُفظت أو زُومنت (السحابة / Wi-Fi) على هذا الحاسوب وفي أرشيف الأسئلة، باللغات الثلاث. لا يُفرّق بين الأحرف الكبيرة والصغيرة ولا الحركات العربية.'],
    srHere: ['Açık sınav', 'Open exam', 'الاختبار المفتوح'],
    srOther: ['Diğer sınavlar', 'Other exams', 'اختبارات أخرى'],
    srArch: ['Soru arşivi', 'Question archive', 'أرشيف الأسئلة'],
    srNone: ['Sonuç yok.', 'No results.', 'لا نتائج.'],
    srCount: ['{n} sonuç', '{n} results', '{n} نتيجة'],
    srIndexed: ['{n} sınav tarandı', '{n} exams searched', 'فُحص {n} اختباراً'],
    srOpen: ['Sınavı aç', 'Open exam', 'افتح الاختبار'],
    srAdd: ['Bu sınava ekle', 'Add to this exam', 'أضف إلى هذا الاختبار'],
    srAdded: ['Soru açık sınava eklendi.', 'Question added to the open exam.', 'أُضيف السؤال إلى الاختبار المفتوح.'],
    srSrc_dosya: ['dosya', 'file', 'ملف'], srSrc_bulut: ['bulut', 'cloud', 'سحابة'], srSrc_wifi: ['Wi-Fi', 'Wi-Fi', 'Wi-Fi'], srSrc_yedek: ['yedek', 'backup', 'نسخة احتياطية'], srSrc_otomatik: ['otomatik kayıt', 'autosave', 'حفظ تلقائي'],
    srScen: ['Senaryo {n}', 'Scenario {n}', 'السيناريو {n}'],
    srRebuild: ['↻ Dizini yenile', '↻ Rebuild index', '↻ إعادة بناء الفهرس'],
    // şablonlar
    tplBtn: ['🧩 Sınav şablonları', '🧩 Exam blueprints', '🧩 قوالب الاختبارات'],
    tplTitle: ['Sınav şablonları — tek tıkla yeni sınav', 'Exam blueprints — a new exam in one click', 'قوالب الاختبارات — اختبار جديد بنقرة واحدة'],
    tplHelp: ['Şablon; soru sayısını, seviyeyi, zorluk ve konu dağılımını saklar. "Oluştur" dediğinizde arşivden (hazır arşiv + benim arşivim) bu kurala uyan sorularla yeni bir sınav açılır. Açık sınav önce yedeklenir.', 'A blueprint stores the number of questions, level, difficulty and topic mix. "Create" opens a new exam with matching questions from the archive (ready archive + my archive). The open exam is backed up first.', 'يحفظ القالب عدد الأسئلة والمستوى وتوزيع الصعوبة والمواضيع. عند «إنشاء» يُفتح اختبار جديد بأسئلة مطابقة من الأرشيف (الأرشيف الجاهز + أرشيفي). يُحفظ الاختبار المفتوح احتياطياً أولاً.'],
    tplNew: ['＋ Yeni şablon', '＋ New blueprint', '＋ قالب جديد'],
    tplFromExam: ['＋ Açık sınavdan şablon çıkar', '＋ Blueprint from the open exam', '＋ قالب من الاختبار المفتوح'],
    tplName: ['Şablon adı', 'Blueprint name', 'اسم القالب'],
    tplNamePh: ['ör. Stajyer ara sınavı', 'e.g. Trainee midterm', 'مثال: اختبار المتدربين النصفي'],
    tplCount: ['Soru sayısı', 'Questions', 'عدد الأسئلة'],
    tplTitleF: ['Sınav başlığı', 'Exam title', 'عنوان الاختبار'],
    tplTag: ['Seviye etiketi', 'Level tag', 'وسم المستوى'],
    tplLvl: ['Arşiv seviyesi', 'Archive level', 'مستوى الأرشيف'],
    tplZor: ['Zorluk dağılımı (%)', 'Difficulty mix (%)', 'توزيع الصعوبة (%)'],
    tplKonu: ['Konu dağılımı (%)', 'Topic mix (%)', 'توزيع المواضيع (%)'],
    tplKonuAdd: ['＋ Konu ekle', '＋ Add topic', '＋ إضافة موضوع'],
    tplRest: ['Kalan % diğer konulardan tamamlanır.', 'The remaining % is filled from other topics.', 'تُستكمل النسبة المتبقية من مواضيع أخرى.'],
    tplSrc: ['Kaynak', 'Source', 'المصدر'],
    tplMix: ['Seçenek sırası karışık', 'Shuffle options', 'خلط ترتيب الخيارات'],
    tplCreate: ['▶ Oluştur', '▶ Create', '▶ إنشاء'],
    tplSave: ['💾 Kaydet', '💾 Save', '💾 حفظ'],
    tplDel: ['🗑', '🗑', '🗑'],
    tplNone: ['Henüz şablon yok.', 'No blueprints yet.', 'لا توجد قوالب بعد.'],
    tplMade: ['"{n}" şablonundan {c} soruluk yeni sınav hazırlandı{x}.', 'A new {c}-question exam was made from "{n}"{x}.', 'أُعدّ اختبار جديد من {c} سؤالاً من القالب «{n}»{x}.'],
    tplShort: [' ({m} soru eksik: arşivde uygun soru kalmadı)', ' ({m} short: no more matching questions in the archive)', ' (ينقص {m} سؤالاً: لا توجد أسئلة مطابقة أخرى في الأرشيف)'],
    tplSaved: ['Şablon kaydedildi.', 'Blueprint saved.', 'حُفظ القالب.'],
    tplAny: ['Hepsi', 'Any', 'الكل'],
    tplSumm: ['{c} soru · {k}', '{c} questions · {k}', '{c} سؤالاً · {k}'],
  });

  /* =============================== benzer sorular =============================== */
  const nrm = (s) => String(s || '').replace(/[İIı]/g, 'i').toLowerCase().normalize('NFD').replace(/[̀-ًͯ-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const grams = (s) => { const g = new Set(); const x = ' ' + s + ' '; for (let i = 0; i < x.length - 2; i++) g.add(x.slice(i, i + 3)); return g; };
  const dice = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; const [s, l] = a.size < b.size ? [a, b] : [b, a]; for (const x of s) if (l.has(x)) n++; return (2 * n) / (a.size + b.size); };
  function prep(q, nOpt) {
    const P = { q, L: {} };
    LK.forEach((k) => {
      const st = nrm(q.text && q.text[k]);
      if (!st) return;
      const opts = (q.options || []).slice(0, nOpt).map((o) => nrm(o && o[k])).filter(Boolean);
      P.L[k] = { st, g: grams(st), o: new Set(opts), toks: st.split(' ').filter((w) => w.length > 3) };
    });
    return P;
  }
  function sim(a, b) {
    let best = 0;
    LK.forEach((k) => {
      const x = a.L[k], y = b.L[k];
      if (!x || !y) return;
      const s1 = x.st === y.st ? 1 : dice(x.g, y.g);
      let s2 = 1;
      if (x.o.size && y.o.size) { let n = 0; x.o.forEach((o) => { if (y.o.has(o)) n++; }); s2 = (2 * n) / (x.o.size + y.o.size); }
      const s = x.o.size && y.o.size ? s1 * 0.75 + s2 * 0.25 : s1;
      if (s > best) best = s;
    });
    return best;
  }
  // aday çiftler: en az bir uzun kelimeyi paylaşanlar (n² yerine)
  function pairs(listA, listB, min, onProg) {
    const idx = new Map();
    listB.forEach((p, j) => { const seen = new Set(); Object.values(p.L).forEach((x) => x.toks.forEach((w) => { if (seen.has(w)) return; seen.add(w); if (!idx.has(w)) idx.set(w, []); idx.get(w).push(j); })); });
    const out = [];
    const same = listA === listB;
    listA.forEach((p, i) => {
      if (onProg && i % 200 === 0) onProg(i / listA.length);
      const cand = new Set();
      Object.values(p.L).forEach((x) => x.toks.forEach((w) => { const l = idx.get(w); if (l && l.length < 400) l.forEach((j) => cand.add(j)); }));
      if (!Object.keys(p.L).length) return;
      cand.forEach((j) => {
        if (same && j <= i) return;
        const s = sim(p, listB[j]);
        if (s >= min) out.push({ a: p.q, b: listB[j].q, s });
      });
    });
    return out.sort((x, y) => y.s - x.s);
  }
  // b'deki eksikleri a'ya taşır (a'da dolu olan hiçbir şeye dokunmaz)
  function mergeInto(a, b, nOpt) {
    const same = a.correct === b.correct || a.correct < 0 || b.correct < 0;
    LK.forEach((k) => {
      if (!(a.text[k] || '').trim() && (b.text[k] || '').trim()) a.text[k] = b.text[k];
      if (same) for (let i = 0; i < nOpt; i++) if (a.options[i] && b.options[i] && !(a.options[i][k] || '').trim() && (b.options[i][k] || '').trim()) a.options[i][k] = b.options[i][k];
    });
    if ((a.correct == null || a.correct < 0) && b.correct >= 0) a.correct = b.correct;
    if (!a.img && b.img) a.img = b.img;
    if (!a.oimg && b.oimg) a.oimg = b.oimg.slice();
    ['konu', 'kaynak', 'zor'].forEach((f) => { if (!a[f] && b[f]) a[f] = b[f]; });
    if (!a.tag && b.tag) a.tag = b.tag;
  }
  async function dupModal() {
    const a = A();
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="row">
        <label>${esc(t('dupScope'))} <select class="in" id="duScope" style="width:auto"><option value="exam">${esc(t('dupScopeExam'))}</option><option value="both">${esc(t('dupScopeBoth'))}</option><option value="mine">${esc(t('dupScopeMine'))}</option></select></label>
        <label>${esc(t('dupLevel'))} <input type="range" id="duMin" min="60" max="100" step="5" value="${a.prefs.dupMin || 85}"> <b id="duMinV"></b></label>
        <button class="btn primary" id="duGo">${esc(t('dupFind'))}</button>
        <button class="btn" id="duAll" style="display:none"></button>
      </div>
      <div class="bkinfo" id="duInfo"></div>
      <div id="duList" class="duplist"></div>`;
    const m = a.modal({ title: t('dupTitle'), body, wide: true, buttons: [{ label: t('close'), onClick: (c) => c() }] });
    const minEl = $('#duMin', body);
    const showMin = () => { $('#duMinV', body).textContent = '%' + minEl.value; };
    minEl.oninput = showMin; showMin();
    let found = [];
    const L = a.letters();
    const pickT = (ml) => (ml && (ml[a.CL()] || ml.tr || ml.en || ml.ar)) || '';
    const mini = (q, where) => {
      const n = where === 'exam' ? (a.qNumber(q) || '👻') : '';
      return `<div class="dq"><div class="dh">${where === 'exam' ? `<b>${esc(t('question'))} ${n}</b>` : `<span class="tagc">${esc(t('dupInArch'))}</span>`}${q.konu ? ` <span class="muted">${esc(q.konu)}</span>` : ''}</div><div class="ds" dir="auto">${esc(pickT(q.text))}</div>${q.img ? `<img src="${q.img}" alt="">` : ''}` +
        `<div class="do">${(q.options || []).slice(0, a.S().optionCount).map((o, k) => pickT(o) ? `<span class="${k === q.correct ? 'c' : ''}" dir="auto">${L[k]}) ${esc(pickT(o))}</span>` : '').join('')}</div></div>`;
    };
    let scope = 'exam';
    const render = () => {
      const box = $('#duList', body);
      $('#duInfo', body).textContent = found.length ? t('dupFound', { n: found.length }) : t('dupNone');
      const mergeable = found.filter((p) => p.wa === 'exam' && p.wb === 'exam');
      const allBtn = $('#duAll', body);
      allBtn.style.display = scope === 'exam' && mergeable.length > 1 ? '' : 'none';
      allBtn.textContent = t('dupAll', { n: mergeable.length });
      box.innerHTML = found.slice(0, 300).map((p, i) => `<div class="dpair"><div class="dsim">${esc(t('dupSame', { p: Math.round(p.s * 100) }))}</div><div class="dcols">${mini(p.a, p.wa)}${mini(p.b, p.wb)}</div><div class="row dbtns">${
        p.wa === 'exam' && p.wb === 'exam' ? `<button class="btn primary" data-a="merge" data-i="${i}" title="${esc(t('dupMergeTip'))}">${esc(t('dupMerge'))}</button><button class="btn" data-a="ga" data-i="${i}">${esc(t('dupGhostA'))}</button><button class="btn" data-a="gb" data-i="${i}">${esc(t('dupGhostB'))}</button>`
          : p.wa === 'mine' && p.wb === 'mine' ? `<button class="btn primary" data-a="mmine" data-i="${i}" title="${esc(t('dupMergeMineTip'))}">${esc(t('dupMerge'))}</button>`
            : `<button class="btn" data-a="go" data-i="${i}">${esc(t('auditGo'))}</button><button class="btn" data-a="ga" data-i="${i}">${esc(t('dupGhostA'))}</button>`
      }<button class="btn" data-a="keep" data-i="${i}">${esc(t('dupKeep'))}</button></div></div>`).join('');
      box.querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => act(b.dataset.a, found[+b.dataset.i]); });
    };
    const act = async (k, p) => {
      if (!p) return;
      if (k === 'keep') { found = found.filter((x) => x !== p); return render(); }
      if (k === 'go') { m.close(); return a.scrollToQ(p.a.id); }
      if (k === 'mmine') {
        const mine = await window.Bank.getMine();
        const B = mine.questions.find((x) => x === p.b), Aq = mine.questions.find((x) => x === p.a);
        if (!B || !Aq) return;
        mergeInto(Aq, B, 5);
        await window.Bank.delMine('q', B.id); // delMine arşivi yeniden yazar (önceki hâli main tarafında yedeklenir)
        found = found.filter((x) => x.a !== p.b && x.b !== p.b);
        a.toast(t('dupMerged', { n: 1 }), 'ok');
        return render();
      }
      a.snap();
      if (k === 'merge') { const b0 = EK.qSnap(p.a); mergeInto(p.a, p.b, a.S().optionCount); EK.histCommit(p.a, b0, null); p.b.ghost = true; }
      if (k === 'ga') p.a.ghost = true;
      if (k === 'gb') p.b.ghost = true;
      found = found.filter((x) => !(x.wa === 'exam' && x.a.ghost) && !(x.wb === 'exam' && x.b.ghost));
      a.renderList(); a.changed();
      a.toast(t(k === 'merge' ? 'dupMerged' : 'ghostMade', { n: 1 }), 'ok', [{ label: t('undo'), onClick: () => a.undo() }]);
      render();
    };
    $('#duAll', body).onclick = () => {
      a.snap();
      let n = 0;
      found.filter((p) => p.wa === 'exam' && p.wb === 'exam').forEach((p) => { if (p.a.ghost || p.b.ghost) return; const b0 = EK.qSnap(p.a); mergeInto(p.a, p.b, a.S().optionCount); EK.histCommit(p.a, b0, null); p.b.ghost = true; n++; });
      found = found.filter((x) => !(x.wa === 'exam' && x.a.ghost) && !(x.wb === 'exam' && x.b.ghost));
      a.renderList(); a.changed(); render();
      a.toast(t('dupMerged', { n }), 'ok', [{ label: t('undo'), onClick: () => a.undo() }]);
    };
    $('#duGo', body).onclick = async () => {
      scope = $('#duScope', body).value;
      const min = +minEl.value / 100;
      a.prefs.dupMin = +minEl.value; a.savePrefs();
      $('#duGo', body).disabled = true;
      const info = $('#duInfo', body);
      info.textContent = t('dupScanning', { p: '' });
      await new Promise((r) => setTimeout(r, 20));
      const nOpt = a.S().optionCount;
      const live = a.exam.questions.filter((q) => !q.ghost).map((q) => prep(q, nOpt));
      try {
        if (scope === 'exam') found = pairs(live, live, min).map((x) => ({ ...x, wa: 'exam', wb: 'exam' }));
        else {
          const mine = await window.Bank.getMine();
          const mineP = mine.questions.map((q) => prep(q, 5));
          if (scope === 'mine') found = pairs(mineP, mineP, min, (f) => { info.textContent = t('dupScanning', { p: '%' + Math.round(f * 100) }); }).map((x) => ({ ...x, wa: 'mine', wb: 'mine' }));
          else {
            const st = await window.Bank.load();
            const arch = mineP.concat(st.bank.questions.map((q) => prep(q, 5)));
            found = pairs(live, arch, min, (f) => { info.textContent = t('dupScanning', { p: '%' + Math.round(f * 100) }); }).map((x) => ({ ...x, wa: 'exam', wb: 'arch' }));
          }
        }
      } catch (e) { info.textContent = t('error') + ': ' + e.message; }
      $('#duGo', body).disabled = false;
      render();
    };
  }

  /* =============================== yapay zekâ denetimi =============================== */
  function offlineIssues(q, nOpt, L) {
    const out = [];
    const langs = LK.filter((k) => (q.text[k] || '').trim());
    if (!langs.length) out.push({ k: 'au_emptyStem' });
    if (!(q.correct >= 0 && q.correct < nOpt)) out.push({ k: 'au_noKey', lvl: 'bad' });
    const main = langs[0] || 'tr';
    const opts = q.options.slice(0, nOpt);
    opts.forEach((o, i) => { if (!(o[main] || '').trim() && !(q.oimg && q.oimg[i])) out.push({ k: 'au_emptyOpt', v: { l: L[i] }, lvl: 'bad' }); });
    for (let i = 0; i < nOpt; i++) for (let j = i + 1; j < nOpt; j++) {
      const x = nrm(opts[i][main]), y = nrm(opts[j][main]);
      if (x && x === y && !(q.oimg && (q.oimg[i] || q.oimg[j]))) out.push({ k: 'au_sameOpt', v: { a: L[i], b: L[j] }, lvl: 'bad' });
    }
    // çeviri durumu: en az bir dil doluysa diğerleri
    if (langs.length) LK.forEach((k) => {
      if (!langs.includes(k)) { out.push({ k: 'au_missLang', v: { lang: window.LANGS[k] }, lvl: 'info' }); return; }
      const tx = q.text[k] || '';
      const untr = k === 'ar' ? tx.length > 25 && !/[\u0600-\u06FF]/.test(tx) && !/^[\s\S]*_{2,}/.test(tx)
        : LK.some((o) => o !== k && tx.length > 25 && nrm(q.text[o]) === nrm(tx)) && k !== main;
      if (untr) out.push({ k: 'au_untr', v: { lang: window.LANGS[k] }, lvl: 'info' });
    });
    if (opts.some((o) => /hepsi|hiçbiri|all of the above|none of the above|جميع ما سبق|لا شيء مما سبق/i.test(o[main] || ''))) out.push({ k: 'au_allAbove', lvl: 'info' });
    if (q.correct >= 0 && q.correct < nOpt) {
      const lens = opts.map((o) => (o[main] || '').trim().length);
      const c = lens[q.correct], others = lens.filter((_, i) => i !== q.correct);
      const mx = Math.max(...others);
      if (c > 20 && c > mx * 1.6) out.push({ k: 'au_longest', lvl: 'info' });
    }
    return out;
  }
  async function aiCheck(qs, nOpt, L, onProg, ctl) {
    const res = new Map();
    const lang = window.UI_LANG || 'tr';
    const sys = `You are a strict exam quality reviewer for UAV/aviation and English-language multiple-choice questions written in Turkish, English and Arabic.
For each question check: (1) is the marked correct option really correct; (2) is more than one option defensibly correct; (3) is the question ambiguous; (4) do the TR/EN/AR versions say the same thing with correct aviation terminology.
Return STRICT JSON only: {"results":[{"i":0,"keyOk":true,"better":null,"multi":[],"notes":[]}]}.
"i" is the question index given. "keyOk": false only if you are confident the marked key is wrong; then "better" is the 0-based index of the right option. "multi": other 0-based indices that are also correct. "notes": at most 3 very short notes in ${{ tr: 'Turkish', en: 'English', ar: 'Arabic' }[lang]} only for real problems (ambiguity, wrong fact, translation mismatch with which language). Empty arrays when fine. Do not comment on style.`;
    const chunk = 6;
    for (let s = 0; s < qs.length; s += chunk) {
      if (ctl.stop) break;
      const part = qs.slice(s, s + chunk);
      const payload = part.map((q, i) => ({ i: s + i, text: q.text, options: q.options.slice(0, nOpt).map((o, k) => ({ letter: L[k], ...o })), marked: q.correct >= 0 ? q.correct : null }));
      try {
        const out = await window.AI.chat([{ role: 'user', content: JSON.stringify(payload) }], { system: sys, json: true, temperature: 0.1, maxTokens: 4096, timeout: 90000 });
        const m = String(out).match(/\{[\s\S]*\}/);
        const j = m ? JSON.parse(m[0]) : null;
        ((j && j.results) || []).forEach((r) => { const q = qs[+r.i]; if (q) res.set(q, r); });
      } catch (e) { res.set('err', e.message); if (/key|401|403|anahtar/i.test(e.message)) break; }
      if (onProg) onProg(Math.min(qs.length, s + chunk), qs.length);
    }
    return res;
  }
  async function auditModal(qsIn) {
    const a = A();
    const qs = (qsIn && qsIn.length ? qsIn : (a.exam.questions.filter((q) => a.selected.has(q.id) && !q.ghost).length ? a.exam.questions.filter((q) => a.selected.has(q.id) && !q.ghost) : a.liveQs()));
    if (!qs.length) return a.toast(t('nothingToOutput'), 'warn');
    const nOpt = a.S().optionCount, L = a.letters();
    const body = document.createElement('div');
    body.innerHTML = `<p class="help">${esc(t('auditHelp'))}</p><div class="row"><b>${esc(t('auditScope', { n: qs.length }))}</b><button class="btn primary" id="auGo">${esc(t('auditRun'))}</button><button class="btn" id="auStop" style="display:none">${esc(t('auditStop'))}</button></div><div class="bkinfo" id="auInfo"></div><div id="auList" class="aulist"></div>`;
    const m = a.modal({ title: t('auditTitle'), body, wide: true, buttons: [{ label: t('close'), onClick: (c) => { ctl.stop = true; c(); } }] });
    const ctl = { stop: false };
    const pickT = (ml) => (ml && (ml[a.CL()] || ml.tr || ml.en || ml.ar)) || '';
    const run = async () => {
      $('#auGo', body).disabled = true;
      const info = $('#auInfo', body);
      const issues = new Map(qs.map((q) => [q, offlineIssues(q, nOpt, L).map((x) => ({ ...x, txt: t(x.k, x.v) }))]));
      const draw = () => {
        const bad = qs.filter((q) => issues.get(q).length);
        $('#auList', body).innerHTML = bad.length ? bad.map((q) => {
          const n = a.qNumber(q) || '👻';
          const list = issues.get(q);
          return `<div class="auitem"><div class="auh"><b>${esc(t('question'))} ${n}</b> <span dir="auto">${esc(pickT(q.text).slice(0, 140))}</span></div><ul>${list.map((x) => `<li class="${x.lvl || ''}">${esc(x.txt)}${x.fix != null ? ` <button class="btn mini" data-fix="${x.fix}" data-q="${q.id}">${esc(t('auditApply', { l: L[x.fix] }))}</button>` : ''}</li>`).join('')}</ul><button class="btn mini" data-go="${q.id}">${esc(t('auditGo'))}</button></div>`;
        }).join('') : `<div class="empty">${esc(t('auditAllOk', { n: qs.length }))}</div>`;
        $('#auList', body).querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => { m.close(); ctl.stop = true; a.scrollToQ(b.dataset.go); }; });
        $('#auList', body).querySelectorAll('[data-fix]').forEach((b) => {
          b.onclick = () => {
            const q = qs.find((x) => x.id === b.dataset.q); if (!q) return;
            a.snap(); const b0 = EK.qSnap(q); q.correct = +b.dataset.fix; EK.histCommit(q, b0, null); a.rerenderCard(q);
            issues.set(q, issues.get(q).filter((x) => x.fix == null)); draw();
            a.toast(t('auditApply', { l: L[q.correct] }) + ' ✓', 'ok', [{ label: t('undo'), onClick: () => a.undo() }]);
          };
        });
        const nIss = [...issues.values()].reduce((s, l) => s + l.length, 0);
        return { bad: bad.length, nIss };
      };
      let r = draw();
      const canAi = window.AI && window.AI.ready() && navigator.onLine !== false;
      if (!canAi) { info.textContent = t('auditAiOff') + (r.nIss ? ' · ' + t('auditSum', { q: r.bad, n: r.nIss }) : ''); $('#auGo', body).disabled = false; return; }
      $('#auStop', body).style.display = '';
      $('#auStop', body).onclick = () => { ctl.stop = true; };
      const ai = await aiCheck(qs, nOpt, L, (d, n) => { info.textContent = t('auditAiRun', { d, n }); }, ctl);
      ai.forEach((v, q) => {
        if (q === 'err') return;
        const l = issues.get(q); if (!l) return;
        if (v.keyOk === false && Number.isInteger(v.better) && v.better >= 0 && v.better < nOpt && v.better !== q.correct) l.push({ txt: t('au_ai_key', { l: L[v.better] }), lvl: 'bad', fix: v.better });
        if (Array.isArray(v.multi) && v.multi.length) l.push({ txt: t('au_ai_multi', { l: v.multi.filter((x) => x >= 0 && x < nOpt).map((x) => L[x]).join(', ') }), lvl: 'bad' });
        (v.notes || []).slice(0, 3).forEach((m2) => { if (m2) l.push({ txt: t('au_ai_note', { m: String(m2).slice(0, 300) }), lvl: 'info' }); });
      });
      r = draw();
      info.textContent = (ai.has('err') ? t('auditAiErr', { e: ai.get('err') }) + ' · ' : '') + (r.nIss ? t('auditSum', { q: r.bad, n: r.nIss }) : t('auditOk')) + (window.AI.lastModel ? ` · ${window.AI.lastModel}` : '');
      $('#auStop', body).style.display = 'none';
      $('#auGo', body).disabled = false;
    };
    $('#auGo', body).onclick = run;
    run();
  }

  /* =============================== genel arama =============================== */
  async function searchModal() {
    const a = A();
    const body = document.createElement('div');
    body.innerHTML = `<p class="help">${esc(t('srHelp'))}</p><div class="row"><input type="search" id="srQ" class="in" style="flex:1" placeholder="${esc(t('srPh'))}" dir="auto"><button class="btn" id="srRe" title="${esc(t('srRebuild'))}">↻</button></div><div class="bkinfo" id="srInfo"></div><div id="srRes" class="srres"></div>`;
    const m = a.modal({ title: t('srTitle'), body, wide: true, buttons: [{ label: t('close'), onClick: (c) => c() }] });
    const inp = $('#srQ', body);
    const L = a.letters();
    const pickT = (ml) => (ml && (ml[a.CL()] || ml.tr || ml.en || ml.ar)) || '';
    let arch = null, seq = 0;
    const hl = (txt, toks) => {
      let h = esc(txt);
      toks.forEach((w) => {
        if (w.length < 2) return;
        try { h = h.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); } catch { /* yok */ }
      });
      return h;
    };
    const run = async () => {
      const my = ++seq;
      const q = inp.value.trim();
      a.prefs.srLast = q; a.savePrefs();
      const toks = nrm(q).split(' ').filter(Boolean);
      const res = $('#srRes', body);
      if (!toks.length) { res.innerHTML = ''; $('#srInfo', body).textContent = ''; return; }
      const rawToks = q.split(/\s+/).filter(Boolean);
      const match = (s) => toks.every((w) => s.includes(w));
      // açık sınav
      const here = [];
      a.exam.questions.forEach((x) => {
        const s = nrm(LK.map((k) => [x.text[k], ...x.options.map((o) => o[k])].join(' ')).join(' ') + ' ' + (x.konu || '') + ' ' + (x.kaynak || ''));
        if (match(s)) here.push(x);
      });
      a.exam.scenarios.forEach((sc, i) => { const s = nrm(LK.map((k) => [sc.title[k], sc.text[k], ...sc.questions.map((z) => z.text[k] + ' ' + z.answer[k])].join(' ')).join(' ')); if (match(s)) here.push({ scen: i + 1, sc }); });
      // diğer sınavlar (ana süreçteki dizin)
      let other = { hits: [], exams: 0 };
      try { other = await window.api.dizin.search(q, { skipId: a.exam.id, max: 300 }); } catch { /* yok */ }
      // arşiv
      if (!arch) {
        try { const st = await window.Bank.load(); const mine = await window.Bank.getMine(); arch = st.bank.questions.map((x) => ({ x, src: 'bank' })).concat(mine.questions.map((x) => ({ x, src: 'mine' }))).map((o) => ({ ...o, s: nrm(LK.map((k) => [(o.x.text || {})[k], ...(o.x.options || []).map((z) => (z || {})[k])].join(' ')).join(' ') + ' ' + (o.x.konu || '')) })); } catch { arch = []; }
      }
      const ar = arch.filter((o) => match(o.s)).slice(0, 150);
      if (my !== seq) return;
      const total = here.length + other.hits.length + ar.length;
      $('#srInfo', body).textContent = t('srCount', { n: total }) + ' · ' + t('srIndexed', { n: (other.exams || 0) + 1 });
      const optLine = (opts, c) => (opts || []).slice(0, a.S().optionCount).map((o, k) => pickT(o) ? `<span class="${k === c ? 'c' : ''}" dir="auto">${L[k]}) ${hl(pickT(o), rawToks)}</span>` : '').join('');
      let h = '';
      if (here.length) {
        h += `<h4>📝 ${esc(t('srHere'))} (${here.length})</h4>` + here.map((x) => x.scen ? `<div class="sritem" data-scen="${x.sc.id}"><b>${esc(t('srScen', { n: x.scen }))}</b> <span dir="auto">${hl(pickT(x.sc.title) || pickT(x.sc.text).slice(0, 160), rawToks)}</span></div>`
          : `<div class="sritem" data-q="${x.id}"><b>${x.ghost ? '👻' : esc(t('question')) + ' ' + a.qNumber(x)}</b> <span dir="auto">${hl(pickT(x.text), rawToks)}</span><div class="do">${optLine(x.options, x.correct)}</div></div>`).join('');
      }
      if (other.hits.length) {
        const byExam = new Map();
        other.hits.forEach((x) => { if (!byExam.has(x.exam)) byExam.set(x.exam, []); byExam.get(x.exam).push(x); });
        h += `<h4>📂 ${esc(t('srOther'))} (${other.hits.length})</h4>` + [...byExam.values()].map((l) => `<div class="srexam"><div class="srexh"><b>${esc(l[0].name || t('untitled'))}</b> <span class="muted">${esc(t('srSrc_' + l[0].src))}${l[0].t ? ' · ' + new Date(l[0].t).toLocaleDateString() : ''}</span> <button class="btn mini" data-open="${esc(l[0].exam)}">${esc(t('srOpen'))}</button></div>` +
          l.slice(0, 30).map((x) => x.kind === 's' ? `<div class="sritem"><b>${esc(t('srScen', { n: x.n }))}</b> <span dir="auto">${hl(pickT(x.text), rawToks)}</span></div>` : `<div class="sritem"><b>${x.n ? esc(t('question')) + ' ' + x.n : '👻'}</b> <span dir="auto">${hl(pickT(x.text), rawToks)}</span><div class="do">${optLine(x.o, x.c)}</div><button class="btn mini" data-addo="${esc(x.exam)}|${esc(x.qid)}">＋ ${esc(t('srAdd'))}</button></div>`).join('') + '</div>').join('');
      }
      if (ar.length) {
        h += `<h4>📚 ${esc(t('srArch'))} (${ar.length}${ar.length >= 150 ? '+' : ''})</h4>` + ar.map((o, i) => `<div class="sritem"><span class="tagc">${esc(o.src === 'mine' ? t('bkTmine') : t('bkSrcBank'))}</span> <span dir="auto">${hl(pickT(o.x.text), rawToks)}</span>${o.x.img ? ' 🖼' : ''}<div class="do">${optLine(o.x.options, o.x.correct)}</div><button class="btn mini" data-adda="${i}">＋ ${esc(t('srAdd'))}</button></div>`).join('');
      }
      res.innerHTML = h || `<div class="empty">${esc(t('srNone'))}</div>`;
      res.querySelectorAll('[data-q]').forEach((el) => { el.onclick = () => { m.close(); a.setTab('test'); a.scrollToQ(el.dataset.q); }; });
      res.querySelectorAll('[data-scen]').forEach((el) => { el.onclick = () => { m.close(); a.setTab('scen'); const s = document.getElementById('s-' + el.dataset.scen); if (s) s.scrollIntoView({ block: 'center' }); }; });
      res.querySelectorAll('[data-open]').forEach((b) => {
        b.onclick = async (e) => {
          e.stopPropagation();
          const d = await window.api.dizin.get(b.dataset.open);
          if (!d) return a.toast(t('srNone'), 'warn');
          m.close();
          if (d.src === 'dosya' && d.filePath) await a.openFilePath(d.filePath);
          else if (d.cloudId && a.cloudReady()) await a.openCloudExam(d.cloudId);
          else await a.openExamObject(d.exam, 'aramadan-once');
        };
      });
      const addQ = (src) => {
        a.snap();
        const q = a.normalizeExam({ questions: [src] }).questions[0];
        q.id = Math.random().toString(36).slice(2, 10); delete q.ghost; delete q.gecmis; delete q.ist;
        a.exam.questions.push(q); a.renderList(); a.changed();
        a.toast(t('srAdded'), 'ok', [{ label: t('undo'), onClick: () => a.undo() }]);
      };
      res.querySelectorAll('[data-adda]').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); const o = ar[+b.dataset.adda]; const q = a.bankToQuestion(o.x); a.snap(); a.exam.questions.push(q); a.renderList(); a.changed(); window.Bank.markUsed([o.x.id]); a.toast(t('srAdded'), 'ok', [{ label: t('undo'), onClick: () => a.undo() }]); }; });
      res.querySelectorAll('[data-addo]').forEach((b) => {
        b.onclick = async (e) => {
          e.stopPropagation();
          const [ex, qid] = b.dataset.addo.split('|');
          const d = await window.api.dizin.get(ex);
          const src = d && d.exam && (d.exam.questions || []).find((x) => x.id === qid);
          if (src) addQ(src);
        };
      });
    };
    inp.oninput = () => { clearTimeout(run.tm); run.tm = setTimeout(run, 180); };
    $('#srRe', body).onclick = async () => { try { await window.api.dizin.rebuild(); } catch { /* yok */ } arch = null; run(); };
    if (a.prefs.srLast) { inp.value = a.prefs.srLast; run(); }
    setTimeout(() => { inp.focus(); inp.select(); }, 30);
  }

  /* =============================== sınav şablonları =============================== */
  const TPL_KEY = 'ek.sablonlar';
  const tplAll = () => { try { return JSON.parse(localStorage.getItem(TPL_KEY) || '[]') || []; } catch { return []; } };
  const tplSave = (l) => { try { localStorage.setItem(TPL_KEY, JSON.stringify(l)); } catch { /* yok */ } };
  const newTpl = () => ({ id: Math.random().toString(36).slice(2, 10), ad: '', baslik: '', adet: 20, lvl: 0, tag: '', zor: { k: 0, o: 0, z: 0 }, konular: [], kaynak: 'all', mix: true });
  function tplFromExam() {
    const a = A(); const qs = a.liveQs();
    const x = newTpl();
    x.ad = (a.examName(a.exam) || '').slice(0, 60); x.baslik = x.ad; x.adet = qs.length || 20;
    const cnt = (f) => qs.filter(f).length;
    if (qs.length) {
      ['k', 'o', 'z'].forEach((z) => { x.zor[z] = Math.round((100 * cnt((q) => q.zor === z)) / qs.length); });
      const km = new Map(); qs.forEach((q) => { if (q.konu) km.set(q.konu, (km.get(q.konu) || 0) + 1); });
      x.konular = [...km.entries()].sort((p, q) => q[1] - p[1]).slice(0, 8).map(([k, n]) => ({ k, p: Math.round((100 * n) / qs.length) }));
      const tags = new Map(); qs.forEach((q) => { if (q.tag) tags.set(q.tag, (tags.get(q.tag) || 0) + 1); });
      const top = [...tags.entries()].sort((p, q) => q[1] - p[1])[0]; if (top && top[1] > qs.length / 2) x.tag = top[0];
    }
    return x;
  }
  // arşivden şablona uyan sorular
  async function tplBuild(T) {
    const a = A();
    const st = await window.Bank.load();
    const mine = await window.Bank.getMine();
    let pool = (T.kaynak === 'mine' ? [] : st.bank.questions).concat(T.kaynak === 'bank' ? [] : mine.questions);
    pool = pool.filter((q) => q && q.text && Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.correct));
    if (T.lvl) pool = pool.filter((q) => !q.lvl || q.lvl === T.lvl);
    const konuOf = (q) => EK.bankKonu(q) || '';
    const zorOf = (q) => q.zor || ({ 1: 'k', 2: 'o', 3: 'z' })[q.lvl] || '';
    const used = window.Bank.usedSet();
    const B = window.Bank;
    const take = new Set();
    const pickFrom = (list, n) => {
      const fresh = B.shuffle(list.filter((q) => !take.has(q) && !used.has(q.id))).concat(B.shuffle(list.filter((q) => !take.has(q) && used.has(q.id))));
      const out = fresh.slice(0, Math.max(0, n)); out.forEach((q) => take.add(q)); return out;
    };
    const N = Math.max(1, Math.min(200, T.adet | 0));
    // zorluk kotası
    const zq = ['k', 'o', 'z'].map((z) => [z, Math.round((N * (+T.zor[z] || 0)) / 100)]);
    const zMatch = (q) => { const z = zorOf(q); return zq.every(([, n]) => !n) || zq.some(([zz, n]) => n && z === zz); };
    let chosen = [];
    // konu kotası (her konu kendi payı); zorluk süzgeci uygunsa
    const km = (q, k) => { const kk = konuOf(q).toLocaleLowerCase('tr'), f = k.toLocaleLowerCase('tr'); return kk === f || kk.startsWith(f + ' >'); };
    (T.konular || []).filter((x) => x.k && +x.p > 0).forEach((x) => {
      const n = Math.round((N * +x.p) / 100);
      chosen = chosen.concat(pickFrom(pool.filter((q) => km(q, x.k) && zMatch(q)), n));
    });
    // zorluk kotası: eksik kalanlar
    zq.forEach(([z, n]) => { const have = chosen.filter((q) => zorOf(q) === z).length; if (n > have && chosen.length < N) chosen = chosen.concat(pickFrom(pool.filter((q) => zorOf(q) === z), Math.min(n - have, N - chosen.length))); });
    // kalan: herhangi
    if (chosen.length < N) chosen = chosen.concat(pickFrom(pool.filter(zMatch), N - chosen.length));
    if (chosen.length < N) chosen = chosen.concat(pickFrom(pool, N - chosen.length));
    chosen = chosen.slice(0, N);
    return { list: chosen, short: N - chosen.length, sumKonu: konuOf };
  }
  async function tplCreate(T) {
    const a = A();
    const { list, short } = await tplBuild(T);
    if (!list.length) return a.toast(t('bkNone'), 'warn');
    const keep = a.exam.settings;
    const ex = a.newExam();
    ex.settings = JSON.parse(JSON.stringify(keep));
    const title = T.baslik || T.ad || '';
    if (title) LK.forEach((k) => { ex.title[k] = title; });
    ex.school = JSON.parse(JSON.stringify(a.exam.school));
    ex.instructions = JSON.parse(JSON.stringify(a.exam.instructions));
    ex.questions = list.map((bq) => {
      const q = a.bankToQuestion(bq);
      if (T.tag) q.tag = T.tag;
      return q;
    });
    window.Bank.markUsed(list.map((x) => x.id));
    await a.openExamObject(ex, 'sablondan-once');
    a.toast(t('tplMade', { n: T.ad || '—', c: list.length, x: short ? t('tplShort', { m: short }) : '' }), short ? 'warn' : 'ok', [], 7000);
  }
  function tplModal() {
    const a = A();
    let list = tplAll();
    let cur = null;
    const body = document.createElement('div');
    const lvlOpts = `<option value="0">${esc(t('bkLAll'))}</option>` + [1, 2, 3].map((l) => `<option value="${l}">${esc(t('bkL' + l))}</option>`).join('');
    const tagOpts = (sel) => `<option value="">${esc(t('tplAny'))}</option>` + a.tagKeys().map((k) => `<option value="${k}"${sel === k ? ' selected' : ''}>${esc(a.tagName(k))}</option>`).join('');
    const summ = (T) => t('tplSumm', { c: T.adet, k: (T.konular || []).filter((x) => x.k).map((x) => `${x.k} %${x.p}`).join(', ') || t('ekKonuAll') });
    const render = () => {
      body.innerHTML = `<p class="help">${esc(t('tplHelp'))}</p>
        <div class="row"><button class="btn" id="tpNew">${esc(t('tplNew'))}</button><button class="btn" id="tpFrom">${esc(t('tplFromExam'))}</button></div>
        <div class="tplist">${list.length ? list.map((T, i) => `<div class="tpitem${cur && cur.id === T.id ? ' on' : ''}"><div class="tpn"><b>${esc(T.ad || '—')}</b><span class="muted">${esc(summ(T))}</span></div><button class="btn primary" data-c="${i}">${esc(t('tplCreate'))}</button><button class="btn" data-e="${i}">✎</button><button class="btn" data-d="${i}">${esc(t('tplDel'))}</button></div>`).join('') : `<div class="empty">${esc(t('tplNone'))}</div>`}</div>
        ${cur ? `<div class="card tpedit">
          <div class="grid2"><label><span>${esc(t('tplName'))}</span><input class="in" id="tpAd" value="${esc(cur.ad)}" placeholder="${esc(t('tplNamePh'))}" dir="auto"></label><label><span>${esc(t('tplTitleF'))}</span><input class="in" id="tpBas" value="${esc(cur.baslik)}" dir="auto"></label></div>
          <div class="row"><label>${esc(t('tplCount'))} <input class="in" type="number" id="tpN" min="1" max="200" value="${cur.adet}" style="width:80px"></label>
            <label>${esc(t('tplLvl'))} <select class="in" id="tpLvl" style="width:auto">${lvlOpts}</select></label>
            <label>${esc(t('tplTag'))} <select class="in" id="tpTag" style="width:auto">${tagOpts(cur.tag)}</select></label>
            <label>${esc(t('tplSrc'))} <select class="in" id="tpSrc" style="width:auto"><option value="all">${esc(t('bkSrcAll'))}</option><option value="bank">${esc(t('bkSrcBank'))}</option><option value="mine">${esc(t('bkTmine'))}</option></select></label></div>
          <div class="row"><b>${esc(t('tplZor'))}:</b>${['k', 'o', 'z'].map((z) => `<label>${esc(t('ekZor_' + z))} <input class="in" type="number" min="0" max="100" data-z="${z}" value="${cur.zor[z] || 0}" style="width:70px"></label>`).join('')}</div>
          <div><b>${esc(t('tplKonu'))}:</b> <span class="muted">${esc(t('tplRest'))}</span></div>
          <div id="tpK">${(cur.konular || []).map((x, i) => `<div class="row"><input class="in" list="ekKonuAll" data-k="${i}" value="${esc(x.k)}" dir="auto" style="flex:1"><input class="in" type="number" min="0" max="100" data-p="${i}" value="${x.p}" style="width:80px"> % <button class="btn" data-x="${i}">✕</button></div>`).join('')}</div>
          <datalist id="ekKonuAll"></datalist>
          <div class="row"><button class="btn" id="tpKAdd">${esc(t('tplKonuAdd'))}</button><span style="flex:1"></span><button class="btn primary" id="tpSave">${esc(t('tplSave'))}</button><button class="btn" id="tpRun">${esc(t('tplCreate'))}</button></div>
        </div>` : ''}`;
      $('#tpNew', body).onclick = () => { cur = newTpl(); render(); };
      $('#tpFrom', body).onclick = () => { cur = tplFromExam(); render(); };
      body.querySelectorAll('[data-c]').forEach((b) => { b.onclick = async () => { b.disabled = true; m.close(); await tplCreate(list[+b.dataset.c]); }; });
      body.querySelectorAll('[data-e]').forEach((b) => { b.onclick = () => { cur = JSON.parse(JSON.stringify(list[+b.dataset.e])); render(); }; });
      body.querySelectorAll('[data-d]').forEach((b) => { b.onclick = async () => { if (!(await a.confirmBox(t('delete') + '?'))) return; list.splice(+b.dataset.d, 1); tplSave(list); if (cur && !list.some((x) => x.id === cur.id)) cur = null; render(); }; });
      if (!cur) return;
      $('#tpLvl', body).value = String(cur.lvl || 0);
      $('#tpSrc', body).value = cur.kaynak || 'all';
      // konu önerileri: arşivdeki konular + sınavdakiler
      (async () => {
        try {
          const st = await window.Bank.load(); const mine = await window.Bank.getMine();
          const s = new Set(EK.konuList());
          st.bank.questions.concat(mine.questions).forEach((q) => { const k = EK.bankKonu(q); if (k) { s.add(k); s.add(k.split(' > ')[0]); } });
          const dl = $('#ekKonuAll', body); if (dl) dl.innerHTML = [...s].sort((x, y) => x.localeCompare(y, 'tr')).map((k) => `<option value="${esc(k)}">`).join('');
        } catch { /* yok */ }
      })();
      const read = () => {
        cur.ad = $('#tpAd', body).value.trim(); cur.baslik = $('#tpBas', body).value.trim();
        cur.adet = Math.max(1, Math.min(200, parseInt($('#tpN', body).value, 10) || 20));
        cur.lvl = +$('#tpLvl', body).value; cur.tag = $('#tpTag', body).value; cur.kaynak = $('#tpSrc', body).value;
        body.querySelectorAll('[data-z]').forEach((el) => { cur.zor[el.dataset.z] = Math.max(0, Math.min(100, +el.value || 0)); });
        cur.konular = [...body.querySelectorAll('[data-k]')].map((el) => ({ k: el.value.trim(), p: Math.max(0, Math.min(100, +body.querySelector(`[data-p="${el.dataset.k}"]`).value || 0)) })).filter((x) => x.k);
      };
      $('#tpKAdd', body).onclick = () => { read(); cur.konular.push({ k: '', p: 20 }); render(); };
      body.querySelectorAll('[data-x]').forEach((b) => { b.onclick = () => { read(); cur.konular.splice(+b.dataset.x, 1); render(); }; });
      const save = () => { read(); if (!cur.ad) cur.ad = cur.baslik || t('tplNamePh'); const i = list.findIndex((x) => x.id === cur.id); if (i >= 0) list[i] = cur; else list.push(cur); tplSave(list); };
      $('#tpSave', body).onclick = () => { save(); a.toast(t('tplSaved'), 'ok'); render(); };
      $('#tpRun', body).onclick = async () => { save(); m.close(); await tplCreate(cur); };
    };
    render();
    const m = a.modal({ title: t('tplTitle'), body, wide: true, buttons: [{ label: t('close'), onClick: (c) => c() }] });
  }

  EK._audit = auditModal;
  EK._search = searchModal;
  Object.assign(EK, { dupModal, tplModal, offlineIssues, tplBuild, simPairs: pairs, prepQ: prep });
  EK.addSide('btnEkSearch', () => t('srBtn'), searchModal);
  EK.addSide('btnEkDup', () => t('dupBtn'), dupModal);
  EK.addSide('btnEkAudit', () => t('auditBtn'), () => auditModal());
  EK.addSide('btnEkTpl', () => t('tplBtn'), tplModal);
})();
