'use strict';
/* Sınav Hazırlama — Wi-Fi eşitleme (aynı modem / yönlendirici, internet gerekmez), ana süreç tarafı.
   - Eşleştirme: "Kod göster" diyen bilgisayar 5 dakika geçerli 6 haneli bir PIN gösterir; diğer bilgisayar PIN'i girer.
     PIN ağda hiç açık gitmez: istemci scrypt(PIN) anahtarıyla HMAC kanıtı yollar, sunucu doğrularsa rastgele 32 baytlık
     eşleşme anahtarını aynı türetilmiş anahtarla AES-256-GCM içinde döner. 5 hatalı denemede PIN geçersiz olur.
   - Eşitleme: her istek eşleşme anahtarıyla imzalı (HMAC-SHA256, 5 dk zaman penceresi, tek kullanımlık nonce) ve gövde
     AES-256-GCM ile şifreli. Yalnız eşleşmiş cihazlar konuşabilir.
   - Birleştirme ortak çekirdeğin kuralıyla (cekirdek/lan-sync-merge.js): hiçbir sınav silinmez, üstüne yazılmaz;
     çakışmada yeni olan kalır, eski hal "cakisma" klasörüne yedeklenir; uzak silme yerelde yalnız "arşivlendi" olur.
   Kayıt: { id, name, updatedAt, exam } — sınavın tamamı (sorular, senaryolar, kelimeler, ayarlar). */
const http = require('http');
const dgram = require('dgram');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const lanMerge = require('../cekirdek/lan-sync-merge.js');

const APP = 'sinav-hazirlama';
const TCP_PORTS = [47861, 47863, 47864, 47865, 47866];
const UDP_PORT = 47862;
const MAX_BODY = 150 * 1024 * 1024;
const PIN_MS = 5 * 60 * 1000;
const MAX_PIN_TRIES = 5;
const WINDOW_MS = 5 * 60 * 1000;
const KEEP_CONFLICTS = 300;

const b64 = (b) => Buffer.from(b).toString('base64');
const unb64 = (s) => Buffer.from(String(s || ''), 'base64');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const hmac = (key, s) => crypto.createHmac('sha256', key).update(String(s)).digest('hex');
const pinKey = (pin, hostId) => crypto.scryptSync(String(pin), 'sinav-lan|' + hostId, 32, { N: 16384, r: 8, p: 1 });
const subKey = (key, label) => crypto.createHmac('sha256', key).update(label).digest();
function seal(key, obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(Buffer.from(JSON.stringify(obj), 'utf8')), c.final()]);
  return b64(Buffer.concat([iv, c.getAuthTag(), ct]));
}
function open(key, s) {
  const buf = unb64(s);
  if (buf.length < 29) throw code('BAD_BOX');
  const d = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8'));
}
function code(c, m) { const e = new Error(m || c); e.code = c; return e; }
function eq(a, b) { a = Buffer.from(String(a)); b = Buffer.from(String(b)); return a.length === b.length && crypto.timingSafeEqual(a, b); }

