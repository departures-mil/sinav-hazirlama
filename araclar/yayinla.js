// Sınav Hazırlama — masaüstü güncellemesini (yama) GitHub'a yayınlar. Depo kökünden:
//   OZEL_ANAHTAR="C:\\Claude Programlarım\\_Anahtarlar\\SinavHazirlama\\yama-imza-ozel.pem" node araclar/yayinla.js "notlar" [--minBase 1.9.0]
// Sürüm uygulama/package.json'dan okunur (yamada package.json yoktur; sürüm manifestte durur — sürümü
// burada artırın). Çıktı: guncelleme/SinavHazirlama-<sürüm>.sinavyama + guncelleme/desktop.json
// jszip gerekir: npm i jszip
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const JSZip = require('jszip');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'uygulama');
const G = path.join(ROOT, 'guncelleme');
const notes = process.argv[2] || '';
const mi = process.argv.indexOf('--minBase');
const minBase = mi > 0 ? process.argv[mi + 1] : '1.9.0';
const version = JSON.parse(fs.readFileSync(path.join(APP, 'package.json'), 'utf8')).version;
const key = crypto.createPrivateKey(fs.readFileSync(process.env.OZEL_ANAHTAR || '', 'utf8'));
const SKIP = new Set(['package.json', 'boot.js']);   // boot.js yamalanmaz (güven kökü), package.json ana paketten gelir

function list(dir, rel = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) { if (e.name !== 'node_modules') out.push(...list(dir, r)); } else if (!SKIP.has(r)) out.push(r);
  }
  return out.sort();
}

(async () => {
  // 1.9.5: çevrimiçi arşiv (guncelleme/bank.json) her yayında yerleşik arşivden yeniden üretilir
  require('./arsiv.js')();
  const zip = new JSZip();
  const files = {};
  for (const r of list(APP)) {
    const b = fs.readFileSync(path.join(APP, r));
    files[r] = crypto.createHash('sha256').update(b).digest('hex');
    zip.file(r, b);
  }
  const manifest = { app: 'sinav-hazirlama', version, minBase, created: new Date().toISOString(), notes, files };
  const mbuf = Buffer.from(JSON.stringify(manifest, null, 1), 'utf8');
  const sig = crypto.sign(null, mbuf, key).toString('base64');
  zip.file('manifest.json', mbuf);
  zip.file('manifest.sig', sig);
  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  for (const f of fs.readdirSync(G)) if (f.endsWith('.sinavyama')) fs.rmSync(path.join(G, f));
  const file = `SinavHazirlama-${version}.sinavyama`;
  fs.writeFileSync(path.join(G, file), out);
  fs.writeFileSync(path.join(G, 'desktop.json'), JSON.stringify({ version, minBase, notes, file, size: out.length,
    sha: crypto.createHash('sha256').update(out).digest('hex'), publishedAt: new Date().toISOString() }, null, 1));
  console.log('hazır', version, out.length, 'bayt');
})();
