'use strict';
// Senaryo sınavı metinlerini (TXT/DOCX) senaryo → soru → beklenen cevap yapısına çevirir.
// Aynı belgede Arapça ve Latin harfli (Türkçe/İngilizce) metinler birlikte olabilir; her dil ayrı ayrı ayrıştırılıp birleştirilir.
(function () {
  const HEAD_RE = /^\s*(?:senaryo|scenario|السيناريو|سيناريو)\s*[:#-]?\s*(\d{1,3}|[٠-٩]{1,3})\b\s*[-–—:.)]*\s*(.*)$/i;
  const VOCAB_RE = /(kelime\s*test|kelime\s*listesi|vocabulary|word\s*(?:test|list)|مفردات|اختبار\s*الكلمات)/i;
  const LANG_WORDS = /^(ingilizce|arapça|türkçe|english|arabic|turkish|الإنجليزية|الانجليزية|العربية|التركية|ingilizce kelime|kelime|word|term|anlam|meaning|المعنى|الكلمة)$/i;

  const digits = (s) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  function isArabic(line) {
    const ar = (line.match(/[؀-ۿ]/g) || []).length;
    const lat = (line.match(/[A-Za-zÇĞİÖŞÜçğıöşü]/g) || []).length;
    return ar >= 3 || (ar > 0 && ar >= lat * 0.6);
  }
  const isQuestion = (l) => /[?؟]\s*$/.test(l);
  const clean = (l) => l.replace(/^[•●▪■◦·\-–*]\s+/, '').replace(/\s+/g, ' ').trim();

  // Bir dildeki satırları durum metni + soru/cevap çiftlerine böler
  function parseStream(lines) {
    let situation = [];
    const qs = [];
    let cur = null;
    for (const l of lines) {
      if (isQuestion(l)) {
        if (cur && !cur.answer.length) { cur.text += '\n' + l; continue; } // ardışık sorular tek soru
        if (!cur && !situation.length && /[.!]\s+\S/.test(l)) {
          // "Durum cümlesi. Soru?" tek paragrafta ise ayır
          const idx = Math.max(l.lastIndexOf('. '), l.lastIndexOf('! '));
          if (idx > 0) { situation.push(l.slice(0, idx + 1).trim()); cur = { text: l.slice(idx + 2).trim(), answer: [] }; qs.push(cur); continue; }
        }
        cur = { text: l, answer: [] };
        qs.push(cur);
      } else if (cur) cur.answer.push(l);
      else situation.push(l);
    }
    if (!qs.length && situation.length > 1) {
      // soru işareti yoksa: son satırdan önceki kısmı durum, sonu cevap say
      return { situation: situation.slice(0, 1).join('\n'), questions: [{ text: '', answer: situation.slice(1).join('\n') }] };
    }
    return { situation: situation.join('\n'), questions: qs.map((q) => ({ text: q.text, answer: q.answer.join('\n') })) };
  }

  function parseVocab(lines, latinLang) {
    const items = [];
    let term = '';
    for (const l of lines) {
      if (LANG_WORDS.test(l.toLocaleLowerCase('tr')) || LANG_WORDS.test(l) || /(puan|point|درجة|علامة)/i.test(l)) continue;
      if (isArabic(l)) {
        if (term) { items.push({ term, meaning: { ar: l } }); term = ''; } else if (items.length) items[items.length - 1].meaning.ar += ' ' + l;
      } else {
        term = term ? term + ' ' + l : l;
      }
    }
    if (term) items.push({ term, meaning: {} });
    return items;
  }

  function parseScenarios(text, latinLang) {
    latinLang = latinLang || 'tr';
    const raw = String(text || '').replace(/\r\n?/g, '\n').split('\n').map((l) => digits(l.replace(/ /g, ' ')).trim());
    const lines = raw.map(clean).filter((l) => l && !/^[﷽\s]+$/.test(l));
    const blocks = new Map(); // no -> { title:{}, lines:[] }
    const order = [];
    const preamble = [];
    let cur = null;
    let vocab = null;
    for (const l of lines) {
      const h = l.match(HEAD_RE);
      if (h && !vocab) {
        const n = +digits(h[1]);
        if (!blocks.has(n)) { blocks.set(n, { title: {}, lines: [] }); order.push(n); }
        cur = blocks.get(n);
        const lang = isArabic(l) ? 'ar' : latinLang;
        if (h[2]) cur.title[lang] = h[2].trim();
        continue;
      }
      if (VOCAB_RE.test(l) && l.length < 80) {
        vocab = { title: { [isArabic(l) ? 'ar' : latinLang]: l }, lines: [] };
        cur = null;
        continue;
      }
      if (vocab) vocab.lines.push(l);
      else if (cur) cur.lines.push(l);
      else preamble.push(l);
    }

    // her senaryoda tekrarlanan satırlar = ortak not
    const freq = new Map();
    order.forEach((n) => new Set(blocks.get(n).lines).forEach((l) => freq.set(l, (freq.get(l) || 0) + 1)));
    const common = new Set([...freq].filter(([, c]) => order.length >= 3 && c >= Math.max(3, order.length * 0.5)).map(([l]) => l));
    const note = {};
    [...common].forEach((l) => { const lang = isArabic(l) ? 'ar' : latinLang; note[lang] = note[lang] ? note[lang] + '\n' + l : l; });

    const scenarios = order.map((n) => {
      const b = blocks.get(n);
      const byLang = { ar: [], lat: [] };
      b.lines.filter((l) => !common.has(l)).forEach((l) => byLang[isArabic(l) ? 'ar' : 'lat'].push(l));
      const s = { title: {}, text: {}, questions: [] };
      Object.assign(s.title, b.title);
      const put = (lang, parsed) => {
        if (!parsed) return;
        if (parsed.situation) s.text[lang] = parsed.situation;
        parsed.questions.forEach((q, i) => {
          if (!s.questions[i]) s.questions[i] = { text: {}, answer: {} };
          if (q.text) s.questions[i].text[lang] = q.text;
          if (q.answer) s.questions[i].answer[lang] = q.answer;
        });
      };
      if (byLang.lat.length) put(latinLang, parseStream(byLang.lat));
      if (byLang.ar.length) put('ar', parseStream(byLang.ar));
      if (!s.questions.length) s.questions.push({ text: {}, answer: {} });
      return s;
    });

    const warnings = [];
    scenarios.forEach((s, i) => {
      if (s.questions.some((q) => !Object.values(q.answer).some(Boolean))) warnings.push({ key: 'warnScenNoAnswer', vars: { n: i + 1 } });
    });
    const all = preamble.concat(Object.values(note)).join('\n');
    const m1 = all.match(/[×x*]\s*(\d+(?:[.,]\d+)?)\s*(?:puan|points?|pts)/i) || all.match(/\((\d+)\s*(?:علامة|درجة)\s*على\s*كل\s*سؤال\)/) || all.match(/(\d+)\s*(?:puan|points?)\s*(?:each|per)/i);
    const m2 = all.match(/(?:kelime|word)[^\n]*?(\d+(?:[.,]\d+)?)\s*(?:puan|points?)/i);
    return {
      scenarios,
      note,
      points: m1 ? parseFloat(m1[1].replace(',', '.')) : null,
      vocabPoints: m2 ? parseFloat(m2[1].replace(',', '.')) : null,
      vocab: vocab ? { title: vocab.title, items: parseVocab(vocab.lines, latinLang) } : null,
      preamble,
      warnings,
    };
  }

  const hasScenarios = (text) => String(text || '').split('\n').filter((l) => HEAD_RE.test(l.trim())).length >= 1;

  if (typeof window !== 'undefined') { window.parseScenarios = parseScenarios; window.hasScenarios = hasScenarios; }
  if (typeof module !== 'undefined') module.exports = { parseScenarios, hasScenarios };
})();
