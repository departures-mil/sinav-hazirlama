'use strict';
/* Sınav Hazırlama 1.10.1 — genel arama dizini (ana süreç).
   Bu bilgisayarda açılmış / kaydedilmiş / eşitlenmiş bütün sınavların sorularında üç dilde birden arar.
   Kaynaklar: açılan ve kaydedilen sınav dosyaları, otomatik kayıt ve yedekleri, eşitleme yedekleri, bulut yedeği, Wi-Fi deposu.
   Aynı sınav birden çok yerde varsa en yenisi kullanılır. Hiçbir dosyaya yazmaz (yalnız kendi dosya listesini tutar). */
const fs = require('fs');
const path = require('path');

// Türkçe / Arapça / aksan duyarsız biçim
function norm(s) {
  return String(s || '')
    .replace(/[İIı]/g, 'i').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[ً-ٰٟـ]/g, '')            // Arapça hareke, tatvil
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
const ML = (v) => ({ tr: (v && v.tr) || '', en: (v && v.en) || '', ar: (v && v.ar) || '' });
const short = (ml) => { const o = ML(ml); for (const k of Object.keys(o)) o[k] = o[k].slice(0, 220); return o; };
const nameOf = (x) => ['tr', 'en', 'ar'].map((k) => ((x.title || {})[k] || '').trim()).find(Boolean) || '';

