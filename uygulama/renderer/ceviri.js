'use strict';
// 1.9.4 — Çeviri motoru (çevrimiçi + çevrimdışı), havacılık terimlerine sadık.
// Sıra:  1) çeviri belleği (daha önce çevrilenler, cihazda saklanır)
//        2) sözlük tam eşleşme (havacılık + genel; en/tr/ar her yön)
//        3) çevrimiçi: yapay zeka (anahtar varsa ve açıksa) → Google → MyMemory
//        4) çevrimdışı: sözlükle öbek/kelime çevirisi (en iyi çaba)
// Her çevrimiçi sonuç belleğe yazılır; internet yokken aynı metin yeniden çevrilebilir.
(function () {
  const LS = 'tr.mem';
  const MAX = 8000;
  let mem = null;
  const load = () => { if (mem) return mem; try { mem = JSON.parse(localStorage.getItem(LS) || '{}'); } catch { mem = {}; } if (!mem.o) mem.o = []; return mem; };
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(mem)); } catch { /* dolu */ } };
  const key = (text, from, to) => from + '>' + to + '|' + text.trim().toLowerCase();
  const remember = (text, from, to, out) => {
    const m = load(); const k = key(text, from, to);
    if (!m[k]) { m.o.push(k); if (m.o.length > MAX) { const old = m.o.splice(0, m.o.length - MAX); old.forEach((x) => { delete m[x]; }); } }
    m[k] = out; save();
  };
  const recall = (text, from, to) => load()[key(text, from, to)] || '';

  /* ---- sözlük dizinleri ---- */
  const LI = { en: 0, tr: 1, ar: 2 };
  const norm = (s) => String(s || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
  const main = (s) => String(s).split('/')[0].replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  let idx = null; // { 'en>tr': Map(norm(en) -> tr) ... }
  function index() {
    if (idx) return idx;
    idx = {};
    const S = window.SOZLUK; if (!S) return idx;
    const rows = S.AV.map((r) => ({ r, av: true })).concat(S.GEN.map((r) => ({ r, av: false })));
    for (const a of ['en', 'tr', 'ar']) for (const b of ['en', 'tr', 'ar']) {
      if (a === b) continue;
      const m = new Map();
      rows.forEach(({ r }) => {
        const srcs = [r[LI[a]], ...String(r[LI[a]]).split('/')].map((x) => norm(main(x))).filter(Boolean);
        const dst = main(r[LI[b]]);
        srcs.forEach((s) => { if (!m.has(s)) m.set(s, dst); });
      });
      idx[a + '>' + b] = m;
    }
    return idx;
  }
  const exact = (text, from, to) => (index()[from + '>' + to] || new Map()).get(norm(text)) || '';
  // havacılık terimleri: metinde geçen (en uzun önce)
  const avTerms = (text) => {
    const S = window.SOZLUK; if (!S) return [];
    const low = ' ' + norm(text) + ' ';
    return S.AV.filter((r) => low.includes(' ' + norm(r[0]) + ' ') || low.includes(' ' + norm(r[0]) + 's ')).sort((a, b) => b[0].length - a[0].length);
  };
  // çevrimdışı öbek çevirisi: uzun terimler önce, sonra kelime kelime (bilinmeyen olduğu gibi kalır)
  // işlev sözcükleri (sözlükte olmayan kısa sözcükler): en → tr / ar
  const FUNC = {
    tr: { the: '', a: 'bir', an: 'bir', and: 've', or: 'veya', of: '', to: '', is: '', are: '', was: '', were: '', be: 'olmak', it: 'o', this: 'bu', that: 'şu', these: 'bunlar', those: 'şunlar', not: 'değil', no: 'hayır', yes: 'evet', with: 'ile', without: '-sız', from: '-den', by: 'ile', as: 'olarak', if: 'eğer', then: 'sonra', when: '-ken', while: '-ken', which: 'hangi', what: 'ne', why: 'neden', how: 'nasıl', where: 'nerede', who: 'kim', must: '-meli', should: '-meli', can: '-ebilir', may: '-ebilir', will: '-ecek', do: '', does: '', did: '', have: 'sahip', has: 'sahip', your: 'sizin', my: 'benim', our: 'bizim', their: 'onların', its: 'onun', his: 'onun', her: 'onun', you: 'siz', we: 'biz', they: 'onlar', he: 'o', she: 'o', i: 'ben', at: '-de', for: 'için', per: 'başına', than: '-den', so: 'bu yüzden', but: 'ama', also: 'ayrıca', too: 'de', very: 'çok', more: 'daha fazla', most: 'en', all: 'tüm', each: 'her', every: 'her', any: 'herhangi', some: 'bazı', many: 'birçok', much: 'çok', one: 'bir', two: 'iki', three: 'üç', four: 'dört', five: 'beş', first: 'ilk', last: 'son', new: 'yeni', old: 'eski', only: 'yalnızca', always: 'her zaman', never: 'asla', again: 'tekrar', here: 'burada', there: 'orada', now: 'şimdi', up: 'yukarı', down: 'aşağı', off: 'kapalı', on: 'açık', in: '-de', into: '-e', onto: 'üzerine', over: 'üzerinde', under: 'altında', between: 'arasında' },
    ar: { the: '', a: '', an: '', and: 'و', or: 'أو', of: '', to: 'إلى', is: '', are: '', was: 'كان', were: 'كانوا', be: 'يكون', it: 'هو', this: 'هذا', that: 'ذلك', these: 'هذه', those: 'تلك', not: 'ليس', no: 'لا', yes: 'نعم', with: 'مع', without: 'بدون', from: 'من', by: 'بواسطة', as: 'كـ', if: 'إذا', then: 'ثم', when: 'عندما', while: 'بينما', which: 'أي', what: 'ما', why: 'لماذا', how: 'كيف', where: 'أين', who: 'من', must: 'يجب', should: 'ينبغي', can: 'يمكن', may: 'قد', will: 'سوف', do: '', does: '', did: '', have: 'لديه', has: 'لديه', your: 'الخاص بك', my: 'الخاص بي', our: 'الخاص بنا', their: 'الخاص بهم', its: 'الخاص به', his: 'الخاص به', her: 'الخاص بها', you: 'أنت', we: 'نحن', they: 'هم', he: 'هو', she: 'هي', i: 'أنا', at: 'في', for: 'لـ', per: 'لكل', than: 'من', so: 'لذلك', but: 'لكن', also: 'أيضاً', too: 'أيضاً', very: 'جداً', more: 'أكثر', most: 'الأكثر', all: 'كل', each: 'كل', every: 'كل', any: 'أي', some: 'بعض', many: 'كثير', much: 'كثير', one: 'واحد', two: 'اثنان', three: 'ثلاثة', four: 'أربعة', five: 'خمسة', first: 'الأول', last: 'الأخير', new: 'جديد', old: 'قديم', only: 'فقط', always: 'دائماً', never: 'أبداً', again: 'مرة أخرى', here: 'هنا', there: 'هناك', now: 'الآن', up: 'أعلى', down: 'أسفل', off: 'مغلق', on: 'على', in: 'في', into: 'إلى', onto: 'على', over: 'فوق', under: 'تحت', between: 'بين' },
  };
  function phrase(text, from, to) {
    const m = index()[from + '>' + to]; if (!m) return '';
    const F = from === 'en' ? (FUNC[to] || {}) : {};
    const keys = [...m.keys()].filter((k) => k.includes(' ')).sort((a, b) => b.length - a.length);
    let s = ' ' + norm(text).replace(/[.,;:!?()"]/g, (c) => ' ' + c + ' ') + ' ';
    let hits = 0;
    for (const k of keys.slice(0, 2000)) { if (s.includes(' ' + k + ' ')) { s = s.split(' ' + k + ' ').join(' \u0001' + m.get(k).replace(/ /g, '\u0002') + '\u0001 '); hits++; } }
    const words = s.trim().split(/\s+/).map((w) => {
      if (w.startsWith('\u0001')) return w.replace(/\u0001/g, '').replace(/\u0002/g, ' ');
      if (/^[.,;:!?()"]$/.test(w)) return w;
      if (Object.prototype.hasOwnProperty.call(F, w)) { hits++; return F[w]; }
      const base = m.get(w) || (from === 'en' ? (m.get(w.replace(/s$/, '')) || m.get(w.replace(/ies$/, 'y')) || m.get(w.replace(/ed$/, '')) || m.get(w.replace(/ing$/, ''))) : '');
      if (base) { hits++; return base; }
      return w;
    }).filter((w) => w !== '');
    const total = words.length;
    if (!hits || hits < Math.ceil(total * 0.7)) return '';
    let out = words.join(' ').replace(/ ([.,;:!?])/g, '$1').replace(/\( /g, '(').replace(/ \)/g, ')');
    if (/^[A-ZÇĞİÖŞÜ]/.test(text.trim())) out = out.charAt(0).toLocaleUpperCase(to === 'tr' ? 'tr' : 'en') + out.slice(1);
    return out;
  }

  const online = () => navigator.onLine !== false;
  let onlineFail = 0; // arka arkaya çevrimiçi hata: kısa süre çevrimdışı say
  const engines = () => {
    const ai = window.AI && window.AI.useForTranslate();
    return ai ? ['ai', 'google'] : ['google'];
  };
  // Google çevirisinde havacılık terimlerinin doğru karşılığını zorla (EN kaynak): yanlış/birebir karşılık yerine sözlükteki
  function enforceGlossary(src, from, to, out) {
    if (from !== 'en' || !out) return out;
    const terms = avTerms(src).slice(0, 12);
    if (!terms.length) return out;
    let res = out;
    const notes = [];
    terms.forEach((r) => {
      const want = main(r[LI[to]]);
      if (!want || norm(res).includes(norm(want))) return;
      // terimin olası birebir çevirisi bilinmiyor; ilk geçişte terimi İngilizce parantezle ekle (okur doğru terimi görür)
      notes.push(`${want} (${r[0]})`);
    });
    // yalnız kısa metinlerde (soru şıkları gibi) ek yapılır; uzun metne not eklenmez
    if (notes.length && src.length <= 60 && notes.length === 1 && !/\(/.test(res)) res = res + ' (' + notes[0] + ')';
    return res;
  }

  async function translate(text, from, to) {
    const src = String(text || '');
    if (!src.trim() || from === to) return src;
    const r1 = recall(src, from, to); if (r1) return r1;
    const r2 = exact(src, from, to); if (r2) return r2;
    if (online() && onlineFail < 3) {
      for (const e of engines()) {
        try {
          let out = '';
          if (e === 'ai') out = await window.AI.translate(src, from, to);
          else out = await window.api.translate({ text: src, from, to });
          out = String(out || '').trim();
          if (out && norm(out) !== norm(src) || (out && src.length < 4)) {
            if (e !== 'ai') out = enforceGlossary(src, from, to, out);
            onlineFail = 0; remember(src, from, to, out); return out;
          }
        } catch (err) { if (e === 'google') onlineFail++; }
      }
      setTimeout(() => { onlineFail = 0; }, 60000);
    }
    const r3 = phrase(src, from, to);
    if (r3) return r3;
    throw new Error('offline');
  }
  // tek kelime sözlük (kelime testi için): anlam + alternatifler
  function dict(word, from, to) {
    const S = window.SOZLUK; if (!S) return null;
    const w = norm(word);
    const row = S.AV.concat(S.GEN).find((r) => norm(r[LI[from]]).split('/').map((x) => norm(main(x))).includes(w) || norm(main(r[LI[from]])) === w);
    if (!row) return null;
    const alts = String(row[LI[to]]).split('/').map((x) => x.trim()).filter(Boolean);
    return { text: alts[0], alts: alts.slice(1), av: S.AV.includes(row) };
  }
  const stats = () => { const m = load(); return { memory: m.o.length, dictionary: (window.SOZLUK ? window.SOZLUK.AV.length + window.SOZLUK.GEN.length : 0), aviation: window.SOZLUK ? window.SOZLUK.AV.length : 0 }; };
  window.Ceviri = { translate, dict, exact, phrase, remember, stats, avTerms, enforceGlossary, reset: () => { idx = null; } };
})();
