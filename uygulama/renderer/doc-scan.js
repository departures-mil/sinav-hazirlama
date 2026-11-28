'use strict';
// Kelime listesi aktarımı: PDF ve görsellerden (JPEG/PNG...) satır-sütun çıkarır.
// PDF'te metin katmanı varsa doğrudan okunur; taranmış sayfalar ve görseller internetsiz metin tanıma (Tesseract, İngilizce + Türkçe + Arapça) ile okunur.
// Kelimelerin sayfadaki konumlarından satırlar ve sütunlar yeniden kurulur; sonuç table-import ile aynı biçimdedir: [{ name, rows }].
(function () {
  const AR = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
  const LAT = /[A-Za-zÀ-ÖØ-öø-ÿĞğİıŞş]/g;
  const cnt = (s, re) => (String(s || '').match(re) || []).length;
  const isRtl = (s) => cnt(s, AR) > cnt(s, LAT);
  const clean = (s) => String(s || '').normalize('NFKC').replace(/[ ​-‏‪-‮﻿]/g, ' ').replace(/\s+/g, ' ').trim();
  const IMG_EXT = ['jpg', 'jpeg', 'png', 'bmp', 'webp', 'gif'];
  const LANGS = ['tur', 'eng', 'ara'];

  /* ---------------- satır / sütun kurma ---------------- */
  // tokens: [{ text, x0, x1, y0, y1 }] (sayfa genişliği 1 olacak biçimde ölçekli), sayfa sayfa
  function groupLines(tokens) {
    const sorted = tokens.filter((t) => clean(t.text)).sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
    const lines = [];
    for (const t of sorted) {
      const h = t.y1 - t.y0, cy = (t.y0 + t.y1) / 2;
      let best = null;
      for (let i = lines.length - 1; i >= Math.max(0, lines.length - 4); i--) {
        const L = lines[i];
        const ov = Math.min(L.y1, t.y1) - Math.max(L.y0, t.y0);
        if (ov > 0.5 * Math.min(h, L.y1 - L.y0) || (cy > L.y0 && cy < L.y1)) { best = L; break; }
      }
      if (best) { best.tokens.push(t); best.y0 = Math.min(best.y0, t.y0); best.y1 = Math.max(best.y1, t.y1); }
      else lines.push({ tokens: [t], y0: t.y0, y1: t.y1 });
    }
    lines.forEach((L) => L.tokens.sort((a, b) => a.x0 - b.x0));
    return lines;
  }
  const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

  // Hücre metni: Arapça hücrelerde kelimeler sağdan sola dizilir
  function cellText(tokens, h) {
    if (!tokens.length) return '';
    const rtl = isRtl(tokens.map((t) => t.text).join(' '));
    const ts = [...tokens].sort((a, b) => (rtl ? b.x1 - a.x1 : a.x0 - b.x0));
    let out = '';
    ts.forEach((t, i) => {
      if (i) {
        const p = ts[i - 1];
        const gap = rtl ? p.x0 - t.x1 : t.x0 - p.x1;
        out += gap > 0.12 * h || t.space ? ' ' : '';
      }
      out += t.text;
    });
    return clean(out);
  }

  // Sütun sınırları: tüm satırlarda boş kalan dikey şeritler
  function columnCuts(lines, h) {
    const BINS = 1000;
    const cover = new Uint16Array(BINS);
    const multi = lines.filter((L) => L.tokens.length > 1);
    if (multi.length < 3) return [];
    multi.forEach((L) => {
      const seen = new Uint8Array(BINS);
      L.tokens.forEach((t) => { for (let b = Math.max(0, Math.floor(t.x0 * BINS)); b <= Math.min(BINS - 1, Math.floor(t.x1 * BINS)); b++) seen[b] = 1; });
      for (let b = 0; b < BINS; b++) cover[b] += seen[b];
    });
    const first = cover.findIndex((v) => v > 0);
    let last = BINS - 1; while (last > 0 && !cover[last]) last--;
    const limit = Math.max(1, Math.floor(multi.length * 0.04)); // birkaç taşan satır (başlık vb.) sınırı bozmaz
    const minGap = Math.max(3, Math.round(h * 0.9 * BINS));
    const cuts = [];
    let s = -1;
    for (let b = first; b <= last + 1; b++) {
      const empty = b <= last && cover[b] < limit;
      if (empty && s < 0) s = b;
      if (!empty && s >= 0) { if (b - s >= minGap) cuts.push((s + b) / 2 / BINS); s = -1; }
    }
    // gerçek bir sütun sınırı: iki yanında da satırların çoğunda yazı olmalı
    return cuts.filter((c) => {
      let l = 0, r = 0;
      multi.forEach((L) => { if (L.tokens.some((t) => t.x1 < c)) l++; if (L.tokens.some((t) => t.x0 > c)) r++; });
      return l >= multi.length * 0.35 && r >= multi.length * 0.35;
    });
  }

  // Tablo düzeni yoksa: satır içindeki geniş boşluklar sekme sayılır, satır "kelime - anlam" gibi ayrılır
  function splitLine(L, h) {
    const parts = [[]];
    L.tokens.forEach((t, i) => {
      if (i && t.x0 - L.tokens[i - 1].x1 > 1.6 * h) parts.push([]);
      parts[parts.length - 1].push(t);
    });
    let cells = parts.map((p) => cellText(p, h)).filter(Boolean);
    if (cells.length === 1) {
      for (const sep of [/\s*[;\t]\s*/, /\s+[-–—=]\s+/, /\s*[:：]\s+/]) {
        const p = cells[0].split(sep).map(clean).filter(Boolean);
        if (p.length >= 2) { cells = p; break; }
      }
    }
    return cells;
  }

  const JUNK = /^(\d{1,4}|[-–—_.·•|*]+|sayfa\s*\d+|page\s*\d+|\d+\s*\/\s*\d+)$/i;

  // Bir hücreye sığmayıp alt satıra taşan yazılar (ör. iki satırlık Arapça anlam) ait oldukları tablo satırına eklenir.
  // Az hücresi dolu satır, komşu tam satırlardan o hücresi boş olana; ikisi de doluysa daha yakın olana katılır.
  function mergeWrapped(lines, h) {
    const counts = lines.map((L) => L.cells.filter(Boolean).length);
    const freq = {};
    counts.forEach((c) => { freq[c] = (freq[c] || 0) + 1; });
    const typical = +Object.keys(freq).sort((a, b) => freq[b] - freq[a] || b - a)[0] || 0;
    if (typical < 2) return lines;
    const isPart = (i) => counts[i] < typical && counts[i] <= Math.max(1, Math.floor(typical / 2));
    const full = lines.map((L, i) => L.band != null || !isPart(i));
    lines.forEach((L, i) => {
      if (full[i]) return;
      const near = (dir) => {
        for (let j = i + dir; j >= 0 && j < lines.length; j += dir) {
          const gap = dir > 0 ? lines[j].y0 - lines[j - dir].y1 : lines[j - dir].y0 - lines[j].y1;
          if (gap > h * 1.4) return null;
          if (full[j]) return j;
        }
        return null;
      };
      const up = near(-1), dn = near(1);
      const ks = L.cells.map((c, k) => (c ? k : -1)).filter((k) => k >= 0);
      const emptyIn = (j) => j != null && ks.every((k) => !lines[j].cells[k]);
      let to = null;
      if (emptyIn(dn) && !emptyIn(up)) to = dn;
      else if (emptyIn(up) && !emptyIn(dn)) to = up;
      else if (ks.length > 1) { full[i] = true; return; } // birden çok hücresi dolu ve hiçbir komşuya sığmıyor: ayrı satır
      else if (up != null || dn != null) {
        const dUp = up == null ? Infinity : L.y0 - lines[up].y1, dDn = dn == null ? Infinity : lines[dn].y0 - L.y1;
        to = dDn < dUp * 0.8 ? dn : (up != null ? up : dn);
      }
      if (to == null || counts[to] < 2) { full[i] = true; return; }
      const T = lines[to];
      ks.forEach((k) => { T.cells[k] = clean(to > i ? L.cells[k] + ' ' + (T.cells[k] || '') : (T.cells[k] || '') + ' ' + L.cells[k]); });
      L.merged = true;
    });
    return lines.filter((L) => !L.merged);
  }

  function buildRows(pages) {
    pages = pages.map((p) => (Array.isArray(p) ? { tokens: p, rules: [] } : p));
    const all = pages.flatMap((p) => p.tokens);
    const h = median(all.map((t) => t.y1 - t.y0)) || 0.012;
    let lastBand = null;
    const pl = pages.map((p, pi) => {
      const lines = groupLines(p.tokens);
      // tablo çizgileri varsa: iki yatay çizgi arasındaki tüm yazı satırları tek tablo satırıdır
      const r = p.rules || [];
      if (r.length >= 3) lines.forEach((L) => {
        const cy = (L.y0 + L.y1) / 2;
        const k = r.findIndex((y, i) => i < r.length - 1 && cy > y && cy < r[i + 1]);
        if (k >= 0) { L.band = pi + ':' + k; if (k === 0 && lastBand) L.cont = lastBand; }
        // sayfa sonunda bölünen tablo satırının devamı: bir önceki sayfanın son tablo satırına eklenir
        else if (cy < r[0] && lastBand) L.band = lastBand;
        // son çizginin hemen altı: sayfa sonunda kapanmamış tablo satırı
        else if (cy > r[r.length - 1] && cy - r[r.length - 1] < h * 4) L.band = pi + ':' + (r.length - 1);
      });
      const tail = lines.filter((L) => !JUNK.test(clean(L.tokens.map((t) => t.text).join(' ')))).pop();
      lastBand = tail && tail.band != null && r.length >= 3 && (r[r.length - 1] - tail.y1) < h * 1.5 ? tail.band : null;
      return lines;
    });
    // sütun sınırları tüm sayfalar birlikte değerlendirilerek bulunur (sayfa genişliği ölçeğinde)
    const cuts = columnCuts(pl.flat(), h);
    // sayfalar alt alta eklenir: sayfa sonunda bölünen hücre bir sonraki sayfanın başındaki satırla birleşebilir
    let shift = 0, bottom = null;
    pl.forEach((lines) => {
      if (!lines.length) return;
      if (bottom != null) shift = bottom + h * 0.3 - lines[0].y0;
      lines.forEach((L) => { L.y0 += shift; L.y1 += shift; });
      bottom = lines[lines.length - 1].y1;
    });
    const rows = [];
    [pl.flat()].forEach((lines) => {
      let out = lines.map((L) => {
        let cells;
        if (cuts.length) {
          const buckets = Array.from({ length: cuts.length + 1 }, () => []);
          L.tokens.forEach((t) => {
            const cx = (t.x0 + t.x1) / 2;
            let k = 0; while (k < cuts.length && cx > cuts[k]) k++;
            buckets[k].push(t);
          });
          cells = buckets.map((b) => cellText(b, h));
        } else cells = splitLine(L, h);
        return { cells, y0: L.y0, y1: L.y1, band: L.band, cont: L.cont };
      }).filter((r) => { const j = clean(r.cells.join(' ')); return j && !JUNK.test(j); });
      // aynı tablo satırındaki (çizgiler arası) yazı satırları birleştirilir
      out = out.reduce((acc, r) => {
        const p = acc[acc.length - 1];
        const sparse = r.cells.filter(Boolean).length <= Math.floor(r.cells.length / 2);
        // sayfanın ilk tablo satırı seyrekse önceki sayfanın son satırının devamıdır
        if (p && r.band != null && (p.band === r.band || (r.cont && p.band === r.cont && sparse))) {
          r.cells.forEach((c, k) => { if (c) p.cells[k] = clean((p.cells[k] || '') + ' ' + c); });
          p.y1 = r.y1;
        } else acc.push(r);
        return acc;
      }, []);
      if (cuts.length) out = mergeWrapped(out, h);
      rows.push(...out.map((r) => r.cells));
    });
    const width = Math.max(0, ...rows.map((r) => r.length));
    // tamamen boş sütunlar atılır
    const used = Array.from({ length: width }, (_, c) => rows.some((r) => r[c]));
    let res = rows.map((r) => r.filter((_, c) => used[c]).map((x) => x || '')).filter((r) => r.some(Boolean));
    // sağdan sola düzenlenmiş tablo (Arapça sütun en solda, Latin sütun en sağda): sütunlar Word'deki sırasına çevrilir
    const n = Math.max(0, ...res.map((r) => r.length));
    if (n >= 2) {
      const arShare = (c) => { const v = res.map((r) => r[c]).filter(Boolean); return v.length ? v.filter(isRtl).length / v.length : 0; };
      if (arShare(0) > 0.6 && arShare(n - 1) < 0.2) res = res.map((r) => Array.from({ length: n }, (_, c) => r[n - 1 - c] || ''));
    }
    return res;
  }

  /* ---------------- metin tanıma (Tesseract) ---------------- */
  let workerP = null;
  const base = () => new URL('lib/ocr/', location.href).href;
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('script ' + src));
      document.head.appendChild(s);
    });
  }
  let progressCb = null;
  async function getWorker() {
    if (!workerP) {
      workerP = (async () => {
        if (!window.Tesseract) await loadScript(base() + 'tesseract.min.js');
        const langs = [];
        for (const code of LANGS) langs.push({ code, data: await window.api.readOcrData(code) });
        const w = await window.Tesseract.createWorker(langs, 1, {
          workerPath: base() + 'worker.min.js',
          corePath: base() + 'tesseract-core-simd-lstm.wasm.js',
          workerBlobURL: false,
          cacheMethod: 'none',
          gzip: true,
          logger: (m) => { if (progressCb && m && m.status === 'recognizing text') progressCb(m.progress || 0); },
        });
        await w.setParameters({ tessedit_pageseg_mode: '3', preserve_interword_spaces: '1' });
        return w;
      })();
      workerP.catch(() => { workerP = null; });
    }
    return workerP;
  }

  // Görüntüyü tanımaya hazırlar: küçükse büyütür, gri tona çevirir
  function prepCanvas(src, w, h) {
    const long = Math.max(w, h);
    const scale = long < 1800 ? Math.min(3, 2200 / long) : long > 5000 ? 5000 / long : 1;
    const c = document.createElement('canvas');
    c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, c.width, c.height);
    const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; d[i] = d[i + 1] = d[i + 2] = v; }
    g.putImageData(img, 0, 0);
    return c;
  }

  // Yerel zekâ (PaddleOCR PP-OCRv5 + Tesseract) satırlarını sözcük parçalarına çevirir: satırdaki konum karakter oranıyla
  function yzTokens(r, W) {
    const out = [];
    for (const it of r.items || []) {
      const xs = it.box.map((p) => p[0]), ys = it.box.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), words = it.text.split(/\s+/).filter(Boolean);
      const total = it.text.length || 1, rtl = it.script === 'arabic'; let pos = 0;
      for (const wd of words) {
        const i = it.text.indexOf(wd, pos), a = i / total, b = (i + wd.length) / total; pos = i + wd.length;
        const wx0 = rtl ? x1 - b * (x1 - x0) : x0 + a * (x1 - x0), wx1 = rtl ? x1 - a * (x1 - x0) : x0 + b * (x1 - x0);
        const txt = clean(wd); if (txt) out.push({ text: txt, x0: wx0 / W, x1: wx1 / W, y0: y0 / W, y1: y1 / W, space: true });
      }
    }
    return out;
  }
  async function ocrCanvas(canvas, onProgress) {
    if (window.FCYZ && await FCYZ.ready('ocr')) {
      try { if (onProgress) onProgress(0.1); const r = await FCYZ.ocr(canvas, { langs: LANGS.map((c) => ({ eng: 'en', tur: 'tr', ara: 'ar' }[c] || c)) }); if (onProgress) onProgress(1); return yzTokens(r, canvas.width); }
      catch (e) { console.warn('yerel OCR', e); }
    }
    const w = await getWorker();
    progressCb = onProgress || null;
    try {
      const { data } = await w.recognize(canvas, {}, { blocks: true, text: false });
      const W = canvas.width;
      const tokens = [];
      (data.blocks || []).forEach((b) => (b.paragraphs || []).forEach((p) => (p.lines || []).forEach((l) => (l.words || []).forEach((wd) => {
        const txt = clean(wd.text);
        if (!txt || (wd.confidence < 25 && txt.length < 2)) return;
        tokens.push({ text: txt, x0: wd.bbox.x0 / W, x1: wd.bbox.x1 / W, y0: wd.bbox.y0 / W, y1: wd.bbox.y1 / W, space: true });
      }))));
      return tokens;
    } finally { progressCb = null; }
  }

  async function bitmapFrom(bytes, mime) {
    const blob = new Blob([bytes], { type: mime || 'image/*' });
    if (window.createImageBitmap) {
      try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch { /* aşağıda img ile denenir */ }
    }
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('IMAGE')); img.src = url; });
      return img;
    } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }

  async function fromImage(bytes, ext, { onProgress } = {}) {
    const bmp = await bitmapFrom(bytes, 'image/' + (ext === 'jpg' ? 'jpeg' : ext));
    const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight;
    const tokens = await ocrCanvas(prepCanvas(bmp, w, h), (p) => onProgress && onProgress({ stage: 'ocr', page: 1, pages: 1, p }));
    return [{ name: 'Görsel', rows: buildRows([tokens]), ocr: true }];
  }

  /* ---------------- PDF ---------------- */
  // Sayfadaki yatay tablo çizgileri (Word/Excel'den alınmış PDF'lerde satır sınırları), sayfa genişliği ölçeğinde y değerleri
  async function pageRules(page, vp, pdfjs) {
    const O = pdfjs.OPS, U = pdfjs.Util;
    const ol = await page.getOperatorList();
    let ctm = vp.transform.slice();
    const stack = [], segs = [];
    const pt = (x, y) => U.applyTransform([x, y], ctm);
    const hseg = (a, b) => { if (Math.abs(a[1] - b[1]) < 1.5 && Math.abs(a[0] - b[0]) > 20) segs.push({ y: (a[1] + b[1]) / 2, x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]) }); };
    for (let i = 0; i < ol.fnArray.length; i++) {
      const fn = ol.fnArray[i], args = ol.argsArray[i];
      if (fn === O.save) stack.push(ctm.slice());
      else if (fn === O.restore) ctm = stack.pop() || ctm;
      else if (fn === O.transform) ctm = U.transform(ctm, args);
      else if (fn === O.constructPath) {
        const [ops, a] = args;
        let j = 0, cur = null, start = null;
        for (const op of ops) {
          if (op === O.rectangle) {
            const x = a[j++], y = a[j++], w = a[j++], hh = a[j++];
            const p1 = pt(x, y), p2 = pt(x + w, y + hh);
            if (Math.abs(p2[1] - p1[1]) < 3) hseg(p1, [p2[0], p1[1]]);
            else { hseg(p1, [p2[0], p1[1]]); hseg([p1[0], p2[1]], p2); }
          } else if (op === O.moveTo) { cur = pt(a[j++], a[j++]); start = cur; }
          else if (op === O.lineTo) { const n = pt(a[j++], a[j++]); if (cur) hseg(cur, n); cur = n; }
          else if (op === O.curveTo) { j += 6; cur = null; }
          else if (op === O.curveTo2 || op === O.curveTo3) { j += 4; cur = null; }
          else if (op === O.closePath) { if (cur && start) hseg(cur, start); cur = start; }
        }
      }
    }
    const W = vp.width;
    const ys = [];
    segs.sort((p, q) => p.y - q.y).forEach((sg) => {
      const last = ys[ys.length - 1];
      if (last && sg.y - last.y < 2) { last.x0 = Math.min(last.x0, sg.x0); last.x1 = Math.max(last.x1, sg.x1); }
      else ys.push({ ...sg });
    });
    // sayfa boyu arka plan dikdörtgenlerinin kenarları çizgi sayılmaz
    return ys.filter((r) => r.x1 - r.x0 > W * 0.3 && r.x1 - r.x0 < W * 0.97 && r.y > 1 && r.y < vp.height - 1).map((r) => r.y / W);
  }

  async function fromPdf(bytes, { pdfjs, onProgress } = {}) {
    const doc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false }).promise;
    const pages = [];
    let ocrPages = 0;
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const vp = page.getViewport({ scale: 1 });
      const W = vp.width;
      const tc = await page.getTextContent();
      let tokens = [];
      tc.items.forEach((it) => {
        if (!it.str || !clean(it.str)) return;
        // pdf.js: transform = [a, b, c, d, e, f]; görüntü koordinatlarına çevrilir
        const m = pdfjs.Util.transform(vp.transform, it.transform);
        const fh = Math.hypot(m[2], m[3]) || it.height || 10;
        const x0 = m[4], y1 = m[5], wdt = it.width * (vp.scale || 1);
        // bir öğe içindeki geniş boşluklar (sekme benzeri) ayrı parçalara bölünür
        const str = it.str;
        const pieces = str.split(/(\s{3,})/);
        if (pieces.length > 1 && !isRtl(str)) {
          let off = 0;
          pieces.forEach((pc) => {
            const a = x0 + (off / str.length) * wdt; off += pc.length;
            const b = x0 + (off / str.length) * wdt;
            if (clean(pc)) tokens.push({ text: clean(pc), x0: a / W, x1: b / W, y0: (y1 - fh) / W, y1: y1 / W });
          });
        } else tokens.push({ text: str.trim(), x0: x0 / W, x1: (x0 + wdt) / W, y0: (y1 - fh) / W, y1: y1 / W, space: /^\s|\s$/.test(str) });
      });
      // metin katmanı yok ya da çok az: taranmış sayfa, görüntüsü tanınır
      if (tokens.length < 4) {
        const scale = Math.min(3, 2400 / Math.max(vp.width, vp.height) * 1.2);
        const v2 = page.getViewport({ scale });
        const c = document.createElement('canvas');
        c.width = Math.round(v2.width); c.height = Math.round(v2.height);
        const g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: g, viewport: v2 }).promise;
        tokens = await ocrCanvas(prepCanvas(c, c.width, c.height), (p) => onProgress && onProgress({ stage: 'ocr', page: n, pages: doc.numPages, p }));
        ocrPages++;
      } else if (onProgress) onProgress({ stage: 'pdf', page: n, pages: doc.numPages, p: 1 });
      let rules = [];
      try { rules = await pageRules(page, vp, pdfjs); } catch { rules = []; }
      pages.push({ tokens, rules });
      page.cleanup();
    }
    doc.destroy();
    const sheets = [{ name: 'PDF', rows: buildRows(pages), ocr: ocrPages > 0 }];
    if (doc.numPages > 1) {
      // sayfa düzenleri farklıysa her sayfa ayrıca seçilebilir
      pages.forEach((pg, i) => { const rows = buildRows([pg]); if (rows.length) sheets.push({ name: `Sayfa ${i + 1}`, rows }); });
    }
    await fixLamAlef(sheets);
    return sheets;
  }

  /* ---------------- Arapça lam-elif düzeltmesi ---------------- */
  // Bazı PDF'lerde (ör. LibreOffice çıktısı) "لا" bitişik harfi ters çıkar: الارتفاع → االرتفاع, للإشارة → لإلشارة.
  // Belgede bu iz (yan yana iki elif) görülürse her Arapça kelimede elif+lam çiftleri lam+elif olarak denenir;
  // yazım sözlüğünde bulunan biçim seçilir, bulunamazsa harf tanımı (baştaki "ال" takısı ve sondaki "ال" korunur) kullanılır.
  const ALEF = 'اأإآ';
  const PREF = 'وبفك';
  function lamAlefSpots(w) {
    const out = [];
    for (let i = 0; i < w.length - 1; i++) if (ALEF.includes(w[i]) && w[i + 1] === 'ل') out.push(i);
    return out;
  }
  const swapAt = (w, spots) => { const a = [...w]; spots.forEach((i) => { const x = a[i]; a[i] = a[i + 1]; a[i + 1] = x; }); return a.join(''); };
  function guessFix(w) {
    if (w === 'ال') return 'لا';
    return swapAt(w, lamAlefSpots(w).filter((i) => {
      const article = w[i] === 'ا' && (i === 0 || (i === 1 && PREF.includes(w[0])));
      const final = i + 2 === w.length && w[i] === 'ا';
      return !article && !final;
    }));
  }
  async function fixLamAlef(sheets) {
    const text = sheets.map((s) => s.rows.map((r) => r.join(' ')).join(' ')).join(' ');
    if ((text.match(/ا[اأإآ]|ل[أإآ]ل/g) || []).length < 2) return;
    const words = new Set();
    sheets.forEach((s) => s.rows.forEach((r) => r.forEach((c) => (c.match(/[\u0600-\u06ff]+/g) || []).forEach((w) => { if (lamAlefSpots(w).length) words.add(w); }))));
    const cand = new Map();
    words.forEach((w) => {
      const sp = lamAlefSpots(w).slice(0, 4);
      const list = [];
      for (let m = 0; m < 1 << sp.length; m++) list.push(swapAt(w, sp.filter((_, k) => m & (1 << k))));
      cand.set(w, list);
    });
    const fix = new Map();
    let rk = null;
    try {
      const all = [...new Set([...cand.values()].flat())];
      const r = await window.Spell.rank('ar', all);
      rk = new Map(all.map((w, i) => [w, r[i]]));
    } catch { rk = null; }
    cand.forEach((list, w) => {
      const g = guessFix(w);
      let pick = g;
      if (rk && rk.get(w) < 1e9 && !/ا[اأإآ]/.test(w)) pick = w; // kelime zaten sözlükte var: dokunulmaz
      else if (rk) {
        // sözlükteki en yaygın biçim; eşitlikte harf tanımı
        const best = list.filter((x) => !/ا[اأإآ]/.test(x)).sort((x, y) => rk.get(x) - rk.get(y) || (y === g) - (x === g))[0];
        if (best && rk.get(best) < 1e9 && !(rk.get(g) <= rk.get(best))) pick = best;
      }
      if (pick !== w) fix.set(w, pick);
    });
    if (!fix.size) return;
    sheets.forEach((s) => { s.rows = s.rows.map((r) => r.map((c) => c.replace(/[\u0600-\u06ff]+/g, (w) => fix.get(w) || w))); });
  }

  async function terminate() {
    if (!workerP) return;
    const p = workerP; workerP = null;
    try { (await p).terminate(); } catch { /* yok */ }
  }

  window.DocScan = { fromPdf, fromImage, buildRows, terminate, ocrCanvas, prepCanvas, bitmapFrom, IMG_EXT, isImage: (ext) => IMG_EXT.includes(ext) };
})();
