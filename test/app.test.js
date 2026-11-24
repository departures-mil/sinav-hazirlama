// Node duman testi (bağımlılıksız): sürüm, gömülü çekirdek, eski kanal köprüsü (eski güncelleyici kodu ile), paketleme ayarları,
// eşitleme kuralı (hiçbir veri silinmez), dosya bütünlüğü.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const R = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const pkg = JSON.parse(R('package.json'));
const REN = 'uygulama/renderer/';

test('tek semver sürüm: package.json = renderer/surum.js = release-notes; ad ve veri klasörü değişmedi', () => {
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  const surum = require('../tools/surum.js');
  assert.strictEqual(R(REN + 'surum.js'), surum.render(), 'surum.js eski: node tools/surum.js');
  const ctx = { window: {} }; vm.runInNewContext(R(REN + 'surum.js'), ctx);
  assert.strictEqual(ctx.window.APP_RELEASE.version, pkg.version);
  for (const l of ['tr', 'en', 'ar']) assert.ok(ctx.window.APP_RELEASE.notes[l].length > 40, 'not: ' + l);
  // kullanıcı verisi %APPDATA%\Sinav Hazirlama Sistemi altında: bu adlar asla değişmez
  assert.strictEqual(pkg.name, 'sinav-hazirlama');
  assert.strictEqual(pkg.productName, 'Sinav Hazirlama Sistemi');
  assert.strictEqual(pkg.build.productName, 'Sinav Hazirlama Sistemi');
  assert.strictEqual(pkg.build.appId, 'com.milen.sinavhazirlama');
  assert.ok(!fs.existsSync(path.join(ROOT, 'uygulama/package.json')), 'tek package.json (kökte)');
});

test('paketleme: NSIS, kullanıcı başına, tek tık, tr/en/ar, kendi simgesi; app.asar', () => {
  const b = pkg.build;
  assert.strictEqual(pkg.main, 'uygulama/main.js');
  assert.strictEqual(b.asar, true);
  assert.deepStrictEqual(b.win.target.map((t) => t.target), ['nsis']);
  assert.strictEqual(b.nsis.oneClick, true);
  assert.strictEqual(b.nsis.perMachine, false);
  assert.deepStrictEqual(b.nsis.installerLanguages, ['tr_TR', 'en_US', 'ar_SA']);
  assert.strictEqual(b.nsis.deleteAppDataOnUninstall, false);
  assert.match(b.nsis.artifactName, /Setup/);
  assert.strictEqual(b.win.icon, 'build/icon.ico');
  assert.notStrictEqual(b.win.signAndEditExecutable, false, 'exe simgesi uygulamanın kendi .ico\'su olmalı');
  const ico = fs.readFileSync(path.join(ROOT, 'build/icon.ico'));
  assert.strictEqual(ico.readUInt16LE(2), 1, '.ico');
  assert.ok(ico.readUInt16LE(4) >= 4, 'birden çok boyut');
  for (const d of Object.keys(pkg.dependencies)) assert.ok(fs.existsSync(path.join(ROOT, 'node_modules', d)) || !fs.existsSync(path.join(ROOT, 'node_modules')), 'bağımlılık: ' + d);
});

test('gömülü ortak çekirdek: sürüm kaydı, modüller, güncelleme planı', () => {
  for (const f of ['uygulama/cekirdek/VERSION', REN + 'cekirdek/VERSION']) assert.match(R(f), /^ortak-cekirdek [0-9a-f]{40}\n/);
  assert.strictEqual(R('uygulama/cekirdek/VERSION'), R(REN + 'cekirdek/VERSION'));
  delete globalThis.FC;
  require('../uygulama/renderer/cekirdek/fc-core.js');
  const FC = globalThis.FC;
  for (const m of ['updater', 'topbar', 'settings', 'contact', 'crash', 'look', 'onboarding', 'whatsnew', 'announcements', 'progress', 'host', 'usage', 'lanMerge']) assert.ok(FC[m], 'FC.' + m);
  const H = (b) => crypto.createHash('sha256').update(b).digest('hex');
  const man = { schema: 1, app: 'sinav-hazirlama', version: '1.11.0', minVersion: '1.0.0', assets: {
    'win-app': { file: 'SinavHazirlama-1.11.0-win-app.asar', size: 100, sha256: H('a'), patches: { '1.10.0': { file: 'SinavHazirlama-win-app.patch-from-1.10.0.bin', size: 10, sha256: H('b') } } },
    'win-setup': { file: 'SinavHazirlama-1.11.0-win-setup.exe', size: 200, sha256: H('c') } } };
  const o = { repo: 'sinav-hazirlama', app: 'sinav-hazirlama', version: '1.10.0', channel: 'win-app', setupChannel: 'win-setup' };
  const p = FC.updater.plan(man, o);
  assert.strictEqual(p.mode, 'patch');
  assert.strictEqual(p.url, 'https://github.com/departures-mil/sinav-hazirlama/releases/download/v1.11.0/SinavHazirlama-win-app.patch-from-1.10.0.bin');
  assert.strictEqual(FC.updater.plan(Object.assign({}, man, { minVersion: '1.11.0' }), o).channel, 'win-setup');
  assert.strictEqual(FC.updater.plan(man, Object.assign({}, o, { version: '1.11.0' })), null);
});

