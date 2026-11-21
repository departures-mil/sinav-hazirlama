'use strict';
// Masaüstü yama (güncelleme) dosyası: .sinavyama = manifest.json + manifest.sig + uygulama kodu (zip).
// İmza ve özetler boot.js'teki açık anahtarla doğrulanır; dosyalar userData/yama/current altına yazılır.
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function readPatch(buf, boot) {
  let zip;
  try { zip = await JSZip.loadAsync(buf); } catch { throw new Error('NOTPATCH'); }
  const mf = zip.file('manifest.json'), sf = zip.file('manifest.sig');
  if (!mf || !sf) throw new Error('NOTPATCH');
  const manifestBuf = await mf.async('nodebuffer');
  const m = boot.verifyManifest(manifestBuf, await sf.async('string'));
  const files = {};
  for (const [rel, h] of Object.entries(m.files)) {
    const f = zip.file(rel);
    if (!f) throw new Error('BADHASH:' + rel);
    const b = await f.async('nodebuffer');
    if (boot.sha256(b) !== h) throw new Error('BADHASH:' + rel);
    files[rel] = b;
  }
  return { manifest: m, manifestBuf, sig: await sf.async('string'), files };
}

async function install(buf, boot) {
  const p = await readPatch(buf, boot);
  const m = p.manifest;
  if (m.minBase && boot.cmpVer(boot.baseVersion, m.minBase) < 0) throw new Error('MINBASE:' + m.minBase);
  if (boot.cmpVer(m.version, boot.baseVersion) <= 0) throw new Error('OLDER:' + boot.baseVersion);
  const root = boot.yamaRoot();
  const tmp = path.join(root, 'yeni-' + Date.now());
  fs.mkdirSync(tmp, { recursive: true });
  try {
    for (const [rel, b] of Object.entries(p.files)) {
      const out = path.join(tmp, rel);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, b);
    }
    fs.writeFileSync(path.join(tmp, 'manifest.json'), p.manifestBuf);
    fs.writeFileSync(path.join(tmp, 'manifest.sig'), p.sig);
    boot.verifyDir(tmp);
  } catch (e) { fs.rmSync(tmp, { recursive: true, force: true }); throw e; }
  const cur = path.join(root, 'current');
  const old = path.join(root, 'onceki');
  fs.rmSync(old, { recursive: true, force: true });
  if (fs.existsSync(cur)) fs.renameSync(cur, old);
  fs.renameSync(tmp, cur);
  cleanup(root);
  return { version: m.version, notes: m.notes || '' };
}

// Yamayı kaldırır: uygulama gömülü (tam kurulum) sürümüyle açılır
function remove(boot) {
  const root = boot.yamaRoot();
  const cur = path.join(root, 'current');
  if (!fs.existsSync(cur)) return false;
  const old = path.join(root, 'onceki');
  fs.rmSync(old, { recursive: true, force: true });
  fs.renameSync(cur, old);
  return true;
}

// eski "yeni-*" ve "devre-disi-*" klasörlerinden yalnızca en son ikisini tutar
function cleanup(root) {
  try {
    const xs = fs.readdirSync(root).filter((n) => /^(yeni|devre-disi)-\d+$/.test(n)).sort();
    xs.slice(0, Math.max(0, xs.length - 2)).forEach((n) => fs.rmSync(path.join(root, n), { recursive: true, force: true }));
  } catch { /* yok */ }
}

module.exports = { readPatch, install, remove };
