'use strict';
// Hazır soru metinlerini (TXT/DOCX'ten gelen) soru-şık-cevap yapısına çevirir.
(function () {
  const L_IDX = { a: 0, b: 1, c: 2, d: 3, e: 4, 'أ': 0, 'ا': 0, 'ب': 1, 'ج': 2, 'د': 3, 'ه': 4, 'هـ': 4 };
  const LET = '([A-Ea-e]|هـ|ه|أ|ا|ب|ج|د)';
  const qRe = /^\s*(?:soru|question|sual|سؤال|السؤال)?\s*(\d{1,3})\s*[.)\-:–](?!\d)\s*(.*)$/i;
  const qWordRe = /^\s*(?:soru|question|سؤال|السؤال)\s*(\d{1,3})\s*[.)\-:–]?\s*(.*)$/i;
  const optRe = new RegExp('^\\s*(\\*)?\\s*\\(?' + LET + '\\s*[).\\-:]\\s*(.*)$');
  const ansRe = new RegExp('^\\s*(?:doğru\\s*)?(?:cevap|cevabı|yanıt|answer|correct(?:\\s*answer)?|الإجابة(?:\\s*الصحيحة)?|الجواب)\\s*[:：\\-=]?\\s*\\(?' + LET + '\\)?\\s*[.)]?\\s*$', 'i');
  const keyHeadRe = /^\s*(?:cevap\s*anahtar[ıi]|cevaplar|answer\s*key|answers|مفتاح\s*الإجابة|الإجابات)\s*[:：]?\s*(.*)$/i;
  const keyPairRe = new RegExp('(\\d{1,3})\\s*[.\\-):=]?\\s*\\(?' + LET + '\\)?(?![A-Za-z\\u0621-\\u064A])', 'g');
  const markRe = /\s*(\*|\(doğru\)|\(dogru\)|\(correct\)|\(صحيح\)|✓|✔)\s*$/i;

  function idx(letter) { return L_IDX[(letter || '').toLowerCase()]; }

  function normalize(line) {
    return line
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
      .replace(/ /g, ' ')
      .replace(/[\t ]+/g, ' ')
      .replace(/\s+$/, '');
  }

  // "A) 12 B) 15 C) 18" gibi tek satırdaki şıkları ayırır
  function splitInlineOptions(firstLetterIdx, rest) {
    const out = [];
    let cur = { idx: firstLetterIdx, text: rest };
    for (;;) {
      const next = cur.idx + 1;
      if (next > 4) break;
      const letters = [['A', 'a'], ['B', 'b'], ['C', 'c'], ['D', 'd'], ['E', 'e']][next];
      const ar = [['أ', 'ا'], ['ب'], ['ج'], ['د'], ['هـ', 'ه']][next];
      const alts = letters.concat(ar).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const re = new RegExp('\\s(\\*)?\\(?(' + alts + ')\\s*[).]\\s');
      const m = cur.text.match(re);
      if (!m) break;
      out.push({ idx: cur.idx, text: cur.text.slice(0, m.index) });
      cur = { idx: next, text: cur.text.slice(m.index + m[0].length), star: !!m[1] };
      out[out.length - 1].nextStar = !!m[1];
    }
    out.push({ idx: cur.idx, text: cur.text });
    return out;
  }

  function parseQuestions(text) {
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n').map(normalize);
    const qs = [];
    const keyMap = {};
    let cur = null;
    let lastOpt = -1;
    let keyMode = false;

    const pushOpt = (i, txt, star) => {
      if (!cur || i == null || i > 4) return;
      let t = (txt || '').trim();
      if (markRe.test(t)) { t = t.replace(markRe, '').trim(); star = true; }
      cur.options[i] = t;
      cur.optCount = Math.max(cur.optCount, i + 1);
      if (star) cur.correct = i;
      lastOpt = i;
    };
    const addOptsFromLine = (m) => {
      const first = idx(m[2]);
      if (first == null) return false;
      const parts = splitInlineOptions(first, m[3]);
      let star = !!m[1];
      parts.forEach((p) => { pushOpt(p.idx, p.text, star); star = !!p.nextStar; });
      return true;
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;

      const kh = line.match(keyHeadRe);
      if (kh && !/^\s*(cevap|answer|الإجابة)\s*[:：\-=]?\s*\(?([A-Ea-e]|هـ|ه|أ|ب|ج|د)\)?\s*$/i.test(line)) {
        keyMode = true;
        let p; keyPairRe.lastIndex = 0;
        while ((p = keyPairRe.exec(kh[1]))) keyMap[+p[1]] = idx(p[2]);
        continue;
      }
      if (keyMode) {
        let p, any = false; keyPairRe.lastIndex = 0;
        while ((p = keyPairRe.exec(line))) { keyMap[+p[1]] = idx(p[2]); any = true; }
        if (any) continue;
        keyMode = false;
      }

      const am = line.match(ansRe);
      if (am && cur) { const i = idx(am[1]); if (i != null) cur.correct = i; continue; }

      if (cur && cur.optCount > 0 || cur && lastOpt >= 0) {
        const om = line.match(optRe);
        if (om && idx(om[2]) != null) { addOptsFromLine(om); continue; }
      }

      const qm = line.match(qWordRe) || line.match(qRe);
      if (qm && (!cur || cur.optCount > 0 || +qm[1] === cur.num + 1 || +qm[1] <= cur.num)) {
        // şıksız ve numarası geride kalan önceki "soru" aslında başlıktı (örn. "9. Sınıf ...")
        if (cur && cur.optCount === 0 && +qm[1] <= cur.num) qs.pop();
        cur = { num: +qm[1], text: '', options: ['', '', '', '', ''], optCount: 0, correct: -1 };
        qs.push(cur);
        lastOpt = -1;
        let stem = qm[2] || '';
        // soru satırının içinde şıklar varsa ayır
        const inl = stem.match(new RegExp('\\s(\\*)?\\(?([Aa]|أ)\\s*\\)\\s'));
        if (inl) {
          const rest = stem.slice(inl.index + inl[0].length);
          stem = stem.slice(0, inl.index);
          cur.text = stem.trim();
          addOptsFromLine([null, inl[1], inl[2], rest]);
        } else cur.text = stem.trim();
        continue;
      }

      if (cur) {
        const om = line.match(optRe);
        if (om && idx(om[2]) != null && (lastOpt >= 0 || idx(om[2]) === 0)) { addOptsFromLine(om); continue; }
        if (lastOpt >= 0) cur.options[lastOpt] = (cur.options[lastOpt] + ' ' + line).trim();
        else cur.text = (cur.text ? cur.text + '\n' : '') + line;
      }
    }

    // cevap anahtarı bölümünden doğru cevapları uygula
    qs.forEach((q, i) => {
      const k = keyMap[q.num] != null ? keyMap[q.num] : keyMap[i + 1];
      if (k != null && q.correct < 0) q.correct = k;
    });

    const warnings = [];
    qs.forEach((q, i) => {
      if (q.correct < 0) warnings.push({ key: 'warnNoAnswer', vars: { n: i + 1 } });
      if (q.optCount < 4) warnings.push({ key: 'warnFewOptions', vars: { n: i + 1, k: q.optCount } });
    });
    return { questions: qs.map((q) => ({ text: q.text, options: q.options, correct: q.correct })), warnings };
  }

  function tidyText(text) {
    return String(text || '')
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((l) => l.replace(/ /g, ' ').replace(/[\t ]+/g, ' ').trim())
      .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
      .filter((l) => !/^[-–—]?\s*\d{1,3}\s*[-–—]?$/.test(l) || false)
      .map((l) => l.replace(/^([a-e])\s*([).])\s*/, (m, a, b) => a.toUpperCase() + b + ' ')
        .replace(/^(\d{1,3})\s*([.)])\s*/, '$1$2 '))
      .join('\n')
      .trim();
  }

  if (typeof window !== "undefined") { window.parseQuestions = parseQuestions; window.tidyText = tidyText; }
  if (typeof module !== 'undefined') module.exports = { parseQuestions, tidyText };
})();
