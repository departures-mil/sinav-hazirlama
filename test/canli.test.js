// Çevrimiçi sınav sunucusu, genel arama dizini ve Word çıktısı (görsel + iki dil yan yana) testleri — Electron gerekmez.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { createCanli } = require('../uygulama/src/canli.js');
const sayfa = require('../uygulama/src/canli-sayfa.js');
const { createDizin } = require('../uygulama/src/dizin.js');

const ML = (tr, en, ar) => ({ tr, en: en || tr, ar: ar || tr });
function post(port, p, body) {
  return new Promise((resolve, reject) => {
    const b = JSON.stringify(body);
    const r = http.request({ host: '127.0.0.1', port, path: p, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, (res) => {
      let d = ''; res.on('data', (c) => { d += c; }); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d), raw: d }); } catch (e) { resolve({ status: res.statusCode, raw: d }); } });
    });
    r.on('error', reject); r.end(b);
  });
}
const get = (port, p) => new Promise((resolve, reject) => { http.get({ host: '127.0.0.1', port, path: p }, (res) => { let d = ''; res.on('data', (c) => { d += c; }); res.on('end', () => resolve({ status: res.statusCode, raw: d })); }).on('error', reject); });

test('çevrimiçi sınav: giriş, karışık şık sırası asıl sıraya çevrilir, doğru cevap telefona gitmez, teslim', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'canli-'));
  let last = null;
  const c = createCanli({ dir, pageHtml: sayfa.pageHtml, scanHtml: sayfa.scanHtml, onChange: (s) => { last = s; } });
  const questions = [0, 1, 2, 3].map((i) => ({ id: 'q' + i, text: ML('Soru ' + i), options: [0, 1, 2, 3, 4].map((k) => ML(`ş${i}-${k}`)) }));
  const s = await c.start({ examId: 'ex1', title: 'Deneme', dur: 10, shuffleQ: true, shuffleO: true, lang: 'tr', langs: ['tr'], questions, key: { q0: 2, q1: 0, q2: 4, q3: 1 } });
  try {
    const port = s.port;
    assert.match((await get(port, '/')).raw, /<html/);
    assert.match((await get(port, '/okut')).raw, /capture="environment"/);
    assert.strictEqual((await post(port, '/api/giris', { ad: 'Ali Veli', no: '123', code: '0000' === s.code ? '9999' : '0000' })).body.error, 'CODE');
    const j = (await post(port, '/api/giris', { ad: 'Ali Veli', no: '123', code: s.code })).body;
    assert.strictEqual(j.ok, true);
    assert.strictEqual(j.paper.length, 4);
    const raw = JSON.stringify(j);
    assert.ok(!/"correct"|"key"/.test(raw), 'doğru cevap gönderilmez');
    // her soruda "ş{i}-{doğru}" metinli şıkkı seç
    const want = { q0: 2, q1: 0, q2: 4, q3: 1 };
    const answers = j.paper.map((q) => q.options.findIndex((o) => o.tr === `ş${q.id.slice(1)}-${want[q.id]}`));
    assert.ok(answers.every((x) => x >= 0));
    const r = (await post(port, '/api/cevap', { token: j.token, answers })).body;
    assert.strictEqual(r.ok, true);
    assert.deepStrictEqual(last.students[0].answers, want, 'cevaplar asıl şık sırasıyla saklanır');
    // aynı numara başka cihazdan giremez
    assert.strictEqual((await post(port, '/api/giris', { ad: 'Başka', no: '123', code: s.code })).body.error, 'TAKEN');
    // jetonla geri dönüş: işaretler karışık sırada geri gelir
    const back = (await post(port, '/api/giris', { token: j.token })).body;
    assert.deepStrictEqual(back.answers, answers);
    const fin = (await post(port, '/api/cevap', { token: j.token, answers, final: true })).body;
    assert.strictEqual(fin.done, true);
    assert.strictEqual((await post(port, '/api/cevap', { token: j.token, answers: [0, 0, 0, 0] })).body.error, 'DONE');
    // oturum dosyası diskte, öğrenci kaydı ile
    const list = c.list();
    assert.strictEqual(list.length, 1);
    const saved = c.get(list[0].id);
    assert.deepStrictEqual(saved.students['123'].answers, want);
  } finally { c.stop(); }
});

