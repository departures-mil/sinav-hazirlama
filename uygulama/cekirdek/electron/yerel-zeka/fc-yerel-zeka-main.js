/* Yerel zeka — Electron ana süreç bölümü.
   Paketler (GitHub Releases, departures-mil/ortak-cekirdek, etiket yerel-zeka-v1):
     runtime-<platform>  onnxruntime-node (Windows'ta DirectML ile GPU), transformers.js, tesseract.js
     ocr                 PaddleOCR PP-OCRv5 (sunucu + hızlı algılama, Latin [tr/en] + Arapça tanıma) + Tesseract tur/eng
     mt                  NLLB-200 (Meta) çeviri modeli, tam duyarlık (fp32)
   Paketler kullanıcı veri klasörüne (<userData>/yerel-zeka) iner: program güncellemelerinden etkilenmez, bir kez iner.
   İndirme: yüzde + inen/toplam MB + kalan MB + hız + süre; yarıda kalırsa kaldığı yerden; SHA-256 doğrulanır.

   Kullanım (main.js):  require('./fc-yerel-zeka-main').install({ app, ipcMain });
   Preload:             require('./fc-yerel-zeka-preload').expose(contextBridge, ipcRenderer)  → window.fcYerelZeka */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const { Worker } = require('worker_threads');
const os = require('os');
const tar = require('./fc-tar');

const RELEASE = 'https://github.com/departures-mil/ortak-cekirdek/releases/download/yerel-zeka-v1/';
const MANIFEST_URL = RELEASE + 'paketler.json';

