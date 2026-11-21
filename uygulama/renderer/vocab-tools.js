'use strict';
// Kelime testi: tablodan sütun seçimi, tekrar temizliği ve çeviri denetimi.
(function () {
  const AR = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
  const LAT = /[A-Za-zÀ-ÖØ-öø-ÿĞğİıŞş]/g;
  const arCount = (s) => (String(s || '').match(AR) || []).length;
  const latCount = (s) => (String(s || '').match(LAT) || []).length;
  const isAr = (s) => arCount(s) >= 2 && arCount(s) >= latCount(s) * 0.5;

  const TERM_H = /^(ingilizce|english|kelime|word|words|term|terim|vocabulary|الإنجليزية|الانجليزية|الكلمة|المصطلح)\b|ingilizce\s*kelime/i;
  const MEAN_H = /^(arapça|arapca|arabic|العربية|عربي|anlam|anlamı|meaning|المعنى|الترجمة|türkçe|turkce|turkish|التركية)\b/i;
  const TR_H = /türkçe|turkce|turkish|التركية|تركي/i;
  const TRCH = /[çğışöüÇĞİŞÖÜ]/;
  const AR_H = /arap|arabic|عرب/i;
  const OTHER_H = /telaffuz|okunuş|pronunciation|النطق|#|^no\.?$|^sıra|^s\.?n/i;
  const low = (s) => String(s || '').toLocaleLowerCase('tr').trim();

  // Sütun önerisi: başlık satırı, kelime sütunu, anlam sütunu
  function detectColumns(rows) {
    const width = Math.max(0, ...rows.map((r) => r.length));
    let header = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const r = rows[i].map(low);
      const hits = r.filter((c) => c && (TERM_H.test(c) || MEAN_H.test(c) || OTHER_H.test(c))).length;
      if (hits >= 2 || (hits >= 1 && r.filter(Boolean).length <= 2 && i === 0)) { header = i; break; }
    }
    const body = rows.slice(header + 1);
    const stats = [];
    for (let c = 0; c < width; c++) {
      const cells = body.map((r) => r[c] || '').filter(Boolean);
      const n = cells.length || 1;
      stats.push({
        c, filled: cells.length / Math.max(1, body.length),
        ar: cells.filter(isAr).length / n,
        lat: cells.filter((x) => latCount(x) >= 2 && !isAr(x)).length / n,
        ipa: cells.filter((x) => /\/[^/]*[əɪʊæɔŋʃʒθðˈː][^/]*\//.test(x)).length / n,
        avg: cells.reduce((a, x) => a + x.length, 0) / n,
        trc: cells.filter((x) => TRCH.test(x) && !isAr(x)).length / n,
        h: header >= 0 ? low(rows[header][c]) : '',
      });
    }
    const usable = stats.filter((s) => s.filled > 0.2 && s.ipa < 0.5 && !OTHER_H.test(s.h));
    let term = usable.find((s) => s.h && TERM_H.test(s.h)) || usable.filter((s) => s.lat > 0.6).sort((a, b) => a.c - b.c)[0] || usable[0] || stats[0];
    // Türkçe sütun: başlığı Türkçe olan ya da Türkçe harfleri sık geçen Latin sütun
    const trCol = usable.find((s) => s !== term && s.h && TR_H.test(s.h)) ||
      usable.filter((s) => s !== term && s.ar < 0.2 && s.trc >= 0.25).sort((a, b) => b.trc - a.trc)[0];
    let mean = usable.find((s) => s !== term && s !== trCol && s.h && MEAN_H.test(s.h) && AR_H.test(s.h)) ||
      usable.filter((s) => s !== term && s !== trCol).sort((a, b) => b.ar - a.ar)[0];
    if (mean && mean.ar < 0.3) mean = usable.find((s) => s !== term && s !== trCol && s.h && MEAN_H.test(s.h) && !TR_H.test(s.h)) || (trCol ? null : mean);
    return { header, term: term ? term.c : 0, meaning: mean ? mean.c : (trCol ? -1 : (width > 1 ? 1 : -1)), tr: trCol ? trCol.c : -1, width };
  }

  const keyOf = (term) => low(term).replace(/[.\s]+$/g, '').replace(/^(to|the|a|an)\s+/, '').replace(/\s+/g, ' ');

  // Satırlardan kelime listesi; tekrarlar her zaman ayıklanır (mevcut listedekiler dahil)
  function buildItems(rows, { header = -1, term = 0, meaning = 1, tr = -1 } = {}, existing = []) {
    const seen = new Map();
    existing.forEach((it, i) => { if (it.term && it.term.trim()) seen.set(keyOf(it.term), { term: it.term, meaning: it.meaning, where: 'existing', i }); });
    const items = [], duplicates = [];
    let skipped = 0;
    const headText = header >= 0 ? low(rows[header][term]) : null;
    rows.forEach((r, ri) => {
      if (ri <= header) return;
      const t = String(r[term] || '').trim();
      const m = meaning >= 0 ? String(r[meaning] || '').trim() : '';
      const mt = tr >= 0 ? String(r[tr] || '').trim() : '';
      if (!t && !m && !mt) { skipped++; return; }
      if (headText && low(t) === headText) { skipped++; return; } // tekrar eden başlık satırı
      const k = keyOf(t);
      if (t && seen.has(k)) {
        const first = seen.get(k);
        duplicates.push({ term: t, meaning: m, keptMeaning: first.meaning, row: ri + 1, existing: first.where === 'existing', differs: !!m && low(m) !== low(first.meaning) });
        return;
      }
      const it = { term: t, meaning: m, tr: mt, row: ri + 1 };
      if (t) seen.set(k, { term: t, meaning: m, where: 'new' });
      items.push(it);
    });
    return { items, duplicates, skipped };
  }

  // Listedeki tekrarları kaldırır (ilk geçen kalır)
  function dedupeList(items) {
    const seen = new Map();
    const kept = [], removed = [];
    items.forEach((it) => {
      const k = keyOf(it.term);
      if (it.term && it.term.trim() && seen.has(k)) {
        const first = seen.get(k);
        if (!first.meaning && it.meaning) first.meaning = it.meaning; // boş anlamı doldur
        if (!first.tr && it.tr) first.tr = it.tr;
        removed.push({ term: it.term, meaning: it.meaning, keptMeaning: first.meaning, differs: !!it.meaning && low(it.meaning) !== low(first.meaning) });
        return;
      }
      if (it.term && it.term.trim()) seen.set(k, it);
      kept.push(it);
    });
    return { kept, removed };
  }

  /* ---- yerel denetim (internetsiz) ---- */
  // döner: Map(index -> [{code, level:'err'|'warn'|'info', vars}])
  function checkItems(items, cols = { ar: true, tr: false }) {
    const res = new Map();
    const add = (i, code, level, vars) => { if (!res.has(i)) res.set(i, []); res.get(i).push({ code, level, vars }); };
    const arMeanings = items.filter((it) => (it.meaning || '').trim()).filter((it) => isAr(it.meaning)).length;
    const expectAr = arMeanings >= Math.max(1, items.filter((it) => (it.meaning || '').trim()).length * 0.5);
    const meanIdx = new Map();
    const termIdx = new Map();
    const simIdx = new Map();
    const trIdx = new Map();
    items.forEach((it, i) => {
      const t = (it.term || '').trim(), m = cols.ar ? (it.meaning || '').trim() : '', tm = cols.tr ? (it.tr || '').trim() : '';
      if (!t && !m && !tm) return;
      if (!t) add(i, 'vwEmptyTerm', 'err');
      if (cols.ar && !m) add(i, 'vwEmptyMeaning', 'err');
      if (cols.tr && !tm) add(i, 'vwEmptyTr', 'err');
      if (tm && arCount(tm) >= 2) add(i, 'vwTrArabic', 'warn');
      if (t && tm && low(t) === low(tm) && t.length > 3) add(i, 'vwTrSame', 'info');
      if (tm) {
        const k = low(tm);
        if (trIdx.has(k)) add(i, 'vwDupTr', 'info', { n: trIdx.get(k) + 1, w: items[trIdx.get(k)].term }); else trIdx.set(k, i);
      }
      if (t && arCount(t) >= 2) add(i, 'vwTermArabic', 'warn');
      if (m && expectAr && !arCount(m)) add(i, 'vwNotArabic', 'warn');
      if (t && m && low(t) === low(m)) add(i, 'vwSame', 'warn');
      if (m && expectAr && arCount(m) && latCount(m) >= 3) add(i, 'vwLatinInMeaning', 'info', { w: (m.match(/[A-Za-z][A-Za-z\-]+/g) || []).join(', ') });
      if (t && m && m.split(/\s+/).length > Math.max(5, t.split(/\s+/).length * 4)) add(i, 'vwLong', 'info');
      if (/[?؟]{1,}|\.{3}|xxx|\?\?/i.test(m)) add(i, 'vwUnsure', 'warn');
      if (t) {
        const k = keyOf(t);
        if (termIdx.has(k)) add(i, 'vwDupTerm', 'err', { n: termIdx.get(k) + 1 }); else {
          termIdx.set(k, i);
          const sk = k.replace(/[^a-z0-9]/g, '').replace(/(es|s)$/, '');
          if (sk.length >= 3 && simIdx.has(sk)) add(i, 'vwSimilar', 'info', { n: simIdx.get(sk) + 1, w: items[simIdx.get(sk)].term }); else simIdx.set(sk, i);
        }
      }
      if (m) {
        const k = normAr(m) || low(m);
        if (meanIdx.has(k)) {
          const j = meanIdx.get(k);
          add(i, 'vwDupMeaning', 'info', { n: j + 1, w: items[j].term });
        } else meanIdx.set(k, i);
      }
    });
    return res;
  }

  /* ---- çevrimiçi denetim yardımcıları ---- */
  function normAr(s) {
    return String(s || '').replace(/[ً-ْٰـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
      .replace(/[^ء-ي\s]/g, ' ').split(/\s+/).filter(Boolean)
      .map((w) => w.replace(/^(وال|بال|كال|فال|لل|ال)(?=..)/, '').replace(/^[وبلف](?=...)/, ''))
      .filter((w) => w.length >= 2).join(' ');
  }
  const EN_STOP = new Set(['to', 'the', 'a', 'an', 'of', 'in', 'on', 'for', 'and', 'or', 'is', 'be', 'it', 'its', 'with', 'by', 'at', 'from']);
  const stemEn = (w) => w.replace(/(ing|ed|es|s|ly|ment|tion|er)$/, '').slice(0, 6);
  function enTokens(s) {
    return String(s || '').toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter((w) => w.length > 1 && !EN_STOP.has(w)).map(stemEn);
  }
  const arTokens = (s) => normAr(s).split(' ').filter((w) => w.length >= 2);
  const arStem = (w) => w.slice(0, 4);
  // verilen anlam ile makine çevirisi (ve geri çeviri) uyuşuyor mu?
  function judge(term, meaning, mt, back) {
    const a = arTokens(meaning), b = arTokens(mt);
    const sa = new Set(a.map(arStem));
    const arHit = b.some((w) => sa.has(arStem(w)) || a.some((x) => (x.length >= 3 && w.includes(x)) || (w.length >= 3 && x.includes(w))));
    const tt = new Set(enTokens(term));
    const enHit = enTokens(back).some((w) => tt.has(w));
    // terim Arapça anlamın içinde Latin harfle geçiyorsa (ör. "ESC kalibrasyonu") kabul
    const latinHit = enTokens(meaning).some((w) => tt.has(w));
    return { ok: arHit || enHit || latinHit, arHit, enHit };
  }

  // Türkçe anlam ile makine çevirisi uyuşuyor mu? (kök benzerliği; geri çeviride kelimenin geçmesi)
  const trTok = (s) => low(s).replace(/[^a-zçğıöşüâîû\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !['bir', 've', 'ile', 'için', 'olan', 'veya'].includes(w));
  function judgeTr(term, meaning, mt, back) {
    const a = trTok(meaning), b = trTok(mt);
    const stem = (w) => w.slice(0, Math.max(4, Math.min(6, w.length - 2)));
    const trHit = b.some((w) => a.some((x) => stem(x) === stem(w) || (x.length >= 4 && w.startsWith(x)) || (w.length >= 4 && x.startsWith(w))));
    const tt = new Set(enTokens(term));
    const enHit = enTokens(back).some((w) => tt.has(w));
    const latinHit = enTokens(meaning).some((w) => tt.has(w) && w.length >= 4);
    return { ok: trHit || enHit || latinHit, trHit, enHit };
  }

  const api = { detectColumns, buildItems, dedupeList, checkItems, judge, judgeTr, normAr, isAr, keyOf };
  if (typeof window !== 'undefined') window.VocabTools = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
