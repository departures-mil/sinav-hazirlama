// Electron açılış testi: gerçek ana süreç + preload + arayüz. Pencere açılır, ortak çekirdek başlar, tam ekran, üst çubuk ve sekmeler dolu.
// Linux'ta ekran yoksa xvfb-run ile çalışır (CI: ubuntu-latest). Electron ikilisi yoksa (npm ci yapılmadıysa) atlanır.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let electron = null;
try { electron = require('electron'); } catch (e) { }
const needX = process.platform === 'linux' && !process.env.DISPLAY;
const hasXvfb = !needX || spawnSync('sh', ['-c', 'command -v xvfb-run'], { encoding: 'utf8' }).status === 0;

test('Electron: pencere yüklenir, çekirdek başlar, tam ekran', { skip: !electron || typeof electron !== 'string' ? 'electron yok' : !hasXvfb ? 'xvfb-run yok' : false, timeout: 120000 }, () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'sh-smoke-'));
  const args = [ROOT, '--no-sandbox', '--disable-gpu', '--user-data-dir=' + userData];
  const cmd = needX ? 'xvfb-run' : electron;
  const full = needX ? ['-a', '-s', '-screen 0 1600x1000x24', electron].concat(args) : args;
  const r = spawnSync(cmd, full, { encoding: 'utf8', timeout: 100000, env: Object.assign({}, process.env, { SINAV_SMOKE: '1', ELECTRON_DISABLE_SECURITY_WARNINGS: '1' }) });
  const line = String(r.stdout || '').split('\n').find((l) => l.startsWith('SINAV_SMOKE '));
  assert.ok(line, 'çıktı yok: ' + (r.stdout || '') + (r.stderr || '').slice(-2000));
  const o = JSON.parse(line.slice('SINAV_SMOKE '.length));
  console.log(o);
  assert.deepStrictEqual(o.errors, []);
  assert.strictEqual(o.fc, true, 'FC çekirdeği yüklü');
  assert.strictEqual(o.host, 'electron', 'fcHost tanındı');
  assert.strictEqual(o.api, true);
  assert.strictEqual(o.version, require('../package.json').version);
  assert.strictEqual(o.appVersion, require('../package.json').version);
  assert.strictEqual(o.topbar, true);
  assert.strictEqual(o.winBtns, 4, 'Küçült · Orta · Tam ekran · Kapat');
  assert.ok(o.sync && o.lan && o.update, 'Eşitle · Wi-Fi · Güncelle');
  assert.strictEqual(o.kabuk, true);
  assert.ok(o.schemes.includes('klasik') && o.schemes[0] === 'falcon', 'klasik şema kayıtlı');
  assert.strictEqual(o.tabs, 3);
  assert.strictEqual(o.scheme, 'falcon');
  assert.strictEqual(o.fullscreen, true, 'her açılışta tam ekran');
  // 1.10.4: kalite ve sınıf araçları
  assert.ok(o.ekplus, '1.10.4 denetimi çalışmadı');
  assert.strictEqual(o.ekplus.side, 7, 'kenar çubuğunda 7 yeni araç');
  assert.ok(o.ekplus.keep, 'durum / rev / inceleme alanları normalizeExam sonrası korunur');
  assert.ok(o.ekplus.onay, 'onay akışı süzgeci');
  assert.ok(o.ekplus.parse, 'Excel/Word tablosundan soru okuma');
  assert.ok(o.ekplus.meta, 'kartta onay durumu');
  assert.ok(o.ekplus.fits, 'müfredat kodu eşleşmesi (M8)');
  assert.deepStrictEqual(o.ekplus.modalErrs, []);
  // 1.11.2
  const y = o.yeni;
  assert.ok(y, '1.11.2 denetimi çalışmadı');
  assert.strictEqual(y.side, 3, 'kenar çubuğunda 3 yeni araç (eskime, Part-66, kılavuz)');
  assert.ok(y.kul, 'kullanım kaydı (q.kul) ve yıprandı işareti normalizeExam sonrası korunur → eşitlenir');
  assert.ok(y.worn, 'yıprandı / sınıfa verildi hesabı');
  assert.ok(y.mod && y.mod7, 'Part-66 modül ve alt konu tanıma');
  assert.ok(y.app2, 'Appendix II soru sayıları');
  assert.ok(y.weights, 'modül ağırlık sapması');
  assert.ok(y.audit, 'olumsuz kök, soru biçimi, üç dilde sayı tutarlılığı');
  assert.ok(y.tok && y.ev && y.rule, 'OCR satır kurma, kanıt doğrulama, çevrimdışı terim sorusu');
  assert.ok(y.lazy && y.hydrate, 'çok soruda hızlı liste ve kaydırınca kart kurulumu');
  assert.deepStrictEqual(y.modalErrs, []);
  const rl = y.rules;
  assert.strictEqual(rl.winBtns, 4); assert.ok(rl.sync && rl.lan && rl.update, 'sağ üst: Eşitle · Wi-Fi · Güncelle');
  assert.ok(rl.themes, 'açık / koyu mod ve renk şemaları');
  assert.ok(rl.usage, 'Ayarlar: kullanım limitleri'); assert.ok(rl.contactLast, 'Ayarlar: admin ile iletişim en sonda'); assert.ok(rl.yz, 'Ayarlar: çevrimdışı yapay zekâ kartı');
  assert.ok(rl.progress, 'güncelleme: kalan MB, hız, yalnızca değişen kısımlar');
  assert.ok(rl.offlineTr && rl.offlineOcr, 'çevrimdışı çeviri ve OCR');
  assert.strictEqual(o.ok, true);
});
