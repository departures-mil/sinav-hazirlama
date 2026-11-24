'use strict';
/* Sınav Hazırlama 1.10.1 — sınıf araçları: optik form (bas + okut), çevrimiçi sınav (aynı Wi-Fi), analiz raporu.
   Sonuçlar bilgisayarda kalır: %APPDATA%\Sinav Hazirlama Sistemi\sonuclar (optik okumalar) ve \canli-sinav (çevrimiçi oturumlar).
   Hiçbir sonuç silinmez: "Kaldır" yalnız rapordan gizler. */
(function () {
  const A = () => window.__app;
  const t = (...a) => window.t(...a);
  const $ = (s, r = document) => r.querySelector(s);
  const EK = window.EK;
  const esc = EK.esc;
  const LK = ['tr', 'en', 'ar'];
  const api = () => window.api;

  Object.assign(window.I18N, {
    // optik form
    omrBtn: ['📋 Optik form', '📋 Answer sheets (OMR)', '📋 ورقة الإجابة الضوئية'],
    ekOmrForm: ['Optik form', 'Answer sheet', 'ورقة الإجابة'],
    omrTitle: ['Optik form — bas ve okut', 'Answer sheets — print and scan', 'ورقة الإجابة — اطبع واقرأ'],
    omrHelp: ['1) Formu basın ve öğrencilere dağıtın. 2) Doldurulan formların fotoğrafını çekin (telefonla da olur) ya da tarayıcıdan geçirin. 3) "Okut" deyin: cevaplar otomatik okunur ve puanlanır. Okumadan önce doğru cevapların işaretli olması gerekir.', '1) Print the sheet and hand it out. 2) Photograph the filled sheets (a phone is fine) or scan them. 3) Press "Scan": answers are read and scored automatically. The correct answers must be marked first.', '1) اطبع الورقة ووزّعها. 2) صوّر الأوراق المعبّأة (يكفي الهاتف) أو امسحها ضوئياً. 3) اضغط «اقرأ»: تُقرأ الإجابات وتُصحَّح تلقائياً. يجب تحديد الإجابات الصحيحة أولاً.'],
    omrQs: ['{n} soru forma girecek', '{n} questions on the sheet', 'سيُدرج {n} سؤالاً في الورقة'],
    omrMax: ['Bir formda en çok 100 soru olur; ilk 100 soru alındı.', 'A sheet holds at most 100 questions; the first 100 were used.', 'تتسع الورقة لـ 100 سؤال كحد أقصى؛ أُخذ أول 100 سؤال.'],
    omrLang: ['Form dili', 'Sheet language', 'لغة الورقة'],
    omrPdf: ['📄 Formu PDF kaydet', '📄 Save sheet as PDF', '📄 حفظ الورقة PDF'],
    omrPrev: ['👁 Önizle / yazdır', '👁 Preview / print', '👁 معاينة / طباعة'],
    omrRead: ['📷 Okut (fotoğraf / tarama / PDF)', '📷 Scan (photo / scan / PDF)', '📷 قراءة (صورة / مسح / PDF)'],
    omrPhone: ['📱 Telefonla okut', '📱 Scan with phone', '📱 قراءة بالهاتف'],
    omrPhoneHelp: ['Telefon ve bilgisayar aynı Wi-Fi ağında olsun. Telefonda adresi açın (ya da QR kodunu okutun), sınav kodunu yazın ve formların fotoğrafını çekin; her fotoğraf hemen puanlanır.', 'Phone and computer must be on the same Wi-Fi. Open the address on the phone (or scan the QR), type the exam code and photograph the sheets; each photo is scored at once.', 'يجب أن يكون الهاتف والحاسوب على شبكة Wi-Fi نفسها. افتح العنوان في الهاتف (أو امسح رمز QR)، واكتب رمز الاختبار وصوّر الأوراق؛ تُصحَّح كل صورة فوراً.'],
    omrNoKey: ['{n} sorunun doğru cevabı işaretli değil; bu sorular puanlanmaz.', '{n} questions have no marked answer; they are not scored.', '{n} سؤالاً بلا إجابة صحيحة محددة؛ لن تُصحَّح.'],
    omrForm: ['Form', 'Sheet', 'الورقة'],
    omrNoForm: ['Bu sınav için henüz form basılmadı. Önce formu kaydedin / yazdırın.', 'No sheet printed for this exam yet. Save / print the sheet first.', 'لم تُطبع ورقة لهذا الاختبار بعد. احفظ / اطبع الورقة أولاً.'],
    omrReading: ['Okunuyor… {d}/{n}', 'Reading… {d}/{n}', 'جارٍ القراءة… {d}/{n}'],
    omrErr_CORNERS: ['dört köşe karesi bulunamadı', 'the four corner squares were not found', 'لم يُعثر على مربعات الزوايا الأربعة'],
    omrErr_IMG: ['görüntü açılamadı', 'image could not be opened', 'تعذّر فتح الصورة'],
    omrFail: ['{f}: okunamadı ({e}). Formu düz koyup dört köşe görünecek biçimde yeniden çekin.', '{f}: not read ({e}). Lay the sheet flat and shoot again with all four corners visible.', '{f}: تعذّرت القراءة ({e}). ضع الورقة مستوية وأعد التصوير مع ظهور الزوايا الأربع.'],
    omrDone: ['{n} form okundu.', '{n} sheets read.', 'قُرئت {n} ورقة.'],
    omrList: ['Okunan formlar ({n})', 'Scanned sheets ({n})', 'الأوراق المقروءة ({n})'],
    omrNo: ['No', 'No.', 'الرقم'], omrName: ['Ad soyad', 'Name', 'الاسم'], omrScore: ['Doğru', 'Correct', 'صحيحة'],
    omrBlank: ['Boş', 'Blank', 'فارغة'], omrMulti: ['Çift işaret', 'Double mark', 'تظليل مزدوج'], omrWrong: ['Yanlış', 'Wrong', 'خاطئة'],
    omrFix: ['Kontrol et / düzelt', 'Check / correct', 'تحقق / صحّح'],
    omrHide: ['Rapordan çıkar', 'Remove from report', 'إزالة من التقرير'],
    omrShow: ['Geri al', 'Restore', 'استعادة'],
    omrPhoto: ['Fotoğraf', 'Photo', 'الصورة'],
    omrSheetTitle: ['OPTİK CEVAP FORMU', 'ANSWER SHEET', 'ورقة الإجابة'],
    omrSheetName: ['Adı Soyadı', 'Name', 'الاسم'], omrSheetClass: ['Sınıfı', 'Class', 'الصف'], omrSheetSign: ['İmza', 'Signature', 'التوقيع'],
    omrSheetNo: ['ÖĞRENCİ NO', 'STUDENT NO', 'رقم الطالب'],
    omrSheetRule: ['Yalnızca yumuşak kurşun kalem kullanın. Yuvarlağı tamamen doldurun: ●   Değiştirirken iyice silin. Formu katlamayın.', 'Use a soft pencil only. Fill the circle completely: ●   Erase cleanly to change. Do not fold.', 'استخدم قلم رصاص ليّناً فقط. املأ الدائرة كاملة: ●   امسح جيداً عند التغيير. لا تطوِ الورقة.'],
    omrSheetNoHelp: ['Numaranızı kutulara yazın ve altındaki yuvarlakları doldurun.', 'Write your number in the boxes and fill the circles below.', 'اكتب رقمك في المربعات واملأ الدوائر تحتها.'],
    // çevrimiçi sınav
    liveBtn: ['📡 Çevrimiçi sınav (Wi-Fi)', '📡 Online exam (Wi-Fi)', '📡 اختبار عبر الشبكة (Wi-Fi)'],
    liveTitle: ['Çevrimiçi sınav — öğrenciler telefondan', 'Online exam — students on their phones', 'اختبار عبر الشبكة — الطلاب من هواتفهم'],
    liveHelp: ['Öğrenciler aynı Wi-Fi ağındaki telefonlarından tarayıcıyla girer (uygulama kurmaları gerekmez). Adı, numarası ve sınav kodunu yazan öğrenci sınava başlar; süresi kendi girişinden başlar, bitince cevaplar otomatik teslim edilir. Cevaplar anında bu bilgisayara gelir; doğru cevaplar telefona hiç gönderilmez. İlk açılışta Windows güvenlik duvarı izin isterse "Erişime izin ver" deyin.', 'Students join from phones on the same Wi-Fi using the browser (nothing to install). A student enters name, number and the exam code; their time starts at entry and answers are submitted automatically when it ends. Answers reach this computer at once; correct answers are never sent to phones. If Windows Firewall asks the first time, choose "Allow access".', 'يدخل الطلاب من هواتفهم على شبكة Wi-Fi نفسها عبر المتصفح (لا حاجة لتثبيت شيء). يكتب الطالب اسمه ورقمه ورمز الاختبار فيبدأ؛ يبدأ وقته من لحظة دخوله وتُسلَّم الإجابات تلقائياً عند انتهائه. تصل الإجابات فوراً إلى هذا الحاسوب ولا تُرسل الإجابات الصحيحة إلى الهواتف أبداً. إن طلب جدار حماية Windows الإذن أول مرة فاختر «السماح بالوصول».'],
    liveDur: ['Süre (dakika, 0 = sınırsız)', 'Time (minutes, 0 = unlimited)', 'المدة (دقائق، 0 = بلا حد)'],
    liveShQ: ['Soru sırası her öğrenciye farklı', 'Different question order per student', 'ترتيب أسئلة مختلف لكل طالب'],
    liveShO: ['Şık sırası her öğrenciye farklı', 'Different option order per student', 'ترتيب خيارات مختلف لكل طالب'],
    liveStart: ['▶ Sınavı başlat', '▶ Start the exam', '▶ ابدأ الاختبار'],
    liveAddr: ['Öğrenciler bu adresi açsın', 'Students open this address', 'يفتح الطلاب هذا العنوان'],
    liveCode: ['Sınav kodu', 'Exam code', 'رمز الاختبار'],
    liveNoNet: ['Bu bilgisayar bir ağa bağlı görünmüyor. Wi-Fi\'a ya da modeme bağlanın.', 'This computer does not seem to be on a network. Connect to Wi-Fi or the router.', 'لا يبدو أن هذا الحاسوب متصل بشبكة. اتصل بشبكة Wi-Fi أو بالموجّه.'],
    liveStudents: ['Öğrenciler ({n})', 'Students ({n})', 'الطلاب ({n})'],
    liveNoStud: ['Henüz giren öğrenci yok.', 'No students have joined yet.', 'لم ينضم أي طالب بعد.'],
    liveState_on: ['sınavda', 'in progress', 'يجيب'], liveState_done: ['teslim etti', 'submitted', 'سلّم'],
    liveOpen: ['Giriş açık', 'Entry open', 'الدخول مفتوح'], liveClosed: ['Giriş kapalı', 'Entry closed', 'الدخول مغلق'],
    liveToggle: ['Girişi aç / kapat', 'Open / close entry', 'فتح / إغلاق الدخول'],
    liveFinish: ['⏹ Herkesi bitir', '⏹ Finish for everyone', '⏹ إنهاء للجميع'],
    liveStop: ['Sunucuyu kapat', 'Stop server', 'إيقاف الخادم'],
    liveRe: ['Yeniden girişe izin ver', 'Allow re-entry', 'السماح بالدخول مجدداً'],
    liveReopen: ['Yeniden aç (süre baştan)', 'Reopen (time restarts)', 'إعادة فتح (يبدأ الوقت من جديد)'],
    liveFinishQ: ['Sınavdaki herkesin cevapları şimdi teslim edilsin mi?', 'Submit everyone\'s answers now?', 'هل تُسلَّم إجابات الجميع الآن؟'],
    liveAns: ['{a}/{n} cevap', '{a}/{n} answered', '{a}/{n} إجابة'],
    liveLeft: ['{m} dk kaldı', '{m} min left', 'بقيت {m} دقيقة'],
    liveRunning: ['Çalışan sınav: {t}', 'Running exam: {t}', 'اختبار جارٍ: {t}'],
    liveErr: ['Sunucu başlatılamadı: {e}', 'Could not start the server: {e}', 'تعذّر تشغيل الخادم: {e}'],
    liveFirewall: ['Telefonlar bağlanamıyorsa: Windows güvenlik duvarında "Sinav Hazirlama Sistemi" için Özel ağlara izin verin ve iki cihazın aynı ağda olduğunu kontrol edin.', 'If phones cannot connect: allow "Sinav Hazirlama Sistemi" on Private networks in Windows Firewall and make sure both devices are on the same network.', 'إن لم تتصل الهواتف: اسمح لـ «Sinav Hazirlama Sistemi» على الشبكات الخاصة في جدار حماية Windows وتأكد أن الجهازين على الشبكة نفسها.'],
    liveLangs: ['Telefonda gösterilecek dil', 'Language on phones', 'اللغة على الهواتف'],
    // analiz
    anBtn: ['📊 Analiz raporu', '📊 Analysis report', '📊 تقرير التحليل'],
    anTitle: ['Analiz raporu', 'Analysis report', 'تقرير التحليل'],
    anHelp: ['Çevrimiçi sınav oturumları ve okunan optik formlar birlikte değerlendirilir. Hangi soruyu herkes yanlış yaptı, hangi konuda sınıf zayıf, her sorunun zorluğu ve ayırt ediciliği burada.', 'Online exam sessions and scanned answer sheets are analysed together: which question everyone missed, which topic is weak, and each question\'s difficulty and discrimination.', 'تُحلَّل جلسات الاختبار عبر الشبكة والأوراق المقروءة معاً: أي سؤال أخطأ فيه الجميع، وأي موضوع ضعيف، وصعوبة كل سؤال وقدرته على التمييز.'],
    anSources: ['Kaynaklar', 'Sources', 'المصادر'],
    anSrcLive: ['Çevrimiçi: {t} ({n} öğrenci)', 'Online: {t} ({n} students)', 'عبر الشبكة: {t} ({n} طالب)'],
    anSrcOmr: ['Optik form okumaları ({n})', 'Scanned sheets ({n})', 'الأوراق المقروءة ({n})'],
    anNone: ['Bu sınav için henüz sonuç yok. Çevrimiçi sınav yapın ya da optik form okutun.', 'No results for this exam yet. Run an online exam or scan answer sheets.', 'لا توجد نتائج لهذا الاختبار بعد. أجرِ اختباراً عبر الشبكة أو اقرأ أوراق إجابة.'],
    anSum: ['{s} öğrenci · ortalama %{a} · en yüksek %{h} · en düşük %{l}', '{s} students · average {a}% · highest {h}% · lowest {l}%', '{s} طالباً · المتوسط {a}% · الأعلى {h}% · الأدنى {l}%'],
    anStud: ['Öğrenciler', 'Students', 'الطلاب'], anQs: ['Sorular', 'Questions', 'الأسئلة'], anKonu: ['Konular', 'Topics', 'المواضيع'], anTag: ['Seviyeler', 'Levels', 'المستويات'],
    anRank: ['Sıra', 'Rank', 'الترتيب'], anPct: ['Başarı', 'Score', 'النسبة'], anSrc: ['Kaynak', 'Source', 'المصدر'],
    anP: ['Doğru %', 'Correct %', 'صحيح %'], anDisc: ['Ayırt edicilik', 'Discrimination', 'التمييز'], anDist: ['Şık dağılımı', 'Option spread', 'توزيع الخيارات'],
    anSugg: ['Önerilen zorluk', 'Suggested difficulty', 'الصعوبة المقترحة'],
    anWeak: ['⚠ Herkesin zorlandığı sorular (%30 altı)', '⚠ Questions most students missed (below 30%)', '⚠ أسئلة أخطأ فيها معظم الطلاب (أقل من 30%)'],
    anLure: ['En çok seçilen yanlış: {l} (%{p})', 'Most chosen wrong option: {l} ({p}%)', 'أكثر خيار خاطئ اختياراً: {l} ({p}%)'],
    anDiscLow: ['Ayırt ediciliği düşük (iyi öğrenciler de yanlış yapmış): gözden geçirin', 'Low discrimination (strong students missed it too): review', 'تمييز منخفض (أخطأ فيه المتفوقون أيضاً): راجعه'],
    anApply: ['⚙ Zorlukları sorulara işle', '⚙ Write difficulties to the questions', '⚙ اكتب الصعوبة في الأسئلة'],
    anApplyTip: ['En az {n} öğrencinin cevapladığı sorular: %80 ve üstü doğru → Kolay, %40–80 → Orta, %40 altı → Zor. Elle verdiğiniz zorluklar değişmez (yalnız boş ya da ⚙ otomatik olanlar).', 'Questions answered by at least {n} students: ≥80% → Easy, 40–80% → Medium, <40% → Hard. Difficulties you set by hand are kept (only empty or ⚙ automatic ones change).', 'الأسئلة التي أجاب عنها {n} طلاب على الأقل: 80% فأكثر ← سهل، 40–80% ← متوسط، أقل من 40% ← صعب. لا تتغير الصعوبات التي حددتها يدوياً (فقط الفارغة أو التلقائية ⚙).'],
    anApplied: ['{n} sorunun zorluğu güncellendi.', 'Difficulty updated on {n} questions.', 'حُدّثت صعوبة {n} سؤالاً.'],
    anPdf: ['📄 Raporu PDF kaydet', '📄 Save report as PDF', '📄 حفظ التقرير PDF'],
    anCsv: ['📊 Excel için CSV', '📊 CSV for Excel', '📊 CSV لبرنامج Excel'],
    anGo: ['Git', 'Go', 'انتقل'],
    anQGone: ['(soru sınavdan kaldırılmış)', '(question no longer in the exam)', '(السؤال لم يعد في الاختبار)'],
    anOmr: ['Optik', 'OMR', 'ضوئي'], anLive: ['Çevrimiçi', 'Online', 'عبر الشبكة'],
    anSaved: ['Kaydedildi: {p}', 'Saved: {p}', 'حُفظ: {p}'],
  });

  /* ---------------- ortak: sonuç dosyası (optik) ---------------- */
  async function sonucRead(examId) { const d = await api().sonuc.read(examId); return d && d.examId ? d : { examId, formlar: {}, okumalar: [] }; }
  const sonucWrite = (d) => api().sonuc.write(d.examId, d);
  const keyOf = (ex, qids) => qids.map((id) => { const q = ex.questions.find((x) => x.id === id); return q && q.correct >= 0 && q.correct < ex.settings.optionCount ? q.correct : -1; });
  const pickL = (ml, cl) => (ml && (ml[cl] || ml.tr || ml.en || ml.ar)) || '';
  const pctS = (x) => Math.round(x * 100);
  const fmtD = (ms) => { try { return new Date(ms).toLocaleString(window.UI_LANG === 'ar' ? 'ar' : window.UI_LANG === 'en' ? 'en-GB' : 'tr-TR', { dateStyle: 'short', timeStyle: 'short' }); } catch { return ''; } };

  /* =============================== optik form: bas =============================== */
  function formHtml(o) {
    const O = window.OMR, L = O.L, lang = o.lang;
    const T = (k) => t(k, null, lang);
    const rtl = lang === 'ar';
    const Ls = window.LETTERS[lang];
    const mm = (v) => v + 'mm';
    const el = [];
    const bub = (x, y, txt) => el.push(`<div class="b" style="left:${mm(x - L.r)};top:${mm(y - L.r)}">${txt == null ? '' : esc(txt)}</div>`);
    L.fid.pos.forEach(([x, y]) => el.push(`<div class="f" style="left:${mm(x)};top:${mm(y)}"></div>`));
    el.push(`<div class="hd" style="top:${mm(12)}">${o.school ? `<div class="sc">${esc(o.school)}</div>` : ''}<div class="ti">${esc(o.title || '')}</div><div class="st">${esc(T('omrSheetTitle'))}</div></div>`);
    el.push(`<div class="code" style="top:${mm(40)}">${esc(T('omrForm'))}: ${esc(o.formId)} · ${o.n} ${esc(T('lbl_question'))}</div>`);
    // numara ızgarası
    el.push(`<div class="lbl" style="left:${mm(L.no.x - 4)};top:${mm(L.no.y - 17)};width:${mm(L.no.dx * L.no.cols)}">${esc(T('omrSheetNo'))}</div>`);
    for (let c = 0; c < L.no.cols; c++) {
      el.push(`<div class="nb" style="left:${mm(L.no.x - 3 + c * L.no.dx)};top:${mm(L.no.y - 11)}"></div>`);
      for (let d = 0; d < 10; d++) { const [x, y] = O.noXY(c, d); bub(x, y, d); }
    }
    el.push(`<div class="box" style="left:${mm(L.no.x - 5)};top:${mm(L.no.y - 18)};width:${mm(L.no.dx * L.no.cols + 3)};height:${mm(L.no.dy * 10 + 15)}"></div>`);
    // ad, sınıf, imza ve kurallar
    const fx = 92, fw = 98;
    el.push(`<div class="fields" style="left:${mm(fx)};top:${mm(L.no.y - 18)};width:${mm(fw)}" dir="${rtl ? 'rtl' : 'ltr'}">
      <div class="fl"><span>${esc(T('omrSheetName'))}:</span><i></i></div><div class="fl"><span>${esc(T('omrSheetClass'))}:</span><i></i></div><div class="fl"><span>${esc(T('omrSheetSign'))}:</span><i></i></div>
      <div class="rule">${esc(T('omrSheetRule'))}</div><div class="rule">${esc(T('omrSheetNoHelp'))}</div></div>`);
    // cevaplar
    const blocks = Math.ceil(o.n / L.ans.rows);
    for (let b = 0; b < blocks; b++) {
      const [x0, y0] = O.ansXY(b * L.ans.rows, 0);
      for (let k = 0; k < L.ans.opts; k++) el.push(`<div class="lh" style="left:${mm(x0 + k * L.ans.dx - 2)};top:${mm(y0 - 7.5)}">${esc(Ls[k])}</div>`);
      el.push(`<div class="box" style="left:${mm(x0 - 10)};top:${mm(y0 - 9)};width:${mm(L.ans.dx * 4 + 13.5)};height:${mm(Math.min(L.ans.rows, o.n - b * L.ans.rows) * L.ans.dy + 6.5)}"></div>`);
    }
    for (let q = 0; q < o.n; q++) {
      const [x, y] = O.ansXY(q, 0);
      el.push(`<div class="qn" style="left:${mm(x - 9.5)};top:${mm(y - 2.2)}">${q + 1}</div>`);
      for (let k = 0; k < L.ans.opts; k++) { const [bx, by] = O.ansXY(q, k); bub(bx, by, Ls[k]); }
    }
    return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
      @page { size: A4; margin: 0 } html, body { margin: 0; padding: 0; }
      body { font-family: Arial, "Noto Sans Arabic", Tahoma, sans-serif; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .pg { position: relative; width: 210mm; height: 296mm; overflow: hidden; page-break-after: always; }
      .pg:last-child { page-break-after: auto; }
      .pg > div { position: absolute; }
      .f { width: ${L.fid.size}mm; height: ${L.fid.size}mm; background: #000; }
      .b { width: ${L.r * 2}mm; height: ${L.r * 2}mm; border: .25mm solid #444; border-radius: 50%; box-sizing: border-box; font-size: 2.3mm; line-height: ${L.r * 2 - 0.5}mm; text-align: center; color: #c9c9c9; }
      .hd { left: 20mm; right: 20mm; text-align: center; } .sc { font-size: 11pt; font-weight: bold; } .ti { font-size: 13pt; font-weight: bold; margin-top: 1mm; } .st { font-size: 10pt; letter-spacing: .15em; margin-top: 1.5mm; color: #333; }
      .code { left: 20mm; right: 20mm; text-align: center; font-size: 8pt; color: #555; }
      .lbl { font-size: 8pt; font-weight: bold; text-align: center; }
      .nb { width: 6mm; height: 7mm; border: .3mm solid #555; box-sizing: border-box; }
      .box { border: .3mm solid #888; border-radius: 2mm; box-sizing: border-box; }
      .fields { font-size: 10pt; } .fl { display: flex; gap: 2mm; margin: 0 0 5mm; } .fl span { white-space: nowrap; font-weight: bold; } .fl i { flex: 1; border-bottom: .3mm dotted #333; }
      .rule { font-size: 8.5pt; color: #333; margin-top: 2.5mm; line-height: 1.35; }
      .lh { width: 4mm; text-align: center; font-size: 8pt; font-weight: bold; }
      .qn { width: 6mm; text-align: right; font-size: 8pt; font-weight: bold; }
    </style></head><body>${Array.from({ length: Math.max(1, o.copies || 1) }, () => `<div class="pg">${el.join('')}</div>`).join('')}</body></html>`;
  }
  function examQsFor(o) {
    const a = A();
    let qs = a.liveQs().filter((q) => (!o.tag || (o.tag === 'none' ? !a.tagOf(q) : a.tagOf(q) === o.tag)) && EK.konuMatch(q, o.konu || ''));
    return qs;
  }
  async function omrFormModal(o = {}) {
    const a = A();
    const all = examQsFor(o);
    const qs = all.slice(0, 100);
    const body = document.createElement('div');
    const noKey = qs.filter((q) => !a.isAnswered(q)).length;
    body.innerHTML = `<p class="help">${esc(t('omrHelp'))}</p>
      <div class="row"><b>${esc(t('omrQs', { n: qs.length }))}</b>${all.length > 100 ? `<span class="status">⚠ ${esc(t('omrMax'))}</span>` : ''}${noKey ? `<span class="status">⚠ ${esc(t('omrNoKey', { n: noKey }))}</span>` : ''}</div>
      <div class="row"><label>${esc(t('omrLang'))} <select class="in" id="omLang" style="width:auto">${LK.map((k) => `<option value="${k}">${window.LANGS[k]}</option>`).join('')}</select></label>
        <label>${esc(t('lbl_count', null))} <input class="in" type="number" id="omCopies" min="1" max="200" value="1" style="width:70px"></label>
        <button class="btn" id="omPrev">${esc(t('omrPrev'))}</button><button class="btn primary" id="omPdf">${esc(t('omrPdf'))}</button></div>
      <hr><div class="row"><button class="btn primary" id="omRead">${esc(t('omrRead'))}</button><button class="btn" id="omPhone">${esc(t('omrPhone'))}</button><button class="btn" id="omAn">${esc(t('anBtn'))}</button></div>`;
    $('#omLang', body).value = a.CL();
    const m = a.modal({ title: t('omrTitle'), body, wide: true, buttons: [{ label: t('close'), onClick: (c) => c() }] });
    const make = async (action) => {
      if (!qs.length) return a.toast(t('nothingToOutput'), 'warn');
      const lang = $('#omLang', body).value;
      const d = await sonucRead(a.exam.id);
      const formId = 'F' + Date.now().toString(36).slice(-5).toUpperCase();
      d.formlar[formId] = { t: Date.now(), qids: qs.map((q) => q.id), lang };
      await sonucWrite(d);
      const html = formHtml({ lang, formId, n: qs.length, title: pickL(a.exam.title, lang), school: pickL(a.exam.school, lang), copies: Math.max(1, Math.min(200, +$('#omCopies', body).value || 1)) });
      const r = await api().makePdf({ html, pageNumbers: false, margins: { top: 0, bottom: 0, left: 0, right: 0 }, action, fileName: (a.examName(a.exam) || 'sinav').replace(/[\\/:*?"<>|]/g, '').slice(0, 50) + '-optik-form', noTemplate: true });
      if (r && r.path) a.toast(t('anSaved', { p: r.path }), 'ok');
    };
    $('#omPrev', body).onclick = () => make('preview');
    $('#omPdf', body).onclick = () => make('save');
    $('#omRead', body).onclick = () => { m.close(); omrReadModal(); };
    $('#omPhone', body).onclick = () => { m.close(); omrReadModal({ phone: true }); };
    $('#omAn', body).onclick = () => { m.close(); analysisModal(); };
  }

  /* =============================== optik form: okut =============================== */
  const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('IMG')); im.src = src; });
  // görüntüyü oku → { r, thumb }
  async function readCanvas(cv, n) {
    const g = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height);
    const img = window.OMR.toGray(g.data, cv.width, cv.height, 1700);
    const r = window.OMR.read(img, n);
    // küçük önizleme (sonuç dosyasında saklanır: düzeltme için)
    const s = Math.min(1, 900 / Math.max(cv.width, cv.height));
    const c2 = document.createElement('canvas'); c2.width = Math.round(cv.width * s); c2.height = Math.round(cv.height * s);
    c2.getContext('2d').drawImage(cv, 0, 0, c2.width, c2.height);
    // işaretleri çiz (kontrol için)
    if (r.ok) {
      const k = c2.width / img.w; const ctx = c2.getContext('2d');
      const O = window.OMR;
      for (let q = 0; q < n; q++) for (let o = 0; o < 5; o++) {
        if (r.answers[q] !== o) continue;
        const [x, y] = O.ansXY(q, o); const [u, v] = r.map(x, y); const [u2, v2] = r.map(x + O.L.r, y);
        ctx.strokeStyle = '#1f9d55'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(u * k, v * k, Math.hypot(u2 - u, v2 - v) * k + 2, 0, 7); ctx.stroke();
      }
      r.corners.forEach(([x, y]) => { ctx.fillStyle = 'rgba(31,95,191,.7)'; ctx.fillRect(x * k - 4, y * k - 4, 8, 8); });
      delete r.map;
    }
    return { r, thumb: c2.toDataURL('image/jpeg', 0.7) };
  }
  async function readFile(f, n) {
    const out = [];
    if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) {
      const pdfjs = await A().getPdfjs();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const vp = page.getViewport({ scale: 2 });
        const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
        const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        out.push({ name: `${f.name} (${p})`, ...(await readCanvas(cv, n)) });
      }
      return out;
    }
    const url = URL.createObjectURL(f);
    try { const im = await loadImg(url); const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; cv.getContext('2d').drawImage(im, 0, 0); out.push({ name: f.name, ...(await readCanvas(cv, n)) }); } finally { URL.revokeObjectURL(url); }
    return out;
  }
  async function readDataUrl(data, n) { const im = await loadImg(data); const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; cv.getContext('2d').drawImage(im, 0, 0); return readCanvas(cv, n); }
  // okumayı sonuç dosyasına ekle; aynı numara + form daha önce okunduysa yenisi eklenir, eskisi gizlenir (silinmez)
  async function addReading(examId, formId, r, thumb, name) {
    const a = A();
    const d = await sonucRead(examId);
    const f = d.formlar[formId];
    const ans = {};
    f.qids.forEach((id, i) => { ans[id] = r.answers[i]; });
    const roster = rosterOf(d);
    const rec = { id: Math.random().toString(36).slice(2, 10), t: Date.now(), formId, no: r.no, ad: roster.get(r.no) || '', answers: ans, thumb, file: name || '' };
    d.okumalar.filter((x) => x.formId === formId && x.no && x.no === r.no && !x.gizli).forEach((x) => { x.gizli = true; x.yerine = rec.id; });
    d.okumalar.push(rec);
    await sonucWrite(d);
    const key = keyOf(a.exam, f.qids);
    const dd = f.qids.reduce((s, id, i) => s + (key[i] >= 0 && ans[id] === key[i] ? 1 : 0), 0);
    return { rec, d: dd, n: f.qids.length };
  }
  function rosterOf(d) {
    const m = new Map();
    (d.okumalar || []).forEach((x) => { if (x.no && x.ad) m.set(x.no, x.ad); });
    (window.__canliRoster || []).forEach((x) => { if (x.no && x.ad && !m.has(x.no)) m.set(x.no, x.ad); });
    return m;
  }
  const latestForm = (d) => Object.entries(d.formlar || {}).sort((x, y) => y[1].t - x[1].t)[0];

  async function omrReadModal(opt = {}) {
    const a = A();
    const ex = a.exam;
    let d = await sonucRead(ex.id);
    const body = document.createElement('div');
    const forms = Object.entries(d.formlar).sort((x, y) => y[1].t - x[1].t);
    if (!forms.length) { a.modal({ title: t('omrTitle'), body: `<p class="help">${esc(t('omrNoForm'))}</p>`, buttons: [{ label: t('ekOmrForm'), cls: 'primary', onClick: (c) => { c(); omrFormModal(); } }, { label: t('close'), onClick: (c) => c() }] }); return; }
    body.innerHTML = `<div class="row"><label>${esc(t('omrForm'))} <select class="in" id="orForm" style="width:auto">${forms.map(([id, f]) => `<option value="${id}">${id} · ${f.qids.length} ${esc(t('lbl_question'))} · ${esc(fmtD(f.t))}</option>`).join('')}</select></label>
      <button class="btn primary" id="orFile">${esc(t('omrRead'))}</button><button class="btn" id="orPhone">${esc(t('omrPhone'))}</button><button class="btn" id="orAn">${esc(t('anBtn'))}</button>
      <input type="file" id="orIn" multiple accept="image/*,application/pdf" style="display:none"></div>
      <div id="orPhoneBox"></div><div class="bkinfo" id="orInfo"></div><div id="orList"></div>`;
    const m = a.modal({ title: t('omrTitle'), body, wide: true, buttons: [{ label: t('close'), onClick: (c) => c() }], onClose: () => { window.__omrRefresh = null; } });
    const formSel = $('#orForm', body);
    const L = a.letters();
    const render = async () => {
      d = await sonucRead(ex.id);
      const fid = formSel.value; const f = d.formlar[fid];
      const key = keyOf(a.exam, f.qids);
      const list = d.okumalar.filter((x) => x.formId === fid).sort((x, y) => y.t - x.t);
      const score = (x) => { let c = 0, w = 0, b = 0, mu = 0; f.qids.forEach((id, i) => { const v = x.answers[id]; if (v === -1 || v == null) b++; else if (v === -2) mu++; else if (key[i] >= 0 && v === key[i]) c++; else w++; }); return { c, w, b, mu }; };
      $('#orList', body).innerHTML = `<h4>${esc(t('omrList', { n: list.filter((x) => !x.gizli).length }))}</h4><table class="ortable"><thead><tr><th>${esc(t('omrNo'))}</th><th>${esc(t('omrName'))}</th><th>${esc(t('omrScore'))}</th><th>${esc(t('omrWrong'))}</th><th>${esc(t('omrBlank'))}</th><th>${esc(t('omrMulti'))}</th><th></th></tr></thead><tbody>${
        list.map((x) => { const s = score(x); return `<tr class="${x.gizli ? 'gizli' : ''}"><td><input class="in" data-no="${x.id}" value="${esc(x.no)}" style="width:110px"></td><td><input class="in" data-ad="${x.id}" value="${esc(x.ad)}" dir="auto"></td><td><b>${s.c}</b>/${f.qids.length}</td><td>${s.w}</td><td>${s.b}</td><td class="${s.mu ? 'bad' : ''}">${s.mu}</td><td><button class="btn mini" data-fix="${x.id}">${esc(t('omrFix'))}</button> <button class="btn mini" data-hide="${x.id}">${esc(t(x.gizli ? 'omrShow' : 'omrHide'))}</button></td></tr>`; }).join('')}</tbody></table>`;
      const upd = async (id, fn) => { const dd = await sonucRead(ex.id); const x = dd.okumalar.find((y) => y.id === id); if (x) { fn(x); await sonucWrite(dd); } };
      $('#orList', body).querySelectorAll('[data-no]').forEach((el) => { el.onchange = () => upd(el.dataset.no, (x) => { x.no = el.value.trim(); }); });
      $('#orList', body).querySelectorAll('[data-ad]').forEach((el) => { el.onchange = () => upd(el.dataset.ad, (x) => { x.ad = el.value.trim(); }); });
      $('#orList', body).querySelectorAll('[data-hide]').forEach((b) => { b.onclick = async () => { await upd(b.dataset.hide, (x) => { x.gizli = !x.gizli; }); render(); }; });
      $('#orList', body).querySelectorAll('[data-fix]').forEach((b) => {
        b.onclick = () => {
          const x = list.find((y) => y.id === b.dataset.fix); if (!x) return;
          const bd = document.createElement('div');
          bd.innerHTML = `<div class="omrfix">${x.thumb ? `<img src="${x.thumb}" alt="">` : ''}<div class="omrgrid">${f.qids.map((id, i) => `<label class="${x.answers[id] === -2 ? 'bad' : key[i] >= 0 && x.answers[id] === key[i] ? 'ok' : ''}"><b>${i + 1}</b><select class="in" data-q="${id}"><option value="-1">–</option>${L.slice(0, 5).map((l, k) => `<option value="${k}"${x.answers[id] === k ? ' selected' : ''}>${l}</option>`).join('')}<option value="-2"${x.answers[id] === -2 ? ' selected' : ''}>✱</option></select></label>`).join('')}</div></div>`;
          a.modal({ title: `${t('omrFix')} — ${x.no || '?'} ${x.ad || ''}`, body: bd, wide: true, buttons: [{ label: t('cancel'), onClick: (c) => c() }, { label: t('save'), cls: 'primary', onClick: async (c) => { const ans = {}; bd.querySelectorAll('[data-q]').forEach((s) => { ans[s.dataset.q] = +s.value; }); await upd(x.id, (y) => { y.answers = ans; y.elle = true; }); c(); render(); } }] });
        };
      });
    };
    window.__omrRefresh = () => render();
    formSel.onchange = render;
    $('#orFile', body).onclick = () => $('#orIn', body).click();
    $('#orAn', body).onclick = () => { m.close(); analysisModal(); };
    $('#orIn', body).onchange = async (e) => {
      const files = [...e.target.files]; e.target.value = '';
      const fid = formSel.value; const f = d.formlar[fid];
      const info = $('#orInfo', body);
      let ok = 0; const fails = [];
      for (let i = 0; i < files.length; i++) {
        info.textContent = t('omrReading', { d: i + 1, n: files.length });
        try {
          for (const res of await readFile(files[i], f.qids.length)) {
            if (!res.r.ok) { fails.push(t('omrFail', { f: res.name, e: t('omrErr_' + res.r.err) })); continue; }
            await addReading(ex.id, fid, res.r, res.thumb, res.name); ok++;
          }
        } catch (er) { fails.push(t('omrFail', { f: files[i].name, e: t('omrErr_IMG') })); }
      }
      info.innerHTML = esc(t('omrDone', { n: ok })) + fails.map((x) => `<div class="bad">${esc(x)}</div>`).join('');
      render();
    };
    $('#orPhone', body).onclick = () => phoneBox($('#orPhoneBox', body));
    render();
    if (opt.phone) phoneBox($('#orPhoneBox', body));
  }
  // telefonla okutma: sunucu çalışmıyorsa girişe kapalı bir oturum açılır (yalnız okutma için)
  async function phoneBox(box) {
    const a = A();
    let st = await api().canli.status();
    let s = st.ok && st.data.session;
    if (!s || !st.data.running) {
      const r = await api().canli.start(livePayload({ dur: 0, scanOnly: true }));
      if (!r.ok) { box.innerHTML = `<div class="bad">${esc(t('liveErr', { e: r.error }))}</div>`; return; }
      s = r.data;
      if (s.open) s = (await api().canli.setOpen(false)).data || s;
    }
    const url = (s.urls[0] || '') + 'okut';
    const qr = url ? await api().qr(url) : '';
    box.innerHTML = `<div class="livebox"><div>${qr ? `<img class="qr" src="${qr}" alt="">` : ''}</div><div><p class="help">${esc(t('omrPhoneHelp'))}</p>${s.urls.length ? s.urls.map((u) => `<div class="url">${esc(u)}okut</div>`).join('') : `<div class="bad">${esc(t('liveNoNet'))}</div>`}<div class="code">${esc(t('liveCode'))}: <b>${esc(s.code)}</b></div><p class="muted">${esc(t('liveFirewall'))}</p></div></div>`;
  }
  // telefondan gelen fotoğraf
  async function onScan({ id, image }) {
    const a = A();
    try {
      const d = await sonucRead(a.exam.id);
      const lf = latestForm(d);
      if (!lf) { api().canli.scanResult(id, { ok: true, read: false, error: t('omrNoForm') }); return; }
      const [fid, f] = lf;
      const { r, thumb } = await readDataUrl(image, f.qids.length);
      if (!r.ok) { api().canli.scanResult(id, { ok: true, read: false, error: t('omrErr_' + r.err) }); return; }
      const x = await addReading(a.exam.id, fid, r, thumb, 'telefon');
      api().canli.scanResult(id, { ok: true, read: true, no: x.rec.no, ad: x.rec.ad, d: x.d, n: x.n });
      if (window.__omrRefresh) window.__omrRefresh(); else a.toast(`📷 ${x.rec.no || '?'}: ${x.d}/${x.n}`, 'ok');
    } catch (e) { api().canli.scanResult(id, { ok: true, read: false, error: e.message }); }
  }

  /* =============================== çevrimiçi sınav =============================== */
  function livePayload(o) {
    const a = A();
    const ex = a.exam, nOpt = ex.settings.optionCount;
    const qs = (o.qs || a.liveQs());
    const langs = LK.filter((k) => qs.length && qs.filter((q) => (q.text[k] || '').trim()).length >= qs.length * 0.9);
    const lang = langs.includes(o.lang || a.CL()) ? (o.lang || a.CL()) : (langs[0] || a.CL());
    return {
      examId: ex.id, title: a.examName(ex), dur: o.dur || 0, shuffleQ: !!o.shuffleQ, shuffleO: !!o.shuffleO, lang, langs: langs.length ? langs : [lang],
      letters: window.LETTERS,
      questions: qs.map((q) => ({ id: q.id, text: q.text, img: q.img || '', options: q.options.slice(0, nOpt), oimg: q.oimg ? q.oimg.slice(0, nOpt) : null })),
      key: Object.fromEntries(qs.map((q) => [q.id, a.isAnswered(q) ? q.correct : -1])),
    };
  }
  async function liveModal() {
    const a = A();
    const body = document.createElement('div');
    const m = a.modal({ title: t('liveTitle'), body, wide: true, buttons: [{ label: t('close'), onClick: (c) => c() }], onClose: () => { if (off) off(); } });
    let off = null;
    const L = a.letters();
    const setup = () => {
      const p = a.prefs.live || { dur: 30, shQ: true, shO: true };
      body.innerHTML = `<p class="help">${esc(t('liveHelp'))}</p>
        <div class="row"><label>${esc(t('liveDur'))} <input class="in" type="number" id="lvDur" min="0" max="600" value="${p.dur}" style="width:80px"></label>
          <label class="chk"><input type="checkbox" id="lvQ"${p.shQ ? ' checked' : ''}> ${esc(t('liveShQ'))}</label><label class="chk"><input type="checkbox" id="lvO"${p.shO ? ' checked' : ''}> ${esc(t('liveShO'))}</label></div>
        <div class="row"><label>${esc(t('liveLangs'))} <select class="in" id="lvLang" style="width:auto">${LK.map((k) => `<option value="${k}">${window.LANGS[k]}</option>`).join('')}</select></label>
          <label>${esc(t('outTag'))} <select class="in" id="lvTag" style="width:auto"><option value="">${esc(t('filterAll'))}</option>${a.tagKeys().map((k) => `<option value="${k}">${esc(a.tagName(k))}</option>`).join('')}</select></label>
          <label>${esc(t('ekKonu'))} <select class="in" id="lvKonu" style="width:auto">${EK.konuOptions(a.liveQs())}</select></label></div>
        <div class="row"><button class="btn primary" id="lvGo">${esc(t('liveStart'))}</button><span class="bad" id="lvErr"></span></div>`;
      $('#lvLang', body).value = a.CL();
      $('#lvGo', body).onclick = async () => {
        const o = { dur: Math.max(0, +$('#lvDur', body).value || 0), shuffleQ: $('#lvQ', body).checked, shuffleO: $('#lvO', body).checked, lang: $('#lvLang', body).value };
        a.prefs.live = { dur: o.dur, shQ: o.shuffleQ, shO: o.shuffleO }; a.savePrefs();
        o.qs = examQsFor({ tag: $('#lvTag', body).value, konu: $('#lvKonu', body).value });
        if (!o.qs.length) { $('#lvErr', body).textContent = t('nothingToOutput'); return; }
        const r = await api().canli.start(livePayload(o));
        if (!r.ok) { $('#lvErr', body).textContent = t('liveErr', { e: r.error }); return; }
        show(r.data);
      };
    };
    let qrFor = '', qrImg = '';
    const show = async (s) => {
      if (!s) return setup();
      const url = s.urls[0] || '';
      if (url && url !== qrFor) { qrFor = url; qrImg = await api().qr(url); }
      const key = (await keyNow(s));
      const stu = s.students.slice().sort((x, y) => (x.done === y.done ? x.start - y.start : x.done ? 1 : -1));
      const now = Date.now();
      body.innerHTML = `<div class="livebox"><div>${qrImg ? `<img class="qr" src="${qrImg}" alt="">` : ''}</div><div>
          <div class="muted">${esc(t('liveRunning', { t: s.title || '' }))} · ${s.n} ${esc(t('lbl_question'))}${s.dur ? ` · ${s.dur} dk` : ''}</div>
          <div>${esc(t('liveAddr'))}:</div>${s.urls.length ? s.urls.map((u) => `<div class="url">${esc(u)}</div>`).join('') : `<div class="bad">${esc(t('liveNoNet'))}</div>`}
          <div class="code">${esc(t('liveCode'))}: <b>${esc(s.code)}</b></div>
          <div class="row"><span class="pill ${s.open ? 'ok' : 'bad'}">${esc(t(s.open ? 'liveOpen' : 'liveClosed'))}</span><button class="btn" id="lvTog">${esc(t('liveToggle'))}</button><button class="btn" id="lvFin">${esc(t('liveFinish'))}</button><button class="btn" id="lvAn">${esc(t('anBtn'))}</button><button class="btn" id="lvStop">${esc(t('liveStop'))}</button></div>
          <p class="muted">${esc(t('liveFirewall'))}</p></div></div>
        <h4>${esc(t('liveStudents', { n: stu.length }))}</h4>
        ${stu.length ? `<table class="ortable"><thead><tr><th>${esc(t('omrNo'))}</th><th>${esc(t('omrName'))}</th><th></th><th>${esc(t('omrScore'))}</th><th></th></tr></thead><tbody>${stu.map((x) => {
          const na = Object.keys(x.answers).length;
          const c = Object.entries(x.answers).filter(([id, v]) => key[id] >= 0 && key[id] === v).length;
          const left = s.dur && !x.done ? Math.max(0, Math.ceil((x.start + s.dur * 60000 - now) / 60000)) : null;
          return `<tr><td>${esc(x.no)}</td><td dir="auto">${esc(x.ad)}</td><td>${esc(t(x.done ? 'liveState_done' : 'liveState_on'))} · ${esc(t('liveAns', { a: na, n: s.n }))}${left != null ? ' · ' + esc(t('liveLeft', { m: left })) : ''}</td><td><b>${c}</b>/${s.n}</td><td>${x.done ? `<button class="btn mini" data-ro="${esc(x.id)}">${esc(t('liveReopen'))}</button>` : `<button class="btn mini" data-re="${esc(x.id)}">${esc(t('liveRe'))}</button>`}</td></tr>`;
        }).join('')}</tbody></table>` : `<div class="empty">${esc(t('liveNoStud'))}</div>`}`;
      window.__canliRoster = s.students;
      $('#lvTog', body).onclick = async () => show((await api().canli.setOpen(!s.open)).data);
      $('#lvFin', body).onclick = async () => { if (await a.confirmBox(t('liveFinishQ'))) show((await api().canli.finishAll()).data); };
      $('#lvStop', body).onclick = async () => { await api().canli.stop(); setup(); };
      $('#lvAn', body).onclick = () => { m.close(); analysisModal(); };
      body.querySelectorAll('[data-re]').forEach((b) => { b.onclick = async () => show((await api().canli.allowRe(b.dataset.re, false)).data); });
      body.querySelectorAll('[data-ro]').forEach((b) => { b.onclick = async () => show((await api().canli.allowRe(b.dataset.ro, true)).data); });
    };
    off = api().canli.onChanged((s) => { if (document.body.contains(m.el) && s && body.querySelector('.livebox')) show(s); });
    const st = await api().canli.status();
    const s = st.ok && st.data.session;
    if (s && st.data.running && s.examId === a.exam.id && s.n) show(s); else setup();
    const tick = setInterval(async () => { if (!document.body.contains(m.el)) return clearInterval(tick); if (body.querySelector('.livebox')) { const x = await api().canli.status(); if (x.ok && x.data.session) show(x.data.session); } }, 30000);
  }
  // oturumun anahtarı (kayıttaki) yoksa açık sınavdan
  async function keyNow(s) {
    const a = A();
    const k = {};
    a.exam.questions.forEach((q) => { k[q.id] = a.isAnswered(q) ? q.correct : -1; });
    void s;
    return k;
  }

  /* =============================== analiz raporu =============================== */
  async function collect(ex) {
    const srcs = [];
    try {
      const l = await api().canli.list();
      for (const x of (l.ok ? l.data : []).filter((y) => y.examId === ex.id)) {
        const g = await api().canli.get(x.id);
        const s = g.ok && g.data; if (!s) continue;
        srcs.push({ id: 'c:' + s.id, kind: 'live', label: t('anSrcLive', { t: fmtD(s.createdAt), n: Object.keys(s.students).length }), t: s.createdAt,
          rows: Object.values(s.students).map((st) => ({ ad: st.ad, no: st.no, src: 'live', answers: st.answers, qids: s.questions.map((q) => q.id) })) });
      }
    } catch { /* yok */ }
    const d = await sonucRead(ex.id);
    const ok = d.okumalar.filter((x) => !x.gizli && d.formlar[x.formId]);
    if (ok.length) srcs.push({ id: 'o', kind: 'omr', label: t('anSrcOmr', { n: ok.length }), t: Math.max(...ok.map((x) => x.t)), rows: ok.map((x) => ({ ad: x.ad, no: x.no, src: 'omr', answers: x.answers, qids: d.formlar[x.formId].qids })) });
    return srcs.sort((x, y) => y.t - x.t);
  }
  function analyse(ex, rows) {
    const nOpt = ex.settings.optionCount;
    const qById = new Map(ex.questions.map((q) => [q.id, q]));
    const key = (id) => { const q = qById.get(id); return q && q.correct >= 0 && q.correct < nOpt ? q.correct : -1; };
    const studs = rows.map((r) => {
      const scored = r.qids.filter((id) => key(id) >= 0);
      let c = 0, w = 0, b = 0;
      scored.forEach((id) => { const v = r.answers[id]; if (v == null || v < 0) b++; else if (v === key(id)) c++; else w++; });
      return { ...r, c, w, b, n: scored.length, p: scored.length ? c / scored.length : 0 };
    }).sort((x, y) => y.p - x.p);
    // üst / alt %27 grup (ayırt edicilik)
    const g = Math.max(1, Math.round(studs.length * 0.27));
    const top = new Set(studs.slice(0, g)), bot = new Set(studs.slice(-g));
    const qstat = new Map();
    studs.forEach((s) => s.qids.forEach((id) => {
      if (key(id) < 0) return;
      let o = qstat.get(id); if (!o) { o = { id, n: 0, d: 0, dist: [0, 0, 0, 0, 0], blank: 0, tc: 0, tn: 0, bc: 0, bn: 0 }; qstat.set(id, o); }
      const v = s.answers[id]; o.n++;
      if (v == null || v < 0) o.blank++; else o.dist[v] = (o.dist[v] || 0) + 1;
      const ok = v === key(id); if (ok) o.d++;
      if (top.has(s)) { o.tn++; if (ok) o.tc++; } if (bot.has(s)) { o.bn++; if (ok) o.bc++; }
    }));
    const qs = ex.questions.filter((q) => qstat.has(q.id)).map((q) => {
      const o = qstat.get(q.id);
      const p = o.n ? o.d / o.n : 0;
      const disc = o.tn && o.bn && studs.length >= 6 ? o.tc / o.tn - o.bc / o.bn : null;
      let lure = -1, lv = 0; o.dist.forEach((v, k) => { if (k !== key(q.id) && v > lv) { lv = v; lure = k; } });
      return { q, ...o, p, disc, lure, lureP: o.n ? lv / o.n : 0, sugg: p >= 0.8 ? 'k' : p >= 0.4 ? 'o' : 'z' };
    });
    const groupBy = (f) => {
      const m = new Map();
      qs.forEach((x) => { const k = f(x.q) || '—'; const o = m.get(k) || { k, n: 0, d: 0, q: 0 }; o.n += x.n; o.d += x.d; o.q++; m.set(k, o); });
      return [...m.values()].map((o) => ({ ...o, p: o.n ? o.d / o.n : 0 })).sort((x, y) => x.p - y.p);
    };
    const konu = groupBy((q) => q.konu || t('ekKonuNone'));
    const tag = groupBy((q) => (q.tag ? A().tagName(q.tag) : ''));
    const ps = studs.map((s) => s.p);
    const avg = ps.length ? ps.reduce((x, y) => x + y, 0) / ps.length : 0;
    return { studs, qs, konu, tag, avg, hi: ps.length ? Math.max(...ps) : 0, lo: ps.length ? Math.min(...ps) : 0 };
  }
  function reportHtml(ex, R, forPrint) {
    const a = A();
    const L = a.letters();
    const cl = a.CL();
    const bar = (p) => `<span class="pbar"><i style="width:${pctS(p)}%;background:${p >= 0.8 ? '#2e9e5b' : p >= 0.4 ? '#d9a21b' : '#d64545'}"></i></span> %${pctS(p)}`;
    const weak = R.qs.filter((x) => x.p < 0.3 && x.n >= 3);
    const qn = (q) => a.qNumber(q) || '👻';
    let h = `<div class="ansum">${esc(t('anSum', { s: R.studs.length, a: pctS(R.avg), h: pctS(R.hi), l: pctS(R.lo) }))}</div>`;
    if (weak.length) h += `<h4>${esc(t('anWeak'))}</h4><ul class="anweak">${weak.map((x) => `<li><b>${esc(t('question'))} ${qn(x.q)}</b> · %${pctS(x.p)} — <span dir="auto">${esc(pickL(x.q.text, cl).slice(0, 120))}</span>${x.lure >= 0 ? ` · ${esc(t('anLure', { l: L[x.lure], p: pctS(x.lureP) }))}` : ''}${forPrint ? '' : ` <button class="btn mini" data-go="${x.q.id}">${esc(t('anGo'))}</button>`}</li>`).join('')}</ul>`;
    h += `<h4>${esc(t('anKonu'))}</h4><table class="antable"><thead><tr><th>${esc(t('ekKonu'))}</th><th>${esc(t('anQs'))}</th><th>${esc(t('anP'))}</th></tr></thead><tbody>${R.konu.map((x) => `<tr><td dir="auto">${esc(x.k)}</td><td>${x.q}</td><td>${bar(x.p)}</td></tr>`).join('')}</tbody></table>`;
    if (R.tag.length > 1) h += `<h4>${esc(t('anTag'))}</h4><table class="antable"><tbody>${R.tag.map((x) => `<tr><td>${esc(x.k)}</td><td>${x.q}</td><td>${bar(x.p)}</td></tr>`).join('')}</tbody></table>`;
    h += `<h4>${esc(t('anQs'))}</h4><table class="antable"><thead><tr><th>#</th><th></th><th>${esc(t('anP'))}</th><th>${esc(t('anDist'))}</th><th>${esc(t('anDisc'))}</th><th>${esc(t('anSugg'))}</th></tr></thead><tbody>${R.qs.map((x) => `<tr><td><b>${qn(x.q)}</b></td><td class="qt" dir="auto">${esc(pickL(x.q.text, cl).slice(0, 90))}</td><td>${bar(x.p)}<br><small>${x.d}/${x.n}</small></td><td class="dist">${x.dist.slice(0, a.S().optionCount).map((v, k) => `<span class="${k === x.q.correct ? 'c' : ''}">${L[k]}:${v}</span>`).join(' ')}${x.blank ? ` <span>–:${x.blank}</span>` : ''}</td><td>${x.disc == null ? '—' : x.disc.toFixed(2)}${x.disc != null && x.disc < 0.15 ? ` <span class="bad" title="${esc(t('anDiscLow'))}">⚠</span>` : ''}</td><td>${esc(t('ekZor_' + x.sugg))}${x.q.zor && x.q.zor !== x.sugg ? ` <small>(${esc(t('ekZor_' + x.q.zor))})</small>` : ''}</td></tr>`).join('')}</tbody></table>`;
    h += `<h4>${esc(t('anStud'))}</h4><table class="antable"><thead><tr><th>${esc(t('anRank'))}</th><th>${esc(t('omrNo'))}</th><th>${esc(t('omrName'))}</th><th>${esc(t('omrScore'))}</th><th>${esc(t('omrWrong'))}</th><th>${esc(t('omrBlank'))}</th><th>${esc(t('anPct'))}</th><th>${esc(t('anSrc'))}</th></tr></thead><tbody>${R.studs.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.no)}</td><td dir="auto">${esc(s.ad)}</td><td><b>${s.c}</b>/${s.n}</td><td>${s.w}</td><td>${s.b}</td><td>${bar(s.p)}</td><td>${esc(t(s.src === 'omr' ? 'anOmr' : 'anLive'))}</td></tr>`).join('')}</tbody></table>`;
    return h;
  }
  async function analysisModal() {
    const a = A();
    const ex = a.exam;
    const srcs = await collect(ex);
    const body = document.createElement('div');
    if (!srcs.length) { a.modal({ title: t('anTitle'), body: `<p class="help">${esc(t('anHelp'))}</p><div class="empty">${esc(t('anNone'))}</div>`, buttons: [{ label: t('liveBtn'), onClick: (c) => { c(); liveModal(); } }, { label: t('omrBtn'), onClick: (c) => { c(); omrFormModal(); } }, { label: t('close'), onClick: (c) => c() }] }); return; }
    const sel = new Set(a.prefs.anSel && a.prefs.anSel.length ? a.prefs.anSel.filter((x) => srcs.some((s) => s.id === x)) : [srcs[0].id]);
    if (!sel.size) sel.add(srcs[0].id);
    let R = null;
    const minN = 5;
    const render = () => {
      const rows = srcs.filter((s) => sel.has(s.id)).flatMap((s) => s.rows);
      R = analyse(ex, rows);
      body.innerHTML = `<p class="help">${esc(t('anHelp'))}</p>
        <div class="row"><b>${esc(t('anSources'))}:</b>${srcs.map((s) => `<label class="chk"><input type="checkbox" data-s="${esc(s.id)}"${sel.has(s.id) ? ' checked' : ''}> ${esc(s.label)}</label>`).join('')}</div>
        <div class="row"><button class="btn primary" id="anApply" title="${esc(t('anApplyTip', { n: minN }))}">${esc(t('anApply'))}</button><button class="btn" id="anPdf">${esc(t('anPdf'))}</button><button class="btn" id="anCsv">${esc(t('anCsv'))}</button></div>
        <div class="anrep">${reportHtml(ex, R, false)}</div>`;
      body.querySelectorAll('[data-s]').forEach((c) => { c.onchange = () => { if (c.checked) sel.add(c.dataset.s); else sel.delete(c.dataset.s); a.prefs.anSel = [...sel]; a.savePrefs(); render(); }; });
      body.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => { m.close(); a.setTab('test'); a.scrollToQ(b.dataset.go); }; });
      $('#anApply', body).onclick = () => {
        a.snap(); let n = 0;
        R.qs.forEach((x) => {
          x.q.ist = { n: x.n, d: x.d, t: Date.now() };
          if (x.n >= minN && (!x.q.zor || x.q.zorOto) && x.q.zor !== x.sugg) { x.q.zor = x.sugg; x.q.zorOto = true; n++; }
        });
        a.renderList(); a.changed();
        a.toast(t('anApplied', { n }), 'ok', [{ label: t('undo'), onClick: () => a.undo() }]);
      };
      $('#anPdf', body).onclick = async () => {
        const html = `<!doctype html><html lang="${a.prefs.uiLang}" dir="${a.prefs.uiLang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>
          body{font-family:Arial,"Noto Sans Arabic",Tahoma,sans-serif;font-size:9.5pt;color:#111} h2{font-size:14pt;margin:0 0 4pt} h4{font-size:11pt;margin:12pt 0 4pt;border-bottom:.6pt solid #888}
          table{width:100%;border-collapse:collapse} td,th{border:.5pt solid #999;padding:2pt 4pt;text-align:start;vertical-align:top} tr{break-inside:avoid}
          .pbar{display:inline-block;width:40pt;height:6pt;background:#eee;vertical-align:middle}.pbar i{display:block;height:100%}.dist .c{font-weight:bold;color:#1e7b34}.bad{color:#b00}.qt{max-width:220pt}.ansum{font-weight:bold;margin:4pt 0 8pt}
        </style></head><body><h2>${esc(t('anTitle'))} — ${esc(a.examName(ex))}</h2><div>${esc(fmtD(Date.now()))}</div>${reportHtml(ex, R, true)}</body></html>`;
        const r = await api().makePdf({ html, pageNumbers: true, footerLabel: '', margins: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5 }, action: 'save', fileName: (a.examName(ex) || 'sinav').replace(/[\\/:*?"<>|]/g, '').slice(0, 50) + '-analiz', noTemplate: true });
        if (r && r.path) a.toast(t('anSaved', { p: r.path }), 'ok');
      };
      $('#anCsv', body).onclick = async () => {
        const L = a.letters();
        const qcols = R.qs.map((x) => x.q);
        const sep = ';';
        const cell = (v) => { const s = String(v == null ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
        const lines = [[t('anRank'), t('omrNo'), t('omrName'), t('omrScore'), t('omrWrong'), t('omrBlank'), t('anPct'), t('anSrc'), ...qcols.map((q) => '#' + (a.qNumber(q) || '-'))].map(cell).join(sep)];
        R.studs.forEach((s, i) => lines.push([i + 1, s.no, s.ad, s.c, s.w, s.b, pctS(s.p), t(s.src === 'omr' ? 'anOmr' : 'anLive'), ...qcols.map((q) => { const v = s.answers[q.id]; return v == null || v === -1 ? '' : v === -2 ? '*' : L[v]; })].map(cell).join(sep)));
        lines.push(['', '', t('anP'), '', '', '', '', '', ...R.qs.map((x) => pctS(x.p))].map(cell).join(sep));
        const p = await api().saveDialog({ defaultPath: (a.examName(ex) || 'sinav').replace(/[\\/:*?"<>|]/g, '').slice(0, 50) + '-sonuclar.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] });
        if (!p) return;
        await api().writeText(p, '﻿' + lines.join('\r\n'));
        a.toast(t('anSaved', { p }), 'ok');
      };
    };
    const m = a.modal({ title: t('anTitle'), body, wide: true, buttons: [{ label: t('close'), onClick: (c) => c() }] });
    render();
  }

  // telefondan gelen optik form fotoğrafları
  try { if (window.api && window.api.canli) window.api.canli.onScan((x) => onScan(x)); } catch { /* yok */ }

  EK._omrForm = omrFormModal;
  Object.assign(EK, { omrReadModal, liveModal, analysisModal, analyse, formHtml, livePayload });
  EK.addSide('btnEkLive', () => t('liveBtn'), liveModal);
  EK.addSide('btnEkOmr', () => t('omrBtn'), () => omrFormModal());
  EK.addSide('btnEkAn', () => t('anBtn'), analysisModal);
})();