function createDizin({ userData }) {
  const filesListPath = path.join(userData, 'arama', 'dosyalar.json');
  let files = [];
  try { files = JSON.parse(fs.readFileSync(filesListPath, 'utf8')) || []; } catch (e) { files = []; }
  const saveFiles = () => { try { fs.mkdirSync(path.dirname(filesListPath), { recursive: true }); fs.writeFileSync(filesListPath, JSON.stringify(files.slice(-400))); } catch (e) { /* yok */ } };
  let idx = null; // Map id -> kayıt

  function entryOf(exam, src, t) {
    if (!exam || !Array.isArray(exam.questions)) return null;
    const qs = [];
    let n = 0;
    exam.questions.forEach((q) => {
      if (!q) return;
      if (!q.ghost) n++;
      const opts = (q.options || []).slice(0, 5).map(ML);
      const all = ['tr', 'en', 'ar'].map((k) => [((q.text || {})[k] || ''), ...opts.map((o) => o[k])].join(' ')).join(' ') + ' ' + (q.konu || '') + ' ' + (q.kaynak || '');
      qs.push({ id: q.id, n: q.ghost ? 0 : n, s: norm(all), text: short(q.text), o: opts.map(short), c: q.correct, konu: q.konu || '' });
    });
    const sc = (exam.scenarios || []).map((s, i) => ({ n: i + 1, s: norm(['tr', 'en', 'ar'].map((k) => [((s.title || {})[k] || ''), ((s.text || {})[k] || ''), ...(s.questions || []).map((x) => ((x.text || {})[k] || '') + ' ' + ((x.answer || {})[k] || ''))].join(' ')).join(' ')), text: short(s.title && nameOf({ title: s.title }) ? s.title : s.text) }));
    return { id: String(exam.id || ''), name: nameOf(exam), src, t: +t || 0, nq: n, qs, sc };
  }
  function put(e) {
    if (!e || !e.id) return;
    const old = idx.get(e.id);
    // daha yeni olan kalır; eşitse dosya kaynağı önce gelir (açılabilir)
    if (!old || e.t > old.t || (e.t === old.t && e.src.tip === 'dosya')) idx.set(e.id, e);
  }
  const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
  const mtime = (f) => { try { return fs.statSync(f).mtimeMs; } catch (e) { return 0; } };
  const listDir = (d, re) => { try { return fs.readdirSync(d).filter((x) => re.test(x)).map((x) => path.join(d, x)); } catch (e) { return []; } };

  function build() {
    idx = new Map();
    const Y = path.join(userData, 'yedekler');
    // açılan / kaydedilen sınav dosyaları
    files.forEach((f) => { const d = readJson(f); if (d) put(entryOf(d.exam || d, { tip: 'dosya', yol: f }, mtime(f))); });
    // otomatik kaydın yedekleri (en yeni 40)
    listDir(Y, /^otomatik-kayit-.*\.sinav$/).sort().slice(-40).forEach((f) => { const d = readJson(f); if (d && d.exam) put(entryOf(d.exam, d.filePath && fs.existsSync(d.filePath) ? { tip: 'dosya', yol: d.filePath } : { tip: 'yedek', yol: f }, mtime(f))); });
    // eşitleme / açmadan önce yedekleri (en yeni 80)
    listDir(path.join(Y, 'esitleme'), /\.json$/).sort().slice(-80).forEach((f) => { const d = readJson(f); if (d && d.exam) put(entryOf(d.exam, { tip: 'yedek', yol: f }, mtime(f))); });
    // bulut yedeği (en yeni)
    const bl = listDir(path.join(Y, 'bulut'), /^bulut-.*\.json$/).sort().pop();
    if (bl) { const d = readJson(bl); ((d && d.exams) || []).forEach((x, i) => put(entryOf({ ...x.exam, id: x.id }, { tip: 'bulut', yol: bl, i, bid: x.id }, +x.updatedAt || mtime(bl)))); }
    // Wi-Fi deposu
    listDir(path.join(userData, 'wifi-esitleme', 'sinavlar'), /\.json$/).forEach((f) => { const r = readJson(f); if (r && r.exam && !r.deleted) put(entryOf(r.exam, { tip: 'wifi', yol: f }, +r.updatedAt || mtime(f))); });
    // açık sınav (otomatik kayıt)
    const a = readJson(path.join(userData, 'autosave.sinav'));
    if (a && a.exam) put(entryOf(a.exam, a.filePath ? { tip: 'dosya', yol: a.filePath } : { tip: 'otomatik' }, Date.now()));
  }
  const ensure = () => { if (!idx) build(); };

  return {
    norm,
    // sınav açıldı / kaydedildi: dosya listesine eklenir, dizin güncellenir
    noteFile(p, data) {
      if (!p) return;
      files = files.filter((x) => x !== p).concat(p); saveFiles();
      if (idx && data) put(entryOf(data.exam || data, { tip: 'dosya', yol: p }, Date.now()));
    },
    noteOpen(exam, filePath) { if (idx && exam) { const e = entryOf(exam, filePath ? { tip: 'dosya', yol: filePath } : { tip: 'otomatik' }, Date.now()); if (e) idx.set(e.id, e); } },
    rebuild() { idx = null; ensure(); return idx.size; },
    search(q, opts = {}) {
      ensure();
      const toks = norm(q).split(' ').filter(Boolean);
      if (!toks.length) return { exams: idx.size, hits: [] };
      const hits = [];
      const skip = opts.skipId || '';
      for (const e of idx.values()) {
        if (e.id === skip) continue;
        for (const x of e.qs) if (toks.every((t) => x.s.includes(t))) hits.push({ exam: e.id, name: e.name, src: e.src.tip, t: e.t, kind: 'q', qid: x.id, n: x.n, text: x.text, o: x.o, c: x.c, konu: x.konu });
        for (const x of e.sc) if (toks.every((t) => x.s.includes(t))) hits.push({ exam: e.id, name: e.name, src: e.src.tip, t: e.t, kind: 's', n: x.n, text: x.text });
        if (hits.length > (opts.max || 400)) break;
      }
      hits.sort((a, b) => b.t - a.t);
      return { exams: idx.size, hits: hits.slice(0, opts.max || 400) };
    },
    // sonuçtaki sınavın tamamı (açmak için)
    get(id) {
      ensure();
      const e = idx.get(String(id));
      if (!e) return null;
      const s = e.src;
      if (s.tip === 'dosya') { const d = readJson(s.yol); return d ? { exam: d.exam || d, filePath: s.yol, src: 'dosya' } : null; }
      if (s.tip === 'bulut') { const d = readJson(s.yol); const x = d && d.exams && d.exams[s.i]; return x ? { exam: { ...x.exam, id: x.id }, cloudId: x.id, src: 'bulut' } : null; }
      if (s.tip === 'wifi' || s.tip === 'yedek') { const d = readJson(s.yol); return d && d.exam ? { exam: d.exam, src: s.tip } : null; }
      const a = readJson(path.join(userData, 'autosave.sinav'));
      return a && a.exam ? { exam: a.exam, src: 'otomatik' } : null;
    },
  };
}
module.exports = { createDizin, norm };
