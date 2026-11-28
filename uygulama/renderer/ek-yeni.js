'use strict';
/* Sınav Hazırlama 1.11.2 — window.EK'e eklenir (ek-plus.js'ten sonra, app.js'ten önce yüklenir).
   1) Soru eskimesi: yıpranmış soru işareti, aynı sınıfa tekrar verilmeme, kullanım kaydının eşitlenmesi (q.kul, ek-plus.js).
   2) EASA Part-66 Appendix II modül ağırlık denetimi: sınavın modül / alt konu dağılımı resmî soru sayılarıyla karşılaştırılır.
   3) Kılavuzdan taslak soru: AMM / CAA / EASA belgesi (PDF, tarama, görsel, DOCX, TXT) okunur (çevrimdışı OCR dahil),
      kaynak sayfası ve kanıt cümlesiyle taslak sorular üretilir; onay akışına "taslak" olarak düşer.
   4) Yerel yapay zekâ: internet ya da anahtar yoksa bu bilgisayardaki Ollama modeli kullanılır (EK.localChat / EK.smartChat).
   Hiçbir kayıt silinmez; değişiklikler geri alınabilir (snap / undo). */
(function () {
  const A = () => window.__app;
  const t = (...a) => window.t(...a);
  const $ = (s, r = document) => r.querySelector(s);
  const EK = window.EK;
  const esc = EK.esc;
  const LK = ['tr', 'en', 'ar'];
  const norm = (s) => String(s || '').replace(/[İI]/g, 'i').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
  const ls = {
    get: (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* dolu */ } },
  };
  const pickL = (ml, cl) => (ml && (ml[cl] || ml.tr || ml.en || ml.ar)) || '';
  const fmtD = (ms) => { try { return new Date(ms).toLocaleDateString(window.UI_LANG === 'ar' ? 'ar' : window.UI_LANG === 'en' ? 'en-GB' : 'tr-TR'); } catch { return ''; } };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  Object.assign(window.I18N, {
    // soru eskimesi
    esBtn: ['🥀 Soru eskimesi', '🥀 Question wear', '🥀 استهلاك الأسئلة'],
    esTitle: ['Soru eskimesi ve sınıf tekrarı', 'Question wear and class repeats', 'استهلاك الأسئلة وتكرارها للصف'],
    esHelp: ['Öğrenciye giden her çıktı, kitapçık ve çevrimiçi sınav sorunun içine kaydedilir; bu kayıt bulut ve Wi-Fi eşitlemesiyle bütün cihazlara gider. Eşik kadar kullanılan soru "yıprandı" sayılır (ezberlenmiş olabilir). Sınıf adını yazarsanız o sınıfa verilen soru, müfredat planında o sınıfa bir daha gelmez.', 'Every output, booklet and online exam given to candidates is recorded inside the question; the record travels to all devices with cloud and Wi-Fi sync. A question used as many times as the threshold counts as "worn" (it may have been memorised). If you enter a class name, questions given to that class are never picked for it again by the syllabus plan.', 'يُسجَّل داخل السؤال كل مخرج وكتيّب واختبار عبر الشبكة يُعطى للمتقدمين، وينتقل السجل إلى كل الأجهزة بالمزامنة السحابية وعبر Wi-Fi. السؤال الذي يبلغ عدد استخداماته الحدَّ يُعدّ «مستهلَكاً» (ربما حُفظ). إذا كتبت اسم الصف فلن تختار خطة المنهج لذلك الصف سؤالاً أُعطي له من قبل.'],
    esSinif: ['Şu anki sınıf / grup', 'Current class / group', 'الصف / المجموعة الحالية'],
    esSinifPh: ['ör. B1-2026-Güz', 'e.g. B1-2026-Autumn', 'مثال: B1-2026-خريف'],
    esEsik: ['Yıprandı eşiği (kullanım)', 'Worn threshold (uses)', 'حد الاستهلاك (مرات الاستخدام)'],
    esSum: ['Bu sınavda: yıpranmış {w} · "{s}" sınıfına verilmiş {c} · hiç kullanılmamış {f}', 'In this exam: worn {w} · given to "{s}" {c} · never used {f}', 'في هذا الاختبار: مستهلَك {w} · أُعطي للصف «{s}» {c} · لم يُستخدم قط {f}'],
    esSumNo: ['Bu sınavda: yıpranmış {w} · hiç kullanılmamış {f} (sınıf adı yok)', 'In this exam: worn {w} · never used {f} (no class name)', 'في هذا الاختبار: مستهلَك {w} · لم يُستخدم قط {f} (لا يوجد اسم صف)'],
    esUses: ['Kullanım', 'Uses', 'الاستخدام'], esLast: ['Son', 'Last', 'آخر مرة'], esClasses: ['Sınıflar', 'Classes', 'الصفوف'],
    esSelWorn: ['Yıpranmışları seç', 'Select worn', 'تحديد المستهلَكة'], esSelCls: ['Bu sınıfa verilmişleri seç', 'Select given to this class', 'تحديد ما أُعطي لهذا الصف'],
    esMark: ['Seçilileri "yıprandı" işaretle', 'Mark selected as worn', 'تعليم المحدد كمستهلَك'], esUnmark: ['Seçililerden işareti kaldır', 'Clear the mark on selected', 'إزالة العلامة عن المحدد'],
    esReplace: ['Seçililerin yerine taze soru koy', 'Replace selected with fresh questions', 'استبدال المحدد بأسئلة جديدة'],
    esReplaceTip: ['Aynı konu ve zorlukta, yıpranmamış ve bu sınıfa verilmemiş soru arşivinizden / soru arşivinden alınır. Eski soru silinmez, hayalet olur (listede kalır, çıktıya girmez).', 'A question with the same topic and difficulty, not worn and not given to this class, is taken from your archive / the question archive. The old one is not deleted; it becomes a ghost (stays in the list, not printed).', 'يُؤخذ من أرشيفك / أرشيف الأسئلة سؤالٌ بالموضوع والصعوبة نفسيهما غير مستهلَك ولم يُعطَ لهذا الصف. لا يُحذف القديم بل يصبح شبحاً (يبقى في القائمة ولا يُطبع).'],
    esReplaced: ['{n} soru yenilendi; {k} soru için uygun soru bulunamadı.', '{n} questions replaced; no match for {k}.', 'استُبدل {n} سؤالاً؛ ولم يوجد بديل مناسب لـ {k}.'],
    esMarked: ['{n} sorunun işareti değişti.', 'Mark changed for {n} questions.', 'تغيّرت العلامة لـ {n} سؤالاً.'],
    esNone: ['Bu sınavda yıpranmış ya da bu sınıfa verilmiş soru yok.', 'No worn questions or questions given to this class in this exam.', 'لا توجد في هذا الاختبار أسئلة مستهلَكة أو أُعطيت لهذا الصف.'],
    esOutCls: ['Bu çıktıdaki {n} soru "{s}" sınıfına daha önce verildi.', '{n} questions in this output were already given to the class "{s}".', 'أُعطي {n} سؤالاً من هذا المخرج سابقاً للصف «{s}».'],
    esShow: ['Göster', 'Show', 'عرض'],
    // Part-66
    p6Btn: ['⚖ Part-66 modül ağırlığı', '⚖ Part-66 module weights', '⚖ أوزان وحدات Part-66'],
    p6Title: ['EASA Part-66 modül ve alt konu ağırlık denetimi', 'EASA Part-66 module and sub-topic weighting check', 'فحص أوزان وحدات EASA Part-66 وموضوعاتها الفرعية'],
    p6Help: ['Sorular "Konu" alanındaki modül koduna göre (M8, Modül 8, 8.2, Module 11A …) ya da modül adına göre gruplanır ve Part-66 Appendix II\'deki resmî soru sayılarıyla karşılaştırılır. Alt konu hedefleri resmî değildir; isterseniz kurumunuzun ağırlıklarını yazın.', 'Questions are grouped by the module code in the "Topic" field (M8, Module 8, 8.2, Module 11A …) or by module name, and compared with the official numbers of questions in Part-66 Appendix II. Sub-topic targets are not official; enter your organisation\'s weights if you wish.', 'تُجمَّع الأسئلة حسب رمز الوحدة في حقل «الموضوع» (M8، الوحدة 8، 8.2، Module 11A …) أو حسب اسم الوحدة، وتُقارن بأعداد الأسئلة الرسمية في الملحق II من Part-66. أهداف الموضوعات الفرعية ليست رسمية؛ يمكنك إدخال أوزان مؤسستك.'],
    p6Cat: ['Lisans kategorisi', 'Licence category', 'فئة الرخصة'],
    p6Tol: ['İzin verilen sapma (yüzde puan)', 'Allowed deviation (percentage points)', 'الانحراف المسموح (نقاط مئوية)'],
    p6Warn: ['Çıktı alırken sapma varsa uyar', 'Warn on output if there is a deviation', 'التنبيه عند الإخراج إذا وُجد انحراف'],
    p6Mod: ['Modül', 'Module', 'الوحدة'], p6Have: ['Sınavda', 'In exam', 'في الاختبار'], p6Off: ['Resmî (App. II)', 'Official (App. II)', 'الرسمي (الملحق II)'],
    p6Target: ['Hedef', 'Target', 'الهدف'], p6Dev: ['Sapma', 'Deviation', 'الانحراف'],
    p6One: ['Tek modüllük sınav: App. II bu modül için {c} kategorisinde {n} soru ister; sınavda {h} soru var.', 'Single-module exam: App. II requires {n} questions for this module in category {c}; the exam has {h}.', 'اختبار وحدة واحدة: يطلب الملحق II {n} سؤالاً لهذه الوحدة في الفئة {c}؛ وفي الاختبار {h}.'],
    p6NotCat: ['{m} bu kategoride ({c}) yok.', '{m} is not part of category {c}.', '{m} ليست ضمن الفئة {c}.'],
    p6Unknown: ['{n} sorunun modülü anlaşılamadı (Konu alanı boş ya da kodsuz).', 'The module of {n} questions could not be found (Topic empty or without a code).', 'تعذّر تحديد وحدة {n} سؤالاً (حقل الموضوع فارغ أو دون رمز).'],
    p6SelUnknown: ['Bunları seç', 'Select them', 'تحديدها'],
    p6Sub: ['Alt konular — {m}', 'Sub-topics — {m}', 'الموضوعات الفرعية — {m}'],
    p6SubW: ['Ağırlık', 'Weight', 'الوزن'], p6SubHelp: ['Ağırlık boşsa yalnız dağılım gösterilir. Ağırlıklar bu cihazda saklanır.', 'With no weights only the distribution is shown. Weights are kept on this device.', 'إذا لم تُحدَّد الأوزان يُعرض التوزيع فقط. تُحفظ الأوزان على هذا الجهاز.'],
    p6Conc: ['{m}: soruların %{p}\'i tek alt konuda ({s}); dağılım dengesiz.', '{m}: {p}% of the questions are in one sub-topic ({s}); the spread is unbalanced.', '{m}: {p}% من الأسئلة في موضوع فرعي واحد ({s})؛ التوزيع غير متوازن.'],
    p6Opt: ['App. II: her soruda 3 şık ve tek doğru cevap bulunur; bu sınav {n} şıklı.', 'App. II: each question has 3 options with one correct answer; this exam uses {n} options.', 'الملحق II: لكل سؤال 3 خيارات وإجابة صحيحة واحدة؛ هذا الاختبار بـ {n} خيارات.'],
    p6Pass: ['Geçme notu her modülde %75; yanlış cevap puan düşürmez.', 'Pass mark is 75% in every module; wrong answers carry no penalty.', 'درجة النجاح 75% في كل وحدة؛ لا تُخصم درجات للإجابات الخاطئة.'],
    p6Essay: ['{m} için App. II ayrıca {n} yazılı (essay) soru ister.', 'App. II also requires {n} essay question(s) for {m}.', 'يطلب الملحق II أيضاً {n} سؤالاً مقالياً لـ {m}.'],
    p6Ok: ['Dağılım resmî ağırlıklarla uyumlu.', 'The distribution matches the official weights.', 'التوزيع متوافق مع الأوزان الرسمية.'],
    p6Plan: ['Bu kategorinin App. II sayılarıyla müfredat planı aç', 'Open a syllabus plan with this category\'s App. II numbers', 'فتح خطة منهج بأعداد الملحق II لهذه الفئة'],
    p6OutWarn: ['Part-66 ağırlığı: {n} modülde sapma var ({c}).', 'Part-66 weighting: deviation in {n} module(s) ({c}).', 'أوزان Part-66: انحراف في {n} وحدة ({c}).'],
    p6Detail: ['Ayrıntı', 'Details', 'التفاصيل'],
    p6Src: ['Kaynak: Reg. (EU) 1321/2014 Annex III (Part-66) Appendix II. Sayıları kurumunuzun güncel otorite yayımına göre denetleyin.', 'Source: Reg. (EU) 1321/2014 Annex III (Part-66) Appendix II. Check the numbers against your authority\'s current publication.', 'المصدر: اللائحة (EU) 1321/2014 الملحق III (Part-66) الملحق II. تحقّق من الأعداد مقابل الإصدار الحالي لسلطتك.'],
    // kılavuzdan soru
    kgBtn: ['📘 Kılavuzdan soru üret', '📘 Questions from a manual', '📘 أسئلة من دليل'],
    kgTitle: ['Kılavuzdan taslak soru üretme (AMM / CAA / EASA)', 'Draft questions from a manual (AMM / CAA / EASA)', 'توليد أسئلة مسودة من دليل (AMM / CAA / EASA)'],
    kgHelp: ['Belgeyi seçin; metin katmanı olmayan (taranmış) sayfalar internetsiz metin tanımayla okunur. Sorular yalnız belgedeki bilgiden, kaynak sayfası ve kanıt cümlesiyle yazılır ve "taslak" olarak eklenir: onaylayana kadar sınava girmez.', 'Choose the document; scanned pages without a text layer are read with offline text recognition. Questions are written only from the document, with the source page and an evidence sentence, and are added as "draft": they do not go into exams until you approve them.', 'اختر المستند؛ تُقرأ الصفحات الممسوحة التي لا طبقة نص فيها بالتعرف على النص دون إنترنت. تُكتب الأسئلة من المستند فقط مع صفحة المصدر وجملة الدليل، وتُضاف «مسودة»: لا تدخل الاختبارات حتى تعتمدها.'],
    kgPick: ['Belge seç (PDF, görsel, DOCX, TXT)', 'Choose document (PDF, image, DOCX, TXT)', 'اختيار مستند (PDF، صورة، DOCX، TXT)'],
    kgRead: ['Okunuyor: sayfa {p}/{n}{o}', 'Reading: page {p}/{n}{o}', 'جارٍ القراءة: الصفحة {p}/{n}{o}'], kgOcr: [' (metin tanıma)', ' (text recognition)', ' (التعرف على النص)'],
    kgLoaded: ['{f}: {n} sayfa, {c} karakter{o}.', '{f}: {n} pages, {c} characters{o}.', '{f}: {n} صفحة، {c} حرفاً{o}.'], kgOcrN: [', {n} sayfa metin tanımayla okundu', ', {n} pages read with text recognition', '، قُرئت {n} صفحة بالتعرف على النص'],
    kgSrc: ['Kaynak adı', 'Source name', 'اسم المصدر'], kgRev: ['Revizyon', 'Revision', 'المراجعة'], kgPages: ['Sayfalar', 'Pages', 'الصفحات'],
    kgCount: ['Soru sayısı', 'Number of questions', 'عدد الأسئلة'], kgKonu: ['Konu', 'Topic', 'الموضوع'], kgZor: ['Zorluk', 'Difficulty', 'الصعوبة'],
    kgLangs: ['Üç dilde yaz (TR / EN / AR)', 'Write in three languages (TR / EN / AR)', 'الكتابة بثلاث لغات (TR / EN / AR)'],
    kgGo: ['Taslak soruları üret', 'Generate draft questions', 'توليد أسئلة المسودة'],
    kgEngOn: ['Yapay zekâ: {m} (çevrimiçi)', 'AI: {m} (online)', 'الذكاء الاصطناعي: {m} (عبر الإنترنت)'],
    kgEngLocal: ['Yapay zekâ: bu bilgisayardaki {m} (çevrimdışı)', 'AI: {m} on this computer (offline)', 'الذكاء الاصطناعي: {m} على هذا الحاسوب (دون اتصال)'],
    kgEngRule: ['Yapay zekâ yok: terim sözlüğüne dayalı boşluk doldurma soruları üretilir (çevrimdışı). Daha iyi sorular için Ayarlar → Yapay zekâ ya da Ollama.', 'No AI: fill-in-the-blank questions based on the glossary are produced (offline). For better questions use Settings → AI or Ollama.', 'لا يوجد ذكاء اصطناعي: تُولَّد أسئلة ملء فراغ مبنية على المسرد (دون اتصال). لأسئلة أفضل استخدم الإعدادات ← الذكاء الاصطناعي أو Ollama.'],
    kgGen: ['Üretiliyor: bölüm {d}/{n}…', 'Generating: part {d}/{n}…', 'جارٍ التوليد: الجزء {d}/{n}…'],
    kgRes: ['{n} taslak soru üretildi. Eklemek istediklerinizi işaretleyin.', '{n} draft questions generated. Tick the ones to add.', 'وُلِّد {n} سؤال مسودة. حدّد ما تريد إضافته.'],
    kgNoRes: ['Soru üretilemedi: {e}', 'No questions could be generated: {e}', 'تعذّر توليد الأسئلة: {e}'],
    kgPage: ['s. {p}', 'p. {p}', 'ص {p}'], kgPart: ['bölüm {p}', 'part {p}', 'جزء {p}'],
    kgUnver: ['⚠ Kanıt belgede bulunamadı — dikkatle denetleyin', '⚠ Evidence not found in the document — check carefully', '⚠ لم يُعثر على الدليل في المستند — راجعه بعناية'],
    kgAdd: ['Seçilenleri sınava taslak olarak ekle', 'Add selected to the exam as drafts', 'إضافة المحدد إلى الاختبار كمسودات'],
    kgAdded: ['{n} taslak soru eklendi (Onay ve gözden geçirme listesinde).', '{n} draft questions added (in the Approval & review list).', 'أُضيف {n} سؤال مسودة (في قائمة الاعتماد والمراجعة).'],
    kgEmpty: ['Belgeden metin okunamadı.', 'No text could be read from the document.', 'تعذّر قراءة نص من المستند.'],
    kgNoTerm: ['belgede terim sözlüğündeki havacılık terimleri bulunamadı', 'no glossary aviation terms were found in the document', 'لم تُوجد في المستند مصطلحات طيران من المسرد'],
    kgClozeStem: ['Boşluğa hangisi gelmelidir?', 'Which term completes the statement?', 'أيّ مصطلح يكمل العبارة؟'],
  });

  /* =============================== yerel yapay zekâ (Ollama) =============================== */
  const OLL = 'http://127.0.0.1:11434';
  let ollModel = null, ollAt = 0;
  // Bilgisayarda Ollama açıksa en uygun sohbet modeli (çeviri ve gömme modelleri hariç)
  async function ollamaModel() {
    if (Date.now() - ollAt < 60000) return ollModel;
    ollAt = Date.now(); ollModel = null;
    try {
      const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 1500);
      const r = await fetch(OLL + '/api/tags', { signal: ac.signal }); clearTimeout(tm);
      const j = await r.json();
      const names = (j.models || []).map((m) => m.name || m.model).filter((n) => n && !/embed|translategemma|nllb|whisper|vision-only/i.test(n));
      const pref = [/qwen3/i, /qwen2\.5/i, /gemma3/i, /llama3\.[1-9]/i, /mistral-small|mistral-nemo/i, /llama3/i, /gemma/i, /mistral/i, /phi/i, /./];
      for (const re of pref) { const m = names.find((n) => re.test(n)); if (m) { ollModel = m; break; } }
    } catch { ollModel = null; }
    return ollModel;
  }
  async function localChat(messages, opts = {}) {
    const model = await ollamaModel();
    if (!model) throw new Error('local-ai');
    const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), opts.timeout || 240000);
    try {
      const r = await fetch(OLL + '/api/chat', {
        method: 'POST', signal: ac.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, stream: false, ...(opts.json ? { format: 'json' } : {}), options: { temperature: opts.temperature ?? 0.2, num_ctx: 16384 },
          messages: [...(opts.system ? [{ role: 'system', content: opts.system }] : []), ...messages.map((m) => ({ role: m.role, content: m.content }))] }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j && j.error) || 'HTTP ' + r.status);
      return (j.message && j.message.content) || '';
    } finally { clearTimeout(tm); }
  }
  const NETERR = /fetch|network|ERR_|Timeout|zaman|timed? ?out|HTTP 5\d\d|offline/i;
  // önce çevrimiçi (kullanıcının kendi anahtarı), olmazsa bilgisayardaki yapay zekâ
  async function smartChat(messages, opts = {}) {
    const on = window.AI && window.AI.ready() && navigator.onLine !== false;
    if (on) {
      try { return { text: await window.AI.chat(messages, opts), engine: 'online', model: window.AI.lastModel || '' }; }
      catch (e) { if (!NETERR.test(String(e && e.message || e)) || !(await ollamaModel())) throw e; }
    }
    const m = await ollamaModel();
    if (!m) throw new Error('no-ai');
    return { text: await localChat(messages, opts), engine: 'local', model: m };
  }
  async function engineInfo() {
    if (window.AI && window.AI.ready() && navigator.onLine !== false) { const c = window.AI.get(); return { kind: 'online', label: t('kgEngOn', { m: (c.model || (window.AI.PROV[c.provider || 'gemini'] || {}).models?.[0] || c.provider || '') }) }; }
    const m = await ollamaModel();
    if (m) return { kind: 'local', label: t('kgEngLocal', { m }) };
    return { kind: 'rule', label: t('kgEngRule') };
  }

  /* =============================== soru eskimesi =============================== */
  function knownClasses() {
    const set = new Set();
    Object.values(ls.get('ek.kullanim', {})).forEach((l) => (l || []).forEach((r) => { if (r && r[2]) set.add(String(r[2])); }));
    (A().exam.questions || []).forEach((q) => (q.kul || []).forEach((r) => { if (r && r[2]) set.add(String(r[2])); }));
    return [...set].sort((x, y) => x.localeCompare(y, 'tr')).slice(0, 200);
  }
  async function replaceFresh(qs, cls) {
    const a = A();
    const pool = await EK.poolFor({ exam: false, mine: true, bank: true });
    const inExam = new Set(a.exam.questions.map((q) => EK.fp(q)));
    const m = ls.get('ek.kullanim', {});
    let n = 0, k = 0;
    a.snap();
    for (const q of qs) {
      const cand = shuffle(pool.filter((x) => {
        const f = EK.fp(x.q);
        if (!f || inExam.has(f)) return false;
        if (q.konu && !EK.konuFits(x.q, q.konu)) return false;
        if (q.zor && x.q.zor && x.q.zor !== q.zor) return false;
        if (EK.isWorn(x.q, m) || (cls && EK.givenTo(x.q, cls, m))) return false;
        return !x.q.durum || x.q.durum === 'o';
      }));
      const pick = cand.sort((x, y) => EK.useCount(x.q, m) - EK.useCount(y.q, m))[0];
      if (!pick) { k++; continue; }
      const c = JSON.parse(JSON.stringify(pick.q)); c.id = a.newQuestion().id; delete c.ist; delete c.gecmis; delete c.kul; delete c.yip;
      if (q.konu && !c.konu) c.konu = q.konu; if (q.tag && !c.tag) c.tag = q.tag;
      const i = a.exam.questions.indexOf(q);
      a.exam.questions.splice(i, 0, c);      // yeni soru eskisinin numarasını alır
      q.ghost = true;                          // eski soru silinmez
      inExam.add(EK.fp(c)); n++;
    }
    a.renderList(); a.changed();
    a.toast(t('esReplaced', { n, k }), n ? 'ok' : 'warn', n ? [{ label: t('undo'), onClick: () => a.undo() }] : [], 7000);
  }
  function esModal() {
    const a = A();
    EK.absorbUse();
    const body = document.createElement('div');
    const render = () => {
      const m = ls.get('ek.kullanim', {});
      const cls = EK.sinifNow();
      const qs = a.exam.questions.filter((q) => !q.ghost);
      const worn = qs.filter((q) => EK.isWorn(q, m));
      const given = cls ? qs.filter((q) => EK.givenTo(q, cls, m)) : [];
      const fresh = qs.filter((q) => !EK.useCount(q, m)).length;
      const rows = qs.filter((q) => worn.includes(q) || given.includes(q));
      const classes = knownClasses();
      body.innerHTML = `<p class="help">${esc(t('esHelp'))}</p>
        <div class="row"><label>${esc(t('esSinif'))} <input class="in" id="esCls" list="esClsList" dir="auto" style="width:200px" placeholder="${esc(t('esSinifPh'))}" value="${esc(cls)}"></label>
          <datalist id="esClsList">${classes.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
          <label>${esc(t('esEsik'))} <input class="in" id="esEsik" type="number" min="1" max="50" style="width:70px" value="${EK.esikNow()}"></label></div>
        <div class="bkinfo">${esc(cls ? t('esSum', { w: worn.length, s: cls, c: given.length, f: fresh }) : t('esSumNo', { w: worn.length, f: fresh }))}</div>
        <div class="row"><button class="btn" id="esSelW"${worn.length ? '' : ' disabled'}>${esc(t('esSelWorn'))}</button><button class="btn" id="esSelC"${given.length ? '' : ' disabled'}>${esc(t('esSelCls'))}</button>
          <button class="btn" id="esMark">${esc(t('esMark'))}</button><button class="btn" id="esUnmark">${esc(t('esUnmark'))}</button>
          <button class="btn primary" id="esRep" title="${esc(t('esReplaceTip'))}">${esc(t('esReplace'))}</button></div>
        ${rows.length ? `<table class="antable"><thead><tr><th>#</th><th></th><th>${esc(t('esUses'))}</th><th>${esc(t('esLast'))}</th><th>${esc(t('esClasses'))}</th><th></th></tr></thead><tbody>${rows.map((q) => {
          const u = EK.usesOf(q, m); const last = u[u.length - 1];
          const cs = [...new Set(u.map((x) => x[2]).filter(Boolean))];
          return `<tr><td><b>${a.qNumber(q)}</b></td><td dir="auto">${esc(pickL(q.text, a.CL()).slice(0, 90))}</td><td>${worn.includes(q) ? '🥀 ' : ''}${u.length}${q.yip ? ' ✋' : ''}</td><td>${last ? esc(fmtD(last[0])) : '—'}</td><td dir="auto">${cs.map((c) => (cls && norm(c) === norm(cls) ? `<b class="bad">${esc(c)}</b>` : esc(c))).join(', ') || '—'}</td><td><button class="btn mini" data-go="${q.id}">${esc(t('plGo'))}</button></td></tr>`;
        }).join('')}</tbody></table>` : `<div class="empty">${esc(t('esNone'))}</div>`}`;
      $('#esCls', body).onchange = (e) => { a.prefs.sinif = String(e.target.value || '').trim().slice(0, 40); a.savePrefs(); a.renderList(); render(); };
      $('#esEsik', body).onchange = (e) => { a.prefs.eskiEsik = Math.max(1, Math.min(50, +e.target.value || 4)); a.savePrefs(); a.renderList(); render(); };
      const selOnly = (list) => { a.selected.clear(); list.forEach((q) => a.selected.add(q.id)); a.renderList(); a.toast(t('selVisDone', { n: a.selected.size }), 'ok'); };
      $('#esSelW', body).onclick = () => selOnly(worn);
      $('#esSelC', body).onclick = () => selOnly(given);
      const mark = (on) => {
        const sel = qs.filter((q) => a.selected.has(q.id));
        if (!sel.length) return a.toast(t('plNoSel'), 'warn');
        a.snap(); let n = 0;
        sel.forEach((q) => { if (!!q.yip !== on) { if (on) q.yip = true; else delete q.yip; n++; } });
        a.renderList(); a.changed(); a.toast(t('esMarked', { n }), 'ok', [{ label: t('undo'), onClick: () => a.undo() }]); render();
      };
      $('#esMark', body).onclick = () => mark(true);
      $('#esUnmark', body).onclick = () => mark(false);
      $('#esRep', body).onclick = async () => {
        const sel = qs.filter((q) => a.selected.has(q.id));
        if (!sel.length) return a.toast(t('plNoSel'), 'warn');
        $('#esRep', body).disabled = true;
        try { await replaceFresh(sel, cls); } finally { render(); }
      };
      body.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => { md.close(); a.setTab('test'); a.scrollToQ(b.dataset.go); }; });
    };
    const md = a.modal({ title: t('esTitle'), body, wide: true, buttons: [{ label: t('close'), onClick: (c) => c() }] });
    render();
  }

  /* =============================== EASA Part-66 Appendix II =============================== */
  // Soru sayıları: Reg. (EU) 1321/2014 Annex III (Part-66) Appendix II, madde 2 (MCQ / essay). Kategori anahtarları:
  // A (A1–A4), B1 (B1.1–B1.4), B113 (B1.1 ve B1.3), B124 (B1.2 ve B1.4), B2, B3.
  const MODS = [
    { id: '1', ad: ['Matematik', 'Mathematics', 'الرياضيات'], n: { A: 16, B1: 32, B2: 32, B3: 28 } },
    { id: '2', ad: ['Fizik', 'Physics', 'الفيزياء'], n: { A: 32, B1: 52, B2: 52, B3: 28 } },
    { id: '3', ad: ['Elektrik Temelleri', 'Electrical Fundamentals', 'أساسيات الكهرباء'], n: { A: 20, B1: 52, B2: 52, B3: 24 } },
    { id: '4', ad: ['Elektronik Temelleri', 'Electronic Fundamentals', 'أساسيات الإلكترونيات'], n: { B1: 20, B2: 40, B3: 8 } },
    { id: '5', ad: ['Sayısal Teknikler / Elektronik Cihaz Sistemleri', 'Digital Techniques / Electronic Instrument Systems', 'التقنيات الرقمية / أنظمة الأجهزة الإلكترونية'], n: { A: 16, B113: 40, B124: 20, B2: 72, B3: 16 } },
    { id: '6', ad: ['Malzemeler ve Donanım', 'Materials and Hardware', 'المواد والعتاد'], n: { A: 52, B1: 72, B2: 60, B3: 60 } },
    { id: '7A', ad: ['Bakım Uygulamaları', 'Maintenance Practices', 'ممارسات الصيانة'], n: { A: 72, B1: 80, B2: 60 }, e: 2 },
    { id: '7B', ad: ['Bakım Uygulamaları (B3)', 'Maintenance Practices (B3)', 'ممارسات الصيانة (B3)'], n: { B3: 60 }, e: 2 },
    { id: '8', ad: ['Temel Aerodinamik', 'Basic Aerodynamics', 'الديناميكا الهوائية الأساسية'], n: { A: 20, B1: 20, B2: 20, B3: 20 } },
    { id: '9A', ad: ['İnsan Faktörleri', 'Human Factors', 'العوامل البشرية'], n: { A: 20, B1: 20, B2: 20 }, e: 1 },
    { id: '9B', ad: ['İnsan Faktörleri (B3)', 'Human Factors (B3)', 'العوامل البشرية (B3)'], n: { B3: 16 }, e: 1 },
    { id: '10', ad: ['Havacılık Mevzuatı', 'Aviation Legislation', 'تشريعات الطيران'], n: { A: 32, B1: 40, B2: 40, B3: 32 }, e: 1 },
    { id: '11A', ad: ['Türbinli Uçak Aerodinamiği, Yapıları ve Sistemleri', 'Turbine Aeroplane Aerodynamics, Structures and Systems', 'الديناميكا الهوائية للطائرات التوربينية وهياكلها وأنظمتها'], n: { A: 108, B1: 140 } },
    { id: '11B', ad: ['Pistonlu Uçak Aerodinamiği, Yapıları ve Sistemleri', 'Piston Aeroplane Aerodynamics, Structures and Systems', 'الديناميكا الهوائية للطائرات المكبسية وهياكلها وأنظمتها'], n: { A: 72, B1: 100 } },
    { id: '11C', ad: ['Pistonlu Uçak Aerodinamiği, Yapıları ve Sistemleri (B3)', 'Piston Aeroplane Aerodynamics, Structures and Systems (B3)', 'الديناميكا الهوائية للطائرات المكبسية (B3)'], n: { B3: 60 } },
    { id: '12', ad: ['Helikopter Aerodinamiği, Yapıları ve Sistemleri', 'Helicopter Aerodynamics, Structures and Systems', 'الديناميكا الهوائية للمروحيات وهياكلها وأنظمتها'], n: { A: 100, B1: 128 } },
    { id: '13', ad: ['Hava Aracı Aerodinamiği, Yapıları ve Sistemleri', 'Aircraft Aerodynamics, Structures and Systems', 'الديناميكا الهوائية للطائرات وهياكلها وأنظمتها'], n: { B2: 180 } },
    { id: '14', ad: ['Tahrik', 'Propulsion', 'الدفع'], n: { B2: 24 } },
    { id: '15', ad: ['Gaz Türbinli Motor', 'Gas Turbine Engine', 'المحرك التوربيني الغازي'], n: { A: 60, B1: 92 } },
    { id: '16', ad: ['Pistonlu Motor', 'Piston Engine', 'المحرك المكبسي'], n: { A: 52, B1: 72, B3: 68 } },
    { id: '17A', ad: ['Pervane', 'Propeller', 'المروحة الدافعة'], n: { A: 20, B1: 32 } },
    { id: '17B', ad: ['Pervane (B3)', 'Propeller (B3)', 'المروحة الدافعة (B3)'], n: { B3: 28 } },
  ];
  const CATS = {
    A1: ['1', '2', '3', '5', '6', '7A', '8', '9A', '10', '11A', '15', '17A'],
    A2: ['1', '2', '3', '5', '6', '7A', '8', '9A', '10', '11B', '16', '17A'],
    A3: ['1', '2', '3', '5', '6', '7A', '8', '9A', '10', '12', '15'],
    A4: ['1', '2', '3', '5', '6', '7A', '8', '9A', '10', '12', '16'],
    'B1.1': ['1', '2', '3', '4', '5', '6', '7A', '8', '9A', '10', '11A', '15', '17A'],
    'B1.2': ['1', '2', '3', '4', '5', '6', '7A', '8', '9A', '10', '11B', '16', '17A'],
    'B1.3': ['1', '2', '3', '4', '5', '6', '7A', '8', '9A', '10', '12', '15'],
    'B1.4': ['1', '2', '3', '4', '5', '6', '7A', '8', '9A', '10', '12', '16'],
    B2: ['1', '2', '3', '4', '5', '6', '7A', '8', '9A', '10', '13', '14'],
    B3: ['1', '2', '3', '4', '5', '6', '7B', '8', '9B', '10', '11C', '16', '17B'],
  };
  const MOD = Object.fromEntries(MODS.map((m) => [m.id, m]));
  const li = () => ({ tr: 0, en: 1, ar: 2 }[window.UI_LANG] || 0);
  const modName = (id) => `M${id} ${MOD[id] ? MOD[id].ad[li()] : ''}`.trim();
  const p66 = () => { const a = A(); const p = (a && a.prefs && a.prefs.p66) || {}; return { cat: CATS[p.cat] ? p.cat : 'B1.1', tol: p.tol >= 0 ? +p.tol : 5, uyar: p.uyar !== false, alt: p.alt || {} }; };
  const p66Cat = () => p66().cat;
  function countOf(id, cat) {
    const m = MOD[id]; if (!m || !CATS[cat] || !CATS[cat].includes(id)) return 0;
    if (cat[0] === 'A') return m.n.A || 0;
    if (cat.startsWith('B1')) return (/B1\.[13]/.test(cat) ? m.n.B113 : m.n.B124) || m.n.B1 || 0;
    return m.n[cat] || 0;
  }
  // 7 / 9 / 11 / 17 harfsiz yazıldıysa kategoriye göre A / B / C
  function resolveId(num, letter, cat) {
    const n = String(+num);
    if (MOD[n]) return n;
    if (letter && MOD[n + letter.toUpperCase()]) return n + letter.toUpperCase();
    const opts = MODS.filter((m) => m.id.replace(/[ABC]$/, '') === n).map((m) => m.id);
    if (!opts.length) return null;
    return opts.find((id) => CATS[cat] && CATS[cat].includes(id)) || opts[0];
  }
  const KW = [
    ['1', /matemati|mathemat|الرياضيات/], ['2', /fizik|physics|الفيزياء/], ['3', /elektrik temel|electrical fundamental|أساسيات الكهرباء/],
    ['4', /elektronik temel|electronic fundamental|أساسيات الإلكترونيات/], ['5', /sayısal teknik|digital techni|التقنيات الرقمية/],
    ['6', /malzeme|materials and hardware|المواد والعتاد/], ['7', /bakım uygulama|maintenance practice|ممارسات الصيانة/],
    ['8', /temel aerodinamik|basic aerodynamic|الديناميكا الهوائية الأساسية/], ['9', /insan faktör|human factor|العوامل البشرية/],
    ['10', /mevzuat|legislation|تشريعات الطيران/], ['12', /helikopter|helicopter|المروحيات/], ['14', /\btahrik\b|propulsion|الدفع/],
    ['15', /gaz türbin|gas turbine|التوربيني الغازي/], ['16', /pistonlu motor|piston engine|المحرك المكبسي/], ['17', /pervane|propeller|المروحة/],
  ];
  // sorunun modülü ve alt konusu: Konu alanındaki koddan (M8, Modül 8, Module 11A, 8.2 …), yoksa modül adından
  function modOf(q, cat) {
    const k = norm(q && q.konu);
    if (!k) return null;
    let id = null, sub = '';
    let m = k.match(/(?:^|[^a-z0-9ğüşıöç])(?:m|mod|modül|modul|module|الوحدة)\s*\.?\s*-?\s*(\d{1,2})\s*([abc])?(?![0-9])/i);
    if (m && +m[1] >= 1 && +m[1] <= 17) id = resolveId(m[1], m[2], cat);
    const sm = k.match(/(?:^|[^0-9.])(\d{1,2})\.(\d{1,2})(?:\.\d{1,2})?(?![0-9])/);
    if (sm && +sm[1] >= 1 && +sm[1] <= 17) { if (!id) id = resolveId(sm[1], '', cat); if (id && String(+sm[1]) === id.replace(/[ABC]$/, '')) sub = sm[1] + '.' + sm[2]; }
    if (!id) { const kw = KW.find(([, re]) => re.test(k)); if (kw) id = resolveId(kw[0], '', cat); }
    if (!id) return null;
    const parts = String(q.konu).split('>').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) sub = parts.slice(1).join(' > ');   // "8.2 Stol" gibi tam alt konu adı
    return { id, sub };
  }
  function analyze(qs, cat, tol, alt) {
    const groups = new Map(); const unknown = [];
    qs.forEach((q) => { const r = modOf(q, cat); if (!r) { unknown.push(q); return; } const g = groups.get(r.id) || { id: r.id, qs: [], subs: new Map() }; g.qs.push(q); const s = r.sub || '—'; g.subs.set(s, (g.subs.get(s) || 0) + 1); groups.set(r.id, g); });
    const ids = [...groups.keys()].sort((x, y) => parseFloat(x) - parseFloat(y) || x.localeCompare(y));
    const known = qs.length - unknown.length;
    const appl = ids.filter((id) => countOf(id, cat) > 0);
    const offSum = appl.reduce((s, id) => s + countOf(id, cat), 0);
    const rows = ids.map((id) => {
      const have = groups.get(id).qs.length, off = countOf(id, cat);
      const sharePct = known ? (100 * have) / known : 0;
      const targetPct = off && offSum ? (100 * off) / offSum : 0;
      const target = ids.length === 1 ? off : Math.round((known * targetPct) / 100);
      const dev = ids.length === 1 ? (off ? (100 * (have - off)) / off : 0) : sharePct - targetPct;
      return { id, have, off, target, dev, notCat: !off, bad: !off || Math.abs(dev) > tol };
    });
    const warns = [];
    rows.filter((r) => r.notCat).forEach((r) => warns.push(t('p6NotCat', { m: modName(r.id), c: cat })));
    const infos = [];
    if (ids.length === 1 && rows[0] && rows[0].off) infos.push(t('p6One', { c: cat, n: rows[0].off, h: rows[0].have }));
    // alt konu: kurum ağırlıkları varsa onlarla, yoksa tek alt konuda yığılma
    const subs = ids.map((id) => {
      const g = groups.get(id); const w = alt[id] || {}; const wSum = Object.values(w).reduce((s, v) => s + (+v || 0), 0);
      const list = [...new Set([...g.subs.keys(), ...Object.keys(w)])].sort((x, y) => x.localeCompare(y, 'tr', { numeric: true }));
      const sr = list.map((s) => { const have = g.subs.get(s) || 0; const sharePct = (100 * have) / g.qs.length; const tp = wSum ? (100 * (+w[s] || 0)) / wSum : null; return { s, have, sharePct, tp, dev: tp == null ? 0 : sharePct - tp, bad: tp != null && Math.abs(sharePct - tp) > tol }; });
      if (!wSum && g.qs.length >= 8 && sr.length >= 1) { const top = sr.slice().sort((x, y) => y.have - x.have)[0]; if (top && top.s !== '—' && top.sharePct > 60 && (sr.length > 1 || g.qs.length >= 15)) warns.push(t('p6Conc', { m: modName(id), p: Math.round(top.sharePct), s: top.s })); }
      return { id, rows: sr, wSum };
    });
    const badMods = rows.filter((r) => r.bad).length + subs.reduce((s, x) => s + x.rows.filter((r) => r.bad).length, 0);
    return { rows, subs, unknown, known, ids, warns, infos, badMods, essays: ids.filter((id) => MOD[id] && MOD[id].e && countOf(id, cat)).map((id) => ({ id, n: MOD[id].e })) };
  }
  const examQs = () => { const a = A(); return a.liveQs().filter((q) => !EK.onayMatch || EK.onayMatch(q)); };
  function p66Rows(cat) {
    const c = cat || p66Cat();
    return CATS[c].map((id) => ({ konu: modName(id), zor: '', adet: countOf(id, c) }));
  }
  function p66Modal() {
    const a = A();
    const body = document.createElement('div');
    const save = (o) => { a.prefs.p66 = Object.assign(p66(), o); a.savePrefs(); };
    const render = () => {
      const P = p66();
      const r = analyze(examQs(), P.cat, P.tol, P.alt);
      const fmt = (v) => (v > 0 ? '+' : '') + (Math.round(v * 10) / 10).toLocaleString(window.UI_LANG === 'tr' ? 'tr-TR' : 'en-GB');
      const nOpt = a.S().optionCount;
      body.innerHTML = `<p class="help">${esc(t('p6Help'))}</p>
        <div class="row"><label>${esc(t('p6Cat'))} <select class="in" id="p6Cat" style="width:auto">${Object.keys(CATS).map((c) => `<option${c === P.cat ? ' selected' : ''}>${c}</option>`).join('')}</select></label>
          <label>${esc(t('p6Tol'))} <input class="in" type="number" id="p6Tol" min="0" max="50" style="width:70px" value="${P.tol}"></label>
          <label class="chk"><input type="checkbox" id="p6Uy"${P.uyar ? ' checked' : ''}> ${esc(t('p6Warn'))}</label></div>
        ${r.rows.length ? `<table class="antable"><thead><tr><th>${esc(t('p6Mod'))}</th><th>${esc(t('p6Have'))}</th><th>${esc(t('p6Off'))}</th><th>${esc(t('p6Target'))}</th><th>${esc(t('p6Dev'))}</th></tr></thead><tbody>${r.rows.map((x) => `<tr><td dir="auto">${esc(modName(x.id))}</td><td>${x.have}</td><td>${x.off || '—'}</td><td>${x.off ? x.target : '—'}</td><td>${x.notCat ? '<span class="bad">✕</span>' : `<span class="${x.bad ? 'bad' : ''}">${fmt(x.dev)} ${r.ids.length === 1 ? '%' : 'pp'}</span>`}</td></tr>`).join('')}</tbody></table>` : ''}
        ${r.unknown.length ? `<div class="status">⚠ ${esc(t('p6Unknown', { n: r.unknown.length }))} <button class="btn mini" id="p6SelU">${esc(t('p6SelUnknown'))}</button></div>` : ''}
        ${r.infos.map((w) => `<div class="bkinfo">${r.badMods ? '⚠' : 'ℹ'} ${esc(w)}</div>`).join('')}
        ${r.warns.map((w) => `<div class="status">⚠ ${esc(w)}</div>`).join('')}
        ${r.rows.length && !r.badMods && !r.warns.length ? `<div class="bkinfo">✓ ${esc(t('p6Ok'))}</div>` : ''}
        ${r.subs.filter((g) => g.rows.some((x) => x.s !== '—')).map((g) => `<h4>${esc(t('p6Sub', { m: modName(g.id) }))}</h4><table class="antable"><thead><tr><th></th><th>${esc(t('p6Have'))}</th><th>%</th><th>${esc(t('p6SubW'))}</th><th>${esc(t('p6Dev'))}</th></tr></thead><tbody>${g.rows.map((x) => `<tr><td dir="auto">${esc(x.s)}</td><td>${x.have}</td><td>${Math.round(x.sharePct)}</td><td>${x.s === '—' ? '' : `<input class="in" type="number" min="0" max="100" style="width:64px" data-m="${esc(g.id)}" data-s="${esc(x.s)}" value="${P.alt[g.id] && P.alt[g.id][x.s] != null ? +P.alt[g.id][x.s] : ''}">`}</td><td>${x.tp == null ? '—' : `<span class="${x.bad ? 'bad' : ''}">${fmt(x.dev)} pp</span>`}</td></tr>`).join('')}</tbody></table>`).join('')}
        ${r.subs.some((g) => g.rows.some((x) => x.s !== '—')) ? `<p class="help">${esc(t('p6SubHelp'))}</p>` : ''}
        <ul class="help">${nOpt !== 3 ? `<li>${esc(t('p6Opt', { n: nOpt }))}</li>` : ''}<li>${esc(t('p6Pass'))}</li>${r.essays.map((e) => `<li>${esc(t('p6Essay', { m: modName(e.id), n: e.n }))}</li>`).join('')}</ul>
        <div class="row"><button class="btn" id="p6Plan">${esc(t('p6Plan'))}</button></div>
        <p class="help"><small>${esc(t('p6Src'))}</small></p>`;
      $('#p6Cat', body).onchange = (e) => { save({ cat: e.target.value }); render(); };
      $('#p6Tol', body).onchange = (e) => { save({ tol: Math.max(0, Math.min(50, +e.target.value || 0)) }); render(); };
      $('#p6Uy', body).onchange = (e) => { save({ uyar: e.target.checked }); };
      body.querySelectorAll('[data-m]').forEach((i) => {
        i.onchange = () => { const alt = p66().alt; const w = alt[i.dataset.m] || {}; const v = i.value.trim(); if (v === '') delete w[i.dataset.s]; else w[i.dataset.s] = Math.max(0, Math.min(100, +v || 0)); alt[i.dataset.m] = w; save({ alt }); render(); };
      });
      if ($('#p6SelU', body)) $('#p6SelU', body).onclick = () => { a.selected.clear(); r.unknown.forEach((q) => a.selected.add(q.id)); a.renderList(); md.close(); a.toast(t('selVisDone', { n: a.selected.size }), 'ok'); };
      $('#p6Plan', body).onclick = () => { md.close(); EK.planModal({ ad: t('plPresetP66') + ' ' + p66Cat(), rows: p66Rows() }); };
    };
    const md = a.modal({ title: t('p6Title'), body, wide: true, buttons: [{ label: t('close'), onClick: (c) => c() }] });
    render();
  }

  /* ---------------- çıktı öncesi uyarılar (app.js doOutput çağırır; çıktıyı durdurmaz) ---------------- */
  function outputCheck(model) {
    try {
      const a = A();
      const ids = new Set((model && model.questions || []).map((x) => x.id));
      const qs = a.exam.questions.filter((q) => ids.has(q.id));
      if (!qs.length) return;
      const cls = EK.sinifNow();
      if (cls) {
        const m = ls.get('ek.kullanim', {});
        const n = qs.filter((q) => EK.givenTo(q, cls, m)).length;
        if (n) a.toast(t('esOutCls', { n, s: cls }), 'warn', [{ label: t('esShow'), onClick: () => esModal() }], 9000);
      }
      const P = p66();
      if (P.uyar) {
        const r = analyze(qs, P.cat, P.tol, P.alt);
        if (r.ids.length && r.badMods) a.toast(t('p6OutWarn', { n: r.badMods, c: P.cat }), 'warn', [{ label: t('p6Detail'), onClick: () => p66Modal() }], 9000);
      }
    } catch (e) { console.warn('outputCheck', e); }
  }

  /* =============================== kılavuzdan taslak soru =============================== */
  // OCR sözcüklerini satırlara (sağdan sola dahil) dizer
  function tokensToText(tokens) {
    const tk = (tokens || []).filter((x) => x && x.text).slice().sort((p, q) => p.y0 - q.y0 || p.x0 - q.x0);
    const lines = [];
    tk.forEach((w) => {
      const h = Math.max(0.004, w.y1 - w.y0);
      const L = lines.find((l) => Math.abs((l.y0 + l.y1) / 2 - (w.y0 + w.y1) / 2) < h * 0.6);
      if (L) { L.w.push(w); L.y0 = Math.min(L.y0, w.y0); L.y1 = Math.max(L.y1, w.y1); } else lines.push({ y0: w.y0, y1: w.y1, w: [w] });
    });
    return lines.sort((p, q) => p.y0 - q.y0).map((l) => {
      const rtl = l.w.filter((w) => /[؀-ۿ]/.test(w.text)).length > l.w.length / 2;
      return l.w.sort((p, q) => (rtl ? q.x0 - p.x0 : p.x0 - q.x0)).map((w) => w.text).join(' ');
    }).join('\n');
  }
  async function readDoc(p, onProg) {
    const a = A();
    const ext = String(p).split('.').pop().toLowerCase();
    const DS = window.DocScan;
    if (ext === 'txt' || ext === 'docx') {
      const txt = String(await window.api.readImportFile(p) || '');
      const parts = []; let cur = '';
      txt.split(/\n/).forEach((ln) => { if ((cur + ln).length > 3500 && cur) { parts.push(cur); cur = ''; } cur += ln + '\n'; });
      if (cur.trim()) parts.push(cur);
      return { pages: parts.map((text, i) => ({ n: i + 1, text, part: true })), ocr: 0 };
    }
    const bytes = await window.api.readBinary(p);
    if (DS && DS.isImage(ext)) {
      onProg && onProg(1, 1, true);
      const bmp = await DS.bitmapFrom(bytes, 'image/' + (ext === 'jpg' ? 'jpeg' : ext));
      const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight;
      return { pages: [{ n: 1, text: tokensToText(await DS.ocrCanvas(DS.prepCanvas(bmp, w, h))) }], ocr: 1 };
    }
    const pdfjs = await a.getPdfjs();
    const doc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false }).promise;
    const pages = []; let ocr = 0;
    try {
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        const tc = await page.getTextContent();
        let text = ''; let lastY = null;
        tc.items.forEach((it) => { if (!it.str) return; const y = it.transform ? Math.round(it.transform[5]) : 0; if (lastY != null && Math.abs(y - lastY) > 2) text += '\n'; else if (text && !/\s$/.test(text)) text += ' '; text += it.str; lastY = y; });
        if (text.replace(/\s/g, '').length < 30 && DS) {
          // taranmış sayfa: görüntüsü internetsiz metin tanımayla okunur
          onProg && onProg(n, doc.numPages, true);
          const vp0 = page.getViewport({ scale: 1 });
          const v2 = page.getViewport({ scale: Math.min(3, 2400 / Math.max(vp0.width, vp0.height) * 1.2) });
          const c = document.createElement('canvas'); c.width = Math.round(v2.width); c.height = Math.round(v2.height);
          const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
          await page.render({ canvasContext: g, viewport: v2 }).promise;
          text = tokensToText(await DS.ocrCanvas(DS.prepCanvas(c, c.width, c.height)));
          ocr++;
        } else onProg && onProg(n, doc.numPages, false);
        pages.push({ n, text: text.replace(/[ \t]+/g, ' ').trim() });
        page.cleanup();
      }
    } finally { doc.destroy(); }
    return { pages, ocr };
  }
  const NOPT = () => A().S().optionCount;
  const evidenceOk = (ev, text) => {
    const w = norm(ev).split(/[^\p{L}\p{N}]+/u).filter((x) => x.length > 3);
    if (!w.length) return false;
    const tx = norm(text);
    return w.filter((x) => tx.includes(x)).length / w.length >= 0.6;
  };
  const LNAME = { tr: 'Turkish', en: 'English', ar: 'Arabic' };
  function glossLine(text) {
    const S = window.SOZLUK; if (!S || !S.AV) return '';
    const low = String(text).toLowerCase();
    const hits = S.AV.filter((w) => w[0] && w[0].length > 2 && low.includes(String(w[0]).toLowerCase())).slice(0, 50);
    return hits.length ? 'Mandatory aviation glossary (EN = TR | AR): ' + hits.map((w) => `${w[0]} = ${w[1]} | ${w[2]}`).join('; ') : '';
  }
  async function aiGenerate(chunks, o, onProg) {
    const nOpt = NOPT();
    const langs = o.tri ? LK : [o.lang];
    const out = []; let lastErr = '';
    for (let i = 0; i < chunks.length; i++) {
      const ch = chunks[i];
      if (!ch.want) continue;
      onProg(i + 1, chunks.length);
      const sys = `You are a senior EASA Part-66 / Part-147 and ICAO examiner. Write multiple-choice exam questions STRICTLY from the supplied source text (an aircraft maintenance manual, CAA or EASA publication). Never use outside knowledge, never invent values, part numbers, limits or procedures.
Rules: exactly ${nOpt} options, exactly one correct answer, distractors plausible and from the same technical domain, no "all/none of the above", no clue in wording or length (the correct option must not be the longest or repeat stem words), negative stems written in CAPITALS (NOT / DEĞİLDİR), formal register and official aviation terminology in every language (EASA / ICAO usage, never everyday wording).
For each question give "page" (the page number shown in the [[PAGE n]] marker where the fact is), "evidence" (a short verbatim sentence fragment, max 25 words, copied from the source text that proves the answer), "konu" (short topic, e.g. "M7 Maintenance Practices > Torque" if it fits a Part-66 module) and "zor" (k = easy, o = medium, z = hard).
Write every text in ${langs.map((k) => LNAME[k]).join(', ')}${o.tri ? ' (Turkish and Arabic must be faithful formal translations of the English, same numbers and units)' : ''}.
Output STRICT JSON only: {"questions":[{"page":1,"evidence":"","konu":"","zor":"o","text":{${langs.map((k) => `"${k}":""`).join(',')}},"options":[{${langs.map((k) => `"${k}":""`).join(',')}}],"correct":0}]}
${glossLine(ch.text)}`;
      const user = `${o.konu ? 'Topic focus: ' + o.konu + '\n' : ''}${o.zor ? 'Target difficulty: ' + { k: 'easy', o: 'medium', z: 'hard' }[o.zor] + '\n' : ''}Generate ${ch.want} questions.\n\nSOURCE TEXT:\n${ch.text}`;
      try {
        const r = await smartChat([{ role: 'user', content: user }], { system: sys, json: true, temperature: 0.4, maxTokens: 8192, timeout: 180000 });
        const mm = String(r.text).match(/\{[\s\S]*\}/);
        const j = mm ? JSON.parse(mm[0]) : null;
        ((j && j.questions) || []).forEach((x) => { x._engine = r.engine; x._chunk = ch; out.push(x); });
      } catch (e) { lastErr = String(e && e.message || e); if (/key|401|403|anahtar|no-ai/i.test(lastErr)) break; }
      await sleep(50);
    }
    return { list: out, err: lastErr };
  }
  // çevrimdışı ve yapay zekâsız: belgedeki havacılık terimleriyle boşluk doldurma (çeldiriciler terim sözlüğünden)
  function ruleGenerate(pages, o) {
    const S = window.SOZLUK; const nOpt = NOPT();
    if (!S || !S.AV) return [];
    const col = { en: 0, tr: 1, ar: 2 }[o.lang] ?? 0;
    const loc = o.lang === 'tr' ? 'tr' : 'en';
    const rx = (s2) => s2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const terms = S.AV.map((w) => ({ w, k: String(w[col] || '').split(/[/(]/)[0].trim() })).filter((x) => x.k.length >= 4 && x.k.length <= 40)
      .map((x) => ({ ...x, low: x.k.toLocaleLowerCase(loc), re: new RegExp('(^|[^\\p{L}])' + rx(x.k.toLocaleLowerCase(loc)) + '([^\\p{L}]|$)', 'u') }));
    const stemTxt = (window.I18N.kgClozeStem || [])[{ tr: 0, en: 1, ar: 2 }[o.lang] || 0] || t('kgClozeStem');
    const out = []; const used = new Set();
    for (const pg of pages) {
      // cümleler; büyük harfle başlayan yeni satır (başlık, madde) ayrı cümle sayılır
      const sents = pg.text.split(/(?<=[.!?؟])\s+|\n(?=[A-ZÇĞİÖŞÜ0-9\u0600-\u06FF•\-–])/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length >= 40 && s.length <= 260);
      for (const s of sents) {
        if (out.length >= o.count) return out;
        const low = s.toLocaleLowerCase(loc);
        const hit = terms.find((x) => !used.has(x.k) && low.includes(x.low) && x.re.test(low));
        if (!hit) continue;
        used.add(hit.k);
        const stem = s.replace(new RegExp(rx(hit.k), 'giu'), '_____');
        // çeldirici: benzer uzunlukta, aynı sözcük sayısında, cümlede geçmeyen terimler
        const nw = hit.k.split(/\s+/).length;
        const near = terms.filter((x) => x.k !== hit.k && !low.includes(x.low) && Math.abs(x.k.length - hit.k.length) < 10);
        const pool = shuffle(near.filter((x) => x.k.split(/\s+/).length === nw)).concat(shuffle(near.filter((x) => x.k.split(/\s+/).length !== nw)))
          .filter((x, i, arr) => arr.findIndex((y) => y.low === x.low) === i).slice(0, nOpt - 1).map((x) => x.k);
        if (pool.length < nOpt - 1) continue;
        const text = { tr: '', en: '', ar: '' }; text[o.lang] = stemTxt + '\n' + stem;
        const opts = [hit.k, ...pool].map((v) => { const m = { tr: '', en: '', ar: '' }; m[o.lang] = v; return m; });
        out.push({ page: pg.n, evidence: s.slice(0, 160), text, options: opts, correct: 0, zor: o.zor || 'o', konu: o.konu || '', _engine: 'rule', _chunk: { text: pg.text } });
      }
    }
    return out;
  }
  function toQuestion(x, o) {
    const a = A(); const nOpt = NOPT();
    const ml = (v) => (typeof v === 'string' ? { tr: o.lang === 'tr' ? v : '', en: o.lang === 'en' ? v : '', ar: o.lang === 'ar' ? v : '' } : { tr: String((v && v.tr) || ''), en: String((v && v.en) || ''), ar: String((v && v.ar) || '') });
    const opts = (Array.isArray(x.options) ? x.options : []).slice(0, nOpt).map(ml);
    if (opts.length < Math.min(3, nOpt)) return null;
    let correct = Number.isInteger(+x.correct) ? +x.correct : -1;
    if (!(correct >= 0 && correct < opts.length)) return null;
    // doğru şıkkın yeri karıştırılır (yapay zekâ çoğu zaman A'ya koyar)
    const order = shuffle(opts.map((_, i) => i));
    const sh = order.map((i) => opts[i]); correct = order.indexOf(correct);
    while (sh.length < 5) sh.push({ tr: '', en: '', ar: '' });
    const q = a.newQuestion();
    q.text = ml(x.text); q.options = sh; q.correct = correct;
    if (!LK.some((k) => q.text[k].trim())) return null;
    const page = +x.page || (x._chunk && x._chunk.first) || 0;
    const part = x._chunk && x._chunk.part;
    q.kaynak = (o.src + (page ? ' ' + t(part ? 'kgPart' : 'kgPage', { p: page }) : '')).slice(0, 160);
    if (o.rev) q.rev = o.rev.slice(0, 60);
    const konu = String(o.konu || x.konu || '').trim(); if (konu) q.konu = konu.slice(0, 120);
    const zor = ['k', 'o', 'z'].includes(o.zor) ? o.zor : ['k', 'o', 'z'].includes(x.zor) ? x.zor : ''; if (zor) q.zor = zor;
    q.durum = 't';
    const ev = String(x.evidence || '').slice(0, 220);
    const ok = ev && x._chunk && evidenceOk(ev, x._chunk.text);
    q.inceleme = { n: 'uretim', t: Date.now(), not: ((ok ? '' : t('kgUnver') + ' · ') + (ev ? '"' + ev + '"' : '')).slice(0, 300) };
    q._ok = !!ok; q._engine = x._engine;
    return q;
  }
  function kgModal() {
    const a = A();
    const body = document.createElement('div');
    let docx = null, file = '', results = [];
    const st = { src: '', rev: '', from: 1, to: 1, count: 10, konu: '', zor: '', tri: true, lang: 'en' };
    const detectLang = (txt) => { const ar = (txt.match(/[؀-ۿ]/g) || []).length, tr = (txt.match(/[çğışöüÇĞİŞÖÜ]/g) || []).length, lat = (txt.match(/[A-Za-z]/g) || []).length; return ar > lat ? 'ar' : tr > lat * 0.01 ? 'tr' : 'en'; };
    const render = async () => {
      const eng = await engineInfo();
      const nP = docx ? docx.pages.length : 0;
      body.innerHTML = `<p class="help">${esc(t('kgHelp'))}</p>
        <div class="row"><button class="btn primary" id="kgPick">${esc(t('kgPick'))}</button><span class="muted" id="kgInfo">${docx ? esc(t('kgLoaded', { f: file, n: nP, c: docx.pages.reduce((s, p) => s + p.text.length, 0), o: docx.ocr ? t('kgOcrN', { n: docx.ocr }) : '' })) : ''}</span></div>
        ${docx ? `<div class="row"><label>${esc(t('kgSrc'))} <input class="in" id="kgSrc" dir="auto" style="width:240px" value="${esc(st.src)}"></label><label>${esc(t('kgRev'))} <input class="in" id="kgRev" dir="auto" style="width:100px" value="${esc(st.rev)}"></label>
          <label>${esc(t('kgPages'))} <input class="in" type="number" id="kgFrom" min="1" max="${nP}" style="width:70px" value="${st.from}"> – <input class="in" type="number" id="kgTo" min="1" max="${nP}" style="width:70px" value="${st.to}"></label></div>
          <div class="row"><label>${esc(t('kgCount'))} <input class="in" type="number" id="kgN" min="1" max="100" style="width:70px" value="${st.count}"></label>
          <label>${esc(t('kgKonu'))} <input class="in" id="kgKonu" list="ekKonuList" dir="auto" style="width:220px" value="${esc(st.konu)}"></label>
          <label>${esc(t('kgZor'))} <select class="in" id="kgZor" style="width:auto"><option value="">${esc(t('plZorAny'))}</option>${['k', 'o', 'z'].map((z) => `<option value="${z}"${st.zor === z ? ' selected' : ''}>${esc(t('ekZor_' + z))}</option>`).join('')}</select></label>
          <label class="chk"><input type="checkbox" id="kgTri"${st.tri ? ' checked' : ''}> ${esc(t('kgLangs'))}</label></div>
          <div class="bkinfo">${esc(eng.label)}</div>
          <div class="row"><button class="btn primary" id="kgGo">${esc(t('kgGo'))}</button><span id="kgProg" class="muted"></span></div>` : ''}
        <div id="kgRes"></div>`;
      $('#kgPick', body).onclick = pick;
      if (!docx) return;
      const bind = (id, k, f) => { $(id, body).onchange = (e) => { st[k] = f ? f(e.target) : e.target.value; }; };
      bind('#kgSrc', 'src'); bind('#kgRev', 'rev'); bind('#kgKonu', 'konu'); bind('#kgZor', 'zor');
      bind('#kgFrom', 'from', (el) => Math.max(1, Math.min(nP, +el.value || 1))); bind('#kgTo', 'to', (el) => Math.max(1, Math.min(nP, +el.value || nP)));
      bind('#kgN', 'count', (el) => Math.max(1, Math.min(100, +el.value || 10))); bind('#kgTri', 'tri', (el) => el.checked);
      $('#kgGo', body).onclick = () => generate(eng);
      drawRes();
    };
    const pick = async () => {
      const p = await window.api.openDialog({ filters: [{ name: 'PDF / Görsel / DOCX / TXT', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'bmp', 'webp', 'tif', 'tiff', 'docx', 'txt'] }] });
      if (!p) return;
      file = String(p).split(/[\\/]/).pop();
      const info = $('#kgInfo', body);
      try {
        docx = await readDoc(p, (n, N, ocr) => { if (info) info.textContent = t('kgRead', { p: n, n: N, o: ocr ? t('kgOcr') : '' }); });
      } catch (e) { a.toast(t('error') + ': ' + e.message, 'err', [], 8000); return; }
      if (!docx.pages.some((x) => x.text.trim())) { docx = null; a.toast(t('kgEmpty'), 'warn'); return render(); }
      st.src = file.replace(/\.[^.]+$/, '').slice(0, 120); st.from = 1; st.to = docx.pages.length;
      st.lang = detectLang(docx.pages.map((x) => x.text).join(' ').slice(0, 20000));
      results = [];
      render();
    };
    const generate = async (eng) => {
      const go = $('#kgGo', body), prog = $('#kgProg', body);
      go.disabled = true;
      const pages = docx.pages.filter((x) => x.n >= Math.min(st.from, st.to) && x.n <= Math.max(st.from, st.to) && x.text.trim());
      const o = { ...st };
      let list = [], err = '';
      try {
        if (eng.kind !== 'rule') {
          // ~9000 karakterlik bölümler; soru sayısı bölüm uzunluğuna göre paylaştırılır
          const chunks = []; let cur = null;
          pages.forEach((pg) => { const block = `[[PAGE ${pg.n}]]\n${pg.text}\n`; if (!cur || cur.text.length + block.length > 9000) { cur = { text: '', first: pg.n, part: !!pg.part }; chunks.push(cur); } cur.text += block.slice(0, 12000); });
          const total = chunks.reduce((s, c) => s + c.text.length, 0) || 1;
          let left = o.count; chunks.forEach((c, i) => { c.want = i === chunks.length - 1 ? left : Math.min(left, Math.round((o.count * c.text.length) / total)); left -= c.want; });
          const r = await aiGenerate(chunks, o, (d, n) => { prog.textContent = t('kgGen', { d, n }); });
          list = r.list; err = r.err;
        }
        if (!list.length) { const rl = ruleGenerate(pages, o); if (rl.length) list = rl; else if (!err) err = t('kgNoTerm'); }
      } catch (e) { err = String(e && e.message || e); }
      results = list.map((x) => toQuestion(x, o)).filter(Boolean);
      results.forEach((q) => { q._sel = true; });
      prog.textContent = results.length ? t('kgRes', { n: results.length }) : t('kgNoRes', { e: err || '—' });
      go.disabled = false;
      drawRes();
    };
    const drawRes = () => {
      const box = $('#kgRes', body); if (!box) return;
      if (!results.length) { box.innerHTML = ''; return; }
      const L = a.letters(); const cl = a.CL();
      box.innerHTML = `<div class="row"><button class="btn primary" id="kgAdd">${esc(t('kgAdd'))}</button></div>` + results.map((q, i) => `<div class="auitem"><label class="chk"><input type="checkbox" data-i="${i}"${q._sel ? ' checked' : ''}> <b>${i + 1}.</b> <span dir="auto">${esc(pickL(q.text, cl))}</span></label>
        <ul>${q.options.slice(0, NOPT()).map((op, k) => `<li class="${k === q.correct ? 'ok' : ''}" dir="auto">${L[k]}) ${esc(pickL(op, cl))}${k === q.correct ? ' ✓' : ''}</li>`).join('')}</ul>
        <small dir="auto">📘 ${esc(q.kaynak || '')}${q.konu ? ' · 🗂 ' + esc(q.konu) : ''} · ${esc(q.inceleme.not || '')}</small></div>`).join('');
      box.querySelectorAll('[data-i]').forEach((c) => { c.onchange = () => { results[+c.dataset.i]._sel = c.checked; }; });
      $('#kgAdd', body).onclick = () => {
        const sel = results.filter((q) => q._sel);
        if (!sel.length) return;
        a.snap();
        sel.forEach((q) => { delete q._sel; delete q._ok; delete q._engine; a.exam.questions.push(q); });
        results = results.filter((q) => !sel.includes(q));
        a.setTab('test'); a.renderList(); a.changed(); EK.refreshKonuList();
        a.toast(t('kgAdded', { n: sel.length }), 'ok', [{ label: t('undo'), onClick: () => a.undo() }], 7000);
        a.scrollToQ(sel[0].id);
        drawRes();
      };
    };
    a.modal({ title: t('kgTitle'), body, wide: true, buttons: [{ label: t('close'), onClick: (c) => c() }] });
    render();
  }

  // açık sınavdaki kullanım kayıtları (başka cihazlardan eşitlenmiş olabilir) dakikada bir cihaz listesine katılır
  setInterval(() => { try { if (A() && A().exam) EK.absorbUse(); } catch { /* yok */ } }, 60000);

  Object.assign(EK, { localChat, smartChat, ollamaModel, engineInfo, esModal, p66Modal, kgModal, outputCheck, p66Rows, p66Cat, modOf, analyze66: analyze, countOf66: countOf, P66_CATS: CATS, tokensToText, ruleGenerate, toQuestionKg: toQuestion, evidenceOk, readDocKg: readDoc });
  EK.addSide('btnYnEs', () => t('esBtn'), esModal);
  EK.addSide('btnYnP66', () => t('p6Btn'), p66Modal);
  EK.addSide('btnYnKg', () => t('kgBtn'), kgModal);
})();