test('FCD1 yama uygulayıcı (Electron ana süreç) — FORMAT.md test vektörü', () => {
  const { applyFcd1 } = require('../uygulama/cekirdek/electron/fcd1.js');
  const zlib = require('zlib');
  const sha = (b) => crypto.createHash('sha256').update(b).digest();
  const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
  const src = Buffer.alloc(0), dst = Buffer.from('abc');
  const patch = Buffer.concat([Buffer.from('FCD1'), Buffer.from([1]), u64(0), sha(src), u64(3), sha(dst), zlib.deflateSync(Buffer.from([2, 3, 0x61, 0x62, 0x63, 0]))]);
  assert.strictEqual(applyFcd1(src, patch).toString(), 'abc');
  assert.throws(() => applyFcd1(Buffer.from('x'), patch));
});

test('eski kanal köprüsü: 1.9.10 güncelleyicisi desktop.json ile ne yapar', async () => {
  const ek = require('../tools/eski-kanal.js');
  assert.deepStrictEqual(ek.check(), []);
  // eski kodu (aynen) köprü manifestiyle çalıştır: yama indirmemeli, kurulum adresli "tam kurulum gerekli" uyarısı göstermeli
  const I18N = { updNeedFull: ['Sürüm {v} için programın tam kurulumu (.exe) bir kez yapılmalı.', 'Version {v} needs a full install (.exe) once.', 'يتطلب الإصدار {v} تثبيتاً كاملاً (.exe) مرة واحدة.'], updLatest: ['Program güncel (sürüm {v}).'], updAvail: ['Yeni sürüm hazır: {v}'] };
  const bridge = ek.build();
  for (const [base, cur] of [['1.9.0', '1.9.10'], ['1.9.0', '1.9.4'], ['1.9.10', '1.9.10']]) {
    const toasts = [], notified = [];
    const ctx = vm.createContext({
      module: {}, MOBILE: false, APPINFO: { version: cur, baseVersion: base, canUpdate: true },
      CL0: { updateReady: true, updateHead: async () => JSON.parse(JSON.stringify(bridge)) },
      toast: (m) => toasts.push(m), updNotify: (h) => notified.push(h), cloudMsg: (e) => String(e), cloudModal: () => {},
      t: (k, v) => { let s = (I18N[k] || [k])[0]; Object.keys(v || {}).forEach((x) => { s = s.split('{' + x + '}').join(v[x]); }); return s; },
      $: () => null, updNotified: ''
    });
    vm.runInContext(R('test/fixtures/eski-1.9.10-guncelleyici.js').replace('module.exports =', 'globalThis.__old ='), ctx);
    const old = ctx.__old;
    assert.strictEqual(old.updNewer(bridge), true, 'eski karşılaştırma köprüyü daha yeni görür (' + cur + ')');
    assert.strictEqual(old.updFits(bridge), false, 'minBase: yama indirilmez');
    assert.strictEqual(await old.checkUpdate(false), null, 'kurulacak paket yok');
    assert.strictEqual(notified.length, 0, '"Şimdi güncelle" önerilmez');
    assert.strictEqual(toasts.length, 1);
    assert.ok(toasts[0].includes('github.com/departures-mil/sinav-hazirlama/releases/latest') && toasts[0].includes('tam kurulumu'), toasts[0]);
    toasts.length = 0;
    await old.checkUpdate(true);   // Güncelle düğmesi
    assert.strictEqual(toasts.length, 1); assert.ok(toasts[0].includes('releases/latest'));
  }
  // şu anki desktop.json: ya eski 1.9.10 yaması (köprü yayınlanmadan önce) ya da köprü
  const cur = JSON.parse(R('guncelleme/desktop.json'));
  assert.ok(cur.file ? /\.sinavyama$/.test(cur.file) : String(cur.version).includes('releases/latest'));
});

