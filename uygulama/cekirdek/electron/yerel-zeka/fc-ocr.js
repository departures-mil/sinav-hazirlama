/* FC OCR — cihaz üstünde (çevrimdışı) yüksek doğruluklu metin okuma.
   Motor: PaddleOCR PP-OCRv5 (sunucu algılama modeli + Latin [tr/en] ve Arapça tanıma modelleri), ONNX Runtime ile.
   OpenCV gerekmez: DB algılama son işlemi, döndürülmüş dikdörtgen, kırpma ve CTC çözümü burada.
   Ortam bağımsız: tarayıcı / Electron / Android WebView / Node. `ort` (onnxruntime-web) dışarıdan verilir.

   const ocr = await FCOCR.create({ ort, det: ArrayBuffer, rec: { latin: {model, dict}, arabic: {model, dict} } });
   const r = await ocr.recognize({ data: Uint8ClampedArray(RGBA), width, height }, { langs: ['tr','en','ar'] });
   r.text  → satırlar (Arapça satırlar sağdan sola mantıksal sırada), r.lines → [{text, score, box, script}] */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FCOCR = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DET_MEAN = [0.485, 0.456, 0.406], DET_STD = [0.229, 0.224, 0.225];
  const AR_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/g;

  function parseDict(txt) {
    const lines = String(txt).replace(/\r/g, '').split('\n');
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    return ['', ...lines, ' ']; // 0 = CTC boşluğu, sonda boşluk karakteri
  }

  /* ---------- görüntü yardımcıları ---------- */
  function resizeRGBA(src, w, h) { // çift doğrusal
    const out = new Uint8ClampedArray(w * h * 4), sx = src.width / w, sy = src.height / h, d = src.data, W = src.width, H = src.height;
    for (let y = 0; y < h; y++) {
      const fy = Math.min(H - 1, Math.max(0, (y + 0.5) * sy - 0.5)), y0 = Math.floor(fy), y1 = Math.min(H - 1, y0 + 1), wy = fy - y0;
      for (let x = 0; x < w; x++) {
        const fx = Math.min(W - 1, Math.max(0, (x + 0.5) * sx - 0.5)), x0 = Math.floor(fx), x1 = Math.min(W - 1, x0 + 1), wx = fx - x0;
        const a = (y0 * W + x0) * 4, b = (y0 * W + x1) * 4, c = (y1 * W + x0) * 4, e = (y1 * W + x1) * 4, o = (y * w + x) * 4;
        for (let k = 0; k < 3; k++) out[o + k] = (d[a + k] * (1 - wx) + d[b + k] * wx) * (1 - wy) + (d[c + k] * (1 - wx) + d[e + k] * wx) * wy;
        out[o + 3] = 255;
      }
    }
    return { data: out, width: w, height: h };
  }
  function flatten(img) { // saydam pikselleri beyaz zemine
    const d = img.data; let has = false;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 255) { has = true; break; }
    if (!has) return img;
    const o = new Uint8ClampedArray(d.length);
    for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] / 255; for (let k = 0; k < 3; k++) o[i + k] = d[i + k] * a + 255 * (1 - a); o[i + 3] = 255; }
    return { data: o, width: img.width, height: img.height };
  }

  /* ---------- geometri ---------- */
  function hull(pts) { // Andrew monotone chain; pts: [[x,y]]
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (pts.length < 3) return pts;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function minAreaRect(pts) { // döndürülmüş en küçük dikdörtgen → {cx, cy, w, h, ux, uy} (u = genişlik yönü birim vektörü)
    const hp = hull(pts);
    if (hp.length < 3) { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, y0 = Math.min(...ys), y1 = Math.max(...ys) + 1; return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0, ux: 1, uy: 0 }; }
    let best = null;
    for (let i = 0; i < hp.length; i++) {
      const a = hp[i], b = hp[(i + 1) % hp.length]; let ux = b[0] - a[0], uy = b[1] - a[1]; const L = Math.hypot(ux, uy); if (!L) continue; ux /= L; uy /= L;
      let mn1 = Infinity, mx1 = -Infinity, mn2 = Infinity, mx2 = -Infinity;
      for (const p of hp) { const s = p[0] * ux + p[1] * uy, t = -p[0] * uy + p[1] * ux; if (s < mn1) mn1 = s; if (s > mx1) mx1 = s; if (t < mn2) mn2 = t; if (t > mx2) mx2 = t; }
      const area = (mx1 - mn1) * (mx2 - mn2);
      if (!best || area < best.area) { const s = (mn1 + mx1) / 2, t = (mn2 + mx2) / 2; best = { area, cx: s * ux - t * uy, cy: s * uy + t * ux, w: mx1 - mn1, h: mx2 - mn2, ux, uy }; }
    }
    // piksel merkezleri → piksel kenarları
    best.w += 1; best.h += 1; best.cx += 0.5; best.cy += 0.5;
    if (best.h > best.w) { const t = best.w; best.w = best.h; best.h = t; const ux = best.ux; best.ux = -best.uy; best.uy = ux; }
    if (best.ux < 0) { best.ux = -best.ux; best.uy = -best.uy; } // soldan sağa
    return best;
  }
  function corners(r) { const hx = r.ux * r.w / 2, hy = r.uy * r.w / 2, vx = -r.uy * r.h / 2, vy = r.ux * r.h / 2; return [[r.cx - hx - vx, r.cy - hy - vy], [r.cx + hx - vx, r.cy + hy - vy], [r.cx + hx + vx, r.cy + hy + vy], [r.cx - hx + vx, r.cy - hy + vy]]; }

  /* ---------- algılama ---------- */
  async function detect(ort, sess, img, o) {
    const maxSide = o.maxSide || 2400, minSide = 64;
    let s = 1; const big = Math.max(img.width, img.height), small = Math.min(img.width, img.height);
    if (big * s > maxSide) s = maxSide / big;
    if (small * s < minSide) s = minSide / small;
    const W = Math.max(32, Math.round(img.width * s / 32) * 32), H = Math.max(32, Math.round(img.height * s / 32) * 32);
    const r = resizeRGBA(img, W, H), n = W * H, t = new Float32Array(3 * n), d = r.data;
    for (let i = 0; i < n; i++) { // BGR sırası (PaddleOCR cv2 ile okur)
      t[i] = (d[i * 4 + 2] / 255 - DET_MEAN[0]) / DET_STD[0];
      t[n + i] = (d[i * 4 + 1] / 255 - DET_MEAN[1]) / DET_STD[1];
      t[2 * n + i] = (d[i * 4] / 255 - DET_MEAN[2]) / DET_STD[2];
    }
    const out = await sess.run({ [sess.inputNames[0]]: new ort.Tensor('float32', t, [1, 3, H, W]) });
    const prob = out[sess.outputNames[0]].data, thr = o.detThresh || 0.3, boxThr = o.boxThresh || 0.6, unclip = o.unclipRatio || 1.5;
    const seen = new Uint8Array(n), boxes = [], stack = new Int32Array(n);
    const rx = img.width / W, ry = img.height / H;
    for (let i = 0; i < n; i++) {
      if (seen[i] || prob[i] <= thr) continue;
      let sp = 0, cnt = 0, sum = 0; stack[sp++] = i; seen[i] = 1; const pts = [];
      while (sp) {
        const p = stack[--sp], x = p % W, y = (p - x) / W; cnt++; sum += prob[p];
        // yalnız sınır pikselleri dışbükey zarf için yeter
        let edge = false;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) { edge = true; continue; }
          const q = ny * W + nx; if (prob[q] > thr) { if (!seen[q]) { seen[q] = 1; stack[sp++] = q; } } else edge = true;
        }
        if (edge) pts.push([x, y]);
      }
      if (cnt < 6 || sum / cnt < boxThr) continue;
      const rc = minAreaRect(pts); if (Math.min(rc.w, rc.h) < 3) continue;
      const dist = (rc.w * rc.h) * unclip / (2 * (rc.w + rc.h)); // pyclipper unclip yaklaşımı
      rc.w += 2 * dist; rc.h += 2 * dist;
      // özgün görüntü ölçeğine
      const c = corners(rc).map(([x, y]) => [x * rx, y * ry]);
      const ux = c[1][0] - c[0][0], uy = c[1][1] - c[0][1], vx = c[3][0] - c[0][0], vy = c[3][1] - c[0][1];
      const w = Math.hypot(ux, uy), h = Math.hypot(vx, vy); if (h < 4 || w < 4) continue;
      boxes.push({ pts: c, w, h, score: sum / cnt, ang: Math.atan2(uy, ux) });
    }
    return o.noMerge ? boxes : mergeBoxes(boxes);
  }

  // Aynı satırdaki yatay kutuları birleştir: bölünmüş sözcüklerde yinelenen harfleri önler, tanıma tüm satırı görür
  function mergeBoxes(boxes) {
    const flat = [], rest = [];
    for (const b of boxes) {
      const [p0, p1] = b.pts, ang = Math.abs(Math.atan2(p1[1] - p0[1], p1[0] - p0[0]));
      if (ang < 0.02) { const xs = b.pts.map((p) => p[0]), ys = b.pts.map((p) => p[1]); flat.push({ x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), score: b.score }); } else rest.push(b);
    }
    let changed = true;
    while (changed) {
      changed = false;
      outer: for (let i = 0; i < flat.length; i++) for (let j = i + 1; j < flat.length; j++) {
        const a = flat[i], b = flat[j], ha = a.y1 - a.y0, hb = b.y1 - b.y0;
        const vo = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0), gap = Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1);
        if (vo > 0.6 * Math.min(ha, hb) && Math.max(ha, hb) < 1.6 * Math.min(ha, hb) && gap < 0.8 * Math.min(ha, hb)) {
          flat[i] = { x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1), score: Math.max(a.score, b.score) };
          flat.splice(j, 1); changed = true; break outer;
        }
      }
    }
    return rest.concat(flat.map((f) => ({ pts: [[f.x0, f.y0], [f.x1, f.y0], [f.x1, f.y1], [f.x0, f.y1]], w: f.x1 - f.x0, h: f.y1 - f.y0, score: f.score })));
  }

  function rotate(img, a) { // a radyan; genişleyen tuval, beyaz zemin
    const c = Math.cos(a), s = Math.sin(a), W = img.width, H = img.height;
    const NW = Math.ceil(Math.abs(W * c) + Math.abs(H * s)), NH = Math.ceil(Math.abs(W * s) + Math.abs(H * c)), o = new Uint8ClampedArray(NW * NH * 4), d = img.data;
    for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) {
      const dx = x - NW / 2, dy = y - NH / 2, sx = c * dx + s * dy + W / 2 - 0.5, sy = -s * dx + c * dy + H / 2 - 0.5;
      const x0 = Math.floor(sx), y0 = Math.floor(sy), wx = sx - x0, wy = sy - y0, k0 = (y * NW + x) * 4;
      for (let k = 0; k < 3; k++) {
        const g = (xx, yy) => (xx < 0 || yy < 0 || xx >= W || yy >= H) ? 255 : d[(yy * W + xx) * 4 + k];
        o[k0 + k] = (g(x0, y0) * (1 - wx) + g(x0 + 1, y0) * wx) * (1 - wy) + (g(x0, y0 + 1) * (1 - wx) + g(x0 + 1, y0 + 1) * wx) * wy;
      }
      o[k0 + 3] = 255;
    }
    return { data: o, width: NW, height: NH };
  }
  function skewOf(boxes) { // uzun satırların ağırlıklı ortanca açısı
    const a = boxes.filter((b) => b.ang !== undefined && b.w > 3 * b.h).map((b) => [b.ang, b.w]).sort((x, y) => x[0] - y[0]);
    if (a.length < 2) return 0; const tot = a.reduce((s, x) => s + x[1], 0); let acc = 0;
    for (const [ang, w] of a) { acc += w; if (acc >= tot / 2) return ang; }
    return 0;
  }

  function pad(img, p) { // beyaz kenar: kenara dayalı metin de algılanır
    const W = img.width + 2 * p, H = img.height + 2 * p, o = new Uint8ClampedArray(W * H * 4).fill(255);
    for (let y = 0; y < img.height; y++) o.set(img.data.subarray(y * img.width * 4, (y + 1) * img.width * 4), ((y + p) * W + p) * 4);
    return { data: o, width: W, height: H };
  }

  function crop(img, b, recH, stretch) { // döndürülmüş kutuyu yükseklik recH olacak biçimde düzleştir
    const [p0, p1, , p3] = b.pts, W = img.width, H = img.height, d = img.data;
    const outH = recH, outW = Math.max(8, Math.round(b.w * recH / b.h * (stretch || 1))), out = new Uint8ClampedArray(outW * outH * 4);
    for (let y = 0; y < outH; y++) for (let x = 0; x < outW; x++) {
      const u = (x + 0.5) / outW, v = (y + 0.5) / outH;
      const sx = p0[0] + (p1[0] - p0[0]) * u + (p3[0] - p0[0]) * v - 0.5, sy = p0[1] + (p1[1] - p0[1]) * u + (p3[1] - p0[1]) * v - 0.5;
      const x0 = Math.floor(sx), y0 = Math.floor(sy), wx = sx - x0, wy = sy - y0, o = (y * outW + x) * 4;
      for (let k = 0; k < 3; k++) {
        const g = (xx, yy) => (xx < 0 || yy < 0 || xx >= W || yy >= H) ? 255 : d[(yy * W + xx) * 4 + k];
        out[o + k] = (g(x0, y0) * (1 - wx) + g(x0 + 1, y0) * wx) * (1 - wy) + (g(x0, y0 + 1) * (1 - wx) + g(x0 + 1, y0 + 1) * wx) * wy;
      }
      out[o + 3] = 255;
    }
    return { data: out, width: outW, height: outH };
  }

  /* ---------- tanıma ---------- */
  async function recognizeCrop(ort, rec, c) {
    const H = c.height, W = Math.min(c.width, 3200), n = H * W, t = new Float32Array(3 * n), d = c.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, j = (y * c.width + x) * 4;
      t[i] = d[j + 2] / 127.5 - 1; t[n + i] = d[j + 1] / 127.5 - 1; t[2 * n + i] = d[j] / 127.5 - 1;
    }
    const out = await rec.sess.run({ [rec.sess.inputNames[0]]: new ort.Tensor('float32', t, [1, 3, H, W]) });
    const o = out[rec.sess.outputNames[0]], [, T, C] = o.dims, p = o.data;
    let text = '', last = -1, conf = 0, k = 0;
    for (let s = 0; s < T; s++) {
      let bi = 0, bv = -Infinity; for (let j = 0; j < C; j++) { const v = p[s * C + j]; if (v > bv) { bv = v; bi = j; } }
      if (bi !== 0 && bi !== last) { text += rec.dict[bi] || ''; conf += bv; k++; }
      last = bi;
    }
    return { text, score: k ? conf / k : 0 };
  }

  // Arapça modeli görsel (soldan sağa) sırada çıkarır: mantıksal sıraya çevir, rakam/Latin gruplarını koru
  function arNorm(s) { // Farsça biçimler → Arapça (ک → ك, ی → ي / sözcük sonunda ى)
    return s.replace(/ک/g, 'ك').replace(/ی(?=[\u0600-\u06FF])/g, 'ي').replace(/ی/g, 'ى');
  }
  function arabicLogical(s) {
    const parts = s.match(/[0-9٠-٩A-Za-z.,:/%+\-]+|[^0-9٠-٩A-Za-z.,:/%+\-]+/g) || [];
    return parts.reverse().map((p) => /[0-9٠-٩A-Za-z]/.test(p) ? p : Array.from(p).reverse().join('')).join('')
      .replace(/\(/g, '\u0000').replace(/\)/g, '(').replace(/\u0000/g, ')').trim();
  }

  const TR_MAP = { 'ı': 'i', 'İ': 'i', 'ş': 's', 'Ş': 's', 'ğ': 'g', 'Ğ': 'g', 'ç': 'c', 'Ç': 'c', 'ö': 'o', 'Ö': 'o', 'ü': 'u', 'Ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
  const skeleton = (s) => String(s).replace(/[ıİşŞğĞçÇöÖüÜâîû]/g, (c) => TR_MAP[c]).toLowerCase().replace(/\s+/g, ' ').trim();

  function buildLines(items) {
    items.sort((a, b) => a.cy - b.cy);
    const lines = [];
    for (const it of items) {
      const L = lines.find((l) => Math.abs(l.cy - it.cy) < Math.min(l.h, it.h) * 0.6);
      if (L) { L.items.push(it); L.cy = (L.cy * (L.items.length - 1) + it.cy) / L.items.length; } else lines.push({ cy: it.cy, h: it.h, items: [it] });
    }
    return lines.sort((a, b) => a.cy - b.cy).map((l) => {
      const ar = l.items.filter((i) => i.script === 'arabic').length > l.items.length / 2;
      l.items.sort((a, b) => ar ? b.cx - a.cx : a.cx - b.cx);
      return { text: l.items.map((i) => i.text).join(' '), rtl: ar, items: l.items };
    });
  }

  async function create(opt) {
    const ort = opt.ort; if (!ort) throw new Error('FCOCR: onnxruntime gerekli');
    const so = Object.assign({ graphOptimizationLevel: 'all' }, opt.sessionOptions || {});
    const det = await ort.InferenceSession.create(opt.det, so);
    const recs = {};
    for (const [k, v] of Object.entries(opt.rec || {})) recs[k] = { sess: await ort.InferenceSession.create(v.model, so), dict: parseDict(v.dict) };
    return {
      async recognize(image, o = {}) {
        const P = Math.round(Math.max(16, 0.04 * Math.min(image.width, image.height))); let img = pad(flatten(image), P); const langs = o.langs || ['tr', 'en', 'ar'], t0 = Date.now();
        const wantAr = langs.includes('ar') && recs.arabic, wantLat = langs.some((l) => l !== 'ar') && recs.latin;
        let boxes = await detect(ort, det, img, Object.assign({}, o, { noMerge: true })), skew = skewOf(boxes);
        if (Math.abs(skew) > 0.006 && Math.abs(skew) < 0.8 && o.deskew !== false) { img = rotate(img, skew); boxes = await detect(ort, det, img, o); } // eğik tarama / fotoğraf düzeltilir
        else { skew = 0; boxes = mergeBoxes(boxes); }
        const items = [];
        for (const b of boxes) {
          const c = crop(img, b, 48); let best = null;
          if (wantAr) {
            // Arapça: aynı satır üç genişlikte okunur (yan yana aynı rakamlar — ٢٥٠٠٠٠ — CTC'de birleşmesin); en güvenilir, eşitse en uzun
            const cand = [];
            for (const st of (o.arStretch ? [o.arStretch] : [1, 1.5, 2])) cand.push(await recognizeCrop(ort, recs.arabic, st === 1 ? c : crop(img, b, 48, st)));
            const ns = (t) => t.replace(/\s+/g, '');
            let r = cand.reduce((a, q) => (q.score > a.score + 0.02 || (q.score > a.score - 0.02 && q.text.length > a.text.length)) ? q : a);
            for (const q of cand) if (q !== r && q.score > 0.75 && ns(q.text).length > ns(r.text).length && ns(q.text).includes(ns(r.text))) r = q; // eksik okunanı tamamlayan
            const ar = (r.text.match(AR_RE) || []).length; r.script = 'arabic'; r.arRatio = ar / Math.max(1, r.text.replace(/\s/g, '').length); best = r;
          }
          if (wantLat && (!best || best.arRatio < 0.3)) {
            // Latin satırlar: Paddle Latin + (verildiyse) ek motor (ör. Tesseract tur+eng). İkisi harf iskeletinde aynıysa Türkçe
            // harfleri (ı İ ş ğ ç ö ü) doğru veren ek motor; farklıysa güveni yüksek olan.
            let r = await recognizeCrop(ort, recs.latin, c);
            if (opt.latinEngine) {
              let t = null; try { t = await opt.latinEngine(crop(img, b, 64), langs); } catch (e) { t = null; }
              if (t && t.text && t.text.trim()) {
                t.text = t.text.trim();
                if (skeleton(t.text) === skeleton(r.text)) r = { text: t.text, score: Math.max(r.score, t.score || 0) };
                else if ((t.score || 0) > r.score + 0.05) r = t;
              }
            }
            r.script = 'latin'; best = r;
          }
          if (!best || !best.text.trim() || best.score < (o.minScore || 0.5)) continue;
          const text = best.script === 'arabic' ? (o.arNormalize === false ? arabicLogical(best.text) : arNorm(arabicLogical(best.text))) : best.text.trim();
          const cx = -P + b.pts.reduce((s, p) => s + p[0], 0) / 4, cy = -P + b.pts.reduce((s, p) => s + p[1], 0) / 4;
          items.push({ text, score: best.score, script: best.script, box: b.pts.map(([x, y]) => [x - P, y - P]), cx, cy, h: b.h });
        }
        const lines = buildLines(items);
        return { text: lines.map((l) => l.text).join('\n'), lines, items, ms: Date.now() - t0 };
      },
    };
  }

  return { create, parseDict, _t: { minAreaRect, arabicLogical, hull } };
});
