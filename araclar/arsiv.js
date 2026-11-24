// Sınav Hazırlama — çevrimiçi soru arşivini üretir: guncelleme/bank.json
// Programdaki yerleşik arşivle (sozluk + bank-data + bank-data2 + bank-gen) birebir aynı içerik.
// Program açılışta bu dosyayı GitHub'dan okur; böylece arşiv, program güncellemesi beklemeden yenilenebilir.
//   node araclar/arsiv.js            (yayinla.js her yayında bunu kendisi çağırır)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const R = path.join(ROOT, 'uygulama', 'renderer');
const G = path.join(ROOT, 'guncelleme');

function uret() {
  const window = { I18N: {} };
  window.window = window;
  const ctx = vm.createContext({ window, console, localStorage: { getItem: () => null, setItem() {} }, navigator: { language: 'tr' }, btoa: (s) => Buffer.from(s, 'binary').toString('base64') });
  for (const f of ['sozluk.js', 'bank-data.js', 'bank-data2.js', 'bank-gen.js', 'ek-gorsel.js']) {
    vm.runInContext(fs.readFileSync(path.join(R, f), 'utf8'), ctx, { filename: f });
  }
  const b0 = window.QBANK_BUILTIN, gen = window.QBANK_GEN;
  if (!b0 || !Array.isArray(b0.questions)) throw new Error('QBANK_BUILTIN okunamadı');
  const v = gen && String(gen.v) > String(b0.v) ? gen.v : b0.v;
  const bank = { v, questions: gen ? b0.questions.concat(gen.questions) : b0.questions, scenarios: b0.scenarios || [] };
  const out = path.join(G, 'bank.json');
  fs.writeFileSync(out, JSON.stringify(bank));
  const bytes = fs.statSync(out).size;
  console.log('arşiv', v, bank.questions.length, 'soru', bank.scenarios.length, 'senaryo', (bytes / 1048576).toFixed(2), 'MB');
  return bank;
}
module.exports = uret;
if (require.main === module) uret();
