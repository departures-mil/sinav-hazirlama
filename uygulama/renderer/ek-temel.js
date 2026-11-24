'use strict';
/* Sınav Hazırlama 1.10.1 — soru ek alanları ve ortak yardımcılar (window.EK).
   Soruya eklenen alanlar (hepsi isteğe bağlı; eski dosyalar olduğu gibi açılır):
     zor    : '' | 'k' (kolay) | 'o' (orta) | 'z' (zor)          zorOto: zorluk analiz raporundan otomatik verildiyse true
     konu   : "Meteoroloji > Bulutlar" gibi konu yolu              kaynak: "SHY-İHA madde 12" gibi kaynak
     img    : soru görseli (data: adresi)                          oimg  : şık görselleri [5] (boş = yok)
     gecmis : düzenleme geçmişi [{ t, text, options, correct, zor, konu, kaynak, img, oimg }] (en yeni sonda, en çok 20)
     ist    : { n, d, t } — analiz raporlarından: cevaplayan sayısı, doğru sayısı, son güncelleme
   Bu dosya app.js'ten önce yüklenir; uygulamanın iç işlevlerine window.__app üzerinden çağrı anında ulaşır. */
(function () {
  const A = () => window.__app;
  const t = (...a) => window.t(...a);
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const LK = ['tr', 'en', 'ar'];

  Object.assign(window.I18N, {
    ekImgTip: ['Soruya görsel ekle / değiştir', 'Add / change the question image', 'إضافة صورة للسؤال / تغييرها'],
    ekOptImgTip: ['Bu şıkka görsel ekle / değiştir', 'Add / change an image for this option', 'إضافة صورة لهذا الخيار / تغييرها'],
    ekHistTip: ['Değişiklik geçmişi (eski hâline dön)', 'Edit history (restore an older version)', 'سجل التعديلات (استعادة نسخة سابقة)'],
    ekAuditOneTip: ['Yapay zekâ denetimi: cevap anahtarı, iki doğru şık, çeviri tutarlılığı', 'AI check: answer key, two correct options, translation consistency', 'تدقيق بالذكاء الاصطناعي: مفتاح الإجابة، خياران صحيحان، اتساق الترجمة'],
    ekZor: ['Zorluk', 'Difficulty', 'الصعوبة'],
    ekZorNone: ['Zorluk —', 'Difficulty —', 'الصعوبة —'],
    ekZor_k: ['Kolay', 'Easy', 'سهل'], ekZor_o: ['Orta', 'Medium', 'متوسط'], ekZor_z: ['Zor', 'Hard', 'صعب'],
    ekZorOtoTip: ['Analiz raporundan otomatik: {p} doğru ({n} öğrenci)', 'Set automatically from the analysis report: {p} correct ({n} students)', 'تلقائياً من تقرير التحليل: {p} إجابات صحيحة ({n} طالب)'],
    ekKonu: ['Konu', 'Topic', 'الموضوع'],
    ekKonuPh: ['Konu (ör. Meteoroloji > Bulutlar)', 'Topic (e.g. Meteorology > Clouds)', 'الموضوع (مثال: الأرصاد > الغيوم)'],
    ekKaynakPh: ['Kaynak (ör. SHY-İHA madde 12)', 'Source (e.g. SHY-İHA art. 12)', 'المصدر (مثال: SHY-İHA المادة 12)'],
    ekKonuAll: ['Tüm konular', 'All topics', 'كل المواضيع'],
    ekKonuNone: ['Konusuz', 'No topic', 'بلا موضوع'],
    ekImgTitle: ['Görsel', 'Image', 'صورة'],
    ekImgTitleQ: ['Soru görseli — Soru {n}', 'Question image — Question {n}', 'صورة السؤال — السؤال {n}'],
    ekImgTitleO: ['{l} şıkkının görseli — Soru {n}', 'Image of option {l} — Question {n}', 'صورة الخيار {l} — السؤال {n}'],
    ekImgFile: ['📁 Dosyadan seç', '📁 Choose a file', '📁 اختيار ملف'],
    ekImgPaste: ['📋 Panodan yapıştır', '📋 Paste from clipboard', '📋 لصق من الحافظة'],
    ekImgLib: ['Hazır havacılık görselleri', 'Ready aviation figures', 'صور طيران جاهزة'],
    ekImgLibHint: ['Bir görsele tıklayın; soruya eklenir. Dosya ya da panodan da ekleyebilirsiniz (PNG, JPG, SVG). Görsel küçültülür, sınav dosyası şişmez.', 'Click a figure to add it. You can also add from a file or the clipboard (PNG, JPG, SVG). Images are resized so the exam file stays small.', 'انقر على صورة لإضافتها. يمكنك أيضاً الإضافة من ملف أو من الحافظة (PNG أو JPG أو SVG). تُصغَّر الصور كي يبقى ملف الاختبار صغيراً.'],
    ekImgSuggest: ['Bu soruya uygun görünenler', 'Suggested for this question', 'مقترحة لهذا السؤال'],
    ekImgRemove: ['🗑 Görseli kaldır', '🗑 Remove image', '🗑 إزالة الصورة'],
    ekImgChange: ['Değiştir', 'Change', 'تغيير'],
    ekImgDel: ['Kaldır', 'Remove', 'إزالة'],
    ekImgBig: ['Görsel çok büyük ya da okunamadı.', 'The image is too large or unreadable.', 'الصورة كبيرة جداً أو غير قابلة للقراءة.'],
    ekImgNoClip: ['Panoda görsel yok.', 'No image on the clipboard.', 'لا توجد صورة في الحافظة.'],
    ekImgAdded: ['Görsel eklendi.', 'Image added.', 'أُضيفت الصورة.'],
    ekImgRemoved: ['Görsel kaldırıldı.', 'Image removed.', 'أُزيلت الصورة.'],
    ekImgDrop: ['Görseli buraya bırakabilirsiniz', 'You can drop an image here', 'يمكنك إفلات صورة هنا'],
    ekHistTitle: ['Değişiklik geçmişi — Soru {n}', 'Edit history — Question {n}', 'سجل التعديلات — السؤال {n}'],
    ekHistNone: ['Bu sorunun kayıtlı eski hâli yok. Soru düzenlendikçe önceki hâli burada saklanır (en çok 20).', 'No older versions yet. Each time the question is edited, the previous version is kept here (up to 20).', 'لا توجد نسخ سابقة بعد. عند كل تعديل تُحفظ النسخة السابقة هنا (حتى 20).'],
    ekHistNow: ['Şimdiki hâli', 'Current version', 'النسخة الحالية'],
    ekHistRestore: ['↩ Bu hâline dön', '↩ Restore this version', '↩ استعادة هذه النسخة'],
    ekHistRestored: ['Soru eski hâline döndürüldü (şimdiki hâli de geçmişe kaydedildi).', 'Question restored (the current version was also saved to history).', 'استُعيدت النسخة السابقة (وحُفظت النسخة الحالية في السجل أيضاً).'],
    ekHistDiff: ['Değişenler', 'Changed', 'التغييرات'],
    ekF_text: ['soru metni', 'question text', 'نص السؤال'], ekF_options: ['şıklar', 'options', 'الخيارات'], ekF_correct: ['doğru cevap', 'correct answer', 'الإجابة الصحيحة'],
    ekF_img: ['görsel', 'image', 'الصورة'], ekF_meta: ['zorluk / konu / kaynak', 'difficulty / topic / source', 'الصعوبة / الموضوع / المصدر'],
    ekBiTest: ['Test sorularını iki dilde yan yana yaz', 'Print test questions side by side in two languages', 'اكتب أسئلة الاختبار بلغتين جنباً إلى جنب'],
    ekBiTestHint: ['Arapça sütun sağdan sola yazılır; sütun ayarı tek sütun olur.', 'The Arabic column is written right-to-left; the page uses a single column.', 'يُكتب العمود العربي من اليمين إلى اليسار؛ تُستخدم الصفحة بعمود واحد.'],
    ekSideTools: ['Gelişmiş', 'Advanced', 'متقدم'],
  });

  const ZOR = ['k', 'o', 'z'];
  const imgOk = (s) => typeof s === 'string' && /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 4 * 1024 * 1024;
  const str = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').slice(0, n) : '');
  const ML = (v) => ({ tr: '', en: '', ar: '', ...(v || {}) });

  // Eski / yeni / arşiv sorusundan ek alanları süzer (boş alanlar yazılmaz: dosya küçük kalır)
  function qExtra(q) {
    const o = {};
    if (!q) return o;
    if (ZOR.includes(q.zor)) { o.zor = q.zor; if (q.zorOto) o.zorOto = true; }
    const konu = str(q.konu, 120).trim(); if (konu) o.konu = konu;
    const kaynak = str(q.kaynak, 160).trim(); if (kaynak) o.kaynak = kaynak;
    if (imgOk(q.img)) o.img = q.img;
    if (Array.isArray(q.oimg) && q.oimg.some(imgOk)) { o.oimg = [0, 1, 2, 3, 4].map((i) => (imgOk(q.oimg[i]) ? q.oimg[i] : '')); }
    if (Array.isArray(q.gecmis) && q.gecmis.length) {
      o.gecmis = q.gecmis.filter((h) => h && h.text).slice(-20).map((h) => ({
        t: +h.t || 0, text: ML(h.text), options: (h.options || []).slice(0, 5).map(ML), correct: Number.isInteger(h.correct) ? h.correct : -1,
        ...(ZOR.includes(h.zor) ? { zor: h.zor } : {}), ...(h.konu ? { konu: str(h.konu, 120) } : {}), ...(h.kaynak ? { kaynak: str(h.kaynak, 160) } : {}),
        ...(imgOk(h.img) ? { img: h.img } : {}), ...(Array.isArray(h.oimg) && h.oimg.some(imgOk) ? { oimg: h.oimg.map((x) => (imgOk(x) ? x : '')) } : {}),
        ...(h.imgKeep ? { imgKeep: true } : {}), ...(h.oimgKeep ? { oimgKeep: true } : {}),
      }));
    }
    if (q.ist && +q.ist.n > 0) o.ist = { n: Math.round(+q.ist.n), d: Math.max(0, Math.min(+q.ist.n, Math.round(+q.ist.d || 0))), t: +q.ist.t || 0 };
    return o;
  }
  // arşiv sorusunun konu adı: alt konu varsa "İngilizce > Zaman"
  function bankKonu(bq) {
    if (bq.konu) return bq.konu;
    const top = { uav: t('bkTuav'), eng: t('bkTeng'), vocab: t('bkTvocab'), oxf: t('bkToxf') }[bq.topic];
    if (!top) return '';
    const sub = bq.sub ? (window.I18N['sub_' + bq.sub] ? t('sub_' + bq.sub) : bq.sub) : '';
    return sub ? `${top} > ${sub}` : top;
  }

  /* ---------------- kart: zorluk, konu, kaynak, görseller, geçmiş ---------------- */
  function zorSelect(q) {
    const tip = q.zorOto && q.ist ? t('ekZorOtoTip', { p: '%' + Math.round((100 * q.ist.d) / q.ist.n), n: q.ist.n }) : t('ekZor');
    return `<select class="qzor${q.zor ? ' on z-' + q.zor : ''}" title="${esc(tip)}"><option value="">${esc(t('ekZorNone'))}</option>${ZOR.map((z) => `<option value="${z}"${q.zor === z ? ' selected' : ''}>${q.zorOto && q.zor === z ? '⚙ ' : ''}${esc(t('ekZor_' + z))}</option>`).join('')}</select>`;
  }
  function metaRow(q) {
    return `<div class="qmeta"><label>🗂 <input class="qkonu" list="ekKonuList" dir="auto" placeholder="${esc(t('ekKonuPh'))}" value="${esc(q.konu || '')}"></label>` +
      `<label>📚 <input class="qkaynak" dir="auto" placeholder="${esc(t('ekKaynakPh'))}" value="${esc(q.kaynak || '')}"></label></div>`;
  }
  // geçmiş için sorunun karşılaştırılabilir hâli
  const qSnap = (q) => ({ text: ML(q.text), options: q.options.map(ML), correct: q.correct, zor: q.zor || '', konu: q.konu || '', kaynak: q.kaynak || '', img: q.img || '', oimg: q.oimg ? q.oimg.slice() : [] });
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function histCommit(q, before, card) {
    if (!before || same(before, qSnap(q))) return false;
    const h = { t: Date.now(), ...before };
    // görsel değişmediyse kopyası saklanmaz (dosya şişmesin): "aynı kaldı" işareti yeter
    if (h.img && h.img === (q.img || '')) { delete h.img; h.imgKeep = true; } else if (!h.img) delete h.img;
    if (same(h.oimg, q.oimg ? q.oimg.slice() : [])) { delete h.oimg; if (q.oimg && q.oimg.some(Boolean)) h.oimgKeep = true; } else if (!h.oimg || !h.oimg.some(Boolean)) delete h.oimg;
    if (!h.zor) delete h.zor; if (!h.konu) delete h.konu; if (!h.kaynak) delete h.kaynak;
    q.gecmis = (q.gecmis || []).concat(h);
    // en çok 20 kayıt; görselli eski kayıtlar dosyayı şişirmesin: en yeni 3 kayıt dışındakilerin görseli silinir
    if (q.gecmis.length > 20) q.gecmis = q.gecmis.slice(-20);
    const b = card && $('.histbtn small', card); if (b) b.textContent = q.gecmis.length;
    return true;
  }
  function wireCard(card, q) {
    // düzenleme oturumu: kartın içine odak girince önceki hâl alınır, karttan çıkınca fark varsa geçmişe yazılır
    card.addEventListener('focusin', () => { if (!card._before) card._before = qSnap(q); });
    card.addEventListener('focusout', (e) => {
      if (e.relatedTarget && card.contains(e.relatedTarget)) return;
      const b = card._before; card._before = null;
      if (histCommit(q, b, card)) A().changed();
    });
    const zs = $('.qzor', card);
    zs.onchange = () => {
      A().snap(); q.zor = zs.value; delete q.zorOto;
      zs.className = 'qzor' + (q.zor ? ' on z-' + q.zor : '');
      [...zs.options].forEach((o) => { o.textContent = o.value ? t('ekZor_' + o.value) : t('ekZorNone'); });
      A().changed();
    };
    const ki = $('.qkonu', card), ka = $('.qkaynak', card);
    ki.oninput = () => { q.konu = ki.value.slice(0, 120); if (!q.konu) delete q.konu; A().changed(); };
    ki.onchange = () => { ki.value = ki.value.trim(); q.konu = ki.value; if (!q.konu) delete q.konu; refreshKonuList(); };
    ka.oninput = () => { q.kaynak = ka.value.slice(0, 160); if (!q.kaynak) delete q.kaynak; A().changed(); };
    renderCardImages(card, q);
    // görseli karta sürükleyip bırakma
    card.addEventListener('dragover', (e) => { if ([...(e.dataTransfer.items || [])].some((i) => i.kind === 'file' && /^image\//.test(i.type))) { e.preventDefault(); card.classList.add('dropimg'); } });
    card.addEventListener('dragleave', () => card.classList.remove('dropimg'));
    card.addEventListener('drop', async (e) => {
      const f = [...(e.dataTransfer.files || [])].find((x) => /^image\//.test(x.type));
      card.classList.remove('dropimg');
      if (!f) return;
      e.preventDefault();
      const row = e.target.closest && e.target.closest('.opt');
      try { setImage(q, row ? +row.dataset.k : -1, await fileToData(f)); } catch { A().toast(t('ekImgBig'), 'warn'); }
    });
  }
  function renderCardImages(card, q) {
    const box = $('.qimg', card);
    if (box) {
      box.innerHTML = q.img ? `<figure><img src="${q.img}" alt=""><figcaption><button data-x="ch">🖼 ${esc(t('ekImgChange'))}</button><button data-x="rm">✕ ${esc(t('ekImgDel'))}</button></figcaption></figure>` : '';
      box.style.display = q.img ? '' : 'none';
      box.querySelectorAll('button').forEach((b) => { b.onclick = () => (b.dataset.x === 'rm' ? setImage(q, -1, '') : pickImage(q, -1)); });
      const im = $('img', box); if (im) im.onclick = () => pickImage(q, -1);
    }
    card.querySelectorAll('.oimg').forEach((sp) => {
      const k = +sp.dataset.k; const src = q.oimg && q.oimg[k];
      sp.innerHTML = src ? `<img src="${src}" alt="" title="${esc(t('ekImgChange'))}"><button title="${esc(t('ekImgDel'))}">✕</button>` : '';
      if (src) { $('img', sp).onclick = () => pickImage(q, k); $('button', sp).onclick = () => setImage(q, k, ''); }
    });
  }
  function setImage(q, k, data) {
    const a = A();
    a.snap();
    const b0 = qSnap(q);
    if (k < 0) { if (data) q.img = data; else delete q.img; } else {
      q.oimg = q.oimg || ['', '', '', '', ''];
      q.oimg[k] = data || '';
      if (!q.oimg.some(Boolean)) delete q.oimg;
    }
    histCommit(q, b0, null);
    a.rerenderCard(q);
    a.toast(t(data ? 'ekImgAdded' : 'ekImgRemoved'), 'ok', [{ label: t('undo'), onClick: () => a.undo() }]);
  }

  /* ---------------- görsel: küçült, dosyadan / panodan / kütüphaneden ---------------- */
  const readAsData = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
  const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('img')); im.src = src; });
  // en çok 1200 px; fotoğraf JPEG (%85), çizim/saydam PNG; SVG olduğu gibi (küçükse)
  async function shrink(data) {
    if (/^data:image\/svg\+xml/.test(data) && data.length < 400 * 1024) return data;
    const im = await loadImg(data);
    const max = 1200;
    const sc = Math.min(1, max / Math.max(im.naturalWidth || im.width, im.naturalHeight || im.height));
    if (sc === 1 && data.length < 350 * 1024 && /^data:image\/(png|jpe?g)/.test(data)) return data;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round((im.naturalWidth || im.width) * sc)); c.height = Math.max(1, Math.round((im.naturalHeight || im.height) * sc));
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0, c.width, c.height);
    // saydamlık var mı / az renkli çizim mi: PNG; değilse JPEG
    let alpha = false, colors = new Set();
    try {
      const d = g.getImageData(0, 0, c.width, c.height).data;
      for (let i = 0; i < d.length; i += 4 * 37) { if (d[i + 3] < 250) alpha = true; if (colors.size < 400) colors.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4)); }
    } catch { /* yok */ }
    if (alpha || colors.size < 120) return c.toDataURL('image/png');
    return c.toDataURL('image/jpeg', 0.85);
  }
  async function fileToData(f) {
    if (f.size > 25 * 1024 * 1024) throw new Error('big');
    const d = await shrink(await readAsData(f));
    if (!imgOk(d)) throw new Error('bad');
    return d;
  }
  const svgData = (svg) => 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  // sorunun metnine göre kütüphaneden öneri
  function suggest(q) {
    const txt = LK.map((k) => (q.text[k] || '') + ' ' + q.options.map((o) => o[k] || '').join(' ')).join(' ').toLocaleLowerCase('tr');
    return (window.EK_FIG || []).map((f) => ({ f, s: (f.kw || []).reduce((a, w) => a + (txt.includes(w) ? 1 : 0), 0) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 6).map((x) => x.f);
  }
  function pickImage(q, k) {
    const a = A();
    const n = a.qNumber(q) || '👻';
    const cur = k < 0 ? q.img : q.oimg && q.oimg[k];
    const L = a.letters();
    const body = document.createElement('div');
    const figs = window.EK_FIG || [];
    const sug = k < 0 ? suggest(q) : [];
    const figHtml = (f) => `<button class="figbtn" data-f="${esc(f.id)}" title="${esc(f.ad[window.UI_LANG] || f.ad.tr)}"><img src="${svgData(f.svg)}" alt=""><span>${esc(f.ad[window.UI_LANG] || f.ad.tr)}</span></button>`;
    body.innerHTML = `
      <p class="help">${esc(t('ekImgLibHint'))}</p>
      <div class="row">
        <button class="btn primary" id="imFile">${esc(t('ekImgFile'))}</button>
        <button class="btn" id="imPaste">${esc(t('ekImgPaste'))}</button>
        ${cur ? `<button class="btn danger" id="imDel">${esc(t('ekImgRemove'))}</button>` : ''}
        <input type="file" id="imInput" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" style="display:none">
      </div>
      ${cur ? `<div class="imcur"><img src="${cur}" alt=""></div>` : ''}
      <div class="imdrop">${esc(t('ekImgDrop'))}</div>
      ${sug.length ? `<h4>✨ ${esc(t('ekImgSuggest'))}</h4><div class="figgrid">${sug.map(figHtml).join('')}</div>` : ''}
      <h4>✈ ${esc(t('ekImgLib'))} (${figs.length})</h4>
      <div class="figgrid">${figs.map(figHtml).join('')}</div>`;
    const m = a.modal({ title: k < 0 ? t('ekImgTitleQ', { n }) : t('ekImgTitleO', { l: L[k], n }), body, wide: true, buttons: [{ label: t('close'), onClick: (c) => c() }] });
    const done = (d) => { m.close(); setImage(q, k, d); };
    const take = async (blob) => { try { done(await fileToData(blob)); } catch { a.toast(t('ekImgBig'), 'warn'); } };
    $('#imFile', body).onclick = () => $('#imInput', body).click();
    $('#imInput', body).onchange = (e) => { const f = e.target.files[0]; if (f) take(f); };
    $('#imPaste', body).onclick = async () => {
      try {
        const items = await navigator.clipboard.read();
        for (const it of items) { const ty = it.types.find((x) => /^image\//.test(x)); if (ty) return take(await it.getType(ty)); }
      } catch { /* izin yok */ }
      a.toast(t('ekImgNoClip'), 'warn');
    };
    const onPaste = (e) => { const f = [...(e.clipboardData && e.clipboardData.files || [])].find((x) => /^image\//.test(x.type)); if (f) { e.preventDefault(); take(f); } };
    document.addEventListener('paste', onPaste);
    const obs = new MutationObserver(() => { if (!document.body.contains(m.el)) { document.removeEventListener('paste', onPaste); obs.disconnect(); } });
    obs.observe($('#modalRoot'), { childList: true });
    if ($('#imDel', body)) $('#imDel', body).onclick = () => done('');
    const drop = $('.imdrop', body);
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('on'); };
    drop.ondragleave = () => drop.classList.remove('on');
    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('on'); const f = [...e.dataTransfer.files].find((x) => /^image\//.test(x.type)); if (f) take(f); };
    body.querySelectorAll('.figbtn').forEach((b) => { b.onclick = () => { const f = figs.find((x) => x.id === b.dataset.f); if (f) done(svgData(f.svg)); }; });
  }

  // Çıktı öncesi: her görselin boyutu + Word için PNG/JPEG hâli (SVG Word'de açılmaz)
  const imgCache = new Map();
  async function imgInfo(src) {
    if (!src) return null;
    if (imgCache.has(src)) return imgCache.get(src);
    let info = null;
    try {
      const im = await loadImg(src);
      const w = im.naturalWidth || im.width || 300, h = im.naturalHeight || im.height || 200;
      let data = src;
      if (/^data:image\/(svg\+xml|gif|webp)/.test(src)) {
        const sc = Math.min(3, 1600 / Math.max(w, h));
        const c = document.createElement('canvas'); c.width = Math.round(w * sc); c.height = Math.round(h * sc);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
        data = c.toDataURL('image/png');
      }
      info = { src, data, w, h };
    } catch { info = null; }
    if (imgCache.size > 300) imgCache.clear();
    imgCache.set(src, info);
    return info;
  }
  async function prepareModelImages(model) {
    for (const q of model.questions || []) {
      q.img = q.img ? await imgInfo(q.img) : null;
      if (q.oimg) q.oimg = await Promise.all(q.oimg.map((s) => (s ? imgInfo(s) : null)));
    }
    return model;
  }

  /* ---------------- geçmiş penceresi ---------------- */
  function historyModal(q) {
    const a = A();
    const L = a.letters();
    const cl = a.CL();
    const pickT = (ml) => (ml && (ml[cl] || ml.tr || ml.en || ml.ar)) || '';
    const fmtT = (ms) => { try { return new Date(ms).toLocaleString(window.UI_LANG === 'ar' ? 'ar' : window.UI_LANG === 'en' ? 'en-GB' : 'tr-TR'); } catch { return ''; } };
    const view = (h) => `<div class="hs" dir="auto">${esc(pickT(h.text)) || '—'}</div>${h.img ? `<img class="himg" src="${h.img}" alt="">` : ''}` +
      `<div class="ho">${h.options.slice(0, a.S().optionCount).map((o, k) => `<div class="${k === h.correct ? 'c' : ''}" dir="auto"><b>${L[k]})</b> ${esc(pickT(o))}${h.oimg && h.oimg[k] ? ' 🖼' : ''}${k === h.correct ? ' ✓' : ''}</div>`).join('')}</div>` +
      `<div class="hm">${[h.zor ? t('ekZor_' + h.zor) : '', h.konu, h.kaynak].filter(Boolean).map(esc).join(' · ')}</div>`;
    const diff = (h, nx) => {
      const ch = [];
      if (!same(h.text, nx.text)) ch.push('text');
      if (!same(h.options, nx.options)) ch.push('options');
      if (h.correct !== nx.correct) ch.push('correct');
      if ((h.img || '') !== (nx.img || '') || !same((h.oimg || []).map((x) => x || ''), (nx.oimg || []).map((x) => x || ''))) ch.push('img');
      if ((h.zor || '') !== (nx.zor || '') || (h.konu || '') !== (nx.konu || '') || (h.kaynak || '') !== (nx.kaynak || '')) ch.push('meta');
      return ch.map((k) => t('ekF_' + k)).join(', ');
    };
    // "görsel aynı kaldı" işaretli kayıtların görseli bir sonraki (daha yeni) hâlden çözülür
    const resolved = () => {
      const now = qSnap(q);
      let prev = now;
      return [now, (q.gecmis || []).slice().reverse().map((h) => {
        const e = { ...h, img: h.img || (h.imgKeep ? prev.img : ''), oimg: h.oimg || (h.oimgKeep ? prev.oimg : []) };
        prev = e; return e;
      })];
    };
    const render = () => {
      const [now, list] = resolved();
      body.innerHTML = `<div class="hist">
        <div class="hitem now"><div class="hh"><b>${esc(t('ekHistNow'))}</b></div>${view(now)}</div>
        ${list.length ? list.map((h, i) => { const nx = i === 0 ? now : list[i - 1]; return `<div class="hitem"><div class="hh"><b>🕘 ${esc(fmtT(h.t))}</b><span class="hd">${esc(t('ekHistDiff'))}: ${esc(diff(h, nx))}</span><button class="btn" data-i="${q.gecmis.length - 1 - i}">${esc(t('ekHistRestore'))}</button></div>${view(h)}</div>`; }).join('') : `<p class="help">${esc(t('ekHistNone'))}</p>`}
      </div>`;
      body.querySelectorAll('[data-i]').forEach((b) => {
        b.onclick = () => {
          const h = resolved()[1][q.gecmis.length - 1 - +b.dataset.i];
          a.snap();
          const b0 = qSnap(q);
          q.text = ML(h.text); q.options = h.options.map(ML); while (q.options.length < 5) q.options.push(ML());
          q.correct = h.correct;
          if (h.zor) q.zor = h.zor; else delete q.zor; delete q.zorOto;
          if (h.konu) q.konu = h.konu; else delete q.konu;
          if (h.kaynak) q.kaynak = h.kaynak; else delete q.kaynak;
          if (h.img) q.img = h.img; else delete q.img;
          if (h.oimg && h.oimg.some(Boolean)) q.oimg = h.oimg.slice(); else delete q.oimg;
          histCommit(q, b0, null);
          a.rerenderCard(q); render();
          a.toast(t('ekHistRestored'), 'ok', [{ label: t('undo'), onClick: () => a.undo() }]);
        };
      });
    };
    const body = document.createElement('div');
    render();
    a.modal({ title: t('ekHistTitle', { n: a.qNumber(q) || '👻' }), body, wide: true, buttons: [{ label: t('close'), onClick: (c) => c() }] });
  }

  /* ---------------- konu ---------------- */
  function konuList(extra) {
    const s = new Map();
    const add = (k) => { k = String(k || '').trim(); if (k) s.set(k.toLocaleLowerCase('tr'), k); };
    const ex = A() && A().exam;
    if (ex) ex.questions.forEach((q) => add(q.konu));
    (extra || []).forEach(add);
    try { (JSON.parse(localStorage.getItem('ek.konular') || '[]') || []).forEach(add); } catch { /* yok */ }
    return [...s.values()].sort((a, b) => a.localeCompare(b, 'tr'));
  }
  function refreshKonuList() {
    let dl = document.getElementById('ekKonuList');
    if (!dl) { dl = document.createElement('datalist'); dl.id = 'ekKonuList'; document.body.appendChild(dl); }
    const all = konuList([t('bkTuav'), 'Meteoroloji', 'Mevzuat', 'Aerodinamik', 'Navigasyon', 'Hava sahası', 'İnsan faktörleri', 'Uçuş performansı', 'Haberleşme']);
    try { localStorage.setItem('ek.konular', JSON.stringify(all.slice(0, 400))); } catch { /* yok */ }
    dl.innerHTML = all.map((k) => `<option value="${esc(k)}">`).join('');
  }
  // süzgeç: '' hepsi, '-' konusuz, aksi hâlde konu ya da onun alt konuları
  const konuMatch = (q, f) => {
    if (!f) return true;
    const k = String(q.konu || '').trim().toLocaleLowerCase('tr');
    if (f === '-') return !k;
    const ff = f.toLocaleLowerCase('tr');
    return k === ff || k.startsWith(ff + ' >');
  };
  function konuOptions(qs) {
    const cnt = new Map();
    qs.forEach((q) => {
      const parts = String(q.konu || '').split('>').map((x) => x.trim()).filter(Boolean);
      for (let i = 1; i <= parts.length; i++) { const k = parts.slice(0, i).join(' > '); cnt.set(k, (cnt.get(k) || 0) + 1); }
    });
    const none = qs.filter((q) => !String(q.konu || '').trim()).length;
    return `<option value="">${esc(t('ekKonuAll'))} (${qs.length})</option>` + [...cnt.keys()].sort((a, b) => a.localeCompare(b, 'tr')).map((k) => `<option value="${esc(k)}">${esc(k)} (${cnt.get(k)})</option>`).join('') + (none && none < qs.length ? `<option value="-">${esc(t('ekKonuNone'))} (${none})</option>` : '');
  }

  /* ---------------- kenar çubuğu ---------------- */
  const sideBtns = [];
  function addSide(id, label, fn) { sideBtns.push({ id, label, fn }); }
  function wireSide() {
    refreshKonuList();
    const sb = document.getElementById('btnSearchAll'); if (sb) sb.onclick = () => window.EK.searchModal();
    const box = document.querySelector('.sidetools');
    if (!box || box.querySelector('.ekside')) return;
    const wrap = document.createElement('div');
    wrap.className = 'ekside';
    wrap.innerHTML = `<div class="sidehead">${esc(t('ekSideTools'))}</div>` + sideBtns.map((b) => `<button id="${b.id}" class="sb">${esc(b.label())}</button>`).join('');
    box.appendChild(wrap);
    sideBtns.forEach((b) => { const el = document.getElementById(b.id); if (el) el.onclick = () => b.fn(); });
  }
  // dil değişince (renderAll → updateSide) etiketler yenilenir
  function relabelSide() {
    sideBtns.forEach((b) => { const el = document.getElementById(b.id); if (el) el.textContent = b.label(); });
    const h = document.querySelector('.ekside .sidehead'); if (h) h.textContent = t('ekSideTools');
  }

  window.EK = Object.assign(window.EK || {}, {
    qExtra, bankKonu, zorSelect, metaRow, wireCard, qSnap, histCommit, renderCardImages, setImage, pickImage, shrink, fileToData, svgData,
    prepareModelImages, imgInfo, historyModal, konuMatch, konuOptions, konuList, refreshKonuList, addSide, wireSide, relabelSide, esc, ML, LK, imgOk,
    // ek-araclar.js / ek-sinif.js doldurur
    auditModal: (qs) => window.EK._audit && window.EK._audit(qs),
    searchModal: () => window.EK._search && window.EK._search(),
    omrFormModal: (o) => window.EK._omrForm && window.EK._omrForm(o),
  });
})();
