'use strict';
// Yazım denetimi çekirdeği (Web Worker içinde çalışır; gerekirse sayfada da).
// en: Hunspell (SCOWL en_US) + geniş kelime listesi; ar ve tr: sıklık sıralı kelime listeleri + yakın kelime önerisi.
// Sonuç türleri: 'bad' (sözlükte yok, öneri var), 'unk' (sözlükte yok, öneri yok), 'alt' (doğru ama daha yaygın yazımı var)
(function (G) {
  const S = {};
  const AR_DIAC = /[ً-ْٰـ]/g;
  const AR_PRE = ['وبال', 'وكال', 'فبال', 'وال', 'فال', 'بال', 'كال', 'ولل', 'فلل', 'لل', 'و', 'ف', 'ب', 'ك', 'ل'];
  const ABC = { tr: 'abcçdefgğhıijklmnoöprsştuüvyzâîû', ar: 'ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىي', en: 'abcdefghijklmnopqrstuvwxyz' };
  const trLow = (s) => s.toLocaleLowerCase('tr');

  function rankOf(text) {
    const rank = new Map();
    text.split('\n').forEach((w, i) => { w = w.trim(); if (w && !rank.has(w)) rank.set(w, i); });
    return rank;
  }
  function load(lang, data) {
    if (S[lang]) return;
    if (lang === 'en') S.en = { sp: G.NSpell(data.aff, data.dic), rank: rankOf(data.words || '') };
    else S[lang] = { rank: rankOf(data.words) };
  }

  function edits1(w, abc) {
    const out = new Set();
    for (let i = 0; i <= w.length; i++) {
      const a = w.slice(0, i), b = w.slice(i);
      if (b) out.add(a + b.slice(1));
      if (b.length > 1) out.add(a + b[1] + b[0] + b.slice(2));
      for (const c of abc) { if (b) out.add(a + c + b.slice(1)); out.add(a + c + b); }
    }
    out.delete(w);
    return out;
  }
  // listeden yakın kelimeler (önce tek harf farkı, yoksa iki harf), sıklığa göre
  function near(lang, w, known) {
    const abc = ABC[lang];
    const pick = (set) => [...set].filter(known).sort((x, y) => score(lang, x) - score(lang, y));
    const e1 = edits1(w, abc);
    let r = pick(e1);
    if (!r.length && w.length >= 5) {
      const e2 = new Set();
      for (const x of e1) for (const y of edits1(x, abc)) if (y !== w && known(y)) e2.add(y);
      r = pick(e2);
    }
    return r.slice(0, 4);
  }
  const score = (lang, w) => { const r = S[lang].rank.get(w); return r == null ? 1e9 : r; };

  /* ---- Arapça ---- */
  const arNorm = (w) => w.replace(AR_DIAC, '').replace(/ی/g, 'ي').replace(/ک/g, 'ك');
  function arForms(w) {
    const c = [w];
    for (const p of AR_PRE) {
      if (w.startsWith(p) && w.length - p.length >= 2) {
        const r = w.slice(p.length);
        c.push(r);
        if (/ل$/.test(p) && !r.startsWith('ال')) c.push('ال' + r); // لل / بال = ل/ب + ال
      }
    }
    return c;
  }
  const arKnown = (w) => arForms(w).some((x) => S.ar.rank.has(x));
  const arBest = (w) => Math.min(...arForms(w).map((x) => score('ar', x)));
  // sık karışan yazımlar: ه/ة, ي/ى, elif-hemze, harf tekrarı
  function arVariants(w) {
    const v = new Set();
    if (/ه$/.test(w)) v.add(w.slice(0, -1) + 'ة');
    if (/ة$/.test(w)) v.add(w.slice(0, -1) + 'ه');
    if (/ي$/.test(w)) v.add(w.slice(0, -1) + 'ى');
    if (/ى$/.test(w)) v.add(w.slice(0, -1) + 'ي');
    for (const [a, bs] of [['ا', 'أإآ'], ['أ', 'اإ'], ['إ', 'اأ']]) {
      for (const pre of ['', 'ال', 'و', 'وال', 'بال', 'لل', 'ب', 'ل']) {
        if (w.startsWith(pre + a)) for (const b of bs) v.add(pre + b + w.slice(pre.length + 1));
      }
    }
    const ww = w.replace(/(.)\1\1+/g, '$1$1').replace(/اءء/g, 'اء');
    if (ww !== w) v.add(ww);
    v.delete(w);
    return [...v];
  }
  function arCheck(raw) {
    const w = arNorm(raw);
    if (w.length < 2) return null;
    const persian = /[یک]/.test(raw);
    if (arKnown(w)) {
      if (persian) return { kind: 'alt', sugs: [w] };
      // doğru ama çok daha yaygın bir yazımı var (ör. اضافة → إضافة)
      const mine = arBest(w);
      const better = arVariants(w).filter((x) => arKnown(x) && arBest(x) * 8 < mine).sort((a, b) => arBest(a) - arBest(b));
      return better.length ? { kind: 'alt', sugs: better.slice(0, 3) } : null;
    }
    const v = arVariants(w).filter(arKnown);
    const sugs = v.length ? v.sort((a, b) => arBest(a) - arBest(b)) : near('ar', w, arKnown);
    return sugs.length ? { kind: 'bad', sugs: sugs.slice(0, 4) } : { kind: 'unk', sugs: [] };
  }

  /* ---- Türkçe ---- */
  function trCheck(w) {
    if (w.length < 2 || S.tr.rank.has(w)) return null;
    const sugs = near('tr', w, (x) => S.tr.rank.has(x));
    return sugs.length ? { kind: 'bad', sugs } : { kind: 'unk', sugs: [] };
  }

  /* ---- İngilizce ---- */
  function enCheck(w) {
    const sp = S.en.sp, rank = S.en.rank;
    const lw = w.toLowerCase();
    if (/^[A-Z0-9]{2,6}s?$/.test(w)) return null; // kısaltma (ESC, RPM…)
    if (rank.has(lw) || sp.correct(w) || sp.correct(lw) || sp.correct(w[0].toUpperCase() + w.slice(1).toLowerCase())) return null;
    let sugs = sp.suggest(w).slice(0, 4);
    if (!sugs.length) sugs = near('en', lw, (x) => rank.has(x) || sp.correct(x));
    return sugs.length ? { kind: 'bad', sugs } : { kind: 'unk', sugs: [] };
  }

  // döner: [{ w, kind, sugs }] — yalnızca sorunlu kelimeler
  function check(lang, text, ignore) {
    if (!S[lang]) return [];
    const ig = new Set(ignore || []);
    const out = [];
    const seen = new Set();
    const add = (w, r) => { if (r) out.push({ w, kind: r.kind, sugs: r.sugs }); };
    text = String(text || '');
    if (lang === 'en') {
      for (const raw of text.match(/[A-Za-z]+/g) || []) {
        if (raw.length < 2 || seen.has(raw) || ig.has(raw.toLowerCase())) continue;
        seen.add(raw); add(raw, enCheck(raw));
      }
    } else if (lang === 'ar') {
      for (const raw of text.match(/[ء-يٰـکیً-ْ]+/g) || []) {
        if (seen.has(raw) || ig.has(arNorm(raw))) continue;
        seen.add(raw); add(raw, arCheck(raw));
      }
    } else if (lang === 'tr') {
      for (const w of trLow(text).match(/[a-zçğıöşüâîû]+/g) || []) {
        if (seen.has(w) || ig.has(w)) continue;
        seen.add(w); add(w, trCheck(w));
      }
    }
    return out;
  }

  // kelimenin sıklık sırası (küçük = yaygın; sözlükte yoksa 1e9)
  const rankWord = (lang, w) => (lang === 'ar' ? arBest(arNorm(w)) : score(lang, w));
  G.SpellCore = { load, check, rank: rankWord, loaded: (l) => !!S[l] };
})(typeof self !== 'undefined' ? self : window);