function install(opt) {
  const { app, ipcMain } = opt;
  const root = opt.dir || path.join(app.getPath('userData'), 'yerel-zeka');
  const platKey = process.platform + '-' + process.arch;
  const here = __dirname;
  const REL = opt.releaseUrl || RELEASE, MAN = REL + 'paketler.json';
  let manifest = null, busy = null, worker = null, seq = 0, memo = null, memoFor = null;
  const pending = new Map(), listeners = new Set();

  const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
  const state = () => readJson(path.join(root, 'durum.json'), { packs: {} });
  const saveState = (s) => { fs.mkdirSync(root, { recursive: true }); const t = path.join(root, 'durum.json.tmp'); fs.writeFileSync(t, JSON.stringify(s, null, 1)); fs.renameSync(t, path.join(root, 'durum.json')); };
  const emit = (ev) => { for (const wc of listeners) { try { if (!wc.isDestroyed()) wc.send('fcyz:ilerleme', ev); } catch (e) {} } };

  function get(url, headers, redirects = 6) {
    return new Promise((res, rej) => {
      const req = (url.startsWith('http:') ? http : https).get(url, { headers: Object.assign({ 'user-agent': 'fc-yerel-zeka' }, headers || {}) }, (r) => {
        if ([301, 302, 303, 307, 308].includes(r.statusCode) && r.headers.location && redirects > 0) { r.resume(); res(get(new URL(r.headers.location, url).href, headers, redirects - 1)); return; }
        res(r);
      });
      req.on('error', rej); req.setTimeout(60000, () => req.destroy(new Error('zaman aşımı')));
    });
  }
  async function loadManifest() {
    try {
      const r = await get(MAN);
      if (r.statusCode === 200) { let s = ''; r.setEncoding('utf8'); for await (const c of r) s += c; manifest = JSON.parse(s); fs.mkdirSync(root, { recursive: true }); fs.writeFileSync(path.join(root, 'paketler.json'), s); return manifest; }
      r.resume();
    } catch (e) { /* çevrimdışı */ }
    manifest = readJson(path.join(root, 'paketler.json'), null) || readJson(path.join(here, 'paketler.json'), null);
    return manifest;
  }
  // llm: TranslateGemma — 16 GB+ bellekte 12B (en yüksek kalite), daha azında 4B
  const ramGB = os.totalmem() / 1073741824;
  function packKey(m, name) {
    if (name === 'runtime') return 'runtime-' + platKey;
    if (name === 'llm') { const want = (state().settings || {}).llmSize || (ramGB >= 15 ? '12b' : '4b'); return m && m.packs && m.packs['llm-' + want] ? 'llm-' + want : 'llm-4b'; }
    return name;
  }
  function packFiles(m, name) { const p = m && m.packs && m.packs[packKey(m, name)]; return p ? p.files : null; }

  function packVer(m, n) { const p = m.packs[packKey(m, n)]; return (p && p.version) || p.files.map((f) => f.sha256).join('').slice(0, 16); }

  async function downloadParts(file, dest, prog, signal) { // >2 GB modeller sürümde parçalı durur; burada birleştirilir
    const dir = dest + '.parcalar', hash = crypto.createHash('sha256');
    for (const [i, p] of file.parts.entries()) await download(Object.assign({}, p, { asset: p.asset }), path.join(dir, String(i).padStart(3, '0')), prog, signal);
    const tmp = dest + '.birlesik', out = fs.openSync(tmp, 'w'), buf = Buffer.alloc(8 << 20);
    try {
      for (const [i] of file.parts.entries()) {
        const f = path.join(dir, String(i).padStart(3, '0')), fd = fs.openSync(f, 'r'); let n;
        while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) { hash.update(buf.subarray(0, n)); fs.writeSync(out, buf, 0, n); }
        fs.closeSync(fd);
      }
    } finally { fs.closeSync(out); }
    if (file.sha256 && hash.digest('hex') !== file.sha256) { fs.rmSync(dir, { recursive: true, force: true }); fs.unlinkSync(tmp); throw new Error('SHA-256 tutmadı: ' + file.asset); }
    fs.renameSync(tmp, dest); fs.rmSync(dir, { recursive: true, force: true });
  }

  async function download(file, dest, prog, signal) {
    if (file.parts) return downloadParts(file, dest, prog, signal);
    const part = dest + '.part'; fs.mkdirSync(path.dirname(dest), { recursive: true });
    let have = fs.existsSync(part) ? fs.statSync(part).size : 0;
    if (have > file.size) { fs.unlinkSync(part); have = 0; }
    const hash = crypto.createHash('sha256');
    if (have) await new Promise((res, rej) => fs.createReadStream(part).on('data', (d) => hash.update(d)).on('end', res).on('error', rej));
    prog.add(have);
    if (have < file.size) {
      const r = await get(file.url || REL + file.asset, have ? { Range: `bytes=${have}-` } : null);
      if (have && r.statusCode === 200) { r.resume(); fs.unlinkSync(part); prog.add(-have); return download(file, dest, prog, signal); }
      if (r.statusCode !== 200 && r.statusCode !== 206) { r.resume(); throw new Error('HTTP ' + r.statusCode + ' ' + file.asset); }
      await new Promise((res, rej) => {
        const out = fs.createWriteStream(part, { flags: have ? 'a' : 'w' });
        const abort = () => { r.destroy(new Error('iptal')); };
        signal.on(abort);
        r.on('data', (d) => { hash.update(d); prog.add(d.length); });
        r.on('error', (e) => { out.destroy(); rej(e); });
        out.on('error', rej); out.on('finish', res);
        r.pipe(out);
      });
    }
    const got = hash.digest('hex');
    if (file.sha256 && got !== file.sha256) { fs.unlinkSync(part); throw new Error('SHA-256 tutmadı: ' + file.asset); }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(part, dest);
  }

  async function installPacks(names) {
    if (busy) throw new Error('Zaten indiriliyor');
    const m = await loadManifest(); if (!m) throw new Error('Paket listesine ulaşılamadı (internet gerekli)');
    const want = names.includes('runtime') ? names : ['runtime', ...names];
    const st = state(), todo = [];
    for (const n of want) {
      const files = packFiles(m, n); if (!files) throw new Error('Paket bulunamadı: ' + n + ' (' + platKey + ')');
      const key = n, ver = packVer(m, n);
      if (st.packs[key] && st.packs[key].version === ver && fs.existsSync(path.join(root, key))) continue;
      todo.push({ name: key, files, ver });
    }
    if (!todo.length) return state();
    const total = todo.reduce((s, p) => s + p.files.reduce((a, f) => a + f.size, 0), 0);
    if (todo.some((p) => p.name === 'llm' || p.name === 'mt')) { // disk alanı denetimi
      try { const st2 = fs.statfsSync ? fs.statfsSync(root) : null; if (st2 && st2.bavail * st2.bsize < total * 1.15) throw new Error('Diskte yeterli yer yok: ' + (total * 1.15 / 1073741824).toFixed(1) + ' GB gerekli'); } catch (e) { if (/Diskte/.test(e.message)) throw e; }
    }
    let done = 0, t0 = Date.now(), lastT = t0, lastD = 0, speed = 0, lastEmit = 0;
    const handlers = new Set(), signal = { on: (f) => handlers.add(f) };
    busy = { cancel: () => { for (const f of handlers) f(); } };
    const prog = { add(n) {
      done += n; const now = Date.now();
      if (now - lastT >= 500) { const inst = (done - lastD) / ((now - lastT) / 1000); speed = speed ? speed * 0.7 + inst * 0.3 : inst; lastT = now; lastD = done; }
      if (now - lastEmit >= 250 || done >= total) {
        lastEmit = now; const MB = 1048576;
        emit({ phase: 'indiriliyor', pct: total ? Math.min(100, done / total * 100) : 0, doneMB: done / MB, totalMB: total / MB, leftMB: Math.max(0, total - done) / MB, speed: speed / MB, eta: speed > 0 ? Math.round((total - done) / speed) : null, pack: cur });
      }
    } };
    let cur = null;
    try {
      for (const p of todo) {
        cur = p.name; const tmp = path.join(root, '.indirilen', p.name), dest = path.join(root, p.name);
        for (const f of p.files) await download(f, path.join(tmp, f.asset), prog, signal);
        emit({ phase: 'aciliyor', pack: p.name, pct: 100 });
        const stage = path.join(root, '.kurulan-' + p.name); fs.rmSync(stage, { recursive: true, force: true }); fs.mkdirSync(stage, { recursive: true });
        for (const f of p.files) {
          const src = path.join(tmp, f.asset);
          if (f.extract) tar.extract(src, path.join(stage, f.extract === true ? '' : f.extract));
          else { const to = path.join(stage, f.path || f.asset); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.renameSync(src, to); }
        }
        await stopWorker();
        fs.rmSync(dest, { recursive: true, force: true }); fs.renameSync(stage, dest); fs.rmSync(tmp, { recursive: true, force: true });
        const s = state(); s.packs[p.name] = { version: p.ver, plat: p.name === 'runtime' ? platKey : undefined, bytes: p.files.reduce((a, f) => a + f.size, 0), at: new Date().toISOString() }; saveState(s);
      }
      emit({ phase: 'bitti', pct: 100 });
      return state();
    } catch (e) { emit({ phase: 'hata', error: String(e.message || e) }); throw e; }
    finally { busy = null; }
  }

  function removePack(name) {
    if (busy) throw new Error('İndirme sürüyor');
    return stopWorker().then(() => { fs.rmSync(path.join(root, name), { recursive: true, force: true }); const s = state(); delete s.packs[name]; saveState(s); return status(); });
  }

  function ready(names) { const s = state(); return names.every((n) => s.packs[n] && fs.existsSync(path.join(root, n))); }
  function status() {
    const s = state(), m = manifest || readJson(path.join(root, 'paketler.json'), null) || readJson(path.join(here, 'paketler.json'), null);
    const size = (n) => { const f = packFiles(m, n); return f ? f.reduce((a, x) => a + x.size, 0) : null; };
    return { root, platform: platKey, supported: !!(m && packFiles(m, 'runtime')), busy: !!busy, version: m && m.version,
      packs: Object.fromEntries(['runtime', 'ocr', 'mt', 'llm'].map((n) => [n, { installed: !!s.packs[n], bytes: size(n), variant: m && n === 'llm' ? packKey(m, n) : undefined, update: !!(s.packs[n] && m && packFiles(m, n) && s.packs[n].version !== packVer(m, n)) }])),
      ramGB: Math.round(ramGB), ocr: ready(['runtime', 'ocr']), mt: ready(['runtime', 'mt']) || ready(['runtime', 'llm']), llm: ready(['runtime', 'llm']), settings: s.settings || {} };
  }

  function startWorker() {
    if (worker) return worker;
    const src = (f) => fs.readFileSync(path.join(here, f), 'utf8');
    const settings = state().settings || {};
    worker = new Worker(src('yz-worker.js'), { eval: true, workerData: { packDir: root, sources: { ocr: src('fc-ocr.js'), mt: src('fc-mt.js') }, gpu: settings.gpu !== false, ollama: settings.ollama !== false, llm: settings.llm !== false } });
    worker.on('message', (m) => { const p = pending.get(m.id); if (!p) return; pending.delete(m.id); m.ok ? p.res(m.result) : p.rej(new Error(m.error)); });
    const fail = (e) => { for (const p of pending.values()) p.rej(e instanceof Error ? e : new Error('Yerel zeka durdu')); pending.clear(); worker = null; };
    worker.on('error', fail); worker.on('exit', () => fail(new Error('Yerel zeka durdu')));
    return worker;
  }
  function stopWorker() { if (!worker) return Promise.resolve(); const w = worker; worker = null; return w.terminate().catch(() => {}); }
  function call(op, args, transfer) {
    const w = startWorker(), id = ++seq;
    return new Promise((res, rej) => { pending.set(id, { res, rej }); w.postMessage({ id, op, args }, transfer || []); });
  }

  const api = {
    status, installPacks, removePack, cancel: () => { if (busy) busy.cancel(); return true; },
    async ocr(a) { if (!ready(['runtime', 'ocr'])) throw new Error('OCR paketi kurulu değil'); return call('ocr', a); },
    async translate(a) {
      if (!ready(['runtime', 'mt']) && !ready(['runtime', 'llm'])) throw new Error('Çeviri paketi kurulu değil');
      // terim sözlüğü ana süreçte saklanır; iş parçacığına yalnız değişince ya da iş parçacığı yenilenince gider
      a = Object.assign({}, a);
      if (a.memory) { memo = a.memory; memoFor = null; }
      const w = startWorker();
      if (memo && memoFor !== w) { a.memory = memo; memoFor = w; } else delete a.memory;
      return call('translate', a);
    },
    setSettings(x) { const s = state(); s.settings = Object.assign({}, s.settings || {}, x || {}); saveState(s); return stopWorker().then(status); },
  };

  const manifestP = loadManifest();
  ipcMain.handle('fcyz:durum', async (e) => { listeners.add(e.sender); if (!manifest) await manifestP.catch(() => {}); return status(); });
  ipcMain.handle('fcyz:kur', (e, names) => { listeners.add(e.sender); return installPacks(Array.isArray(names) ? names : [names]); });
  ipcMain.handle('fcyz:iptal', () => api.cancel());
  ipcMain.handle('fcyz:sil', (e, name) => removePack(String(name)));
  ipcMain.handle('fcyz:ayar', (e, x) => api.setSettings(x));
  ipcMain.handle('fcyz:ocr', (e, a) => api.ocr(a));
  ipcMain.handle('fcyz:cevir', (e, a) => api.translate(a));
  app.on('before-quit', () => { stopWorker(); });
  return api;
}

module.exports = { install, RELEASE };
