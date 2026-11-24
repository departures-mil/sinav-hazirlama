'use strict';
/* Sınav Hazırlama 1.10.1 — çevrimiçi sınav (aynı Wi-Fi / modem, internet gerekmez), ana süreç tarafı.
   - Öğretmenin bilgisayarı küçük bir web sunucusu açar; öğrenciler telefonlarının tarayıcısından adrese (ya da QR koduna) girer.
   - Öğrenci adı + numarası ve sınav kodu ile girer. Her öğrencinin süresi kendi girişinden başlar; süre bitince cevaplar
     sunucuda otomatik teslim edilir. Cevaplar her işaretlemede bilgisayara yazılır (telefon kapansa da kaybolmaz).
   - Doğru cevaplar telefona hiç gönderilmez. Soru ve şık sırası öğrenciye göre karıştırılabilir (cevaplar asıl sıraya çevrilir).
   - Aynı numarayla ikinci bir telefondan girilemez (öğretmen "yeniden girişe izin ver" diyebilir).
   - /okut: öğretmenin telefonu optik formların fotoğrafını bilgisayara yollar (sınav kodu gerekir).
   Oturum dosyası: <userData>/canli-sinav/<oturumId>.json (her değişiklikte atomik yazılır; hiçbir oturum silinmez). */
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORTS = [47870, 47871, 47872, 47873, 47874, 47875];
const MAX_BODY = 12 * 1024 * 1024;
const rnd = (n) => crypto.randomBytes(n).toString('hex');
const code4 = () => String(crypto.randomInt(0, 10000)).padStart(4, '0');

