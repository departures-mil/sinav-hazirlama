#!/usr/bin/env node
// Arayüz ekran görüntüleri — gerçek Electron uygulaması (Playwright _electron ile): node tools/ekran.js <çıktı-klasörü>
// PLAYWRIGHT_CORE=/yol/playwright-core ortamdan alınır. Linux'ta ekran yoksa xvfb-run altında çalıştırın:
//   PLAYWRIGHT_CORE=/opt/npm-tools/node_modules/playwright-core xvfb-run -a -s "-screen 0 1600x1000x24" node tools/ekran.js ekran
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const pw = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const OUT = path.resolve(process.argv[2] || 'ekran');
const ROOT = path.join(__dirname, '..');
fs.mkdirSync(OUT, { recursive: true });

const ML = (tr, en, ar) => ({ tr, en, ar });
function sampleExam() {
  const q = (id, text, opts, correct, tag) => ({ id, text, options: opts, correct, tag: tag || '' });
  return {
    app: 'sinav-hazirlama', version: 2, id: 'ornek0sinav0000000000001',
    school: ML('Havacılık Eğitim Merkezi', 'Aviation Training Centre', 'مركز التدريب الجوي'),
    title: ML('İHA Operatörü Ara Sınavı', 'UAV Operator Midterm Exam', 'امتحان منتصف الفصل لمشغّل الطائرات المسيّرة'),
    instructions: ML('Her soru 4 puandır. Süre 40 dakikadır.', 'Each question is worth 4 points. Time: 40 minutes.', 'لكل سؤال 4 نقاط. المدة 40 دقيقة.'),
    questions: [
      q('q1', ML('LiPo bataryanın hücre başına güvenli en düşük gerilimi yaklaşık kaçtır?', 'What is the safe minimum voltage per cell of a LiPo battery?', 'ما الحد الأدنى الآمن لجهد الخلية في بطارية LiPo؟'), [ML('3,0 V', '3.0 V', '3.0 فولت'), ML('3,3 V', '3.3 V', '3.3 فولت'), ML('3,7 V', '3.7 V', '3.7 فولت'), ML('4,2 V', '4.2 V', '4.2 فولت'), ML('5,0 V', '5.0 V', '5.0 فولت')], 1, 'ogr'),
      q('q2', ML('Hücum açısı kritik değeri aşınca ne olur?', 'What happens when the angle of attack exceeds the critical value?', 'ماذا يحدث عندما تتجاوز زاوية الهجوم القيمة الحرجة؟'), [ML('Taşıma artar', 'Lift increases', 'يزداد الرفع'), ML('Stol (perdövites)', 'Stall', 'انهيار هوائي'), ML('Sürükleme sıfırlanır', 'Drag becomes zero', 'ينعدم السحب'), ML('Motor durur', 'The engine stops', 'يتوقف المحرك'), ML('Hiçbiri', 'None', 'لا شيء')], 1, 'stj'),
      q('q3', ML('"Geofence" ne işe yarar?', 'What is a geofence used for?', 'ما فائدة السياج الجغرافي؟'), [ML('Uçuş alanını sınırlar', 'Limits the flight area', 'يحدّ منطقة الطيران'), ML('Bataryayı şarj eder', 'Charges the battery', 'يشحن البطارية'), ML('Kamerayı sabitler', 'Stabilises the camera', 'يثبّت الكاميرا'), ML('Rüzgârı ölçer', 'Measures the wind', 'يقيس الرياح'), ML('GPS sinyalini güçlendirir', 'Boosts GPS signal', 'يقوّي إشارة GPS')], 0, ''),
      q('q4', ML('METAR raporunda "BKN" neyi belirtir?', 'In a METAR, what does "BKN" mean?', 'ماذا يعني «BKN» في تقرير METAR؟'), [ML('Açık hava', 'Clear sky', 'سماء صافية'), ML('Parçalı bulut (5–7/8)', 'Broken cloud (5–7/8)', 'غيوم متقطعة (5–7/8)'), ML('Sis', 'Fog', 'ضباب'), ML('Kapalı (8/8)', 'Overcast (8/8)', 'غائم كلياً (8/8)'), ML('Yağmur', 'Rain', 'مطر')], -1, 'egt')
    ],
    scenarios: [], scenNote: ML('', '', ''),
    vocab: { title: ML('Kelime testi', 'Vocabulary', 'المفردات'), pointsEach: 1, cols: { ar: true, tr: true }, items: [{ id: 'v1', term: 'altitude', meaning: 'ارتفاع', tr: 'irtifa' }, { id: 'v2', term: 'payload', meaning: 'الحمولة', tr: 'faydalı yük' }], okWords: { en: [], ar: [], tr: [] } },
    settings: { optionCount: 5, columns: 1, fontSize: 12, font: 'Times New Roman', showInfo: true, markCorrect: true, keyAtEnd: true, pageNumbers: true, inlineShort: true, scenNewPage: false, scenLines: 4, margins: { top: 1.8, bottom: 1.8, left: 1.8, right: 1.8 }, tplMargins: { top: 3.5, bottom: 2.5, left: 2, right: 2 } }
  };
}
const shots = [
  { name: 'tr-falcon-dark', lang: 'tr', theme: 'dark', scheme: 'falcon' },
  { name: 'ar-falcon-light', lang: 'ar', theme: 'light', scheme: 'falcon' },
  { name: 'tr-klasik', lang: 'tr', theme: 'light', scheme: 'klasik' },
  { name: 'tr-klasik-dark', lang: 'tr', theme: 'dark', scheme: 'klasik' },
  { name: 'tr-falcon-dark-ayarlar', lang: 'tr', theme: 'dark', scheme: 'falcon', open: 'settings' },
  { name: 'ar-falcon-light-ayarlar', lang: 'ar', theme: 'light', scheme: 'falcon', open: 'settings' },
  { name: 'tr-falcon-dark-wifi', lang: 'tr', theme: 'dark', scheme: 'falcon', open: 'wifi' },
  { name: 'en-falcon-dark-ilk-acilis', lang: 'en', theme: 'dark', scheme: 'falcon', open: 'onboarding' }
];
(async () => {
  const errors = [];
  for (const s of shots.filter((x) => !process.env.ONLY || process.env.ONLY.split(',').includes(x.name))) {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'sh-ekran-'));
    fs.writeFileSync(path.join(userData, 'autosave.sinav'), JSON.stringify({ exam: sampleExam(), filePath: null, dirty: false }));
    const app = await pw._electron.launch({ executablePath: require(path.join(ROOT, 'node_modules', 'electron')), args: [ROOT, '--no-sandbox', '--disable-gpu', '--user-data-dir=' + userData], env: Object.assign({}, process.env, { ELECTRON_DISABLE_SECURITY_WARNINGS: '1' }) });
    const page = await app.firstWindow();
    page.on('pageerror', (e) => errors.push(s.name + ': ' + e.message));
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(({ s }) => {
      const set = (k, v) => localStorage.setItem('fc.' + k, JSON.stringify(v));
      set('lang', s.lang); set('theme', s.theme); set('scheme', s.scheme); set('whatsnew.seen', '1.10.0');
      if (s.open !== 'onboarding') set('onboarding.done', true);
      localStorage.setItem('prefs', JSON.stringify({ uiLang: s.lang, contentLang: s.lang, syncLang: true, tab: 'test' }));
    }, { s });
    await page.reload();
    await page.waitForTimeout(2500);
    if (s.open === 'settings') { await page.click('#btnSettings'); await page.waitForTimeout(900); }
    if (s.open === 'wifi') { await page.click('.topbar .lan-act'); await page.waitForTimeout(1200); }
    await page.waitForTimeout(s.open === 'onboarding' ? 1500 : 300);
    await page.screenshot({ path: path.join(OUT, s.name + '.png') });
    if (s.open === 'settings') {   // ayarlar penceresinin sonu (Admin ile iletişim en altta)
      await page.evaluate(() => { const b = document.querySelector('.backdrop .modal .body'); if (b) b.scrollTop = b.scrollHeight; });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, s.name + '-son.png') });
    }
    await app.close();
    console.log('✓', s.name);
  }
  if (errors.length) { console.error('HATALAR:\n' + errors.join('\n')); process.exitCode = 1; }
})();
