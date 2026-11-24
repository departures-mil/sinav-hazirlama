#!/usr/bin/env node
// ESKİ GÜNCELLEME KANALI (köprü) — ≤1.9.10 kurulumları için guncelleme/desktop.json.
//
// Eski güncelleyici ne yapar (1.9.x, renderer/app.js checkUpdate + cloud.js updateHead, src/patcher.js):
//   raw.githubusercontent.com/departures-mil/sinav-hazirlama/main/guncelleme/desktop.json okur.
//   version > kurulu sürüm ve minBase ≤ kurulu TAM sürüm ise "Yeni sürüm hazır" der ve .sinavyama dosyasını indirir;
//   dosya Ed25519 ile imzalı olmalıdır (boot.js'teki açık anahtar), imzasızı KURMAZ. İmza anahtarı yalnız geliştiricinin
//   bilgisayarındadır (C:\Claude Programlarım\_Anahtarlar\SinavHazirlama) — bu yüzden imzasız köprü yapılmaz.
//   version > kurulu sürüm ama minBase > kurulu TAM sürüm ise HİÇBİR ŞEY İNDİRMEZ, yalnız şu uyarıyı gösterir
//   (açılışta 15 sn, Güncelle düğmesinde de):  "Sürüm {v} için programın tam kurulumu (.exe) bir kez yapılmalı."
//   ({v} = desktop.json "version" alanı, olduğu gibi). Sürüm karşılaştırması noktalara bölüp parseInt yapar:
//   "1.10.0 (github.com/…)" → 1,10,0 → 1.9.x'ten büyük. Böylece imzasız tek bir JSON, eski kullanıcıya yeni kurulumun
//   ADRESİNİ gösterir (test/app.test.js eski kodu bu dosyayla çalıştırıp doğrular).
//
//   node tools/eski-kanal.js --yayinla   desktop.json'u köprüye çevirir (YALNIZ GitHub Release yayınlandıktan SONRA; sonra main'e push)
//   node tools/eski-kanal.js --check     desktop.json ya eski 1.9.10 yaması ya da geçerli köprü mü (npm test)
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DJ = path.join(ROOT, 'guncelleme', 'desktop.json');
const LINK = 'github.com/departures-mil/sinav-hazirlama/releases/latest';

function cmpVer(a, b) {   // eski güncelleyicinin karşılaştırmasıyla aynı
  const x = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0), y = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
}
function build() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const notes = JSON.parse(fs.readFileSync(path.join(ROOT, 'release-notes.json'), 'utf8'));
  return {
    version: pkg.version + ' (' + LINK + ')',
    // eski tam kurulumların hepsinden büyük: güncelleyici yama indirmez, "tam kurulum gerekli" uyarısını gösterir
    minBase: pkg.version,
    notes: 'Sınav Hazırlama ' + pkg.version + ' yeni kurulum programıyla gelir: https://' + LINK + ' → SinavHazirlama-' + pkg.version + '-win-setup.exe. Verileriniz korunur.\n' + notes.tr,
    setup: 'https://github.com/departures-mil/sinav-hazirlama/releases/download/v' + pkg.version + '/SinavHazirlama-' + pkg.version + '-win-setup.exe',
    publishedAt: new Date().toISOString()
  };
}
function check() {
  const d = JSON.parse(fs.readFileSync(DJ, 'utf8')), errs = [];
  const legacyPatch = d.file && /\.sinavyama$/.test(d.file);
  if (legacyPatch) {
    if (!fs.existsSync(path.join(ROOT, 'guncelleme', d.file))) errs.push('desktop.json eski yamayı gösteriyor ama dosya yok: ' + d.file);
    return errs;
  }
  if (cmpVer(d.version, '1.9.10') <= 0) errs.push('köprü sürümü 1.9.10\'dan büyük olmalı');
  if (!d.minBase || cmpVer(d.minBase, '1.9.10') <= 0) errs.push('minBase 1.9.10\'dan büyük olmalı (eski güncelleyici yama indirmesin)');
  if (String(d.version).indexOf(LINK) < 0) errs.push('version alanı kurulum adresini içermeli (eski uyarı metninde görünür)');
  if (d.file) errs.push('köprüde file olmamalı (imzasız paket kurulmaz)');
  return errs;
}
module.exports = { build, check, cmpVer, LINK, DJ };
if (require.main === module) {
  const a = process.argv[2];
  if (a === '--check') { const e = check(); if (e.length) { console.error(e.join('\n')); process.exit(1); } console.log('desktop.json tutarlı'); process.exit(0); }
  if (a !== '--yayinla') { console.log('kullanım: node tools/eski-kanal.js --yayinla | --check'); process.exit(0); }
  const d = build();
  fs.writeFileSync(DJ, JSON.stringify(d, null, 1) + '\n');
  for (const f of fs.readdirSync(path.dirname(DJ))) if (f.endsWith('.sinavyama')) fs.rmSync(path.join(path.dirname(DJ), f));
  console.log('desktop.json → köprü:', d.version);
}