function addrs() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push({ name, address: a.address });
  }
  // Wi-Fi / Ethernet önce, sanal bağdaştırıcılar (VirtualBox, VMware, Hyper-V, WSL) sona
  const virt = /virtual|vmware|vbox|hyper-v|vethernet|wsl|docker|loopback|bluetooth/i;
  return out.sort((a, b) => (virt.test(a.name) ? 1 : 0) - (virt.test(b.name) ? 1 : 0)).map((a) => a.address);
}
function shuffledIdx(n) { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = crypto.randomInt(0, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function createCanli({ dir, pageHtml, scanHtml, onChange, onScan, log }) {
  fs.mkdirSync(dir, { recursive: true });
  const L = { server: null, port: 0, s: null, saveTm: null, pendingScans: new Map() };
  const file = (id) => path.join(dir, id.replace(/[^a-z0-9-]/gi, '') + '.json');
  function save(now) {
    const s = L.s; if (!s) return;
    clearTimeout(L.saveTm);
    const write = () => { try { const f = file(s.id); fs.writeFileSync(f + '.tmp', JSON.stringify(s)); fs.renameSync(f + '.tmp', f); } catch (e) { if (log) log('canlı sınav yazılamadı: ' + e.message); } };
    if (now) write(); else L.saveTm = setTimeout(write, 400);
  }
  const pub = () => {
    const s = L.s; if (!s) return null;
    return {
      id: s.id, title: s.title, code: s.code, open: s.open, dur: s.dur, createdAt: s.createdAt, examId: s.examId, n: s.questions.length,
      urls: L.port ? addrs().map((a) => `http://${a}:${L.port}/`) : [], port: L.port,
      students: Object.values(s.students).map((x) => ({ id: x.id, ad: x.ad, no: x.no, start: x.start, end: x.end, done: !!x.done, answers: x.answers, last: x.last, allowRe: !!x.allowRe, ip: x.ip })),
    };
  };
  const changed = (now) => { save(!!now); if (onChange) onChange(pub()); };

  function timeLeft(st) { return Math.max(0, st.start + L.s.dur * 60000 - Date.now()); }
  function finishIfLate(st) { if (!st.done && L.s.dur > 0 && timeLeft(st) <= 0) { st.done = true; st.end = st.start + L.s.dur * 60000; st.auto = true; return true; } return false; }
  setInterval(() => { if (!L.s) return; let ch = false; Object.values(L.s.students).forEach((st) => { if (finishIfLate(st)) ch = true; }); if (ch) changed(); }, 5000).unref();

  // öğrencinin gördüğü sorular (doğru cevap yok; kişiye göre karışık sıra)
  function paperFor(st) {
    const s = L.s;
    return st.order.map((qi) => {
      const q = s.questions[qi];
      const perm = st.perm[qi];
      return { id: q.id, text: q.text, img: q.img || '', options: perm.map((k) => q.options[k]), oimg: q.oimg ? perm.map((k) => q.oimg[k] || '') : null };
    });
  }
  // telefondaki seçim (karışık sıradaki şık) → asıl şık
  const realOpt = (st, qi, shown) => (shown == null || shown < 0 ? -1 : st.perm[qi][shown]);
  const shownOpt = (st, qi, real) => (real == null || real < 0 ? -1 : st.perm[qi].indexOf(real));

  function send(res, code, obj, type) {
    const body = typeof obj === 'string' ? obj : JSON.stringify(obj);
    res.writeHead(code, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    res.end(body);
  }
  function readBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0; const chunks = [];
      req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(new Error('BIG')); req.destroy(); } else chunks.push(c); });
      req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(new Error('JSON')); } });
      req.on('error', reject);
    });
  }
  const tries = new Map(); // ip -> [zamanlar] (kod deneme sınırı)
  function limited(ip) { const now = Date.now(); const a = (tries.get(ip) || []).filter((x) => now - x < 60000); a.push(now); tries.set(ip, a); return a.length > 20; }

  async function handle(req, res) {
    const u = new URL(req.url, 'http://x');
    const ip = String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');
    const s = L.s;
    if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '/index.html')) return send(res, 200, pageHtml(), 'text/html; charset=utf-8');
    if (req.method === 'GET' && u.pathname === '/okut') return send(res, 200, scanHtml(), 'text/html; charset=utf-8');
    if (req.method === 'GET' && u.pathname === '/api/bilgi') {
      if (!s) return send(res, 200, { ok: false, error: 'NO_EXAM' });
      return send(res, 200, { ok: true, title: s.title, dur: s.dur, n: s.questions.length, open: s.open, langs: s.langs, lang: s.lang });
    }
    if (req.method !== 'POST') return send(res, 404, { ok: false });
    let j;
    try { j = await readBody(req); } catch (e) { return send(res, 413, { ok: false, error: e.message }); }
    if (u.pathname === '/api/okut') {
      if (!s || String(j.code || '') !== s.code) { limited(ip); return send(res, 200, { ok: false, error: 'CODE' }); }
      if (limited(ip)) return send(res, 429, { ok: false, error: 'SLOW' });
      if (typeof j.image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(j.image)) return send(res, 200, { ok: false, error: 'IMG' });
      const id = rnd(6);
      const p = new Promise((resolve) => { L.pendingScans.set(id, resolve); setTimeout(() => { if (L.pendingScans.has(id)) { L.pendingScans.delete(id); resolve({ ok: true, pending: true }); } }, 25000); });
      if (onScan) onScan(id, j.image);
      return send(res, 200, await p);
    }
    if (!s) return send(res, 200, { ok: false, error: 'NO_EXAM' });
    if (u.pathname === '/api/giris') {
      if (limited(ip)) return send(res, 429, { ok: false, error: 'SLOW' });
      // kayıtlı jetonla geri dönüş (sayfa yenilendi / telefon kapandı)
      if (j.token) {
        const st = Object.values(s.students).find((x) => x.token === j.token);
        if (!st) return send(res, 200, { ok: false, error: 'TOKEN' });
        finishIfLate(st);
        return send(res, 200, { ok: true, token: st.token, ad: st.ad, no: st.no, done: !!st.done, left: s.dur ? timeLeft(st) : null, paper: st.done ? [] : paperFor(st), answers: st.order.map((qi) => shownOpt(st, qi, st.answers[s.questions[qi].id])), title: s.title, lang: s.lang, langs: s.langs, letters: s.letters });
      }
      if (String(j.code || '').trim() !== s.code) return send(res, 200, { ok: false, error: 'CODE' });
      if (!s.open) return send(res, 200, { ok: false, error: 'CLOSED' });
      const ad = String(j.ad || '').replace(/\s+/g, ' ').trim().slice(0, 80), no = String(j.no || '').replace(/\s+/g, '').slice(0, 30);
      if (ad.length < 2 || !no) return send(res, 200, { ok: false, error: 'NAME' });
      const key = no.toLowerCase();
      let st = s.students[key];
      if (st && !st.allowRe) return send(res, 200, { ok: false, error: st.done ? 'DONE' : 'TAKEN' });
      if (st && st.allowRe) { st.token = rnd(16); st.allowRe = false; st.ip = ip; if (st.done && st.reopen) { st.done = false; st.end = 0; st.start = Date.now(); } st.reopen = false; }
      else {
        const n = s.questions.length;
        st = s.students[key] = {
          id: key, ad, no, token: rnd(16), ip, start: Date.now(), end: 0, done: false, answers: {}, last: Date.now(),
          order: s.shuffleQ ? shuffledIdx(n) : [...Array(n).keys()],
          perm: s.questions.map((q) => (s.shuffleO ? shuffledIdx(q.options.length) : [...Array(q.options.length).keys()])),
        };
      }
      changed(true);
      return send(res, 200, { ok: true, token: st.token, ad: st.ad, no: st.no, done: !!st.done, left: s.dur ? timeLeft(st) : null, paper: st.done ? [] : paperFor(st), answers: st.order.map((qi) => shownOpt(st, qi, st.answers[s.questions[qi].id])), title: s.title, lang: s.lang, langs: s.langs, letters: s.letters });
    }
    const st = j.token ? Object.values(s.students).find((x) => x.token === j.token) : null;
    if (!st) return send(res, 200, { ok: false, error: 'TOKEN' });
    if (u.pathname === '/api/cevap') {
      finishIfLate(st);
      if (st.done) { changed(); return send(res, 200, { ok: false, error: 'DONE' }); }
      // answers: gösterilen sıradaki dizi [şık | -1]
      if (Array.isArray(j.answers)) {
        j.answers.slice(0, st.order.length).forEach((a, i) => {
          const qi = st.order[i]; const q = s.questions[qi];
          const r = realOpt(st, qi, Number.isInteger(a) ? a : -1);
          if (r >= 0 && r < q.options.length) st.answers[q.id] = r; else delete st.answers[q.id];
        });
      }
      st.last = Date.now(); st.ip = ip;
      if (j.final) { st.done = true; st.end = Date.now(); }
      changed(!!j.final);
      return send(res, 200, { ok: true, done: st.done, left: s.dur ? timeLeft(st) : null });
    }
    if (u.pathname === '/api/durum') { finishIfLate(st); return send(res, 200, { ok: true, done: st.done, left: s.dur ? timeLeft(st) : null }); }
    return send(res, 404, { ok: false });
  }

  function listen() {
    if (L.server) return Promise.resolve(L.port);
    return new Promise((resolve, reject) => {
      let i = 0;
      const tryNext = () => {
        if (i >= PORTS.length) return reject(new Error('PORT'));
        const port = PORTS[i++];
        const srv = http.createServer((req, res) => { handle(req, res).catch((e) => { try { send(res, 500, { ok: false, error: 'ERR' }); } catch (er) { /* yok */ } if (log) log(e.message); }); });
        srv.on('error', (e) => { if (e.code === 'EADDRINUSE' || e.code === 'EACCES') tryNext(); else reject(e); });
        srv.listen(port, '0.0.0.0', () => { L.server = srv; L.port = port; resolve(port); });
      };
      tryNext();
    });
  }

  return {
    // yeni oturum ya da kayıtlı oturumu sürdür
    async start(o) {
      if (o.resume) {
        const d = JSON.parse(fs.readFileSync(file(o.resume), 'utf8'));
        L.s = d; L.s.open = true;
      } else {
        const qs = (o.questions || []).map((q) => ({ id: String(q.id), text: q.text, img: q.img || '', options: q.options, oimg: q.oimg || null }));
        if (!qs.length) throw new Error('EMPTY');
        L.s = {
          id: new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19) + '-' + rnd(3), createdAt: Date.now(), examId: String(o.examId || ''),
          title: String(o.title || '').slice(0, 200), code: code4(), open: true, dur: Math.max(0, Math.min(600, +o.dur || 0)),
          shuffleQ: !!o.shuffleQ, shuffleO: !!o.shuffleO, lang: o.lang || 'tr', langs: o.langs || ['tr'], letters: o.letters || {},
          questions: qs, key: o.key || {}, students: {},
        };
      }
      await listen();
      save(true);
      if (onChange) onChange(pub());
      return pub();
    },
    status: () => ({ running: !!L.server, port: L.port, urls: L.port ? addrs().map((a) => `http://${a}:${L.port}/`) : [], session: pub() }),
    setOpen(on) { if (L.s) { L.s.open = !!on; changed(); } return pub(); },
    allowRe(id, reopen) { const st = L.s && L.s.students[id]; if (st) { st.allowRe = true; st.reopen = !!reopen; changed(); } return pub(); },
    finishAll() { if (L.s) { Object.values(L.s.students).forEach((st) => { if (!st.done) { st.done = true; st.end = Date.now(); } }); L.s.open = false; changed(); save(true); } return pub(); },
    stop() { if (L.s) { L.s.open = false; save(true); } if (L.server) { try { L.server.close(); } catch (e) { /* yok */ } } L.server = null; L.port = 0; const p = pub(); L.s = null; return p; },
    scanResult(id, r) { const f = L.pendingScans.get(id); if (f) { L.pendingScans.delete(id); f(r); } return true; },
    // kayıtlı oturumlar (sonuç raporu için)
    list() {
      let names = [];
      try { names = fs.readdirSync(dir).filter((x) => x.endsWith('.json')); } catch (e) { return []; }
      return names.map((n) => { try { const d = JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8')); return { id: d.id, title: d.title, examId: d.examId, createdAt: d.createdAt, n: d.questions.length, students: Object.keys(d.students).length }; } catch (e) { return null; } }).filter(Boolean).sort((a, b) => b.createdAt - a.createdAt);
    },
    get(id) { try { return JSON.parse(fs.readFileSync(file(String(id)), 'utf8')); } catch (e) { return null; } },
    addrs,
  };
}
module.exports = { createCanli, addrs };
