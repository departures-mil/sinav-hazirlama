'use strict';
// Başlatıcı: kullanıcı klasöründe (userData/yama/current) kurulu, imzası doğru ve sürümü
// gömülü sürümden yüksek bir yama varsa uygulama kodunu oradan, yoksa paketten yükler.
// Bu dosya yamalanmaz (güven kökü); npm paketleri her zaman ana paketten gelir.
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Module = require('module');

const BASE = __dirname;
// 1.9.0'dan itibaren güncellemeler bu anahtarla imzalanır (GitHub kanalı; eski 1.8.x yamaları yok sayılır)
const PUBKEY = 'MCowBQYDK2VwAyEAybn+JNcV+oTPC3Fxi5N4FiXqEae/5DSF8vDyUsaB9Nk=';
const MAX_FAILED_STARTS = 3;

const vparts = (v) => String(v || '0').split('.').map((x) => parseInt(x, 10) || 0);
function cmpVer(a, b) {
  const x = vparts(a), y = vparts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
}
const pubKey = crypto.createPublicKey({ key: Buffer.from(PUBKEY, 'base64'), format: 'der', type: 'spki' });

// manifest: { app, version, minBase, files: { "yol/dosya": sha256hex } }; sig: manifest.json baytlarının Ed25519 imzası
function verifyManifest(manifestBuf, sigB64) {
  if (!crypto.verify(null, manifestBuf, pubKey, Buffer.from(String(sigB64 || '').trim(), 'base64'))) throw new Error('BADSIG');
  const m = JSON.parse(manifestBuf.toString('utf8'));
  if (m.app !== 'sinav-hazirlama' || !m.version || !m.files || typeof m.files !== 'object') throw new Error('BADMANIFEST');
  for (const rel of Object.keys(m.files)) {
    if (rel.includes('..') || path.isAbsolute(rel) || /^[\\/]/.test(rel) || /[:*?"<>|]/.test(rel)) throw new Error('BADPATH');
  }
  if (!m.files['main.js']) throw new Error('BADMANIFEST');
  return m;
}
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
// Bir yama klasörünü (dosyalar diske yazılmış hâlde) doğrular
function verifyDir(dir) {
  const m = verifyManifest(fs.readFileSync(path.join(dir, 'manifest.json')), fs.readFileSync(path.join(dir, 'manifest.sig'), 'utf8'));
  for (const [rel, h] of Object.entries(m.files)) {
    if (sha256(fs.readFileSync(path.join(dir, rel))) !== h) throw new Error('BADHASH:' + rel);
  }
  return m;
}

const yamaRoot = () => path.join(app.getPath('userData'), 'yama');
const boot = {
  base: BASE, baseVersion: app.getVersion(), version: app.getVersion(), patch: null, disabled: null, error: null,
  yamaRoot, cmpVer, verifyManifest, verifyDir, sha256,
  libUrl: require('url').pathToFileURL(path.join(BASE, 'node_modules')).href + '/',
  // pencere düzgün açılınca çağrılır: başarısız açılış sayacını sıfırlar
  started() { if (boot.patch) { try { fs.writeFileSync(path.join(yamaRoot(), 'current', '.starts'), '0'); } catch { /* yok */ } } },
};
global.SINAV_BOOT = boot;

// yama devre dışı bırakıldıysa nedeni yazılır; bir sonraki açılışta kullanıcıya bir kez bildirilir
function noteFail(reason, err) {
  try { fs.writeFileSync(path.join(yamaRoot(), 'son-hata.txt'), reason + '\n' + (err && err.stack ? err.stack : String(err || ''))); } catch { /* yok */ }
}
function readFailNote() {
  const f = path.join(yamaRoot(), 'son-hata.txt');
  try {
    if (!fs.existsSync(f)) return;
    boot.disabled = fs.readFileSync(f, 'utf8').split('\n')[0] || 'FAIL';
    fs.renameSync(f, path.join(yamaRoot(), 'son-hata-bildirildi.txt'));
  } catch { /* yok */ }
}

function pickPatch() {
  readFailNote();
  if (process.env.SINAV_NO_PATCH) return null;
  const dir = path.join(yamaRoot(), 'current');
  if (!fs.existsSync(path.join(dir, 'manifest.json'))) return null;
  // kurulu ana sürümden eski ya da ona eşit yama (ör. 1.8.0 kurulumundan önceki 1.7.x) imzaya bakılmadan,
  // hata göstermeden yok sayılır; klasör silinmez, yerinde kalır
  try {
    const m0 = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    if (m0 && m0.version && cmpVer(m0.version, boot.baseVersion) <= 0) return null;
  } catch { /* bozuk manifest: aşağıdaki doğrulama ele alır */ }
  try {
    const m = verifyDir(dir);
    if (cmpVer(m.version, boot.baseVersion) <= 0) return null; // daha yeni tam sürüm kurulmuş: yama gereksiz
    if (m.minBase && cmpVer(boot.baseVersion, m.minBase) < 0) { boot.error = 'MINBASE'; return null; }
    // art arda açılamıyorsa yamayı kenara al
    const sf = path.join(dir, '.starts');
    const n = (parseInt(fs.existsSync(sf) ? fs.readFileSync(sf, 'utf8') : '0', 10) || 0) + 1;
    if (n > MAX_FAILED_STARTS) throw new Error('STARTFAIL');
    fs.writeFileSync(sf, String(n));
    return { dir, manifest: m };
  } catch (e) {
    boot.error = String(e.message || e);
    try { fs.renameSync(dir, path.join(yamaRoot(), 'devre-disi-' + Date.now())); } catch { /* yok */ }
    boot.disabled = boot.error;
    noteFail(boot.error, e);
    try { fs.renameSync(path.join(yamaRoot(), 'son-hata.txt'), path.join(yamaRoot(), 'son-hata-bildirildi.txt')); } catch { /* yok */ }
    return null;
  }
}

const p = pickPatch();
if (p) {
  // yama klasöründeki kod npm paketlerini ana paketin node_modules klasöründen bulsun
  const resolve0 = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, isMain, options) {
    try { return resolve0.call(this, request, parent, isMain, options); } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND' || request.startsWith('.') || path.isAbsolute(request)) throw e;
      return resolve0.call(this, request, parent, isMain, { paths: [BASE] });
    }
  };
  boot.patch = { version: p.manifest.version, dir: p.dir, created: p.manifest.created || null, notes: p.manifest.notes || '' };
  boot.version = p.manifest.version;
  try {
    require(path.join(p.dir, 'main.js'));
  } catch (e) {
    // yama yüklenemedi: kenara al ve gömülü sürümle aç
    console.error('yama yüklenemedi', e);
    noteFail('LOADFAIL', e);
    boot.disabled = boot.error = 'LOADFAIL';
    boot.patch = null; boot.version = boot.baseVersion;
    try { fs.renameSync(p.dir, path.join(yamaRoot(), 'devre-disi-' + Date.now())); } catch { /* yok */ }
    // yarım yüklenen kod olay kaydı bırakmış olabilir: temiz bir açılışla gömülü sürüme dön
    app.relaunch(); app.exit(0);
  }
} else {
  require('./main.js');
}