test('genel arama dizini: Türkçe / Arapça aksan duyarsız, dosya ve yedeklerden', () => {
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'dizin-'));
  fs.mkdirSync(path.join(ud, 'yedekler', 'esitleme'), { recursive: true });
  const ex = (id, t, qs) => ({ id, title: ML(t), questions: qs.map((q, i) => ({ id: 'x' + i, text: q, options: [ML('a'), ML('b')], correct: 0 })), scenarios: [] });
  const f1 = path.join(ud, 'bir.sinav');
  fs.writeFileSync(f1, JSON.stringify(ex('e1', 'Birinci', [ML('Kümülonimbus bulutu nedir?', 'What is a cumulonimbus?', 'ما هي السحابة الركامية المزنية؟')])));
  fs.writeFileSync(path.join(ud, 'yedekler', 'esitleme', 'acmadan-once-1.json'), JSON.stringify({ exam: ex('e2', 'İkinci', [ML('İrtifa göstergesi', 'Altimeter', 'مقياسُ الارتفاع')]) }));
  const d = createDizin({ userData: ud });
  d.noteFile(f1, null);
  assert.strictEqual(d.search('kumulonimbus').hits.length, 1);
  assert.strictEqual(d.search('IRTIFA').hits[0].exam, 'e2');
  assert.strictEqual(d.search('مقياس الارتفاع').hits.length, 1, 'Arapça hareke fark etmez');
  assert.strictEqual(d.search('yok-boyle-kelime').hits.length, 0);
  assert.strictEqual(d.get('e1').filePath, f1);
  assert.strictEqual(d.search('kumulonimbus', { skipId: 'e1' }).hits.length, 0);
});

test('Word çıktısı: soru görseli gömülür, iki dil yan yana tablo, Arapça hücre sağdan sola', async () => {
  const { buildDocx } = require('../uygulama/src/docx-builder.js');
  const JSZip = require('jszip');
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const lbl = { name: 'Ad', number: 'No', class: 'Sınıf', score: 'Puan', page: 'Sayfa', answerKey: 'Cevap anahtarı', teacherCopy: 'Öğretmen', scenario: 'Senaryo', points: 'puan', answer: 'Cevap', total: 'Toplam', question: 'Soru', vocab: 'Kelime', term: 'Terim', meaning: 'Anlam', testPart: 'Test', scenPart: 'Senaryo', section: 'Bölüm', count: 'Adet', testKey: 'Test', noAnswer: '—' };
  const model = {
    variant: 'student', lang: 'tr', rtl: false, lang2: 'ar', rtl2: true, biTest: true, letters: ['A', 'B', 'C', 'D', 'E'], letters2: ['أ', 'ب', 'ج', 'د', 'هـ'],
    font: 'Times New Roman', fontSize: 12, columns: 2, optionCount: 5, showInfo: true, markCorrect: true, keyAtEnd: true, pageNumbers: true, inlineShort: true, scenNewPage: false,
    school: 'Okul', title: 'Sınav', instructions: '', labels: lbl, labels2: lbl, sections: { test: true, scen: false, vocab: false },
    questions: [{ n: 1, stem: 'Şekildeki bulut hangisidir?', stem2: 'ما السحابة في الشكل؟', options: ['A1', 'B1', 'C1', 'D1', 'E1'], options2: ['أ1', 'ب1', 'ج1', 'د1', 'هـ1'], correct: 0, img: { data: png, w: 400, h: 300 }, oimg: [{ data: png, w: 50, h: 50 }, null, null, null, null] }],
    scenarios: [], vocab: null, totals: { test: null, all: null }, margins: { top: 1.8, bottom: 1.8, left: 1.8, right: 1.8 },
  };
  const buf = await buildDocx(model, { meta: null, tplDir: os.tmpdir() });
  const zip = await JSZip.loadAsync(buf);
  const doc = await zip.file('word/document.xml').async('string');
  const rels = await zip.file('word/_rels/document.xml.rels').async('string');
  const ct = await zip.file('[Content_Types].xml').async('string');
  assert.ok(zip.file('word/media/qimg1.png') && zip.file('word/media/qimg2.png'), 'görseller gömülü');
  assert.match(rels, /rIdQm1[^>]*media\/qimg1\.png/);
  assert.match(ct, /Extension="png"/);
  assert.match(doc, /<w:tbl>/, 'iki dil tablo');
  assert.match(doc, /ما السحابة في الشكل؟/);
  assert.match(doc, /<w:bidi\/>[\s\S]*ما السحابة/, 'Arapça paragraf sağdan sola');
  assert.match(doc, /r:embed="rIdQm1"/);
  // sütun ayarı iki dilde tek sütuna iner
  assert.ok(!/<w:cols w:num="2"/.test(doc));
});
