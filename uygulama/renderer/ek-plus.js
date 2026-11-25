'use strict';
/* Sınav Hazırlama 1.10.4 — sınav kalitesi ve sınıf araçları (window.EK'e eklenir; app.js'ten önce yüklenir).
   Soruya eklenen alanlar (isteğe bağlı; eski dosyalar olduğu gibi açılır, hiçbir alan silinmez):
     durum    : '' (eski soru = onaylı sayılır) | 't' taslak | 'k' kontrol edildi | 'o' onaylı
     rev      : sorunun dayandığı kaynağın revizyonu ("Rev 3", "2026-05")
     inceleme : { n: 'analiz' | 'revizyon' | 'elle', t, not } — "gözden geçir" işareti (soru değiştirilmez)
   Cihazda tutulanlar (localStorage): ek.kullanim (öğrenciye giden çıktılarda kullanılan sorular), ek.revler (kaynak revizyonları),
     ek.planlar (müfredat planları), ek.sozluk (kullanıcı terim sözlüğü). */
(function () {
  const A = () => window.__app;
  const t = (...a) => window.t(...a);
  const $ = (s, r = document) => r.querySelector(s);
  const EK = window.EK;
  const esc = EK.esc;
  const LK = ['tr', 'en', 'ar'];
  const api = () => window.api;
  const norm = (s) => String(s || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
  const ls = {
    get: (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* dolu */ } },
  };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pickL = (ml, cl) => (ml && (ml[cl] || ml.tr || ml.en || ml.ar)) || '';
  const fmtD = (ms) => { try { return new Date(ms).toLocaleDateString(window.UI_LANG === 'ar' ? 'ar' : window.UI_LANG === 'en' ? 'en-GB' : 'tr-TR'); } catch { return ''; } };
  const safeName = (s) => String(s || 'sinav').replace(/[\\/:*?"<>|\n\r]/g, '').replace(/\s+/g, '-').slice(0, 50) || 'sinav';

  Object.assign(window.I18N, {
    plSide: ['Kalite ve sınıf', 'Quality & class', 'الجودة والصف'],
    // onay akışı
    plDurum: ['Onay durumu', 'Approval status', 'حالة الاعتماد'],
    plDurum_: ['Onay —', 'Approval —', 'الاعتماد —'],
    plDurum_t: ['Taslak', 'Draft', 'مسودة'], plDurum_k: ['Kontrol edildi', 'Reviewed', 'تمت المراجعة'], plDurum_o: ['Onaylı', 'Approved', 'معتمد'],
    plOnayBtn: ['✅ Onay ve gözden geçirme', '✅ Approval & review', '✅ الاعتماد والمراجعة'],
    plOnayTitle: ['Onay akışı ve gözden geçirilecek sorular', 'Approval workflow and questions to review', 'سير الاعتماد والأسئلة المطلوب مراجعتها'],
    plOnayOn: ['Onay akışını kullan: çıktıya, kitapçığa, optik forma ve çevrimiçi sınava yalnız onaylı sorular girsin', 'Use the approval workflow: only approved questions go to outputs, booklets, answer sheets and online exams', 'استخدام سير الاعتماد: لا تدخل المخرجات والكتيّبات ونماذج الإجابة والاختبار عبر الشبكة إلا الأسئلة المعتمدة'],
    plOnayHelp: ['Durumu boş olan eski sorular onaylı sayılır. Taslak ya da "kontrol edildi" durumundaki sorular listede kalır, düzenlenir, yalnız sınava girmez. Toplu içe aktarılan sorular taslak başlar.', 'Older questions with no status count as approved. Draft and "reviewed" questions stay in the list and can be edited; they just do not go into the exam. Bulk-imported questions start as drafts.', 'تُعدّ الأسئلة القديمة التي لا حالة لها معتمدة. تبقى أسئلة المسودة و"تمت المراجعة" في القائمة ويمكن تعديلها، لكنها لا تدخل الاختبار. تبدأ الأسئلة المستوردة دفعةً واحدة كمسودات.'],
    plOnayCounts: ['Taslak: {t} · Kontrol edildi: {k} · Onaylı: {o} · Durumsuz (onaylı sayılır): {b}', 'Draft: {t} · Reviewed: {k} · Approved: {o} · No status (counts as approved): {b}', 'مسودة: {t} · تمت المراجعة: {k} · معتمد: {o} · بلا حالة (تُعدّ معتمدة): {b}'],
    plSetSel: ['Seçili {n} soruyu işaretle:', 'Mark the {n} selected questions as:', 'تعيين الأسئلة المحددة ({n}) إلى:'],
    plSetAll: ['Durumsuz soruların hepsini "Onaylı" yap', 'Mark all questions without status as "Approved"', 'جعل كل الأسئلة بلا حالة "معتمدة"'],
    plSetDone: ['{n} sorunun durumu değişti.', 'Status changed for {n} questions.', 'تغيّرت حالة {n} سؤالاً.'],
    plNoSel: ['Önce soldaki kutulardan soru seçin.', 'Select questions with the boxes first.', 'حدّد الأسئلة من المربعات أولاً.'],
    plOnayDisi: ['{n} soru onaylı olmadığı için çıktıya girmedi (Onay akışı açık).', '{n} questions were left out because they are not approved (approval workflow is on).', 'لم يدخل {n} سؤالاً في المخرجات لأنها غير معتمدة (سير الاعتماد مفعّل).'],
    plReview: ['Gözden geçirilecek sorular', 'Questions to review', 'أسئلة للمراجعة'],
    plReviewNone: ['Gözden geçirilecek soru yok.', 'No questions to review.', 'لا توجد أسئلة للمراجعة.'],
    plReviewed: ['✓ Gözden geçirildi', '✓ Reviewed', '✓ تمت المراجعة'],
    plFlagTip: ['Gözden geçirilmeli: {n}. Tıklayın: işaret kalkar.', 'Needs review: {n}. Click to clear the flag.', 'تحتاج إلى مراجعة: {n}. انقر لإزالة العلامة.'],
    plInc_analiz: ['Madde analizi', 'Item analysis', 'تحليل الفقرات'], plInc_revizyon: ['Kaynak revizyonu değişti', 'Source revision changed', 'تغيّرت مراجعة المصدر'], plInc_elle: ['Elle işaretlendi', 'Flagged manually', 'عُلّم يدوياً'],
    plGo: ['Git', 'Go', 'انتقال'],
    // madde analizi
    plNf: ['İşlemeyen çeldirici', 'Non-functioning distractor', 'مُشتِّت غير فعّال'],
    plNfTip: ['Bu yanlış şıkları cevaplayanların %5\'inden azı seçti; çeldirici görevini görmüyor, değiştirilmesi önerilir.', 'Fewer than 5% of candidates chose these wrong options; they do not work as distractors and should be revised.', 'اختار أقل من 5% من المتقدمين هذه الخيارات الخاطئة؛ فهي لا تؤدي دور المشتِّت ويُستحسن تعديلها.'],
    plFlag_ters: ['Ters ayırt edicilik: zayıf öğrenciler daha çok doğru yapmış — cevap anahtarını denetleyin', 'Negative discrimination: weaker candidates scored better — check the answer key', 'تمييز سالب: أجاب الأضعف أفضل — تحقّق من مفتاح الإجابة'],
    plFlag_zor: ['Çok zor (%20\'den az doğru) — soru ya da anahtar hatalı olabilir', 'Very hard (under 20% correct) — the item or key may be wrong', 'صعب جداً (أقل من 20% صحيحة) — قد يكون السؤال أو المفتاح خاطئاً'],
    plFlag_ayirt: ['Düşük ayırt edicilik — soru iyi ve zayıf öğrenciyi ayırmıyor', 'Low discrimination — the item does not separate strong and weak candidates', 'تمييز منخفض — لا يفرّق السؤال بين المتقدمين الأقوياء والضعفاء'],
    // müfredat planı
    plPlanBtn: ['🧭 Müfredat planından sınav', '🧭 Exam from a syllabus plan', '🧭 اختبار من خطة المنهج'],
    plPlanTitle: ['Müfredat planına göre otomatik sınav', 'Automatic exam from a syllabus plan', 'اختبار تلقائي وفق خطة المنهج'],
    plPlanHelp: ['Her satıra konu (modül / ders), zorluk ve soru sayısı yazın. Program uygun soruları seçer ve yeni bir sınav açar; açık sınavınız önce yedeklenir. Yakın zamanda öğrenciye verilmiş sorular dışarıda tutulur.', 'Enter a topic (module / subject), difficulty and number of questions on each row. The program picks matching questions and opens a new exam; your open exam is backed up first. Questions given to candidates recently are left out.', 'اكتب في كل سطر الموضوع (الوحدة / المادة) والصعوبة وعدد الأسئلة. يختار البرنامج الأسئلة المناسبة ويفتح اختباراً جديداً بعد حفظ نسخة احتياطية من الاختبار المفتوح. تُستبعد الأسئلة التي أُعطيت للمتقدمين مؤخراً.'],
    plPlanName: ['Plan adı', 'Plan name', 'اسم الخطة'],
    plPreset: ['Hazır müfredat', 'Ready syllabus', 'منهج جاهز'],
    plPresetNone: ['— seçin —', '— choose —', '— اختر —'],
    plPresetP66: ['EASA Part-66 modülleri', 'EASA Part-66 modules', 'وحدات EASA Part-66'],
    plPresetAtpl: ['EASA ATPL(A) dersleri', 'EASA ATPL(A) subjects', 'مواد EASA ATPL(A)'],
    plPresetCur: ['Bu sınavın konuları', 'Topics of this exam', 'مواضيع هذا الاختبار'],
    plRowKonu: ['Konu', 'Topic', 'الموضوع'], plRowZor: ['Zorluk', 'Difficulty', 'الصعوبة'], plRowAdet: ['Soru', 'Questions', 'الأسئلة'], plRowHave: ['Uygun', 'Available', 'متاح'],
    plZorAny: ['Hepsi', 'Any', 'الكل'],
    plAddRow: ['+ Satır', '+ Row', '+ سطر'],
    plSrc: ['Soru kaynakları', 'Question sources', 'مصادر الأسئلة'],
    plSrcExam: ['Bu sınav', 'This exam', 'هذا الاختبار'], plSrcMine: ['Benim arşivim', 'My archive', 'أرشيفي'], plSrcBank: ['Hazır arşiv', 'Ready archive', 'الأرشيف الجاهز'],
    plDays: ['Son {i} gün içinde öğrenciye verilenleri alma', 'Skip questions given to candidates in the last {i} days', 'استبعاد ما أُعطي للمتقدمين خلال آخر {i} يوماً'],
    plOnlyOk: ['Yalnız onaylı sorular', 'Approved questions only', 'الأسئلة المعتمدة فقط'],
    plTotal: ['Toplam {n} soru', 'Total {n} questions', 'المجموع {n} سؤالاً'],
    plMake: ['Sınavı oluştur', 'Create the exam', 'إنشاء الاختبار'],
    plSave: ['💾 Planı kaydet', '💾 Save plan', '💾 حفظ الخطة'],
    plLoad: ['Kayıtlı planlar', 'Saved plans', 'الخطط المحفوظة'],
    plDel: ['🗑 Planı sil', '🗑 Delete plan', '🗑 حذف الخطة'],
    plSaved: ['Plan kaydedildi.', 'Plan saved.', 'حُفظت الخطة.'],
    plShort: ['Eksik kalanlar: {l}. Bu konulara soru ekleyin ya da sayıyı azaltın.', 'Not enough questions for: {l}. Add questions to these topics or lower the numbers.', 'لا توجد أسئلة كافية لـ: {l}. أضف أسئلة لهذه المواضيع أو قلّل العدد.'],
    plOldUsed: ['{n} soru yakın zamanda kullanılmıştı ama başka soru olmadığı için alındı.', '{n} questions had been used recently but were taken because nothing else matched.', 'أُخذ {n} سؤالاً استُخدمت مؤخراً لعدم وجود بديل.'],
    plMadeQ: ['{n} soruluk yeni sınav hazır. Açık sınavınız yedeklendi; şimdi açılsın mı?', 'A new {n}-question exam is ready. Your open exam was backed up; open the new one now?', 'اختبار جديد من {n} سؤالاً جاهز. حُفظت نسخة احتياطية من اختبارك المفتوح؛ هل يُفتح الآن؟'],
    plLoading: ['Sorular hazırlanıyor…', 'Preparing questions…', 'جارٍ تجهيز الأسئلة…'],
    // tekrar kontrolü
    plUsedTip: ['Bu soru en son {d} tarihinde öğrenciye verildi ({s}).', 'Last given to candidates on {d} ({s}).', 'أُعطي هذا السؤال للمتقدمين آخر مرة في {d} ({s}).'],
    plDupWarn: ['Bu sınavda {n} soru başka bir soruyla aynı ya da çok benzer.', '{n} questions in this exam are identical or very similar to another one.', 'يوجد {n} سؤالاً في هذا الاختبار مطابقة أو شديدة الشبه بسؤال آخر.'],
    plDupOpen: ['Benzerleri göster', 'Show similar', 'عرض المتشابهة'],
    // kitapçık
    plKitapcik: ['Kitapçık', 'Booklet', 'كتيّب'],
    plKitBtn: ['📚 A/B/C/D kitapçık', '📚 A/B/C/D booklets', '📚 كتيّبات أ/ب/ج/د'],
    plKitTitle: ['Kitapçık türleri (A/B/C/D)', 'Booklet versions (A/B/C/D)', 'نسخ الكتيّبات (أ/ب/ج/د)'],
    plKitHelp: ['Her kitapçıkta soru ve şık sırası farklı olur. Her kitapçık ayrı dosya olarak kaydedilir; tüm kitapçıkların cevap anahtarı tek PDF\'te çıkar. Optik formlar kitapçığa göre puanlanır.', 'Each booklet has a different question and option order. Every booklet is saved as a separate file; the answer keys of all booklets come in one PDF. Answer sheets are scored per booklet.', 'لكل كتيّب ترتيب مختلف للأسئلة والخيارات. يُحفظ كل كتيّب في ملف مستقل، وتصدر مفاتيح الإجابة لجميع الكتيّبات في ملف PDF واحد. تُصحَّح نماذج الإجابة حسب الكتيّب.'],
    plKitN: ['Kitapçık sayısı', 'Number of booklets', 'عدد الكتيّبات'],
    plKitShQ: ['Soru sırasını karıştır', 'Shuffle question order', 'خلط ترتيب الأسئلة'],
    plKitShO: ['Şık sırasını karıştır', 'Shuffle option order', 'خلط ترتيب الخيارات'],
    plKitAKeep: ['A kitapçığı asıl sırada kalsın', 'Keep booklet A in the original order', 'إبقاء الكتيّب أ بالترتيب الأصلي'],
    plKitOmr: ['Her kitapçığa optik form (tek PDF)', 'Answer sheet for each booklet (one PDF)', 'نموذج إجابة لكل كتيّب (ملف PDF واحد)'],
    plKitGo: ['Kitapçıkları hazırla', 'Prepare booklets', 'تجهيز الكتيّبات'],
    plKitKeyTitle: ['Cevap anahtarı — tüm kitapçıklar', 'Answer key — all booklets', 'مفتاح الإجابة — جميع الكتيّبات'],
    plKitMaster: ['Asıl no', 'Master no.', 'الرقم الأصلي'],
    plKitDone: ['{n} kitapçık hazırlandı.', '{n} booklets prepared.', 'جُهّز {n} كتيّبات.'],
    plKitBusy: ['Kitapçık {l} hazırlanıyor…', 'Preparing booklet {l}…', 'جارٍ تجهيز الكتيّب {l}…'],
    // revizyon
    plRevBtn: ['📑 Kaynak revizyonları', '📑 Source revisions', '📑 مراجعات المصادر'],
    plRevTitle: ['Kaynak ve revizyon takibi', 'Source and revision tracking', 'تتبّع المصادر والمراجعات'],
    plRevHelp: ['Sorularda yazdığınız her kaynağın (mevzuat, el kitabı, AMM…) güncel revizyonunu girin. Revizyon değişince o kaynağa dayanan sorular "gözden geçir" olarak işaretlenir; sorular değiştirilmez.', 'Enter the current revision of each source used in your questions (regulation, manual, AMM…). When a revision changes, questions based on that source are flagged for review; the questions themselves are not changed.', 'أدخل المراجعة الحالية لكل مصدر مستخدم في أسئلتك (تشريع، دليل، AMM…). عند تغيّر المراجعة تُعلَّم الأسئلة المعتمدة على ذلك المصدر للمراجعة دون تغيير الأسئلة نفسها.'],
    plRevSrc: ['Kaynak', 'Source', 'المصدر'], plRevCur: ['Güncel revizyon', 'Current revision', 'المراجعة الحالية'], plRevQs: ['Soru', 'Questions', 'الأسئلة'], plRevOld: ['Eski revizyonlu', 'On an old revision', 'على مراجعة قديمة'],
    plRevSave: ['Kaydet ve denetle', 'Save and check', 'حفظ وتحقّق'],
    plRevDone: ['{n} soru gözden geçirilmek üzere işaretlendi.', '{n} questions were flagged for review.', 'عُلّم {n} سؤالاً للمراجعة.'],
    plRevPh: ['Rev.', 'Rev.', 'مراجعة'],
    plRevNone: ['Bu sınavdaki sorularda kaynak yazılı değil. Soru kartındaki 📚 alanına kaynak yazın.', 'No sources are written on the questions of this exam. Fill in the 📚 field on the question card.', 'لا توجد مصادر مكتوبة في أسئلة هذا الاختبار. املأ الحقل 📚 في بطاقة السؤال.'],
    // sözlük
    plGlBtn: ['📖 Havacılık terim sözlüğü', '📖 Aviation glossary', '📖 مسرد مصطلحات الطيران'],
    plGlTitle: ['Havacılık terim sözlüğü (TR / EN / AR)', 'Aviation glossary (TR / EN / AR)', 'مسرد مصطلحات الطيران (TR / EN / AR)'],
    plGlHelp: ['Buraya eklediğiniz karşılıklar çevrimiçi (yapay zekâ, Google) ve çevrimdışı çevirilerde önceliklidir; programdaki {n} havacılık teriminin önüne geçer. Kurum içi kısaltmalar ve ICAO/EASA karşılıkları için kullanın.', 'Equivalents added here take priority in online (AI, Google) and offline translation, ahead of the {n} built-in aviation terms. Use it for in-house abbreviations and ICAO/EASA equivalents.', 'تحظى المقابلات المضافة هنا بالأولوية في الترجمة عبر الإنترنت (الذكاء الاصطناعي، Google) ودونه، قبل {n} مصطلح طيران مدمجاً في البرنامج. استخدمه للاختصارات الداخلية ومقابلات ICAO/EASA.'],
    plGlAdd: ['+ Terim ekle', '+ Add term', '+ إضافة مصطلح'],
    plGlSearch: ['Programdaki terimlerde ara…', 'Search the built-in terms…', 'ابحث في المصطلحات المدمجة…'],
    plGlSaved: ['Sözlük kaydedildi ({n} terim).', 'Glossary saved ({n} terms).', 'حُفظ المسرد ({n} مصطلحاً).'],
    plGlCsv: ['📥 CSV / Excel\'den al', '📥 Import CSV / Excel', '📥 استيراد CSV / Excel'],
    plGlExport: ['📤 CSV olarak kaydet', '📤 Save as CSV', '📤 حفظ بصيغة CSV'],
    plGlBuiltin: ['Programdaki karşılık', 'Built-in equivalent', 'المقابل المدمج'],
    // karne ve belge
    plKarne: ['Öğrenci karneleri (PDF)', 'Candidate reports (PDF)', 'تقارير المتقدمين (PDF)'],
    plBelge: ['Başarı belgeleri (PDF)', 'Certificates (PDF)', 'شهادات النجاح (PDF)'],
    plKarneTitle: ['Sınav sonuç karnesi', 'Exam result report', 'تقرير نتيجة الاختبار'],
    plKarneWeak: ['Çalışılması gereken konular', 'Topics to study', 'مواضيع تحتاج إلى دراسة'],
    plKarneNoWeak: ['Tüm konularda %70 ve üzeri — tebrikler.', '70% or more in every topic — well done.', '70% أو أكثر في كل المواضيع — أحسنت.'],
    plKarneWrong: ['Yanlış / boş bırakılan sorular', 'Wrong / blank questions', 'الأسئلة الخاطئة / المتروكة'],
    plKarneYou: ['Cevabınız', 'Your answer', 'إجابتك'], plKarneKey: ['Doğru', 'Correct', 'الصحيحة'],
    plPass: ['Geçme notu (%)', 'Pass mark (%)', 'درجة النجاح (%)'],
    plBelgeTitle: ['BAŞARI BELGESİ', 'CERTIFICATE OF ACHIEVEMENT', 'شهادة نجاح'],
    plBelgeText: ['{ad} ({no}), "{s}" sınavını %{p} başarıyla tamamlamıştır.', '{ad} ({no}) has successfully completed the "{s}" examination with a score of {p}%.', 'أتمّ {ad} ({no}) اختبار "{s}" بنجاح بنسبة {p}%.'],
    plBelgeSign: ['Eğitmen', 'Instructor', 'المدرّب'], plBelgeDate: ['Tarih', 'Date', 'التاريخ'],
    plBelgeNone: ['Geçme notunu aşan öğrenci yok.', 'No candidate reached the pass mark.', 'لم يبلغ أي متقدم درجة النجاح.'],
    plOutLang: ['Belge dili', 'Document language', 'لغة المستند'],
    plMake2: ['PDF oluştur', 'Create PDF', 'إنشاء PDF'],
    // toplu içe aktarma
    plImpBtn: ['📥 Excel / Word\'den toplu soru', '📥 Bulk questions from Excel / Word', '📥 أسئلة دفعةً واحدة من Excel / Word'],
    plImpTitle: ['Excel / Word / CSV tablosundan toplu soru aktarma', 'Bulk import from an Excel / Word / CSV table', 'استيراد أسئلة دفعةً واحدة من جدول Excel / Word / CSV'],
    plImpHelp: ['İlk satır başlık olmalı: Soru, A, B, C, D, E, Doğru, Konu, Zorluk, Kaynak, Revizyon, Dil. "Doğru" harf (A–E), sayı (1–5) ya da şıkkın metni olabilir. "Dil" boşsa içerik dili kullanılır. Aynı dilde zaten olan sorular eklenmez; eklenenler taslak olarak başlar.', 'The first row must be a header: Question, A, B, C, D, E, Correct, Topic, Difficulty, Source, Revision, Language. "Correct" may be a letter (A–E), a number (1–5) or the option text. If "Language" is empty the content language is used. Questions already present are skipped; new ones start as drafts.', 'يجب أن يكون الصف الأول عناوين: السؤال، A، B، C، D، E، الصحيحة، الموضوع، الصعوبة، المصدر، المراجعة، اللغة. يمكن أن تكون "الصحيحة" حرفاً (A–E) أو رقماً (1–5) أو نص الخيار. إذا كانت "اللغة" فارغة تُستخدم لغة المحتوى. لا تُضاف الأسئلة الموجودة مسبقاً، وتبدأ الجديدة كمسودات.'],
    plImpTpl: ['📄 Boş şablonu kaydet (CSV)', '📄 Save an empty template (CSV)', '📄 حفظ قالب فارغ (CSV)'],
    plImpPick: ['📂 Dosya seç', '📂 Choose file', '📂 اختيار ملف'],
    plImpFound: ['{n} soru okundu ({s} tanesi zaten var, {b} satır eksik).', '{n} questions read ({s} already present, {b} incomplete rows).', 'قُرئ {n} سؤالاً ({s} موجودة مسبقاً، {b} صفوف ناقصة).'],
    plImpAdd: ['Sınava ekle ({n})', 'Add to exam ({n})', 'أضف إلى الاختبار ({n})'],
    plImpNoHead: ['Başlık satırı bulunamadı ("Soru" ve "A", "B" sütunları gerekli).', 'No header row found ("Question" and "A", "B" columns are required).', 'لم يُعثر على صف العناوين (يلزم عمود "السؤال" و"A" و"B").'],
    plImpAdded: ['{n} soru eklendi (taslak).', '{n} questions added (draft).', 'أُضيف {n} سؤالاً (مسودة).'],
    // yedek
    plBakBtn: ['🛡 Yedek denetimi', '🛡 Backup check', '🛡 فحص النسخ الاحتياطية'],
    plBakTitle: ['Yedekler', 'Backups', 'النسخ الاحتياطية'],
    plBakHelp: ['Program açılışta ve çalışırken 30 dakikada bir (değişiklik varsa) otomatik yedek alır. Denetim, tüm yedeklerin açılabildiğini sınar; hiçbir dosyayı değiştirmez ya da silmez.', 'The program backs up automatically at start-up and every 30 minutes while running (when something changed). The check tests that every backup can be opened; it does not change or delete any file.', 'يحفظ البرنامج نسخة احتياطية تلقائياً عند التشغيل وكل 30 دقيقة أثناء العمل (عند وجود تغيير). يختبر الفحص إمكانية فتح كل نسخة احتياطية، ولا يغيّر أو يحذف أي ملف.'],
    plBakNow: ['Şimdi yedekle', 'Back up now', 'نسخ احتياطي الآن'],
    plBakCheck: ['Yedekleri denetle', 'Check backups', 'فحص النسخ الاحتياطية'],
    plBakOpen: ['Yedek klasörünü aç', 'Open backup folder', 'فتح مجلد النسخ الاحتياطية'],
    plBakRes: ['{s}/{n} yedek sağlam. Son yedek: {d}.', '{s}/{n} backups are intact. Latest backup: {d}.', '{s}/{n} نسخة احتياطية سليمة. آخر نسخة: {d}.'],
    plBakBad: ['Açılamayan yedekler (dokunulmadı):', 'Backups that could not be opened (left untouched):', 'نسخ احتياطية تعذّر فتحها (لم تُمس):'],
    plBakDone: ['Yedek alındı.', 'Backup taken.', 'تم النسخ الاحتياطي.'],
    plBakSame: ['Son yedekten beri değişiklik yok; yine de yeni yedek alındı.', 'Nothing changed since the last backup; a new backup was taken anyway.', 'لا تغيير منذ آخر نسخة؛ ومع ذلك أُخذت نسخة جديدة.'],
    // canlı sınav
    plGuv: ['Güvenli mod', 'Secure mode', 'الوضع الآمن'],
    plGuvTip: ['Öğrencinin sınav sayfasından çıkması ya da tam ekranı kapatması kaydedilir ve burada ⚠ sayısı olarak görünür.', 'Leaving the exam page or exiting full screen is recorded and shown here as a ⚠ count.', 'تُسجَّل مغادرة المتقدم صفحة الاختبار أو خروجه من ملء الشاشة وتظهر هنا كعدد ⚠.'],
    plOlay_gizli: ['sınav sayfasından çıktı', 'left the exam page', 'غادر صفحة الاختبار'], plOlay_cikis: ['tam ekranı kapattı', 'exited full screen', 'خرج من ملء الشاشة'], plOlay_tam: ['tam ekran', 'full screen', 'ملء الشاشة'],
  });

  /* ---------------- soru alanları ---------------- */
  const DUR = ['t', 'k', 'o'];
  const INC = ['analiz', 'revizyon', 'elle'];
  const str = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').slice(0, n) : '');
  const base = EK.qExtra;
  EK.qExtra = function qExtraPlus(q) {
    const o = base(q);
    if (!q) return o;
    if (DUR.includes(q.durum)) o.durum = q.durum;
    const rev = str(q.rev, 60).trim(); if (rev) o.rev = rev;
    if (q.inceleme && INC.includes(q.inceleme.n)) o.inceleme = { n: q.inceleme.n, t: +q.inceleme.t || 0, ...(q.inceleme.not ? { not: str(q.inceleme.not, 300) } : {}) };
    return o;
  };
  const onayOn = () => { const a = A(); return !!(a && a.prefs && a.prefs.onayAkisi); };
  EK.onayMatch = (q) => !onayOn() || !q.durum || q.durum === 'o';

  /* ---------------- tekrar (kullanım) kaydı ---------------- */
  const fp = (q) => { const s = norm(q && q.text && (q.text.en || q.text.tr || q.text.ar)).slice(0, 240); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return s ? (h >>> 0).toString(36) + s.length.toString(36) : ''; };
  const USE = 'ek.kullanim';
  function markUsed(ids, name) {
    const a = A(); if (!a) return;
    const set = new Set(ids);
    const m = ls.get(USE, {});
    const now = Date.now();
    a.exam.questions.filter((q) => set.has(q.id)).forEach((q) => {
      const k = fp(q); if (!k) return;
      const l = (m[k] || []).filter((x) => now - x[0] > 3600000); // aynı saat içindeki tekrar çıktılar tek sayılır
      l.push([now, String(name || '').slice(0, 60)]);
      m[k] = l.slice(-5);
    });
    const keys = Object.keys(m);
    if (keys.length > 20000) keys.sort((x, y) => m[x][m[x].length - 1][0] - m[y][m[y].length - 1][0]).slice(0, keys.length - 20000).forEach((k) => delete m[k]);
    ls.set(USE, m);
  }
  const lastUse = (q, m) => { const l = (m || ls.get(USE, {}))[fp(q)]; return l && l.length ? l[l.length - 1] : null; };

  /* ---------------- kart: onay durumu, revizyon, gözden geçir işareti ---------------- */
  const baseMeta = EK.metaRow;
  EK.metaRow = function metaRowPlus(q) {
    const h = baseMeta(q);
    const u = lastUse(q);
    const inc = q.inceleme && INC.includes(q.inceleme.n) ? q.inceleme : null;
    const extra = `<div class="qmeta qmeta2">` +
      `<select class="qdurum${q.durum ? ' d-' + q.durum : ''}" title="${esc(t('plDurum'))}"><option value="">${esc(t('plDurum_'))}</option>${DUR.map((d) => `<option value="${d}"${q.durum === d ? ' selected' : ''}>${esc(t('plDurum_' + d))}</option>`).join('')}</select>` +
      `<label class="qrevl">🔖 <input class="qrev" dir="auto" placeholder="${esc(t('plRevPh'))}" value="${esc(q.rev || '')}"></label>` +
      (inc ? `<button class="qinc" type="button" title="${esc(t('plFlagTip', { n: t('plInc_' + inc.n) + (inc.not ? ' — ' + inc.not : '') }))}">⚠ ${esc(t('plInc_' + inc.n))}</button>` : '') +
      (u ? `<span class="qused" title="${esc(t('plUsedTip', { d: fmtD(u[0]), s: u[1] || '—' }))}">🕘 ${esc(fmtD(u[0]))}</span>` : '') + `</div>`;
    return h + extra;
  };
  const baseWire = EK.wireCard;
  EK.wireCard = function wireCardPlus(card, q) {
    baseWire(card, q);
    const ds = $('.qdurum', card), rv = $('.qrev', card), ib = $('.qinc', card);
    if (ds) ds.onchange = () => { A().snap(); q.durum = ds.value; if (!q.durum) delete q.durum; ds.className = 'qdurum' + (q.durum ? ' d-' + q.durum : ''); A().changed(); };
    if (rv) rv.oninput = () => { q.rev = rv.value.slice(0, 60); if (!q.rev.trim()) delete q.rev; A().changed(); };
    if (ib) ib.onclick = () => { A().snap(); delete q.inceleme; ib.remove(); A().changed(); A().toast(t('plReviewed'), 'ok', [{ label: t('undo'), onClick: () => A().undo() }]); };
  };

  /* ---------------- onay ve gözden geçirme ---------------- */
  function onayModal() {
    const a = A();
    const body = document.createElement('div');
    const render = () => {
      const qs = a.exam.questions;
      const c = { t: 0, k: 0, o: 0, b: 0 };
      qs.forEach((q) => { c[q.durum || 'b']++; });
      const flagged = qs.filter((q) => q.inceleme);
      const used = ls.get(USE, {});
      // aynı sınavda tekrar eden soru
      const seen = new Map(); let dup = 0;
      qs.forEach((q) => { const k = fp(q); if (!k) return; if (seen.has(k)) dup++; else seen.set(k, q); });
      void used;
      body.innerHTML = `<label class="chk"><input type="checkbox" id="plOn"${a.prefs.onayAkisi ? ' checked' : ''}> <b>${esc(t('plOnayOn'))}</b></label>
        <p class="help">${esc(t('plOnayHelp'))}</p>
        <div class="bkinfo">${esc(t('plOnayCounts', c))}</div>
        <div class="row"><span>${esc(t('plSetSel', { n: a.selected.size }))}</span>${DUR.map((d) => `<button class="btn" data-set="${d}">${esc(t('plDurum_' + d))}</button>`).join('')}<button class="btn" data-set="">${esc(t('plDurum_'))}</button></div>
        <div class="row"><button class="btn" id="plAllOk"${c.b ? '' : ' disabled'}>${esc(t('plSetAll'))}</button></div>
        ${dup ? `<div class="status">⚠ ${esc(t('plDupWarn', { n: dup }))} <button class="btn mini" id="plDup">${esc(t('plDupOpen'))}</button></div>` : ''}
        <h4>${esc(t('plReview'))} (${flagged.length})</h4>
        ${flagged.length ? `<table class="antable"><tbody>${flagged.map((q) => `<tr><td><b>${a.qNumber(q) || '👻'}</b></td><td dir="auto">${esc(pickL(q.text, a.CL()).slice(0, 100))}</td><td>${esc(t('plInc_' + q.inceleme.n))}${q.inceleme.not ? `<br><small>${esc(q.inceleme.not)}</small>` : ''}</td><td style="white-space:nowrap"><button class="btn mini" data-go="${q.id}">${esc(t('plGo'))}</button> <button class="btn mini" data-ok="${q.id}">${esc(t('plReviewed'))}</button></td></tr>`).join('')}</tbody></table>` : `<div class="empty">${esc(t('plReviewNone'))}</div>`}`;
      $('#plOn', body).onchange = (e) => { a.prefs.onayAkisi = e.target.checked; a.savePrefs(); a.renderAll(); render(); };
      body.querySelectorAll('[data-set]').forEach((b) => {
        b.onclick = () => {
          if (!a.selected.size) return a.toast(t('plNoSel'), 'warn');
          a.snap(); let n = 0;
          qs.filter((q) => a.selected.has(q.id)).forEach((q) => { const v = b.dataset.set; if ((q.durum || '') !== v) { if (v) q.durum = v; else delete q.durum; n++; } });
          a.renderList(); a.changed(); a.toast(t('plSetDone', { n }), 'ok', [{ label: t('undo'), onClick: () => a.undo() }]); render();
        };
      });
      $('#plAllOk', body).onclick = () => { a.snap(); let n = 0; qs.forEach((q) => { if (!q.durum) { q.durum = 'o'; n++; } }); a.renderList(); a.changed(); a.toast(t('plSetDone', { n }), 'ok', [{ label: t('undo'), onClick: () => a.undo() }]); render(); };
      if ($('#plDup', body)) $('#plDup', body).onclick = () => { m.close(); const b = document.getElementById('btnEkDup'); if (b) b.click(); };
      body.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => { m.close(); a.setTab('test'); a.scrollToQ(b.dataset.go); }; });
      body.querySelectorAll('[data-ok]').forEach((b) => { b.onclick = () => { const q = qs.find((x) => x.id === b.dataset.ok); if (!q) return; a.snap(); delete q.inceleme; if (q.kaynak) { const r = revOf(q.kaynak); if (r) q.rev = r; } a.renderList(); a.changed(); render(); }; });
    };
    const m = a.modal({ title: t('plOnayTitle'), body, wide: true, buttons: [{ label: t('close'), onClick: (cl) => cl() }] });
    render();
  }

  /* ---------------- kaynak revizyonları ---------------- */
  const REV = 'ek.revler';
  const revOf = (k) => { const r = ls.get(REV, {})[norm(k)]; return r ? r.rev : ''; };
  function revModal() {
    const a = A();
    const body = document.createElement('div');
    const reg = ls.get(REV, {});
    const srcs = new Map();
    a.exam.questions.forEach((q) => { const k = String(q.kaynak || '').trim(); if (!k) return; const n = norm(k); const o = srcs.get(n) || { ad: k, n: 0, old: 0 }; o.n++; const r = reg[n] && reg[n].rev; if (r && q.rev && q.rev !== r) o.old++; srcs.set(n, o); });
    if (!srcs.size) { a.modal({ title: t('plRevTitle'), body: `<p class="help">${esc(t('plRevHelp'))}</p><div class="empty">${esc(t('plRevNone'))}</div>`, buttons: [{ label: t('close'), onClick: (c) => c() }] }); return; }
    const list = [...srcs.entries()].sort((x, y) => x[1].ad.localeCompare(y[1].ad, 'tr'));
    body.innerHTML = `<p class="help">${esc(t('plRevHelp'))}</p><table class="antable"><thead><tr><th>${esc(t('plRevSrc'))}</th><th>${esc(t('plRevQs'))}</th><th>${esc(t('plRevOld'))}</th><th>${esc(t('plRevCur'))}</th></tr></thead><tbody>${list.map(([n, o]) => `<tr><td dir="auto">${esc(o.ad)}</td><td>${o.n}</td><td>${o.old ? `<span class="bad">${o.old}</span>` : '—'}</td><td><input class="in" data-rev="${esc(n)}" value="${esc((reg[n] && reg[n].rev) || '')}" placeholder="${esc(t('plRevPh'))}" style="width:140px" dir="auto"></td></tr>`).join('')}</tbody></table>`;
    a.modal({ title: t('plRevTitle'), body, wide: true, buttons: [
      { label: t('plRevSave'), cls: 'primary', onClick: (c) => {
        const r = ls.get(REV, {});
        body.querySelectorAll('[data-rev]').forEach((i) => { const n = i.dataset.rev; const v = i.value.trim().slice(0, 60); if (v) r[n] = { ad: srcs.get(n).ad, rev: v, t: Date.now() }; else delete r[n]; });
        ls.set(REV, r);
        a.snap(); let flagged = 0;
        a.exam.questions.forEach((q) => {
          const n = norm(q.kaynak); if (!n || !r[n]) return;
          // revizyonu hiç yazılmamış soru güncel revizyona göre yazılmış sayılır
          if (!q.rev) { q.rev = r[n].rev; return; }
          if (q.rev !== r[n].rev && !(q.inceleme && q.inceleme.n === 'revizyon')) { q.inceleme = { n: 'revizyon', t: Date.now(), not: `${q.kaynak}: ${q.rev} → ${r[n].rev}` }; flagged++; }
        });
        a.renderList(); a.changed(); c();
        a.toast(t('plRevDone', { n: flagged }), flagged ? 'warn' : 'ok', [{ label: t('undo'), onClick: () => a.undo() }]);
      } },
      { label: t('close'), onClick: (c) => c() }] });
  }

  /* ---------------- müfredat planı ---------------- */
  const PRESETS = {
    p66: [
      ['M1 Matematik', 'M1 Mathematics', 'M1 الرياضيات'], ['M2 Fizik', 'M2 Physics', 'M2 الفيزياء'], ['M3 Elektrik Temelleri', 'M3 Electrical Fundamentals', 'M3 أساسيات الكهرباء'],
      ['M4 Elektronik Temelleri', 'M4 Electronic Fundamentals', 'M4 أساسيات الإلكترونيات'], ['M5 Sayısal Teknikler / Elektronik Cihaz Sistemleri', 'M5 Digital Techniques / Electronic Instrument Systems', 'M5 التقنيات الرقمية / أنظمة الأجهزة الإلكترونية'],
      ['M6 Malzemeler ve Donanım', 'M6 Materials and Hardware', 'M6 المواد والعتاد'], ['M7 Bakım Uygulamaları', 'M7 Maintenance Practices', 'M7 ممارسات الصيانة'], ['M8 Temel Aerodinamik', 'M8 Basic Aerodynamics', 'M8 الديناميكا الهوائية الأساسية'],
      ['M9 İnsan Faktörleri', 'M9 Human Factors', 'M9 العوامل البشرية'], ['M10 Havacılık Mevzuatı', 'M10 Aviation Legislation', 'M10 تشريعات الطيران'],
      ['M11 Uçak Aerodinamiği, Yapıları ve Sistemleri', 'M11 Aeroplane Aerodynamics, Structures and Systems', 'M11 الديناميكا الهوائية للطائرات وهياكلها وأنظمتها'],
      ['M12 Helikopter Aerodinamiği, Yapıları ve Sistemleri', 'M12 Helicopter Aerodynamics, Structures and Systems', 'M12 الديناميكا الهوائية للمروحيات وهياكلها وأنظمتها'],
      ['M13 Uçak Aerodinamiği, Yapıları ve Sistemleri (B2)', 'M13 Aircraft Aerodynamics, Structures and Systems (B2)', 'M13 الديناميكا الهوائية للطائرات وهياكلها وأنظمتها (B2)'],
      ['M14 Tahrik', 'M14 Propulsion', 'M14 الدفع'], ['M15 Gaz Türbinli Motor', 'M15 Gas Turbine Engine', 'M15 المحرك التوربيني الغازي'], ['M16 Pistonlu Motor', 'M16 Piston Engine', 'M16 المحرك المكبسي'], ['M17 Pervane', 'M17 Propeller', 'M17 المروحة الدافعة'],
    ],
    atpl: [
      ['010 Hava Hukuku', '010 Air Law', '010 قانون الطيران'], ['021 Uçak Genel Bilgisi – Gövde, Sistemler, Güç Ünitesi', '021 Aircraft General Knowledge – Airframe, Systems and Power Plant', '021 المعرفة العامة بالطائرة – الهيكل والأنظمة ووحدة القدرة'],
      ['022 Uçak Genel Bilgisi – Aletler', '022 Aircraft General Knowledge – Instrumentation', '022 المعرفة العامة بالطائرة – الأجهزة'], ['031 Kütle ve Denge', '031 Mass and Balance', '031 الكتلة والتوازن'],
      ['032 Performans', '032 Performance', '032 الأداء'], ['033 Uçuş Planlama ve İzleme', '033 Flight Planning and Monitoring', '033 تخطيط الطيران ومراقبته'], ['040 İnsan Performansı', '040 Human Performance and Limitations', '040 الأداء البشري وحدوده'],
      ['050 Meteoroloji', '050 Meteorology', '050 الأرصاد الجوية'], ['061 Genel Seyrüsefer', '061 General Navigation', '061 الملاحة العامة'], ['062 Radyo Seyrüsefer', '062 Radio Navigation', '062 الملاحة الراديوية'],
      ['070 Harekât Prosedürleri', '070 Operational Procedures', '070 الإجراءات التشغيلية'], ['081 Uçuş Prensipleri', '081 Principles of Flight', '081 مبادئ الطيران'], ['090 Haberleşme', '090 Communications', '090 الاتصالات'],
    ],
  };
  // satırdaki konu ile sorunun konusu: tam / alt konu / kod (M8, 050…) / içerir
  function konuFits(q, k) {
    if (!k) return true;
    if (EK.konuMatch(q, k)) return true;
    const qk = norm(q.konu); if (!qk) return false;
    const kk = norm(k);
    const code = (kk.match(/^(m\d{1,2}|\d{3})\b/) || [])[1];
    if (code && new RegExp('(^|[^a-z0-9])' + code + '([^0-9]|$)').test(qk)) return true;
    return qk.includes(kk);
  }
  async function poolFor(src) {
    const a = A();
    const out = [];
    if (src.exam) a.exam.questions.filter((q) => !q.ghost && a.isAnswered(q)).forEach((q) => out.push({ q, from: 'exam' }));
    try { if (src.mine && window.Bank) (await window.Bank.getMine()).questions.forEach((b) => { try { out.push({ q: a.bankToQuestion(b), from: 'mine' }); } catch { /* bozuk */ } }); } catch { /* yok */ }
    try { if (src.bank && window.Bank) (await window.Bank.load()).bank.questions.forEach((b) => { try { out.push({ q: a.bankToQuestion(b), from: 'bank' }); } catch { /* bozuk */ } }); } catch { /* yok */ }
    return out.filter((x) => x.q && a.isAnswered(x.q));
  }
  async function planModal() {
    const a = A();
    const body = document.createElement('div');
    const plans = ls.get('ek.planlar', []);
    let plan = { ad: '', rows: [{ konu: '', zor: '', adet: 10 }], src: { exam: true, mine: true, bank: false }, gun: 90, onayli: true };
    const li = { tr: 0, en: 1, ar: 2 }[a.prefs.uiLang] || 0;
    let pool = null;
    const loadPool = async () => { pool = null; render(); pool = await poolFor(plan.src); render(); };
    const avail = (r) => (pool ? pool.filter((x) => konuFits(x.q, r.konu) && (!r.zor || x.q.zor === r.zor) && (!plan.onayli || !x.q.durum || x.q.durum === 'o')).length : '…');
    const render = () => {
      const total = plan.rows.reduce((s, r) => s + (+r.adet || 0), 0);
      body.innerHTML = `<p class="help">${esc(t('plPlanHelp'))}</p>
        <div class="row"><label>${esc(t('plPlanName'))} <input class="in" id="ppAd" value="${esc(plan.ad)}" style="width:220px" dir="auto"></label>
          <label>${esc(t('plPreset'))} <select class="in" id="ppPre" style="width:auto"><option value="">${esc(t('plPresetNone'))}</option><option value="p66">${esc(t('plPresetP66'))}</option><option value="atpl">${esc(t('plPresetAtpl'))}</option><option value="cur">${esc(t('plPresetCur'))}</option></select></label>
          ${plans.length ? `<label>${esc(t('plLoad'))} <select class="in" id="ppLoad" style="width:auto"><option value="">—</option>${plans.map((p, i) => `<option value="${i}">${esc(p.ad || '#' + (i + 1))}</option>`).join('')}</select></label>` : ''}</div>
        <table class="antable"><thead><tr><th>${esc(t('plRowKonu'))}</th><th>${esc(t('plRowZor'))}</th><th>${esc(t('plRowAdet'))}</th><th>${esc(t('plRowHave'))}</th><th></th></tr></thead><tbody>${plan.rows.map((r, i) => `<tr>
          <td><input class="in" list="ekKonuList" data-k="${i}" value="${esc(r.konu)}" dir="auto" style="width:100%"></td>
          <td><select class="in" data-z="${i}" style="width:auto"><option value="">${esc(t('plZorAny'))}</option>${['k', 'o', 'z'].map((z) => `<option value="${z}"${r.zor === z ? ' selected' : ''}>${esc(t('ekZor_' + z))}</option>`).join('')}</select></td>
          <td><input class="in" type="number" min="0" max="200" data-n="${i}" value="${+r.adet || 0}" style="width:70px"></td>
          <td>${(() => { const v = avail(r); return typeof v === 'number' && v < (+r.adet || 0) ? `<span class="bad">${v}</span>` : v; })()}</td>
          <td><button class="btn mini" data-del="${i}">✕</button></td></tr>`).join('')}</tbody></table>
        <div class="row"><button class="btn" id="ppAdd">${esc(t('plAddRow'))}</button><b>${esc(t('plTotal', { n: total }))}</b></div>
        <div class="row"><b>${esc(t('plSrc'))}:</b>${['exam', 'mine', 'bank'].map((k) => `<label class="chk"><input type="checkbox" data-src="${k}"${plan.src[k] ? ' checked' : ''}> ${esc(t('plSrc' + k[0].toUpperCase() + k.slice(1)))}</label>`).join('')}${pool ? '' : ` <span class="muted">${esc(t('plLoading'))}</span>`}</div>
        <div class="row"><label class="chk">${t('plDays', { i: `<input class="in" type="number" id="ppGun" min="0" max="3650" value="${+plan.gun || 0}" style="width:70px">` })}</label><label class="chk"><input type="checkbox" id="ppOk"${plan.onayli ? ' checked' : ''}> ${esc(t('plOnlyOk'))}</label></div>
        <div class="row"><button class="btn primary" id="ppGo"${total && pool ? '' : ' disabled'}>${esc(t('plMake'))}</button><button class="btn" id="ppSave">${esc(t('plSave'))}</button>${plans.length ? `<button class="btn" id="ppDel">${esc(t('plDel'))}</button>` : ''}</div>`;
      $('#ppAd', body).oninput = (e) => { plan.ad = e.target.value.slice(0, 80); };
      body.querySelectorAll('[data-k]').forEach((i) => { i.onchange = () => { plan.rows[+i.dataset.k].konu = i.value.trim(); render(); }; });
      body.querySelectorAll('[data-z]').forEach((i) => { i.onchange = () => { plan.rows[+i.dataset.z].zor = i.value; render(); }; });
      body.querySelectorAll('[data-n]').forEach((i) => { i.onchange = () => { plan.rows[+i.dataset.n].adet = Math.max(0, Math.min(200, +i.value || 0)); render(); }; });
      body.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => { plan.rows.splice(+b.dataset.del, 1); if (!plan.rows.length) plan.rows.push({ konu: '', zor: '', adet: 10 }); render(); }; });
      body.querySelectorAll('[data-src]').forEach((c) => { c.onchange = () => { plan.src[c.dataset.src] = c.checked; loadPool(); }; });
      $('#ppAdd', body).onclick = () => { plan.rows.push({ konu: '', zor: '', adet: 5 }); render(); };
      $('#ppGun', body).onchange = (e) => { plan.gun = Math.max(0, +e.target.value || 0); };
      $('#ppOk', body).onchange = (e) => { plan.onayli = e.target.checked; render(); };
      $('#ppPre', body).onchange = (e) => {
        const v = e.target.value; if (!v) return;
        if (v === 'cur') { const ks = [...new Set(a.exam.questions.map((q) => String(q.konu || '').split('>')[0].trim()).filter(Boolean))]; plan.rows = ks.map((k) => ({ konu: k, zor: '', adet: 5 })); }
        else { plan.rows = PRESETS[v].map((r) => ({ konu: r[li] || r[0], zor: '', adet: 0 })); plan.ad = plan.ad || t(v === 'p66' ? 'plPresetP66' : 'plPresetAtpl'); }
        if (!plan.rows.length) plan.rows = [{ konu: '', zor: '', adet: 10 }];
        render();
      };
      if ($('#ppLoad', body)) $('#ppLoad', body).onchange = (e) => { const p = plans[+e.target.value]; if (!p) return; plan = JSON.parse(JSON.stringify(p)); loadPool(); };
      $('#ppSave', body).onclick = () => { if (!plan.ad) plan.ad = t('plPlanName') + ' ' + (plans.length + 1); const i = plans.findIndex((p) => p.ad === plan.ad); if (i >= 0) plans[i] = JSON.parse(JSON.stringify(plan)); else plans.push(JSON.parse(JSON.stringify(plan))); ls.set('ek.planlar', plans.slice(-50)); a.toast(t('plSaved'), 'ok'); render(); };
      if ($('#ppDel', body)) $('#ppDel', body).onclick = () => { const i = plans.findIndex((p) => p.ad === plan.ad); if (i >= 0) { plans.splice(i, 1); ls.set('ek.planlar', plans); render(); } };
      $('#ppGo', body).onclick = () => make();
    };
    const make = async () => {
      const used = ls.get(USE, {});
      const limit = Date.now() - (+plan.gun || 0) * 86400000;
      const taken = new Set();
      const picked = []; const short = []; let oldUsed = 0;
      for (const r of plan.rows) {
        const want = +r.adet || 0; if (!want) continue;
        const cand = pool.filter((x) => konuFits(x.q, r.konu) && (!r.zor || x.q.zor === r.zor) && (!plan.onayli || !x.q.durum || x.q.durum === 'o') && !taken.has(fp(x.q)));
        const fresh = [], old = [];
        cand.forEach((x) => { const u = lastUse(x.q, used); if (u && plan.gun && u[0] > limit) old.push({ x, t: u[0] }); else fresh.push(x); });
        // önce hiç kullanılmamış / eski kullanılmış (sınavdakiler önce), sonra en eski kullanılanlar
        const order = shuffle(fresh).sort((p, q) => (p.from === 'exam' ? 0 : 1) - (q.from === 'exam' ? 0 : 1)).concat(old.sort((p, q) => p.t - q.t).map((o) => o.x));
        const got = [];
        for (const x of order) { if (got.length >= want) break; const k = fp(x.q); if (taken.has(k)) continue; taken.add(k); got.push(x); if (old.some((o) => o.x === x)) oldUsed++; }
        if (got.length < want) short.push(`${r.konu || t('plZorAny')} (${got.length}/${want})`);
        got.forEach((x) => picked.push(x.q));
      }
      if (!picked.length) { a.toast(t('plShort', { l: short.join(', ') }), 'warn', [], 9000); return; }
      const ex = a.newExam();
      ex.school = JSON.parse(JSON.stringify(a.exam.school)); ex.settings = JSON.parse(JSON.stringify(a.exam.settings)); ex.instructions = JSON.parse(JSON.stringify(a.exam.instructions));
      const name = plan.ad || t('plPlanTitle');
      ex.title = { tr: name, en: name, ar: name };
      ex.questions = picked.map((q) => { const c = JSON.parse(JSON.stringify(q)); c.id = a.newQuestion().id; delete c.ist; delete c.gecmis; return c; });
      if (short.length) a.toast(t('plShort', { l: short.join(', ') }), 'warn', [], 9000);
      if (oldUsed) a.toast(t('plOldUsed', { n: oldUsed }), 'warn', [], 7000);
      if (await a.confirmBox(t('plMadeQ', { n: ex.questions.length }))) { m.close(); await a.openExamObject(ex, 'plan-oncesi'); }
    };
    const m = a.modal({ title: t('plPlanTitle'), body, wide: true, buttons: [{ label: t('close'), onClick: (c) => c() }] });
    EK.refreshKonuList();
    loadPool();
  }

  /* ---------------- A/B/C/D kitapçık ---------------- */
  function kitModal() {
    const a = A();
    const body = document.createElement('div');
    const p = { n: 2, shQ: true, shO: true, aKeep: true, omr: true, ...(a.prefs.kit || {}) };
    const qs = EK.examQsFor ? EK.examQsFor({}) : a.liveQs();
    body.innerHTML = `<p class="help">${esc(t('plKitHelp'))}</p>
      <div class="row"><label>${esc(t('plKitN'))} <select class="in" id="kN" style="width:auto">${[2, 3, 4].map((n) => `<option${p.n === n ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>${esc(t('outputLang'))} <select class="in" id="kL" style="width:auto">${LK.map((k) => `<option value="${k}">${window.LANGS[k]}</option>`).join('')}</select></label>
        <label><select class="in" id="kK" style="width:auto"><option value="pdf">📄 ${esc(t('pdf'))}</option><option value="docx">📝 ${esc(t('word'))}</option></select></label></div>
      <div class="row"><label class="chk"><input type="checkbox" id="kQ"${p.shQ ? ' checked' : ''}> ${esc(t('plKitShQ'))}</label><label class="chk"><input type="checkbox" id="kO"${p.shO ? ' checked' : ''}> ${esc(t('plKitShO'))}</label>
        <label class="chk"><input type="checkbox" id="kA"${p.aKeep ? ' checked' : ''}> ${esc(t('plKitAKeep'))}</label><label class="chk"><input type="checkbox" id="kM"${p.omr ? ' checked' : ''}> ${esc(t('plKitOmr'))}</label></div>
      <div class="row"><b>${esc(t('plTotal', { n: qs.length }))}</b>${qs.some((q) => !a.isAnswered(q)) ? `<span class="status">⚠ ${esc(t('answersMissingWarn', { n: qs.filter((q) => !a.isAnswered(q)).length }))}</span>` : ''}</div>
      <div class="row"><button class="btn primary" id="kGo"${qs.length ? '' : ' disabled'}>${esc(t('plKitGo'))}</button><span id="kSt" class="muted"></span></div>`;
    $('#kL', body).value = a.CL();
    $('#kGo', body).onclick = async () => {
      const o = { n: +$('#kN', body).value, shQ: $('#kQ', body).checked, shO: $('#kO', body).checked, aKeep: $('#kA', body).checked, omr: $('#kM', body).checked };
      a.prefs.kit = o; a.savePrefs();
      const lang = $('#kL', body).value, kind = $('#kK', body).value;
      const nOpt = a.S().optionCount;
      const Lx = window.LETTERS[lang];
      const books = [];
      for (let b = 0; b < o.n; b++) {
        const letter = Lx[b];
        const keep = b === 0 && o.aKeep;
        const order = keep || !o.shQ ? qs.map((_, i) => i) : shuffle(qs.map((_, i) => i));
        // perm[i][gösterilen şık] = asıl şık
        const perm = order.map((qi) => { const q = qs[qi]; const used = [...Array(nOpt).keys()].filter((k) => k === q.correct || (q.options[k] && LK.some((l) => (q.options[k][l] || '').trim())) || (q.oimg && q.oimg[k])); const sh = keep || !o.shO ? used : shuffle(used.slice()); return sh.concat([...Array(nOpt).keys()].filter((k) => !sh.includes(k))); });
        const clones = order.map((qi, i) => {
          const q = qs[qi]; const pm = perm[i];
          return { ...q, id: q.id, options: pm.map((k) => q.options[k] || { tr: '', en: '', ar: '' }), oimg: q.oimg ? pm.map((k) => q.oimg[k] || '') : null, correct: a.isAnswered(q) ? pm.indexOf(q.correct) : -1 };
        });
        books.push({ letter, order, perm, clones });
      }
      $('#kGo', body).disabled = true;
      try {
        const title0 = pickL(a.exam.title, lang) || a.examName(a.exam);
        for (const bk of books) {
          $('#kSt', body).textContent = t('plKitBusy', { l: bk.letter });
          const model = a.buildModel('student', lang, { sections: { test: true, scen: false, vocab: false }, qList: bk.clones });
          model.title = `${title0} — ${t('plKitapcik', null, lang)} ${bk.letter}`;
          await EK.prepareModelImages(model);
          const fileName = `${safeName(title0)}-${t('plKitapcik', null, 'tr')}-${bk.letter}-${lang}`.replace(/\s+/g, '-');
          if (kind === 'docx') await api().makeDocx({ model, fileName });
          else await api().makePdf({ html: window.buildHtml(model), pageNumbers: model.pageNumbers, footerLabel: model.labels.page, margins: model.margins, action: 'save', fileName });
        }
        // tüm kitapçıkların cevap anahtarı (tek PDF)
        const rtl = lang === 'ar';
        const T = (k) => t(k, null, lang);
        const rows = qs.map((_, i) => `<tr><td><b>${i + 1}</b></td>${books.map((bk) => { const c = bk.clones[i]; return `<td>${c.correct >= 0 ? Lx[c.correct] : '—'} <small>(${bk.order[i] + 1})</small></td>`; }).join('')}</tr>`).join('');
        const keyHtml = `<!doctype html><html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>body{font-family:Arial,"Noto Sans Arabic",Tahoma,sans-serif;font-size:10pt}h2{font-size:14pt;margin:0 0 6pt}table{border-collapse:collapse;width:100%}td,th{border:.5pt solid #888;padding:2pt 5pt;text-align:center}small{color:#666}tr{break-inside:avoid}</style></head><body>
          <h2>${esc(T('plKitKeyTitle'))} — ${esc(title0)}</h2><p><small>(${esc(T('plKitMaster'))})</small></p>
          <table><thead><tr><th>#</th>${books.map((bk) => `<th>${esc(T('plKitapcik'))} ${esc(bk.letter)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
        await api().makePdf({ html: keyHtml, pageNumbers: true, footerLabel: '', margins: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5 }, action: 'save', fileName: `${safeName(title0)}-cevap-anahtari-kitapciklar`, noTemplate: true });
        // optik formlar: kitapçık başına form kaydı (şık sırasıyla) + tek PDF
        if (o.omr && EK.formHtml && EK.sonucRead) {
          if (qs.length > 100) a.toast(t('omrMax'), 'warn');
          const d = await EK.sonucRead(a.exam.id);
          const parts = [];
          let head = '';
          books.forEach((bk, bi) => {
            const formId = 'K' + bk.letter.replace(/[^A-Za-z]/g, '') + (Date.now() + bi).toString(36).slice(-4).toUpperCase();
            const n = Math.min(100, qs.length);
            d.formlar[formId] = { t: Date.now() + bi, qids: bk.order.slice(0, n).map((qi) => qs[qi].id), perm: bk.perm.slice(0, n), kitapcik: bk.letter, lang };
            const h = EK.formHtml({ lang, formId, n, title: `${title0} — ${T('plKitapcik')} ${bk.letter}`, school: pickL(a.exam.school, lang), copies: 1 });
            if (!head) head = h.split('<body>')[0];
            parts.push(h.split('<body>')[1].split('</body>')[0]);
          });
          await EK.sonucWrite(d);
          await api().makePdf({ html: head + '<body>' + parts.join('') + '</body></html>', pageNumbers: false, margins: { top: 0, bottom: 0, left: 0, right: 0 }, action: 'save', fileName: `${safeName(title0)}-optik-formlar-kitapciklar`, noTemplate: true });
        }
        markUsed(qs.map((q) => q.id), a.examName(a.exam));
        $('#kSt', body).textContent = '';
        a.toast(t('plKitDone', { n: books.length }), 'ok');
      } catch (e) { a.toast(t('error') + ': ' + e.message, 'err', [], 9000); }
      $('#kGo', body).disabled = false;
    };
    a.modal({ title: t('plKitTitle'), body, wide: true, buttons: [{ label: t('close'), onClick: (c) => c() }] });
  }

  /* ---------------- kullanıcı terim sözlüğü ---------------- */
  const GL = 'ek.sozluk';
  let builtinAV = null;
  function applyGlossary() {
    const S = window.SOZLUK; if (!S || !Array.isArray(S.AV)) return;
    if (!builtinAV) builtinAV = S.AV.slice();
    const mine = ls.get(GL, []).filter((r) => r && r[0] && (r[1] || r[2]));
    // kullanıcının terimleri önce: dizinde ilk eşleşen kazanır (çevrimdışı), yapay zekâ isteminde de önce gelir
    S.AV = mine.map((r) => [r[0], r[1] || r[0], r[2] || r[0]]).concat(builtinAV);
    if (window.Ceviri && window.Ceviri.reset) window.Ceviri.reset();
  }
  function glossaryModal() {
    const a = A();
    const body = document.createElement('div');
    let rows = ls.get(GL, []).map((r) => r.slice(0, 3));
    if (!builtinAV) applyGlossary();
    const render = () => {
      body.innerHTML = `<p class="help">${esc(t('plGlHelp', { n: (builtinAV || []).length }))}</p>
        <div class="row"><button class="btn" id="glAdd">${esc(t('plGlAdd'))}</button><button class="btn" id="glImp">${esc(t('plGlCsv'))}</button><button class="btn" id="glExp">${esc(t('plGlExport'))}</button>
          <input class="in" id="glQ" placeholder="${esc(t('plGlSearch'))}" style="width:220px" dir="auto"></div>
        <div id="glHits" class="bkinfo"></div>
        <table class="antable"><thead><tr><th>EN</th><th>TR</th><th>AR</th><th></th></tr></thead><tbody>${rows.map((r, i) => `<tr>${[0, 1, 2].map((c) => `<td><input class="in" data-r="${i}" data-c="${c}" value="${esc(r[c] || '')}" dir="${c === 2 ? 'rtl' : 'ltr'}" style="width:100%"></td>`).join('')}<td><button class="btn mini" data-del="${i}">✕</button></td></tr>`).join('')}</tbody></table>`;
      body.querySelectorAll('[data-r]').forEach((i) => { i.oninput = () => { rows[+i.dataset.r][+i.dataset.c] = i.value.slice(0, 200); }; });
      body.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => { rows.splice(+b.dataset.del, 1); render(); }; });
      $('#glAdd', body).onclick = () => { rows.unshift(['', '', '']); render(); const f = body.querySelector('[data-r="0"][data-c="0"]'); if (f) f.focus(); };
      $('#glQ', body).oninput = (e) => {
        const q = norm(e.target.value);
        $('#glHits', body).innerHTML = q.length < 2 ? '' : (builtinAV || []).filter((r) => r.some((x) => norm(x).includes(q))).slice(0, 12).map((r) => `<div>${esc(r[0])} · ${esc(r[1])} · <span dir="rtl">${esc(r[2])}</span> <button class="btn mini" data-cp="${esc(JSON.stringify(r))}">＋</button></div>`).join('');
        $('#glHits', body).querySelectorAll('[data-cp]').forEach((b) => { b.onclick = () => { rows.unshift(JSON.parse(b.dataset.cp).slice(0, 3)); render(); }; });
      };
      $('#glExp', body).onclick = async () => {
        const p = await api().saveDialog({ defaultPath: 'havacilik-sozluk.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] });
        if (!p) return;
        const cell = (v) => { const s = String(v || ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
        await api().writeText(p, '﻿' + ['EN;TR;AR'].concat(rows.filter((r) => r[0]).map((r) => r.map(cell).join(';'))).join('\r\n'));
        a.toast(t('anSaved', { p }), 'ok');
      };
      $('#glImp', body).onclick = async () => {
        const p = await api().openDialog({ filters: [{ name: 'Excel / Word / CSV', extensions: ['xlsx', 'xls', 'csv', 'txt', 'docx', 'ods'] }] });
        if (!p) return;
        try {
          const sheets = await api().readTable(p);
          const all = (sheets || []).flatMap((s) => s.rows || []);
          let ci = { en: 0, tr: 1, ar: 2 };
          const h = (all[0] || []).map((x) => norm(x));
          if (h.some((x) => /^(en|eng|ingilizce|english|الإنجليزية)$/.test(x))) { ci = { en: h.findIndex((x) => /^(en|eng|ingilizce|english|الإنجليزية)$/.test(x)), tr: h.findIndex((x) => /^(tr|türkçe|turkish|التركية)$/.test(x)), ar: h.findIndex((x) => /^(ar|arapça|arabic|العربية)$/.test(x)) }; all.shift(); }
          const have = new Set(rows.map((r) => norm(r[0])));
          all.forEach((r) => { const en = String(r[ci.en] || '').trim(); if (!en || have.has(norm(en))) return; have.add(norm(en)); rows.push([en, ci.tr >= 0 ? String(r[ci.tr] || '').trim() : '', ci.ar >= 0 ? String(r[ci.ar] || '').trim() : '']); });
          render();
        } catch (e) { a.toast(t('error') + ': ' + e.message, 'err'); }
      };
    };
    render();
    a.modal({ title: t('plGlTitle'), body, wide: true, buttons: [
      { label: t('save'), cls: 'primary', onClick: (c) => { const r = rows.map((x) => x.map((y) => String(y || '').trim())).filter((x) => x[0] && (x[1] || x[2])); ls.set(GL, r.slice(0, 3000)); applyGlossary(); a.toast(t('plGlSaved', { n: r.length }), 'ok'); c(); } },
      { label: t('close'), onClick: (c) => c() }] });
  }

  /* ---------------- öğrenci karnesi ve başarı belgesi ---------------- */
  function docHead(lang, extra) {
    return `<!doctype html><html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>
      body{font-family:Arial,"Noto Sans Arabic",Tahoma,sans-serif;font-size:10pt;color:#111}.pg{page-break-after:always}.pg:last-child{page-break-after:auto}
      h2{font-size:15pt;margin:0 0 4pt}h4{font-size:11pt;margin:10pt 0 4pt;border-bottom:.6pt solid #999}table{width:100%;border-collapse:collapse}td,th{border:.5pt solid #aaa;padding:2pt 5pt;text-align:start;vertical-align:top}
      .big{font-size:22pt;font-weight:bold}.ok{color:#1e7b34}.bad{color:#b00}.pbar{display:inline-block;width:60pt;height:6pt;background:#eee;vertical-align:middle}.pbar i{display:block;height:100%}${extra || ''}</style></head><body>`;
  }
  function langPickModal(title, withPass, go) {
    const a = A();
    const body = document.createElement('div');
    body.innerHTML = `<div class="row"><label>${esc(t('plOutLang'))} <select class="in" id="lpL" style="width:auto">${LK.map((k) => `<option value="${k}">${window.LANGS[k]}</option>`).join('')}</select></label>
      ${withPass ? `<label>${esc(t('plPass'))} <input class="in" type="number" id="lpP" min="0" max="100" value="${+(a.prefs.gecme || 70)}" style="width:70px"></label>` : ''}</div>`;
    $('#lpL', body).value = a.CL();
    a.modal({ title, body, buttons: [{ label: t('plMake2'), cls: 'primary', onClick: async (c) => { const lang = $('#lpL', body).value; const pass = withPass ? Math.max(0, Math.min(100, +$('#lpP', body).value || 0)) : 0; if (withPass) { a.prefs.gecme = pass; a.savePrefs(); } c(); await go(lang, pass); } }, { label: t('close'), onClick: (c) => c() }] });
  }
  EK.karneler = (ex, R) => langPickModal(t('plKarne'), true, async (lang, pass) => {
    const a = A();
    const T = (k, v) => t(k, v, lang);
    const Lx = window.LETTERS[lang];
    const qById = new Map(ex.questions.map((q) => [q.id, q]));
    const title = pickL(ex.title, lang) || a.examName(ex);
    const bar = (p) => `<span class="pbar"><i style="width:${Math.round(p * 100)}%;background:${p >= 0.7 ? '#2e9e5b' : p >= 0.4 ? '#d9a21b' : '#d64545'}"></i></span> %${Math.round(p * 100)}`;
    const pages = R.studs.map((s) => {
      const by = new Map();
      const wrong = [];
      s.qids.forEach((id) => {
        const q = qById.get(id); if (!q || !a.isAnswered(q)) return;
        const k = String(q.konu || '').split('>')[0].trim() || T('ekKonuNone');
        const o = by.get(k) || { k, n: 0, d: 0 }; o.n++;
        const v = s.answers[id];
        if (v === q.correct) o.d++; else wrong.push({ q, v });
        by.set(k, o);
      });
      const kon = [...by.values()].map((o) => ({ ...o, p: o.n ? o.d / o.n : 0 })).sort((x, y) => x.p - y.p);
      const weak = kon.filter((o) => o.p < 0.7);
      const pct = Math.round(s.p * 100);
      return `<div class="pg"><h2>${esc(T('plKarneTitle'))}</h2><div>${esc(title)} · ${esc(fmtD(Date.now()))}</div>
        <table style="margin-top:8pt"><tr><td>${esc(T('omrName'))}</td><td><b dir="auto">${esc(s.ad || '—')}</b></td><td>${esc(T('omrNo'))}</td><td><b>${esc(s.no || '—')}</b></td></tr>
        <tr><td>${esc(T('omrScore'))}</td><td><b>${s.c}</b>/${s.n} · ${esc(T('omrWrong'))}: ${s.w} · ${esc(T('omrBlank'))}: ${s.b}</td><td>%</td><td class="big ${pct >= pass ? 'ok' : 'bad'}">${pct}</td></tr></table>
        <h4>${esc(T('anKonu'))}</h4><table>${kon.map((o) => `<tr><td dir="auto">${esc(o.k)}</td><td>${o.d}/${o.n}</td><td>${bar(o.p)}</td></tr>`).join('')}</table>
        <h4>${esc(T('plKarneWeak'))}</h4>${weak.length ? `<ul>${weak.map((o) => `<li dir="auto">${esc(o.k)} — %${Math.round(o.p * 100)}</li>`).join('')}</ul>` : `<p class="ok">${esc(T('plKarneNoWeak'))}</p>`}
        ${wrong.length ? `<h4>${esc(T('plKarneWrong'))}</h4><table><thead><tr><th>#</th><th></th><th>${esc(T('plKarneYou'))}</th><th>${esc(T('plKarneKey'))}</th></tr></thead><tbody>${wrong.map((w) => `<tr><td>${a.qNumber(w.q) || '—'}</td><td dir="auto">${esc(pickL(w.q.text, lang).slice(0, 140))}</td><td>${w.v == null || w.v < 0 ? '—' : Lx[w.v]}</td><td><b>${Lx[w.q.correct]}</b></td></tr>`).join('')}</tbody></table>` : ''}</div>`;
    });
    const r = await api().makePdf({ html: docHead(lang) + pages.join('') + '</body></html>', pageNumbers: false, footerLabel: '', margins: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5 }, action: 'save', fileName: safeName(a.examName(ex)) + '-karneler', noTemplate: true });
    if (r && r.path) a.toast(t('anSaved', { p: r.path }), 'ok');
  });
  EK.belgeler = (ex, R) => langPickModal(t('plBelge'), true, async (lang, pass) => {
    const a = A();
    const T = (k, v) => t(k, v, lang);
    const list = R.studs.filter((s) => Math.round(s.p * 100) >= pass);
    if (!list.length) { a.toast(t('plBelgeNone'), 'warn'); return; }
    const title = pickL(ex.title, lang) || a.examName(ex);
    const school = pickL(ex.school, lang);
    const css = `@page{size:A4 landscape;margin:0}.cert{height:190mm;margin:10mm;border:3mm double #1f3b6e;padding:16mm;text-align:center;box-sizing:border-box;position:relative}
      .cert .sc{font-size:14pt;color:#1f3b6e;font-weight:bold}.cert .tt{font-size:30pt;letter-spacing:.08em;color:#1f3b6e;margin:14mm 0 8mm;font-weight:bold}
      .cert .nm{font-size:24pt;font-weight:bold;margin:4mm 0}.cert .tx{font-size:14pt;line-height:1.6;margin:6mm 20mm}.cert .ft{position:absolute;left:24mm;right:24mm;bottom:20mm;display:flex;justify-content:space-between;font-size:11pt}
      .cert .ft div{border-top:.4mm solid #333;padding-top:2mm;min-width:60mm}`;
    const pages = list.map((s) => `<div class="pg"><div class="cert">${school ? `<div class="sc">${esc(school)}</div>` : ''}<div class="tt">${esc(T('plBelgeTitle'))}</div>
      <div class="nm" dir="auto">${esc(s.ad || s.no)}</div><div class="tx" dir="auto">${esc(T('plBelgeText', { ad: s.ad || '—', no: s.no || '—', s: title, p: Math.round(s.p * 100) }))}</div>
      <div class="ft"><div>${esc(T('plBelgeDate'))}: ${esc(fmtD(Date.now()))}</div><div>${esc(T('plBelgeSign'))}</div></div></div></div>`);
    const r = await api().makePdf({ html: docHead(lang, css) + pages.join('') + '</body></html>', pageNumbers: false, footerLabel: '', margins: { top: 0, bottom: 0, left: 0, right: 0 }, action: 'save', fileName: safeName(a.examName(ex)) + '-basari-belgeleri', noTemplate: true });
    if (r && r.path) a.toast(t('anSaved', { p: r.path }), 'ok');
  });

  /* ---------------- toplu soru içe aktarma ---------------- */
  const HEAD = {
    text: /^(soru|soru metni|question|question text|stem|السؤال|نص السؤال)$/,
    a: /^(a|a şıkkı|option a|أ|الخيار أ)$/, b: /^(b|b şıkkı|option b|ب|الخيار ب)$/, c: /^(c|c şıkkı|option c|ج|الخيار ج)$/, d: /^(d|d şıkkı|option d|د|الخيار د)$/, e: /^(e|e şıkkı|option e|هـ|ه|الخيار هـ)$/,
    correct: /^(doğru|doğru cevap|cevap|correct|answer|key|الصحيحة|الإجابة|الإجابة الصحيحة)$/,
    konu: /^(konu|topic|subject|module|modül|الموضوع|الوحدة)$/, zor: /^(zorluk|difficulty|level|الصعوبة)$/, kaynak: /^(kaynak|source|reference|المصدر|المرجع)$/,
    rev: /^(revizyon|rev|revision|المراجعة)$/, lang: /^(dil|language|lang|اللغة)$/,
  };
  const ZORMAP = { k: 'k', kolay: 'k', easy: 'k', 'سهل': 'k', 1: 'k', o: 'o', orta: 'o', medium: 'o', 'متوسط': 'o', 2: 'o', z: 'z', zor: 'z', hard: 'z', 'صعب': 'z', 3: 'z' };
  const LANGMAP = { tr: 'tr', türkçe: 'tr', turkish: 'tr', 'التركية': 'tr', en: 'en', ingilizce: 'en', english: 'en', 'الإنجليزية': 'en', ar: 'ar', arapça: 'ar', arabic: 'ar', 'العربية': 'ar' };
  function parseRows(rows) {
    const a = A();
    let hi = -1, col = null;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const h = rows[i].map((x) => norm(x).replace(/[:.]$/, ''));
      const c = {};
      Object.entries(HEAD).forEach(([k, re]) => { const j = h.findIndex((x) => re.test(x)); if (j >= 0) c[k] = j; });
      if (c.text != null && c.a != null && c.b != null) { hi = i; col = c; break; }
    }
    if (hi < 0) return null;
    const nOpt = a.S().optionCount;
    const Ls = ['a', 'b', 'c', 'd', 'e'];
    const out = []; let bad = 0;
    const cl0 = a.CL();
    rows.slice(hi + 1).forEach((r) => {
      const g = (k) => (col[k] == null ? '' : String(r[col[k]] == null ? '' : r[col[k]]).trim());
      const text = g('text');
      const opts = Ls.map((k) => g(k));
      if (!text && opts.every((x) => !x)) return;
      if (!text || opts.filter(Boolean).length < 2) { bad++; return; }
      const lang = LANGMAP[norm(g('lang'))] || cl0;
      const cr = g('correct');
      let correct = -1;
      const cn = norm(cr);
      const lettersAll = LK.map((l) => window.LETTERS[l].map((x) => norm(x)));
      if (/^[a-e]$/.test(cn)) correct = cn.charCodeAt(0) - 97;
      else if (/^[1-5]$/.test(cn)) correct = +cn - 1;
      else { lettersAll.forEach((L) => { const j = L.indexOf(cn); if (j >= 0 && correct < 0) correct = j; }); if (correct < 0 && cn) correct = opts.findIndex((o) => norm(o) === cn); }
      const q = a.newQuestion();
      q.text[lang] = text;
      q.options = Ls.map((_, k) => { const o = { tr: '', en: '', ar: '' }; o[lang] = opts[k] || ''; return o; });
      q.correct = correct >= 0 && correct < Math.max(nOpt, opts.filter(Boolean).length) ? correct : -1;
      const z = ZORMAP[norm(g('zor'))]; if (z) q.zor = z;
      if (g('konu')) q.konu = g('konu').slice(0, 120);
      if (g('kaynak')) q.kaynak = g('kaynak').slice(0, 160);
      if (g('rev')) q.rev = g('rev').slice(0, 60);
      q.durum = 't';
      out.push(q);
    });
    return { qs: out, bad };
  }
  function importModal() {
    const a = A();
    const body = document.createElement('div');
    let found = null;
    const render = () => {
      body.innerHTML = `<p class="help">${esc(t('plImpHelp'))}</p>
        <div class="row"><button class="btn" id="imTpl">${esc(t('plImpTpl'))}</button><button class="btn primary" id="imPick">${esc(t('plImpPick'))}</button></div>
        <div id="imInfo" class="bkinfo">${found ? esc(t('plImpFound', { n: found.qs.length, s: found.skip, b: found.bad })) : ''}</div>
        ${found && found.qs.length ? `<div class="bkinfo" style="max-height:220px;overflow:auto">${found.qs.slice(0, 30).map((q, i) => `<div dir="auto">${i + 1}. ${esc(pickL(q.text, a.CL()).slice(0, 120))}${q.correct >= 0 ? ` <b>(${a.letters()[q.correct]})</b>` : ' <span class="bad">?</span>'}</div>`).join('')}</div>
          <div class="row"><button class="btn primary" id="imAdd">${esc(t('plImpAdd', { n: found.qs.length }))}</button></div>` : ''}`;
      $('#imTpl', body).onclick = async () => {
        const p = await api().saveDialog({ defaultPath: 'soru-sablonu.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] });
        if (!p) return;
        const ex = ['Soru;A;B;C;D;E;Doğru;Konu;Zorluk;Kaynak;Revizyon;Dil', 'Stol hangi durumda meydana gelir?;Kritik hücum açısı aşıldığında;Hız arttığında;İtki azaldığında;Flaplar açıldığında;İrtifa arttığında;A;M8 Temel Aerodinamik;Orta;EASA Part-66 App. I;Rev 1;tr', 'What is the primary purpose of the ailerons?;Control about the longitudinal axis (roll);Control about the lateral axis (pitch);Control about the vertical axis (yaw);Increase lift for take-off;Reduce drag in cruise;A;081 Principles of Flight;Easy;;;en'];
        await api().writeText(p, '﻿' + ex.join('\r\n'));
        a.toast(t('anSaved', { p }), 'ok');
      };
      $('#imPick', body).onclick = async () => {
        const p = await api().openDialog({ filters: [{ name: 'Excel / Word / CSV', extensions: ['xlsx', 'xls', 'xlsm', 'ods', 'csv', 'txt', 'docx', 'doc', 'odt'] }] });
        if (!p) return;
        try {
          const sheets = await api().readTable(p);
          let res = null;
          for (const s of sheets || []) { const r = parseRows(s.rows || []); if (r) { if (!res) res = { qs: [], bad: 0 }; res.qs.push(...r.qs); res.bad += r.bad; } }
          if (!res) { found = null; render(); $('#imInfo', body).textContent = t('plImpNoHead'); return; }
          const have = new Set(a.exam.questions.flatMap((q) => LK.map((l) => norm(q.text[l])).filter(Boolean)));
          const qs = []; let skip = 0;
          res.qs.forEach((q) => { const k = LK.map((l) => norm(q.text[l])).filter(Boolean); if (k.some((x) => have.has(x))) { skip++; return; } k.forEach((x) => have.add(x)); qs.push(q); });
          found = { qs, skip, bad: res.bad };
          render();
        } catch (e) { a.toast(t('error') + ': ' + e.message, 'err', [], 9000); }
      };
      if ($('#imAdd', body)) $('#imAdd', body).onclick = () => {
        a.snap();
        found.qs.forEach((q) => a.exam.questions.push(q));
        const first = found.qs[0];
        a.renderAll(); a.changed(); EK.refreshKonuList();
        a.toast(t('plImpAdded', { n: found.qs.length }), 'ok', [{ label: t('undo'), onClick: () => a.undo() }]);
        m.close(); a.setTab('test'); if (first) a.scrollToQ(first.id);
      };
    };
    const m = a.modal({ title: t('plImpTitle'), body, wide: true, buttons: [{ label: t('close'), onClick: (c) => c() }] });
    render();
  }

  /* ---------------- yedek denetimi ---------------- */
  function backupModal() {
    const a = A();
    const body = document.createElement('div');
    body.innerHTML = `<p class="help">${esc(t('plBakHelp'))}</p>
      <div class="row"><button class="btn primary" id="bkNow">${esc(t('plBakNow'))}</button><button class="btn" id="bkChk">${esc(t('plBakCheck'))}</button><button class="btn" id="bkOpen">${esc(t('plBakOpen'))}</button></div><div id="bkRes"></div>`;
    const check = async () => {
      const r = await api().yedek.dogrula();
      $('#bkRes', body).innerHTML = `<div class="bkinfo ${r.bozuk.length ? '' : 'ok'}">${esc(t('plBakRes', { s: r.saglam, n: r.toplam, d: r.son ? new Date(r.son).toLocaleString() : '—' }))}</div>
        <table class="antable"><tbody>${r.gruplar.map((g) => `<tr><td>${esc(g.ad)}</td><td>${g.ok}/${g.n}</td></tr>`).join('')}</tbody></table>
        ${r.bozuk.length ? `<p class="bad">${esc(t('plBakBad'))}</p><ul>${r.bozuk.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
    };
    $('#bkNow', body).onclick = async () => { if (a.flushForUpdate) { try { await a.flushForUpdate(); } catch { /* yok */ } } const ok = await api().yedek.simdi(); a.toast(t(ok ? 'plBakDone' : 'plBakSame'), 'ok'); check(); };
    $('#bkChk', body).onclick = check;
    $('#bkOpen', body).onclick = () => api().openBackups && api().openBackups();
    a.modal({ title: t('plBakTitle'), body, wide: true, buttons: [{ label: t('close'), onClick: (c) => c() }] });
    check();
  }

  Object.assign(EK, { markUsed, lastUse, fp, onayModal, revModal, planModal, kitModal, glossaryModal, importModal, backupModal, applyGlossary, parseRows, konuFits });
  EK.addSide('btnPlOnay', () => t('plOnayBtn'), onayModal);
  EK.addSide('btnPlPlan', () => t('plPlanBtn'), planModal);
  EK.addSide('btnPlKit', () => t('plKitBtn'), kitModal);
  EK.addSide('btnPlRev', () => t('plRevBtn'), revModal);
  EK.addSide('btnPlGl', () => t('plGlBtn'), glossaryModal);
  EK.addSide('btnPlImp', () => t('plImpBtn'), importModal);
  EK.addSide('btnPlBak', () => t('plBakBtn'), backupModal);
  // kullanıcı sözlüğü ilk çeviriden önce devrede olsun
  try { applyGlossary(); } catch { /* sözlük yok */ }
})();
