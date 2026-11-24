// Wi-Fi eşitleme (uygulama/src/lan.js): iki "bilgisayar" aynı süreçte, 127.0.0.1 üzerinden.
// PIN eşleşmesi, şifreli + imzalı eşitleme, birleştirme kuralı (hiçbir sınav silinmez / ezilmez), saldırı denemeleri.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { createLan } = require('../uygulama/src/lan.js');

const tmp = (n) => fs.mkdtempSync(path.join(os.tmpdir(), 'sh-lan-' + n + '-'));
const ex = (id, title, n) => ({ app: 'sinav-hazirlama', version: 2, id, title: { tr: title, en: '', ar: '' }, questions: Array.from({ length: n || 1 }, (_, i) => ({ id: 'q' + i, text: { tr: title + ' ' + i }, options: [], correct: -1 })), scenarios: [], vocab: { items: [] } });

test('Wi-Fi eşitleme: eşleşme, eşitleme, birleştirme kuralı, güvenlik', async (t) => {
  const changedA = [];
  const A = createLan({ dir: tmp('a'), name: 'Bilgisayar-A', version: 'test', onChanged: (ids) => changedA.push(...ids) });
  const B = createLan({ dir: tmp('b'), name: 'Bilgisayar-B', version: 'test' });
  t.after(() => { A.stop(); B.stop(); });

  // --- eşleşme: yanlış PIN reddedilir, 5 hatada PIN geçersiz olur ---
  let pin = await A.showPin();
  const port = A.status().port;
  assert.ok(port > 0 && /^\d{6}$/.test(pin.code));
  const wrong = pin.code === '000000' ? '111111' : '000000';
  await assert.rejects(B.pair('127.0.0.1', port, wrong, A.id()), (e) => e.code === 'BAD_PIN');
  for (let i = 0; i < 4; i++) await B.pair('127.0.0.1', port, wrong, A.id()).catch(() => {});
  await assert.rejects(B.pair('127.0.0.1', port, pin.code, A.id()), (e) => e.code === 'NO_PIN', '5 hatalı denemeden sonra doğru PIN de geçmez');
  pin = await A.showPin();
  const peer = await B.pair('127.0.0.1', A.status().port, pin.code, A.id());
  assert.strictEqual(peer.name, 'Bilgisayar-A');
  assert.strictEqual(A.status().pairs.length, 1);
  assert.strictEqual(A.status().pin, null, 'PIN tek kullanımlık');
  await B.start();

  // --- yeni kayıtlar iki yöne gider ---
  assert.strictEqual(A.put(ex('sinavA0000000001', 'Matematik')), true);
  assert.strictEqual(A.put(ex('sinavA0000000001', 'Matematik')), false, 'değişmeyen içerik yeniden yazılmaz');
  B.put(ex('sinavB0000000001', 'Fizik'));
  let r = await B.syncAll();
  assert.ok(r.results[0].ok, JSON.stringify(r.results[0]));
  assert.deepStrictEqual(A.list().map((x) => x.id).sort(), ['sinavA0000000001', 'sinavB0000000001']);
  assert.deepStrictEqual(B.list().map((x) => x.id).sort(), ['sinavA0000000001', 'sinavB0000000001']);
  assert.ok(changedA.includes('sinavB0000000001'), 'sunucu tarafı arayüze haber verir');

  // --- çakışma: yeni olan kalır, eski hâl yedeğe; iki taraf aynı sonuca varır ---
  const recA = A.get('sinavA0000000001'), recB = B.get('sinavA0000000001');
  fs.writeFileSync(path.join(A.storeDir, 'sinavA0000000001.json'), JSON.stringify(Object.assign({}, recA, { updatedAt: Date.now() + 1000, exam: ex('sinavA0000000001', 'Matematik A-düzeltme', 2) })));
  fs.writeFileSync(path.join(B.storeDir, 'sinavA0000000001.json'), JSON.stringify(Object.assign({}, recB, { updatedAt: Date.now(), exam: ex('sinavA0000000001', 'Matematik B-düzeltme', 3) })));
  r = await B.syncAll();
  assert.ok(r.results[0].ok);
  assert.strictEqual(r.results[0].conflicts, 1, 'B\'nin eski hâli yedeklendi');
  assert.strictEqual(B.get('sinavA0000000001').exam.title.tr, 'Matematik A-düzeltme');
  assert.strictEqual(A.get('sinavA0000000001').exam.title.tr, 'Matematik A-düzeltme');
  const conf = fs.readdirSync(B.conflictDir);
  assert.strictEqual(conf.length, 1);
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(B.conflictDir, conf[0]), 'utf8')).lost.exam.title.tr, 'Matematik B-düzeltme', 'kaybeden hâl kayıpsız saklanır');

  // --- uzak silme işareti yerelde silmez: kayıt "arşivlendi" olur, verisi durur ---
  const recF = A.get('sinavB0000000001');
  fs.writeFileSync(path.join(B.storeDir, 'sinavB0000000001.json'), JSON.stringify(Object.assign({}, recF, { deleted: true, deletedAt: Date.now() + 5000 })));
  r = await B.syncAll();
  assert.ok(r.results[0].ok);
  const fa = A.get('sinavB0000000001');
  assert.ok(fa && fa.archived === true && fa.exam.title.tr === 'Fizik', 'A\'da arşivlendi, veri duruyor');
  assert.ok(!fa.deleted);
  assert.strictEqual(A.list().length, 2, 'hiçbir kayıt silinmedi');

  // --- güvenlik: imzasız / yanlış anahtarlı / tekrar oynatılan istek reddedilir ---
  const post = (headers, body) => new Promise((res) => { const q = http.request({ host: '127.0.0.1', port: A.status().port, method: 'POST', path: '/sinav/sync', headers: Object.assign({ 'content-type': 'application/json' }, headers) }, (s) => { s.resume(); s.on('end', () => res(s.statusCode)); }); q.end(body || '{}'); });
  assert.strictEqual(await post({}), 401);
  assert.strictEqual(await post({ 'x-sh-id': B.id(), 'x-sh-ts': Date.now(), 'x-sh-nonce': 'abcdefgh12', 'x-sh-sig': 'x'.repeat(64) }), 401);
  assert.strictEqual(await post({ 'x-sh-id': 'baskasi', 'x-sh-ts': Date.now(), 'x-sh-nonce': 'abcdefgh13', 'x-sh-sig': 'x'.repeat(64) }), 401);
  const pairNoPin = await new Promise((res) => { const q = http.request({ host: '127.0.0.1', port: A.status().port, method: 'POST', path: '/sinav/pair', headers: { 'content-type': 'application/json' } }, (s) => { s.resume(); s.on('end', () => res(s.statusCode)); }); q.end(JSON.stringify({ id: 'x', salt: 'y', proof: 'z' })); });
  assert.strictEqual(pairNoPin, 403, 'PIN gösterilmiyorken eşleşme kapalı');

  // --- eşleşme kaldırılınca eşitleme reddedilir (veri silinmez) ---
  A.unpair(B.id());
  r = await B.syncAll();
  assert.strictEqual(r.results[0].ok, false);
  assert.strictEqual(r.results[0].error, 'AUTH');
  assert.strictEqual(A.list().length, 2);
});
