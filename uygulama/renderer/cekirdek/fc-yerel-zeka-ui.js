/* Yerel zeka — arayüz (renderer). window.FCYZ:
     FCYZ.available()                 → masaüstü kabuğu yerel zekayı destekliyor mu
     FCYZ.status()                    → { ocr: hazır mı, mt: hazır mı, packs, ... }
     FCYZ.ocr(kaynak, {langs, quality}) → { text, lines, items }  kaynak: File/Blob/img/canvas/ImageData
     FCYZ.translate(metin, kaynakDil|'auto', hedefDil, {memory}) → { text, engine }
     FCYZ.card({ lang, packs })       → Ayarlar için (packs: ['ocr','llm','mt'] — uygulamanın kullandıkları) "Çevrimdışı yapay zekâ" kartı (indirme, ilerleme, sil, seçenekler)
   Metinler tr / en / ar (Arapça sağdan sola). */
(function () {
  'use strict';
  const B = () => window.fcYerelZeka;
  const L = {
    tr: { title: 'Çevrimdışı yapay zekâ', intro: 'İnternet yokken de en yüksek kalitede metin okuma (OCR) ve çeviri. Modeller bir kez iner, bu bilgisayarda kalır; program güncellemelerinde yeniden inmez.',
      ocr: 'Metin okuma (OCR)', ocrD: 'PaddleOCR PP-OCRv5 (sunucu modeli) + Tesseract — Türkçe, İngilizce, Arapça; eğik / gürültülü fotoğraflar, Arapça rakamlar.',
      mt: 'Hızlı çeviri', mtD: 'NLLB-200 sinirsel çeviri (tam duyarlık) — tr ↔ en ↔ ar, resmî dil; havacılık terimleri uygulamanın terim sözlüğünden zorunlu.',
      llm: 'En yüksek kalitede çeviri', llmD: 'TranslateGemma (Google, Gemma 3 tabanlı çeviri modeli) — havacılık terminolojisi ve resmî dil yönergesiyle; terim sözlüğü zorunlu. Bu bilgisayara göre model: ',
      install: 'İndir ve kur', remove: 'Kaldır', cancel: 'Durdur', ready: 'Kurulu', notInstalled: 'Kurulu değil', size: 'Boyut',
      gpu: 'Ekran kartını kullan (DirectML — daha hızlı)', ollama: 'Bilgisayarda Ollama varsa çeviride onu kullan (en yüksek kalite)',
      dl: 'İndiriliyor', unpack: 'Kuruluyor…', done: 'Tamamlandı', err: 'Hata', left: 'kalan', speed: 'hız', eta: 'süre', unsupported: 'Bu sürümde yerel zekâ yok.',
      confirmRemove: 'Paket kaldırılsın mı? Gerekirse yeniden indirilebilir.', u: ['sa', 'dk', 'sn', 'MB/sn'] },
    en: { title: 'Offline AI', intro: 'Highest-quality text recognition (OCR) and translation even without internet. Models are downloaded once and stay on this computer; app updates do not download them again.',
      ocr: 'Text recognition (OCR)', ocrD: 'PaddleOCR PP-OCRv5 (server model) + Tesseract — Turkish, English, Arabic; skewed / noisy photos, Arabic digits.',
      mt: 'Fast translation', mtD: 'NLLB-200 neural translation (full precision) — tr ↔ en ↔ ar, formal register; aviation terms enforced from the app glossary.',
      llm: 'Highest-quality translation', llmD: 'TranslateGemma (Google, translation model based on Gemma 3) — with aviation terminology and formal-register instructions; glossary terms enforced. Model for this computer: ',
      install: 'Download & install', remove: 'Remove', cancel: 'Stop', ready: 'Installed', notInstalled: 'Not installed', size: 'Size',
      gpu: 'Use the graphics card (DirectML — faster)', ollama: 'Use Ollama for translation if installed on this computer (highest quality)',
      dl: 'Downloading', unpack: 'Installing…', done: 'Completed', err: 'Error', left: 'left', speed: 'speed', eta: 'time', unsupported: 'Offline AI is not available in this build.',
      confirmRemove: 'Remove this pack? It can be downloaded again later.', u: ['h', 'min', 's', 'MB/s'] },
    ar: { title: 'الذكاء الاصطناعي دون اتصال', intro: 'قراءة النصوص (OCR) والترجمة بأعلى جودة حتى دون إنترنت. تُنزَّل النماذج مرة واحدة وتبقى على هذا الحاسوب، ولا يُعاد تنزيلها عند تحديث البرنامج.',
      ocr: 'قراءة النصوص (OCR)', ocrD: 'PaddleOCR PP-OCRv5 (نموذج الخادم) + Tesseract — التركية والإنجليزية والعربية؛ الصور المائلة أو المشوشة والأرقام العربية.',
      mt: 'ترجمة سريعة', mtD: 'ترجمة عصبية NLLB-200 (دقة كاملة) — تركي ↔ إنجليزي ↔ عربي بلغة رسمية؛ مصطلحات الطيران مُلزِمة من مسرد البرنامج.',
      llm: 'ترجمة بأعلى جودة', llmD: 'TranslateGemma (من Google، نموذج ترجمة مبني على Gemma 3) — بتوجيهات مصطلحات الطيران واللغة الرسمية؛ مصطلحات المسرد مُلزِمة. النموذج المناسب لهذا الحاسوب: ',
      install: 'تنزيل وتثبيت', remove: 'إزالة', cancel: 'إيقاف', ready: 'مثبَّت', notInstalled: 'غير مثبَّت', size: 'الحجم',
      gpu: 'استخدام بطاقة الرسوميات (DirectML — أسرع)', ollama: 'استخدام Ollama للترجمة إن كان مثبتًا على هذا الحاسوب (أعلى جودة)',
      dl: 'جارٍ التنزيل', unpack: 'جارٍ التثبيت…', done: 'اكتمل', err: 'خطأ', left: 'المتبقي', speed: 'السرعة', eta: 'الوقت', unsupported: 'الذكاء الاصطناعي دون اتصال غير متوفر في هذا الإصدار.',
      confirmRemove: 'هل تريد إزالة هذه الحزمة؟ يمكن تنزيلها مرة أخرى لاحقًا.', u: ['س', 'د', 'ث', 'م.ب/ث'] },
  };
  const langOf = (o) => { const l = (o && o.lang) || document.documentElement.lang || 'tr'; return L[l.slice(0, 2)] ? l.slice(0, 2) : 'tr'; };
  const mb = (b) => b == null ? '—' : b >= 1073741824 ? (b / 1073741824).toFixed(2) + ' GB' : (b / 1048576).toFixed(0) + ' MB';
  const fmtEta = (s, u) => s == null ? '—' : s >= 3600 ? Math.floor(s / 3600) + ' ' + u[0] + ' ' + Math.round(s % 3600 / 60) + ' ' + u[1] : s >= 60 ? Math.floor(s / 60) + ' ' + u[1] + ' ' + (s % 60) + ' ' + u[2] : s + ' ' + u[2];

  async function toImageData(src, maxSide) {
    maxSide = maxSide || 4000;
    if (src && src.data && src.width && src.height && !(src instanceof HTMLCanvasElement)) return src;
    let bmp = src, w, h;
    if (src instanceof Blob) bmp = await createImageBitmap(src);
    if (bmp instanceof HTMLImageElement) { if (!bmp.complete) await new Promise((r, j) => { bmp.onload = r; bmp.onerror = j; }); w = bmp.naturalWidth; h = bmp.naturalHeight; }
    else { w = bmp.width; h = bmp.height; }
    const s = Math.min(1, maxSide / Math.max(w, h)), c = document.createElement('canvas');
    c.width = Math.round(w * s); c.height = Math.round(h * s);
    const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.imageSmoothingQuality = 'high'; g.drawImage(bmp, 0, 0, c.width, c.height);
    return g.getImageData(0, 0, c.width, c.height);
  }

  let stCache = null, stAt = 0, lastMem = null;
  const FCYZ = {
    available: () => !!B(),
    title: (o) => L[langOf(o)].title,
    async status() { return B() ? B().durum() : { ocr: false, mt: false, supported: false }; },
    /** 'ocr' | 'mt' paketi kurulu mu (30 sn önbellekli; indirme bitince yenilenir) */
    async ready(kind) {
      if (!B()) return false;
      if (!stCache || Date.now() - stAt > 30000) { stAt = Date.now(); stCache = B().durum().catch(() => null); }
      const s = await stCache; return !!(s && s[kind]);
    },
    async ocr(src, o = {}) {
      if (!B()) throw new Error('Yerel zekâ yok');
      const img = await toImageData(src, o.maxSide);
      return B().ocr({ data: new Uint8Array(img.data.buffer, img.data.byteOffset, img.data.byteLength), width: img.width, height: img.height, langs: o.langs, quality: o.quality });
    },
    async translate(text, from, to, o = {}) {
      if (!B()) throw new Error('Yerel zekâ yok');
      // bellek (terim sözlüğü) iş parçacığında kalır: aynı dizi ikinci kez gönderilmez
      const memory = o.memory && o.memory !== lastMem ? o.memory : undefined;
      const r = await B().cevir({ text, from: from || 'auto', to, memory, ollama: o.ollama, llm: o.llm, domain: o.domain });
      if (memory) lastMem = memory;
      return r;
    },
    card(o) {
      const t = L[langOf(o)], el = document.createElement('div');
      el.className = 'fcyz-card'; el.dir = langOf(o) === 'ar' ? 'rtl' : 'ltr';
      el.innerHTML = `<style>.fcyz-card{display:flex;flex-direction:column;gap:10px}.fcyz-card .fcyz-p{opacity:.8;font-size:.92em;line-height:1.45}
        .fcyz-row{border:1px solid var(--fc-border,rgba(127,127,127,.3));border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:6px}
        .fcyz-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.fcyz-h b{flex:1;min-width:140px}.fcyz-badge{font-size:.8em;padding:2px 8px;border-radius:99px;background:rgba(127,127,127,.15)}
        .fcyz-badge.ok{background:rgba(34,160,90,.18);color:#1d8a4e}.fcyz-card button{cursor:pointer;padding:5px 12px;border-radius:8px;border:1px solid var(--fc-border,rgba(127,127,127,.4));background:var(--fc-accent,#0b6bcb);color:#fff;font:inherit}
        .fcyz-card button:disabled{opacity:.45;cursor:default}.fcyz-card button.sec{background:transparent;color:inherit}.fcyz-bar{height:8px;border-radius:99px;background:rgba(127,127,127,.18);overflow:hidden}.fcyz-bar i{display:block;height:100%;width:0;background:var(--fc-accent,#0b6bcb);transition:width .25s}
        .fcyz-info{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.85em;opacity:.85;font-variant-numeric:tabular-nums}.fcyz-opt{display:flex;gap:8px;align-items:center;font-size:.92em}</style>
        <div class="fcyz-p">${t.intro}</div><div class="fcyz-rows"></div><div class="fcyz-prog" hidden><div class="fcyz-bar"><i></i></div><div class="fcyz-info"></div></div>
        <label class="fcyz-opt"><input type="checkbox" data-o="gpu"> ${t.gpu}</label><label class="fcyz-opt"><input type="checkbox" data-o="ollama"> ${t.ollama}</label>`;
      const rows = el.querySelector('.fcyz-rows'), prog = el.querySelector('.fcyz-prog'), bar = prog.querySelector('i'), info = prog.querySelector('.fcyz-info');
      if (!B()) { rows.innerHTML = `<div class="fcyz-p">${t.unsupported}</div>`; el.querySelectorAll('.fcyz-opt').forEach((x) => x.remove()); return el; }
      let st = null;
      const render = () => {
        rows.innerHTML = '';
        for (const k of ((o && o.packs) || ['ocr', 'llm', 'mt'])) {
          if (!st.packs[k]) continue;
          const p = st.packs[k], rt = st.packs.runtime, inst = p.installed && rt.installed, r = document.createElement('div'); r.className = 'fcyz-row';
          const extra = rt.installed ? 0 : (rt.bytes || 0);
          r.innerHTML = `<div class="fcyz-h"><b>${t[k]}</b><span class="fcyz-badge ${inst ? 'ok' : ''}">${inst ? '✓ ' + t.ready : t.notInstalled}</span><span class="fcyz-badge">${t.size}: ${p.bytes == null ? '—' : mb(p.bytes + (inst ? 0 : extra))}</span></div><div class="fcyz-p">${t[k + 'D']}${k === 'llm' ? (p.variant === 'llm-12b' ? '12B' : '4B') + ' · RAM ' + (st.ramGB || '?') + ' GB' : ''}</div>`;
          const h = r.querySelector('.fcyz-h'), btn = document.createElement('button');
          if (inst) { btn.className = 'sec'; btn.textContent = t.remove; btn.onclick = async () => { if (!confirm(t.confirmRemove)) return; st = await B().sil(k); render(); }; }
          else if (st.busy) { btn.className = 'sec'; btn.textContent = t.cancel; btn.onclick = () => B().iptal(); }
          else { btn.textContent = t.install; btn.disabled = !st.supported; btn.onclick = async () => { prog.hidden = false; try { await B().kur([k]); } catch (e) { info.textContent = t.err + ': ' + e.message; } st = await B().durum(); render(); }; }
          h.appendChild(btn); rows.appendChild(r);
        }
        el.querySelectorAll('[data-o]').forEach((c) => { c.checked = (st.settings || {})[c.dataset.o] !== false; c.onchange = async () => { st = await B().ayar({ [c.dataset.o]: c.checked }); }; });
      };
      const off = B().ilerleme((d) => {
        prog.hidden = false;
        if (d.phase === 'indiriliyor') {
          bar.style.width = d.pct.toFixed(1) + '%';
          info.innerHTML = `<span><b>${t.dl}: %${d.pct.toFixed(1)}</b></span><span>${d.doneMB.toFixed(1)} / ${d.totalMB.toFixed(1)} MB</span><span>${t.left}: ${d.leftMB.toFixed(1)} MB</span><span>${t.speed}: ${d.speed.toFixed(2)} ${t.u[3]}</span><span>${t.eta}: ${fmtEta(d.eta, t.u)}</span>`;
        } else if (d.phase === 'aciliyor') info.textContent = t.unpack;
        else if (d.phase === 'bitti') { bar.style.width = '100%'; info.textContent = '✓ ' + t.done; stCache = null; B().durum().then((s) => { st = s; render(); }); }
        else if (d.phase === 'hata') info.textContent = t.err + ': ' + d.error;
      });
      const obs = new MutationObserver(() => { if (!el.isConnected) { off(); obs.disconnect(); } });
      setTimeout(() => { if (el.parentNode) obs.observe(document.body, { childList: true, subtree: true }); }, 0);
      B().durum().then((s) => { st = s; render(); if (s.busy) prog.hidden = false; });
      return el;
    },
  };
  window.FCYZ = FCYZ;
})();