test('eşitleme kuralı: bulutta silme yok (arşiv), şablon arşivlenir, sınav dosyası atomik', () => {
  const cloud = R(REN + 'cloud.js');
  const delFn = cloud.slice(cloud.indexOf('async function deleteExam'), cloud.indexOf('async function restoreExam'));
  assert.ok(!/del\(/.test(delFn) && /deleted: true/.test(delFn), 'deleteExam yalnız arşivler');
  assert.ok(/restoreExam/.test(cloud) && /listArchived/.test(cloud));
  const putT = cloud.slice(cloud.indexOf('async function putTemplate'), cloud.indexOf('async function getTemplate'));
  assert.ok(!/writes\.push\(del\(/.test(putT), 'şablon parçaları silinmez');
  assert.ok(!/updateHead|getUpdate|SINAV_UPDATE_SRC|sendContact/.test(cloud), 'eski güncelleme ve iletişim kodu kaldırıldı');
  const tplSrc = R('uygulama/src/template.js');
  const rm = tplSrc.slice(tplSrc.indexOf('function remove('), tplSrc.indexOf('function remove(') + 80);
  assert.ok(/archive\(dir\)/.test(rm) && !/rmSync\(dir/.test(tplSrc), 'şablon silinmez, arşivlenir');
  const main = R('uygulama/main.js');
  assert.match(main, /exam:write[\s\S]{0,300}renameSync/, 'sınav dosyası atomik yazılır');
  assert.match(main, /fc\.install\(mainWin, \{ channel: 'win-app' \}\)/);
  assert.ok(!/patch:install|BOOT|boot\.js|contact:mail/.test(main.replace(/^\/\/.*$/mg, '')), 'eski yama kanalı ve FormSubmit IPC kaldırıldı');
  const app = R(REN + 'app.js');
  assert.ok(/keepLocal\('bulut-once'\)/.test(app), 'buluttan gelen sürüm açık sınavın yerine geçmeden önce yedek');
  assert.ok(/cloudArchivedElsewhere/.test(app), 'uzak arşiv yerelde silmez, geri canlandırmaz');
});

test('kabuk: sağ üst sıra, Ayarlar (iletişim en son), rehber Firebase + AI adımlı, klasik şema', () => {
  const k = R(REN + 'kabuk.js');
  assert.match(k, /FC\.init\(\{ app: 'sinav-hazirlama', repo: 'sinav-hazirlama'/);
  assert.match(k, /setupChannel: 'win-setup'/);
  assert.match(k, /registerScheme\('klasik'/);
  assert.match(k, /'--active-1': '#1f5fbf29'/, 'klasik --active-1 yarı saydam');
  assert.match(k, /onFirebase:/); assert.match(k, /onAi:/);
  assert.ok(!/firebase:\s*false|ai:\s*false/.test(k.slice(k.indexOf('var OB'), k.indexOf('var OB') + 600)), 'rehberde Firebase ve AI adımları var');
  assert.match(k, /FC\.settings\.build\(/);
  // gömülü anahtar yok (her kullanıcı kendi anahtarını girer)
  for (const f of fs.readdirSync(path.join(ROOT, REN)).filter((x) => x.endsWith('.js'))) {
    const s = R(REN + f);
    assert.ok(!/sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}/.test(s.replace(/AIzaSyB12RFS6ENPpmnnPsETfjedNH-3hmNWQvA/g, '')), 'gömülü anahtar: ' + f);
  }
});

test('tüm arayüz ve ana süreç dosyaları sözdizimi olarak geçerli; index.html başvuruları var', () => {
  const files = ['uygulama/main.js', 'uygulama/preload.js', 'uygulama/src/dizin.js', 'uygulama/src/canli.js', 'uygulama/src/canli-sayfa.js', 'uygulama/preview-preload.js', 'uygulama/src/lan.js', 'uygulama/src/template.js', 'uygulama/cekirdek/electron/fc-electron-main.js', 'uygulama/cekirdek/electron/fc-preload.js', 'tools/eski-kanal.js', 'tools/surum.js']
    .concat(fs.readdirSync(path.join(ROOT, REN)).filter((f) => f.endsWith('.js') && f !== 'app.js').map((f) => REN + f));
  for (const f of files) assert.doesNotThrow(() => new vm.Script(R(f), { filename: f }), f);
  assert.doesNotThrow(() => new vm.Script(R(REN + 'app.js').replace(/import\.meta\.url/g, '""'), { filename: 'app.js' }), 'app.js (modül)');
  for (const gone of ['uygulama/boot.js', 'uygulama/src/patcher.js', REN + 'update-source.js', REN + 'kullanim.js', REN + 'duyuru.js', 'araclar/yayinla.js']) assert.ok(!fs.existsSync(path.join(ROOT, gone)), 'kaldırıldı: ' + gone);
  const html = R(REN + 'index.html');
  const refs = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length > 15);
  for (const r of refs) assert.ok(fs.existsSync(path.join(ROOT, REN, r)), 'eksik: ' + r);
  const pos = (s) => html.indexOf(s);
  assert.ok(pos('cekirdek/css/tokens.css') < pos('cekirdek/css/core.css') && pos('cekirdek/css/core.css') < pos('styles.css'));
  assert.ok(pos('src="cekirdek/fc-core.js"') < pos('src="kabuk.js"') && pos('src="cloud.js"') < pos('src="kabuk.js"') && pos('src="kabuk.js"') < pos('src="app.js"'));
  assert.ok(!/btnQuit|btnMin|btnFull|btnUpdate|id="uiLang"/.test(html), 'eski pencere/güncelleme/dil düğmeleri çekirdeğe taşındı');
  // Arapça yazı tipi gömülü
  assert.ok(fs.readdirSync(path.join(ROOT, REN, 'cekirdek/fonts')).some((f) => /noto-sans-arabic.*\.woff2$/.test(f)));
});