function addrs() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push({ name, address: a.address, netmask: a.netmask });
  }
  return out;
}
function broadcasts() {
  const s = new Set(['255.255.255.255']);
  for (const a of addrs()) {
    try { const ip = a.address.split('.').map(Number), m = a.netmask.split('.').map(Number); s.add(ip.map((x, i) => (x & m[i]) | (~m[i] & 255)).join('.')); } catch (e) { /* yok */ }
  }
  return [...s];
}
function readJson(f, def) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return def; } }
function writeJson(f, obj) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = f + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj), 'utf8');
  fs.renameSync(tmp, f);
}
const safeId = (id) => String(id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
const stamp = () => new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
const examName = (ex) => { const t = (ex && ex.title) || {}; return String(t.tr || t.en || t.ar || '').trim().slice(0, 200); };

/**
 * createLan({ dir, name, version, onChanged(ids, peer), onPaired(peer), log })
 * dir: kullanıcı klasörü altında wifi-esitleme klasörü
 */
function createLan(o) {
  const dir = o.dir;
  const cfgFile = path.join(dir, 'ayar.json');
  const storeDir = path.join(dir, 'sinavlar');
  const conflictDir = path.join(dir, 'cakisma');
  const cfg = Object.assign({ id: '', open: false, pairs: [] }, readJson(cfgFile, {}));
  if (!cfg.id) { cfg.id = crypto.randomBytes(9).toString('hex'); }
  if (!Array.isArray(cfg.pairs)) cfg.pairs = [];
  const L = { server: null, udp: null, port: 0, pin: null, pinTries: 0, busy: false, nonces: new Map(), cache: new Map() };
  const name = () => o.name || os.hostname();
  const saveCfg = () => writeJson(cfgFile, cfg);
  const log = (m) => { if (o.log) try { o.log(m); } catch (e) { /* yok */ } };
  saveCfg();

  /* ---------- yerel depo ---------- */
  function recFile(id) { return path.join(storeDir, safeId(id) + '.json'); }
  function list() {
    let names = [];
    try { names = fs.readdirSync(storeDir).filter((n) => n.endsWith('.json')); } catch (e) { return []; }
    const out = [];
    for (const n of names) { const r = readJson(path.join(storeDir, n), null); if (r && r.id) out.push(r); }
    return out;
  }
  function get(id) { return readJson(recFile(id), null); }
  function writeRec(r) { writeJson(recFile(r.id), r); L.cache.set(String(r.id), JSON.stringify(r.exam)); }
  /** Açık sınavı depoya koyar; içerik değişmediyse dokunmaz. Döner: true (yazıldı) | false */
  function put(exam) {
    if (!exam || !exam.id || !safeId(exam.id)) return false;
    const id = String(exam.id), js = JSON.stringify(exam);
    let prev = L.cache.get(id);
    if (prev === undefined) { const r = get(id); prev = r ? JSON.stringify(r.exam) : null; if (prev != null) L.cache.set(id, prev); }
    if (prev === js) return false;
    writeRec({ id, name: examName(exam), updatedAt: Date.now(), exam });
    return true;
  }
  function backupConflict(c, peer) {
    try {
      fs.mkdirSync(conflictDir, { recursive: true });
      writeJson(path.join(conflictDir, `${stamp()}-${safeId(c.id)}-${crypto.randomBytes(3).toString('hex')}.json`),
        { app: APP, kind: 'cakisma', id: c.id, keptFrom: c.keptFrom, peer: peer || '', savedAt: new Date().toISOString(), lost: c.lost, kept: { updatedAt: c.kept.updatedAt, name: c.kept.name } });
      const all = fs.readdirSync(conflictDir).filter((n) => n.endsWith('.json')).sort();
      // en eski çakışma yedekleri yalnız 300'ü aşınca ve yalnız 90 günden eskiyse temizlenir
      const old = all.slice(0, Math.max(0, all.length - KEEP_CONFLICTS));
      for (const n of old) { try { if (Date.now() - fs.statSync(path.join(conflictDir, n)).mtimeMs > 90 * 86400000) fs.unlinkSync(path.join(conflictDir, n)); } catch (e) { /* yok */ } }
    } catch (e) { log('çakışma yedeği yazılamadı: ' + e.message); }
  }
  /** Uzak kayıtları yerelle birleştirir (kural: çekirdek lan-sync-merge). Döner {changed:[id], conflicts, archived, records} */
  function mergeIn(remote, peer) {
    const local = list();
    const r = lanMerge.merge(local, Array.isArray(remote) ? remote.filter((x) => x && x.id && safeId(x.id)) : [], { idKey: 'id', updatedKey: 'updatedAt' });
    const byId = new Map(local.map((x) => [String(x.id), x]));
    const changed = [];
    for (const rec of r.records) {
      const cur = byId.get(String(rec.id));
      if (!cur || lanMerge.canon(cur) !== lanMerge.canon(rec)) { writeRec(rec); changed.push(String(rec.id)); }
    }
    for (const c of r.conflicts) if (c.keptFrom === 'remote') backupConflict(c, peer);
    return { changed, conflicts: r.conflicts.filter((c) => c.keptFrom === 'remote').length, archived: r.archived.length, records: r.records };
  }

  /* ---------- sunucu ---------- */
  function verify(req, body, key) {
    const ts = +req.headers['x-sh-ts'] || 0, nonce = String(req.headers['x-sh-nonce'] || '');
    if (Math.abs(Date.now() - ts) > WINDOW_MS || nonce.length < 8 || L.nonces.has(nonce)) return false;
    const want = hmac(key, req.method + '\n' + req.url + '\n' + ts + '\n' + nonce + '\n' + sha(body || ''));
    if (!eq(want, req.headers['x-sh-sig'] || '')) return false;
    L.nonces.set(nonce, Date.now());
    if (L.nonces.size > 2000) { const lim = Date.now() - WINDOW_MS; for (const [k, t] of L.nonces) if (t < lim) L.nonces.delete(k); }
    return true;
  }
  const info = () => ({ app: APP, id: cfg.id, name: name(), port: L.port, v: o.version || '', pairing: !!(L.pin && L.pin.until > Date.now()) });
  async function handle(req, body) {
    if (req.method === 'POST' && req.url === '/sinav/pair') {
      const j = JSON.parse(body || '{}');
      if (!L.pin || L.pin.until < Date.now()) return [403, { error: 'NO_PIN' }];
      if (!j.id || !j.salt || !j.proof) return [400, { error: 'BAD' }];
      const pk = L.pin.key;
      const want = hmac(pk, 'pair|' + j.id + '|' + cfg.id + '|' + j.salt);
      if (!eq(want, j.proof)) {
        L.pinTries++;
        if (L.pinTries >= MAX_PIN_TRIES) { L.pin = null; log('PIN çok kez yanlış girildi; geçersiz kılındı'); }
        return [401, { error: 'BAD_PIN' }];
      }
      const key = crypto.randomBytes(32);
      const peer = { id: String(j.id).slice(0, 64), name: String(j.name || '?').slice(0, 80), key: b64(key), host: req.socket.remoteAddress.replace(/^::ffff:/, ''), port: +j.port || 0, last: 0 };
      cfg.pairs = cfg.pairs.filter((p) => p.id !== peer.id).concat([peer]);
      saveCfg();
      L.pin = null;
      if (o.onPaired) o.onPaired(publicPeer(peer));
      return [200, { id: cfg.id, name: name(), box: seal(subKey(pk, 'box|' + j.salt), { key: b64(key) }) }];
    }
    if (req.method === 'POST' && req.url === '/sinav/sync') {
      const pid = String(req.headers['x-sh-id'] || '');
      const peer = cfg.pairs.find((p) => p.id === pid);
      if (!peer || !verify(req, body, unb64(peer.key))) return [401, { error: 'AUTH' }];
      const key = subKey(unb64(peer.key), 'data');
      const j = open(key, JSON.parse(body).box);
      if (o.beforeServe) { try { await o.beforeServe(); } catch (e) { /* yok */ } }
      const r = mergeIn(j.records, peer.name);
      peer.last = Date.now(); peer.host = req.socket.remoteAddress.replace(/^::ffff:/, '') || peer.host; if (j.port) peer.port = +j.port;
      saveCfg();
      if (r.changed.length && o.onChanged) o.onChanged(r.changed, publicPeer(peer));
      return [200, { box: seal(key, { records: r.records, from: cfg.id }) }];
    }
    return [404, { error: 'NOT_FOUND' }];
  }
  function startServer() {
    if (L.server) return Promise.resolve(L.port);
    return new Promise((resolve, reject) => {
      let i = 0;
      const next = () => {
        if (i >= TCP_PORTS.length) return reject(code('PORT'));
        const port = TCP_PORTS[i++];
        const srv = http.createServer((req, res) => {
          const chunks = []; let size = 0, dead = false;
          req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { dead = true; res.writeHead(413).end(); req.destroy(); } else chunks.push(c); });
          req.on('end', async () => {
            if (dead) return;
            let st = 500, out = { error: 'ERR' };
            try { [st, out] = await handle(req, Buffer.concat(chunks).toString('utf8')); } catch (e) { log('lan istek: ' + e.message); st = 400; out = { error: 'BAD' }; }
            res.writeHead(st, { 'content-type': 'application/json' }).end(JSON.stringify(out));
          });
        });
        srv.on('error', () => next());
        srv.listen(port, '0.0.0.0', () => { L.server = srv; L.port = port; resolve(port); });
      };
      next();
    });
  }
  function startUdp() {
    if (L.udp) return Promise.resolve(true);
    return new Promise((resolve) => {
      const u = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      u.on('error', (e) => { log('lan udp: ' + e.message); try { u.close(); } catch (er) { /* yok */ } L.udp = null; resolve(false); });
      u.on('message', (msg, rinfo) => {
        let j; try { j = JSON.parse(msg.toString('utf8')); } catch (e) { return; }
        if (!j || j.app !== APP || !j.q || j.id === cfg.id || !L.server) return;
        const r = Buffer.from(JSON.stringify(info()));
        u.send(r, 0, r.length, rinfo.port, rinfo.address);
      });
      u.bind(UDP_PORT, () => { try { u.setBroadcast(true); } catch (e) { /* yok */ } L.udp = u; resolve(true); });
    });
  }
  async function start() { await startServer(); await startUdp(); return status(); }
  function stop() {
    try { if (L.server) L.server.close(); } catch (e) { /* yok */ }
    try { if (L.udp) L.udp.close(); } catch (e) { /* yok */ }
    L.server = null; L.udp = null; L.port = 0; L.pin = null;
  }
  async function setOpen(on) { cfg.open = !!on; saveCfg(); if (on) await start(); else stop(); return status(); }
  async function showPin() {
    await start();
    const pin = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    L.pin = { code: pin, until: Date.now() + PIN_MS, key: pinKey(pin, cfg.id) };
    L.pinTries = 0;
    return { code: pin, until: L.pin.until };
  }
  function hidePin() { L.pin = null; if (!cfg.open) stop(); return status(); }
  const publicPeer = (p) => ({ id: p.id, name: p.name, host: p.host, port: p.port, last: p.last || 0 });
  function status() {
    return { open: !!L.server, wantOpen: !!cfg.open, port: L.port, addrs: addrs().map((a) => a.address), id: cfg.id, name: name(), busy: L.busy,
      pin: L.pin && L.pin.until > Date.now() ? { code: L.pin.code, until: L.pin.until } : null, pairs: cfg.pairs.map(publicPeer), count: list().length };
  }

  /* ---------- istemci ---------- */
  function discover(ms) {
    return new Promise((resolve) => {
      const found = new Map();
      const sock = dgram.createSocket('udp4');
      const q = Buffer.from(JSON.stringify({ app: APP, q: 1, id: cfg.id, name: name() }));
      const send = () => { for (const b of broadcasts()) { try { sock.send(q, 0, q.length, UDP_PORT, b); } catch (e) { /* yok */ } } };
      sock.on('error', () => { try { sock.close(); } catch (e) { /* yok */ } resolve([...found.values()]); });
      sock.on('message', (msg, rinfo) => {
        try { const j = JSON.parse(msg.toString('utf8')); if (j.app === APP && j.id !== cfg.id && j.port) found.set(j.id, { id: j.id, name: j.name, host: rinfo.address, port: j.port, pairing: !!j.pairing, paired: cfg.pairs.some((p) => p.id === j.id) }); } catch (e) { /* yok */ }
      });
      sock.bind(0, () => {
        try { sock.setBroadcast(true); } catch (e) { /* yok */ }
        send(); setTimeout(send, 400); setTimeout(send, 1200);
        setTimeout(() => { try { sock.close(); } catch (e) { /* yok */ } resolve([...found.values()]); }, ms || 2500);
      });
    });
  }
  function request(host, port, pth, body, headers, timeout) {
    return new Promise((resolve, reject) => {
      const buf = Buffer.from(body || '', 'utf8');
      const req = http.request({ host, port, method: 'POST', path: pth, timeout: timeout || 120000,
        headers: Object.assign({ 'content-type': 'application/json', 'content-length': buf.length }, headers || {}) }, (res) => {
        const chunks = []; res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          let j = {}; try { j = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { j = {}; }
          if (res.statusCode === 200) resolve(j); else reject(code(j.error || ('HTTP_' + res.statusCode)));
        });
      });
      req.on('timeout', () => req.destroy(code('TIMEOUT')));
      req.on('error', (e) => reject(e.code === 'TIMEOUT' ? e : code(e.code === 'ECONNREFUSED' ? 'REFUSED' : 'NET', e.message)));
      req.end(buf);
    });
  }
  /** PIN ile eşleşir (diğer bilgisayarda "Kod göster" açık olmalı). Döner eşleşen cihaz. */
  async function pair(host, port, pin, hostId) {
    pin = String(pin || '').replace(/\D/g, '');
    if (pin.length !== 6) throw code('BAD_PIN');
    // sunucunun kimliği PIN anahtarının tuzudur: önce keşifte görülen kimlik, yoksa sor
    let hid = hostId;
    if (!hid) { const peers = await discover(1500); const p = peers.find((x) => x.host === host && (!port || x.port === +port)); if (p) { hid = p.id; port = p.port; } }
    if (!hid) throw code('NOT_FOUND');
    const pk = pinKey(pin, hid);
    const salt = b64(crypto.randomBytes(16));
    const j = await request(host, port || TCP_PORTS[0], '/sinav/pair', JSON.stringify({ id: cfg.id, name: name(), salt, port: L.port || 0, proof: hmac(pk, 'pair|' + cfg.id + '|' + hid + '|' + salt) }), null, 30000);
    let key;
    try { key = open(subKey(pk, 'box|' + salt), j.box).key; } catch (e) { throw code('BAD_PIN'); }
    if (j.id !== hid) throw code('BAD_PIN');
    const peer = { id: hid, name: String(j.name || '?').slice(0, 80), key, host, port: +port || TCP_PORTS[0], last: 0 };
    cfg.pairs = cfg.pairs.filter((p) => p.id !== peer.id).concat([peer]);
    saveCfg();
    return publicPeer(peer);
  }
  function unpair(id) { cfg.pairs = cfg.pairs.filter((p) => p.id !== id); saveCfg(); return status(); }
  async function syncPeer(peer) {
    const key = unb64(peer.key), dk = subKey(key, 'data');
    const body = JSON.stringify({ box: seal(dk, { records: list(), port: L.port || 0 }) });
    const call = (host, port) => {
      const ts = Date.now(), nonce = crypto.randomBytes(12).toString('hex');
      const sig = hmac(key, 'POST\n/sinav/sync\n' + ts + '\n' + nonce + '\n' + sha(body));
      return request(host, port, '/sinav/sync', body, { 'x-sh-id': cfg.id, 'x-sh-ts': ts, 'x-sh-nonce': nonce, 'x-sh-sig': sig });
    };
    let j;
    try { j = await call(peer.host, peer.port); } catch (e) {
      if (e.code === 'AUTH') throw e;
      // adres değişmiş olabilir (DHCP): ağda kimliğiyle ara
      const found = (await discover(2000)).find((x) => x.id === peer.id);
      if (!found) throw e.code ? e : code('NET');
      peer.host = found.host; peer.port = found.port;
      j = await call(peer.host, peer.port);
    }
    const res = open(dk, j.box);
    const r = mergeIn(res.records, peer.name);
    peer.last = Date.now(); saveCfg();
    return { peer: publicPeer(peer), changed: r.changed, conflicts: r.conflicts, archived: r.archived };
  }
  async function syncAll(only) {
    if (L.busy) throw code('BUSY');
    L.busy = true;
    const results = [], changed = new Set();
    try {
      for (const p of cfg.pairs.filter((x) => !only || x.id === only)) {
        try { const r = await syncPeer(p); r.changed.forEach((x) => changed.add(x)); results.push(Object.assign({ ok: true }, r)); } catch (e) { results.push({ ok: false, peer: publicPeer(p), error: e.code || e.message }); }
      }
    } finally { L.busy = false; }
    return { results, changed: [...changed] };
  }
  function summary() { return list().map((r) => ({ id: r.id, name: r.name || examName(r.exam), updatedAt: r.updatedAt, archived: !!r.archived, q: (r.exam && r.exam.questions || []).length })).sort((a, b) => b.updatedAt - a.updatedAt); }

  if (cfg.open) start().catch((e) => log('lan başlatılamadı: ' + e.message));
  return { start, stop, setOpen, showPin, hidePin, status, discover, pair, unpair, syncAll, put, get, list, summary, mergeIn, conflictDir, storeDir, id: () => cfg.id, _L: L };
}

module.exports = { createLan, seal, open, pinKey, TCP_PORTS, UDP_PORT };
