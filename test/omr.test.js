// Optik form okuma testi (bağımlılıksız): sentetik, eğik çekilmiş ve gürültülü form görüntüsünden cevaplar ve öğrenci numarası okunur.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const OMR = require('../uygulama/renderer/omr.js');

// mm → piksel: hafif döndürülmüş, perspektifli "fotoğraf"
function makePhoto({ answers, no, rot = 0.04, persp = 0.00012, W = 1300, H = 1800, noise = 18, light = true }) {
  const g = new Uint8Array(W * H).fill(0);
  // kâğıt dışı koyu masa
  for (let i = 0; i < g.length; i++) g[i] = 60;
  const sc = 5.0, ox = 90, oy = 80;
  const fwd = (x, y) => { // mm → px
    const cx = x - 105, cy = y - 148;
    const rx = cx * Math.cos(rot) - cy * Math.sin(rot), ry = cx * Math.sin(rot) + cy * Math.cos(rot);
    const wq = 1 + persp * ry * sc;
    return [ox + (rx + 105) * sc / wq, oy + (ry + 148) * sc / wq];
  };
  const H4 = OMR.homography([[0, 0], [210, 0], [0, 297], [210, 297]], [fwd(0, 0), fwd(210, 0), fwd(0, 297), fwd(210, 297)]);
  const inv = OMR.homography([fwd(0, 0), fwd(210, 0), fwd(0, 297), fwd(210, 297)], [[0, 0], [210, 0], [0, 297], [210, 297]]);
  void H4;
  const L = OMR.L;
  const filled = new Set();
  answers.forEach((a, q) => { if (a >= 0) filled.add('a' + q + '_' + a); if (a === -2) { filled.add('a' + q + '_0'); filled.add('a' + q + '_3'); } });
  String(no).split('').forEach((d, c) => filled.add('n' + c + '_' + d));
  const bubbles = [];
  for (let q = 0; q < answers.length; q++) for (let k = 0; k < 5; k++) bubbles.push([...OMR.ansXY(q, k), filled.has('a' + q + '_' + k)]);
  for (let c = 0; c < 8; c++) for (let d = 0; d < 10; d++) bubbles.push([...OMR.noXY(c, d), filled.has('n' + c + '_' + d)]);
  let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  // her pikselin mm karşılığı (önce kâğıt, sonra şekiller yalnız kendi kutularında)
  const MX = new Float32Array(W * H), MY = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [mx, my] = inv(x, y); MX[y * W + x] = mx; MY[y * W + x] = my;
    if (mx < 0 || mx > 210 || my < 0 || my > 297) continue;
    let v = light ? 235 - Math.round(40 * (x / W)) : 230; // eşit olmayan ışık
    if (my > 20 && my < 40 && ((Math.floor(mx) + Math.floor(my * 2)) % 7 === 0)) v = 90; // basılı yazı benzeri
    g[y * W + x] = v;
  }
  const box = (x0, y0, x1, y1, f) => {
    const ps = [fwd(x0, y0), fwd(x1, y0), fwd(x0, y1), fwd(x1, y1)];
    const ax = Math.floor(Math.min(...ps.map((p) => p[0]))) - 2, bx = Math.ceil(Math.max(...ps.map((p) => p[0]))) + 2;
    const ay = Math.floor(Math.min(...ps.map((p) => p[1]))) - 2, by = Math.ceil(Math.max(...ps.map((p) => p[1]))) + 2;
    for (let y = Math.max(0, ay); y < Math.min(H, by); y++) for (let x = Math.max(0, ax); x < Math.min(W, bx); x++) { const v = f(MX[y * W + x], MY[y * W + x]); if (v != null) g[y * W + x] = v; }
  };
  L.fid.pos.forEach(([fx, fy]) => box(fx, fy, fx + L.fid.size, fy + L.fid.size, (mx, my) => (mx >= fx && mx <= fx + L.fid.size && my >= fy && my <= fy + L.fid.size ? 25 : null)));
  for (const [bx, by, f] of bubbles) {
    box(bx - L.r - 0.5, by - L.r - 0.5, bx + L.r + 0.5, by + L.r + 0.5, (mx, my) => {
      const d = Math.hypot(mx - bx, my - by);
      if (f && d < L.r - 0.15) return 55;            // kurşun kalemle doldurulmuş
      if (Math.abs(d - L.r) < 0.18) return 110;      // basılı halka
      return null;
    });
  }
  for (let i = 0; i < g.length; i++) g[i] = Math.max(0, Math.min(255, g[i] + Math.round((rnd() - 0.5) * noise)));
  return { gray: g, w: W, h: H };
}

test('optik form: eğik ve gürültülü fotoğraftan cevaplar ve numara okunur', () => {
  const n = 60;
  const answers = Array.from({ length: n }, (_, i) => (i % 13 === 5 ? -1 : i % 17 === 3 ? -2 : (i * 7) % 5));
  const img = makePhoto({ answers, no: '20261124' });
  const r = OMR.read(img, n);
  assert.strictEqual(r.ok, true, r.err);
  assert.strictEqual(r.no, '20261124');
  assert.deepStrictEqual(r.answers, answers);
});

test('optik form: 100 soru, ters yöne eğik, ışık düz', () => {
  const answers = Array.from({ length: 100 }, (_, i) => (i * 3 + 1) % 5);
  const img = makePhoto({ answers, no: '7051', rot: -0.03, persp: -0.0001, light: false });
  const r = OMR.read(img, 100);
  assert.strictEqual(r.ok, true, r.err);
  assert.strictEqual(r.no, '7051');
  assert.deepStrictEqual(r.answers, answers);
});

test('optik form: 8° döndürülmüş, daha gürültülü fotoğraf', () => {
  const answers = Array.from({ length: 40 }, (_, i) => (i * 2 + 3) % 5);
  const img = makePhoto({ answers, no: '123456', rot: 0.14, persp: 0.00008, noise: 40 });
  const r = OMR.read(img, 40);
  assert.strictEqual(r.ok, true, r.err);
  assert.strictEqual(r.no, '123456');
  assert.deepStrictEqual(r.answers, answers);
});

test('optik form: köşe kareleri yoksa okunmaz', () => {
  const g = new Uint8Array(800 * 1000).fill(230);
  const r = OMR.read({ gray: g, w: 800, h: 1000 }, 20);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.err, 'CORNERS');
});
