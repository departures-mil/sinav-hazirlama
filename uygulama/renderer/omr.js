'use strict';
/* Sınav Hazırlama 1.10.1 — optik form: sayfa düzeni (mm) ve okuma (gri tonlu görüntüden).
   Bağımlılıksız; hem arayüzde (window.OMR) hem Node testlerinde (module.exports) çalışır.
   Düzen: A4 dikey. Dört köşede 8 mm siyah kare (konum işareti). Solda 8 haneli öğrenci numarası ızgarası (0–9),
   altta 4 blok × 25 satır = en çok 100 soru, her satırda 5 şık (A–E). Kabarcık çapı 4,6 mm. */
(function (root) {
  const L = {
    page: { w: 210, h: 297 },
    fid: { size: 8, pos: [[10, 10], [192, 10], [10, 279], [192, 279]] },     // sol üst köşeleri
    no: { x: 24, y: 70, dx: 7, dy: 6, cols: 8, rows: 10 },                   // öğrenci no kabarcık merkezleri
    ans: { x: [26, 72, 118, 164], y: 150, dx: 6.5, dy: 4.9, rows: 25, opts: 5 }, // cevap kabarcık merkezleri (ilk şık)
    r: 2.3,
    max: 100,
  };
  const fidCenter = (i) => [L.fid.pos[i][0] + L.fid.size / 2, L.fid.pos[i][1] + L.fid.size / 2];
  // q (0 tabanlı) sorusunun k şıkkının merkezi (mm)
  function ansXY(q, k) { const b = Math.floor(q / L.ans.rows), r = q % L.ans.rows; return [L.ans.x[b] + k * L.ans.dx, L.ans.y + r * L.ans.dy]; }
  function noXY(c, d) { return [L.no.x + c * L.no.dx, L.no.y + d * L.no.dy]; }

  /* ---------- homografi (4 nokta) ---------- */
  function solve(A, b) {
    const n = b.length; const M = A.map((r, i) => r.concat(b[i]));
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      if (Math.abs(M[c][c]) < 1e-12) return null;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map((r, i) => r[n] / r[i]);
  }
  function homography(src, dst) {
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i], [u, v] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    const h = solve(A, b);
    if (!h) return null;
    return (x, y) => { const w = h[6] * x + h[7] * y + 1; return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w]; };
  }

  /* ---------- görüntü işleme ---------- */
  // gri (Uint8 w*h) → yerel ortalamaya göre koyu (1) / açık (0)
  function binarize(g, w, h) {
    const I = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) { let s = 0; for (let x = 0; x < w; x++) { s += g[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + s; } }
    const r = Math.max(8, Math.round(Math.min(w, h) / 24));
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
        const sum = I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0];
        const mean = sum / ((x1 - x0) * (y1 - y0));
        out[y * w + x] = g[y * w + x] < mean * 0.78 && g[y * w + x] < 170 ? 1 : 0;
      }
    }
    return out;
  }
  // koyu bölgeler (4 komşuluk)
  function components(b, w, h, minArea) {
    const lab = new Int32Array(w * h); const comps = []; const st = new Int32Array(w * h);
    let id = 0;
    for (let i = 0; i < w * h; i++) {
      if (!b[i] || lab[i]) continue;
      id++; let sp = 0; st[sp++] = i; lab[i] = id;
      let area = 0, minx = w, miny = h, maxx = 0, maxy = 0, sx = 0, sy = 0;
      while (sp) {
        const p = st[--sp]; const x = p % w, y = (p / w) | 0;
        area++; sx += x; sy += y; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
        if (x > 0 && b[p - 1] && !lab[p - 1]) { lab[p - 1] = id; st[sp++] = p - 1; }
        if (x < w - 1 && b[p + 1] && !lab[p + 1]) { lab[p + 1] = id; st[sp++] = p + 1; }
        if (y > 0 && b[p - w] && !lab[p - w]) { lab[p - w] = id; st[sp++] = p - w; }
        if (y < h - 1 && b[p + w] && !lab[p + w]) { lab[p + w] = id; st[sp++] = p + w; }
      }
      if (area >= minArea) comps.push({ area, minx, miny, maxx, maxy, cx: sx / area, cy: sy / area, bw: maxx - minx + 1, bh: maxy - miny + 1 });
    }
    return comps;
  }
  function findFiducials(b, w, h) {
    const md = Math.min(w, h);
    const comps = components(b, w, h, Math.max(12, Math.round((md * 0.012) ** 2)));
    const cand = comps.filter((c) => {
      const asp = c.bw / c.bh, fill = c.area / (c.bw * c.bh);
      return asp > 0.55 && asp < 1.8 && fill > 0.6 && c.bw > md * 0.018 && c.bw < md * 0.12;
    });
    const corners = [[0, 0], [w, 0], [0, h], [w, h]];
    const out = [];
    for (let i = 0; i < 4; i++) {
      const [X, Y] = corners[i];
      // köşeye yakın ve büyük olanlar; köşe bölgesi: görüntünün yarısı
      const inQ = cand.filter((c) => (i % 2 ? c.cx > w / 2 : c.cx < w / 2) && (i < 2 ? c.cy < h / 2 : c.cy > h / 2));
      if (!inQ.length) return null;
      inQ.sort((a, b2) => Math.hypot(a.cx - X, a.cy - Y) / Math.sqrt(a.area) - Math.hypot(b2.cx - X, b2.cy - Y) / Math.sqrt(b2.area));
      out.push(inQ[0]);
    }
    // dört karenin boyutları birbirine yakın olmalı
    const s = out.map((c) => Math.sqrt(c.area)); const mx = Math.max(...s), mn = Math.min(...s);
    if (mn < mx * 0.45) return null;
    return out;
  }
  // görüntüdeki noktanın çevresinde, yarıçapı rr olan dairede koyu oranı
  function fillRatio(b, w, h, cx, cy, rr) {
    let n = 0, d = 0; const r2 = rr * rr;
    for (let y = Math.floor(cy - rr); y <= Math.ceil(cy + rr); y++) {
      if (y < 0 || y >= h) continue;
      for (let x = Math.floor(cx - rr); x <= Math.ceil(cx + rr); x++) {
        if (x < 0 || x >= w) continue;
        const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy > r2) continue;
        n++; d += b[y * w + x];
      }
    }
    return n ? d / n : 0;
  }
  const choose = (f, on = 0.42) => {
    let m = -1, mi = -1, s = -1;
    f.forEach((v, i) => { if (v > m) { s = m; m = v; mi = i; } else if (v > s) s = v; });
    if (m < on) return -1;                       // boş
    if (s >= on && s > m * 0.7) return -2;      // birden çok işaret
    return mi;
  };

  // read({ gray: Uint8Array, w, h }, nQuestions) → { ok, answers:[-1 boş | -2 çok | 0..4], no, fills, corners, err }
  function read(img, nQ, opts = {}) {
    const { gray: g, w, h } = img;
    const b = binarize(g, w, h);
    const fids = findFiducials(b, w, h);
    if (!fids) return { ok: false, err: 'CORNERS' };
    const H = homography([0, 1, 2, 3].map(fidCenter), fids.map((c) => [c.cx, c.cy]));
    if (!H) return { ok: false, err: 'CORNERS' };
    // mm → piksel ölçeği (yerel)
    const px = (x, y) => { const a = H(x, y), c = H(x + L.r, y); return [a[0], a[1], Math.hypot(c[0] - a[0], c[1] - a[1])]; };
    const ratio = (x, y) => { const [u, v, rr] = px(x, y); return fillRatio(b, w, h, u, v, rr * 0.62); };
    const n = Math.max(1, Math.min(L.max, nQ || L.max));
    const fills = [], answers = [];
    for (let q = 0; q < n; q++) {
      const f = []; for (let k = 0; k < L.ans.opts; k++) { const [x, y] = ansXY(q, k); f.push(ratio(x, y)); }
      fills.push(f); answers.push(choose(f, opts.on));
    }
    let no = '';
    const noFills = [];
    for (let c = 0; c < L.no.cols; c++) {
      const f = []; for (let d = 0; d < L.no.rows; d++) { const [x, y] = noXY(c, d); f.push(ratio(x, y)); }
      noFills.push(f);
      const k = choose(f, opts.on);
      no += k >= 0 ? String(k) : k === -2 ? '*' : ' ';
    }
    no = no.replace(/^ +| +$/g, '');
    return { ok: true, answers, no, fills, noFills, corners: fids.map((c) => [c.cx, c.cy]), map: H };
  }
  // RGBA (canvas ImageData) → gri, en çok maxDim piksele küçültülmüş
  function toGray(data, w, h, maxDim = 1700) {
    const s = Math.min(1, maxDim / Math.max(w, h));
    const W = Math.max(1, Math.round(w * s)), Hh = Math.max(1, Math.round(h * s));
    const g = new Uint8Array(W * Hh);
    for (let y = 0; y < Hh; y++) {
      const sy = Math.min(h - 1, Math.floor(y / s));
      for (let x = 0; x < W; x++) {
        const sx = Math.min(w - 1, Math.floor(x / s)); const i = (sy * w + sx) * 4;
        g[y * W + x] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
      }
    }
    return { gray: g, w: W, h: Hh };
  }
  const api = { L, ansXY, noXY, fidCenter, homography, binarize, components, findFiducials, read, toGray };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.OMR = api;
})(typeof window !== 'undefined' ? window : null);
