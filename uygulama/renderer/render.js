'use strict';
// Çıktı modelinden yazdırılabilir HTML üretir (PDF ve önizleme için).
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function optionsHtml(q, model) {
    const opts = q.options.slice(0, model.optionCount);
    const mark = (i) => model.variant === 'teacher' && model.markCorrect && q.correct === i;
    const maxLen = Math.max(...opts.map((o) => (o || '').length));
    const limit = model.columns > 1 ? 9 : 20;
    const inline = model.inlineShort && maxLen <= limit && !opts.some((o) => /\n/.test(o || ''));
    const items = opts.map((o, i) => `<div class="opt${mark(i) ? ' ok' : ''}"><span class="l">${esc(model.letters[i])})</span><span class="t">${esc(o)}${mark(i) ? ' <b class="tick">✓</b>' : ''}</span></div>`).join('');
    return `<div class="opts${inline ? ' inline' : ''}" style="${inline ? `grid-template-columns:repeat(${opts.length},1fr)` : ''}">${items}</div>`;
  }

  function keyTable(model) {
    const per = 5;
    const qs = model.questions;
    let rows = '';
    for (let r = 0; r < Math.ceil(qs.length / per); r++) {
      rows += '<tr>';
      for (let c = 0; c < per; c++) {
        const q = qs[r * per + c];
        rows += q ? `<td><b>${q.n}.</b> <span class="ka${q.correct < 0 ? ' none' : ''}">${q.correct >= 0 ? esc(model.letters[q.correct]) : '—'}</span></td>` : '<td></td>';
      }
      rows += '</tr>';
    }
    return `<table class="kt">${rows}</table>`;
  }


  const fmt = (n, lang) => String(Math.round((+n || 0) * 100) / 100).replace('.', lang === 'tr' ? ',' : '.');
  const dirOf = (lang) => (lang === 'ar' ? 'rtl' : 'ltr');
  const bi = (model, a, b, cls) => {
    // birinci dil + (varsa) ikinci dil
    let h = a ? `<div class="${cls}" dir="${dirOf(model.lang)}">${a}</div>` : '';
    if (model.lang2 && b) h += `<div class="${cls} l2" dir="${dirOf(model.lang2)}" lang="${model.lang2}">${b}</div>`;
    return h;
  };

  function scenariosHtml(model) {
    const L = model.labels, L2 = model.labels2 || {};
    const v = model.variant;
    const parts = model.scenarios.map((sc, i) => {
      const brk = model.scenNewPage && i > 0 ? ' brk' : '';
      const ttl = (lab, title) => `${esc(lab)} ${sc.n}${title ? ' — ' + esc(title) : ''}`;
      const head = `<div class="sch"><div class="scht">${bi(model, ttl(L.scenario, sc.title), model.lang2 ? ttl(L2.scenario, sc.title2) : '', 'sct')}</div><span class="scp">${fmt(sc.points, model.lang)} ${esc(L.points)}</span></div>`;
      const text = bi(model, esc(sc.text), esc(sc.text2), 'stx');
      const qs = sc.questions.map((q) => {
        const qp = ` <span class="qp">(${fmt(q.points, model.lang)} ${esc(L.points)})</span>`;
        const qt = bi(model, `<b>${sc.n}.${q.n}</b> ` + esc(q.text) + qp, esc(q.text2), 'sqq');
        let ans = '';
        if (v === 'student') {
          ans = q.lines > 0 ? `<div class="lines">${'<i></i>'.repeat(q.lines)}</div>` : '';
        } else {
          const a1 = q.answer ? esc(q.answer) : `<span class="na">${esc(L.noAnswer)}</span>`;
          ans = `<div class="abox"><div class="alab">✓ ${esc(L.answer)}</div>${bi(model, a1, esc(q.answer2), 'atx')}</div>`;
        }
        return `<div class="sq"><div class="sqh">${qt}</div>${ans}</div>`;
      });
      const note = bi(model, esc(model.scenNote), esc(model.scenNote2), 'snote');
      // başlık, metin ve ilk soru birlikte kalır (başlık sayfa sonunda yalnız kalmasın)
      return `<div class="scen${brk}"><div class="scst">${head}${text}${qs[0] || ''}</div>${qs.slice(1).join('')}${note}</div>`;
    }).join('');
    return parts;
  }

  function vocabHtml(model) {
    const vo = model.vocab;
    const L = model.labels;
    const show = model.variant !== 'student';
    const cols = vo.cols && vo.cols.length ? vo.cols : [{ key: 'meaning', label: L.meaning }];
    const rows = vo.items.map((it) => `<tr><td class="n">${it.n}</td><td class="term" dir="auto">${esc(it.term)}</td>${cols.map((c) => `<td class="mean${show ? ' ok' : ''}" dir="auto">${show ? esc(it[c.key] || '') : ''}</td>`).join('')}</tr>`).join('');
    return `<div class="vocab${cols.length > 1 ? ' c3' : ''}"><h2>${esc(vo.title || L.vocab)} <span class="scp">${fmt(vo.total, model.lang)} ${esc(L.points)}</span></h2>
      <table><thead><tr><th>#</th><th>${esc(L.term)}</th>${cols.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function pointsTable(model) {
    const L = model.labels;
    const T = model.totals;
    const rows = [];
    if (model.sections.test && model.questions.length) rows.push([L.testKey, model.questions.length, T.test != null ? fmt(T.test, model.lang) : '']);
    if (model.sections.scen) model.scenarios.forEach((sc) => rows.push([`${L.scenario} ${sc.n}${sc.title ? ' — ' + sc.title : ''}`, sc.questions.length, fmt(sc.points, model.lang)]));
    if (model.sections.vocab && model.vocab) rows.push([model.vocab.title || L.vocab, model.vocab.items.length, fmt(model.vocab.total, model.lang)]);
    if (!rows.length) return '';
    return `<table class="pt"><thead><tr><th>${esc(L.section)}</th><th>${esc(L.count)}</th><th>${esc(L.score)}</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}
      ${T.all != null ? `<tr class="tot"><td colspan="2">${esc(L.total)}</td><td>${fmt(T.all, model.lang)}</td></tr>` : ''}</tbody></table>`;
  }

  function scenKeyHtml(model) {
    const L = model.labels;
    return model.scenarios.map((sc) => `<div class="sk"><div class="skh">${esc(L.scenario)} ${sc.n}${sc.title ? ' — ' + esc(sc.title) : ''} <span class="scp">${fmt(sc.points, model.lang)} ${esc(L.points)}</span></div>
      ${sc.questions.map((q) => `<div class="skq"><div class="skqt"><b>${sc.n}.${q.n}</b> ${esc(q.text)} <span class="qp">(${fmt(q.points, model.lang)} ${esc(L.points)})</span></div>
        <div class="abox">${bi(model, q.answer ? esc(q.answer) : `<span class="na">${esc(L.noAnswer)}</span>`, esc(q.answer2), 'atx')}</div></div>`).join('')}</div>`).join('');
  }

  function buildHtml(model) {
    const dir = model.rtl ? 'rtl' : 'ltr';
    const L = model.labels;
    const fs = model.fontSize || 12;
    const head = [];
    if (model.school) head.push(`<div class="school">${esc(model.school)}</div>`);
    if (model.title) head.push(`<div class="title">${esc(model.title)}</div>`);
    if (model.variant === 'teacher') head.push(`<div class="badge">${esc(L.teacherCopy)}</div>`);
    if (model.variant !== 'key') {
      if (model.showInfo) {
        head.push(`<div class="info"><span>${esc(L.name)}: <i></i></span><span>${esc(L.number)}: <i></i></span><span>${esc(L.class)}: <i></i></span><span>${esc(L.score)}: <i></i></span></div>`);
      }
      if (model.instructions) head.push(`<div class="instr">${esc(model.instructions)}</div>`);
    }
    const sec = model.sections;
    const multi = [sec.test && model.questions.length, sec.scen && model.scenarios.length, sec.vocab && model.vocab].filter(Boolean).length > 1;
    let body = '';
    if (model.variant !== 'key') {
      if (sec.test && model.questions.length) {
        if (multi) body += `<h2 class="part">${esc(L.testPart)}</h2>`;
        body += `<div class="qs">${model.questions.map((q) => `<div class="q"><div class="stem"><span class="num">${q.n}.</span> ${esc(q.stem)}</div>${optionsHtml(q, model)}</div>`).join('')}</div>`;
      }
      if (sec.scen && model.scenarios.length) {
        const brk = sec.test && model.questions.length ? ' brk' : '';
        if (multi) body += `<h2 class="part${brk}">${esc(L.scenPart)}</h2>`;
        body += `<div class="scens${!multi ? brk : ''}">${scenariosHtml(model)}</div>`;
      }
      if (sec.vocab && model.vocab) body += vocabHtml(model);
    }
    let key = '';
    const wantKey = model.variant === 'key' || (model.variant === 'teacher' && model.keyAtEnd);
    if (wantKey) {
      const sub = model.variant !== 'key' && model.title ? ` — ${esc(model.title)}` : '';
      const inner = [];
      if (sec.test && model.questions.length) inner.push((multi ? `<h3>${esc(L.testKey)}</h3>` : '') + keyTable(model));
      if (model.variant === 'key' && sec.scen && model.scenarios.length) inner.push(`<h3>${esc(L.scenPart)}</h3>` + scenKeyHtml(model));
      if (model.variant === 'key' && sec.vocab && model.vocab) inner.push(vocabHtml(model));
      if (multi || (sec.scen && model.scenarios.length)) inner.push(pointsTable(model));
      if (inner.length) key = `<div class="key${model.variant === 'key' ? '' : ' brk'}"><h2>${esc(model.labels.answerKey)}${sub}</h2>${inner.join('')}</div>`;
    }
    const cols = model.columns > 1 ? model.columns : 1;
    return `<!doctype html><html lang="${model.lang}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(model.title)}</title><style>
      html, body { margin: 0; padding: 0; background: transparent; }
      body { font-family: "${model.font}", "Times New Roman", "Traditional Arabic", serif; font-size: ${fs}pt; color: #111; line-height: 1.32; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .head { text-align: center; margin-bottom: 8pt; padding-top: ${(model.margins && model.margins.firstExtra) || 0}cm; }
      .school { font-weight: bold; font-size: 1.08em; }
      .title { font-weight: bold; font-size: 1.25em; margin-top: 2pt; }
      .badge { color: #b00000; font-weight: bold; font-size: .9em; margin-top: 3pt; letter-spacing: .05em; }
      .info { display: flex; gap: 10pt; border: 1px solid #444; border-radius: 3pt; padding: 5pt 8pt; margin-top: 8pt; text-align: start; font-size: .92em; background: rgba(255,255,255,.55); }
      .info span { white-space: nowrap; display: flex; flex: 1; }
      .info span:first-child { flex: 2.4; }
      .info i { flex: 1; border-bottom: 1px dotted #555; margin-inline-start: 4pt; }
      .instr { white-space: pre-wrap; font-style: italic; text-align: start; margin-top: 6pt; font-size: .92em; }
      .qs { column-count: ${cols}; column-gap: 9mm; ${cols > 1 ? 'column-rule: .6pt solid #888;' : ''} }
      .q { break-inside: avoid; page-break-inside: avoid; margin: 0 0 ${Math.round(fs * 0.8)}pt; }
      .stem { white-space: pre-wrap; margin-bottom: 3pt; }
      .num { font-weight: bold; }
      .opts { padding-inline-start: 12pt; }
      .opts.inline { display: grid; gap: 2pt 8pt; }
      .opt { display: flex; gap: 4pt; padding: 1pt 3pt; border-radius: 3pt; }
      .opt .l { font-weight: bold; min-width: 15pt; }
      .opt .t { white-space: pre-wrap; flex: 1; }
      .opt.ok { background: #c6efce; font-weight: bold; }
      .tick { color: #1e7b34; }

      .part { text-align: center; font-size: 1.1em; margin: 4pt 0 8pt; padding: 3pt; border-top: 1.2pt solid #333; border-bottom: 1.2pt solid #333; letter-spacing: .05em; }
      .brk { break-before: page; page-break-before: always; }
      .scen { margin: 0 0 14pt; }
      .sch { display: flex; align-items: flex-start; gap: 8pt; border-bottom: 1pt solid #555; padding-bottom: 2pt; margin-bottom: 5pt; break-after: avoid; }
      .scht { flex: 1; }
      .sct { font-weight: bold; font-size: 1.05em; }
      .scp { font-size: .85em; font-weight: bold; color: #1e4e9c; white-space: nowrap; border: .8pt solid #1e4e9c; border-radius: 8pt; padding: 0 6pt; }
      .stx { white-space: pre-wrap; margin-bottom: 6pt; }
      .l2 { border-top: .5pt dashed #999; padding-top: 3pt; }
      .sq { margin: 0 0 8pt; break-inside: avoid; }
      .sqh { break-after: avoid; }
      .scst { break-inside: avoid; page-break-inside: avoid; }
      .sqq { white-space: pre-wrap; font-weight: bold; }
      .qp { font-size: .82em; color: #555; white-space: nowrap; font-weight: normal; }
      .lines i { display: block; height: ${Math.round(fs * 1.9)}pt; border-bottom: .8pt dotted #555; }
      .abox { border: 1pt solid #1e7b34; background: #e9f7ec; border-radius: 3pt; padding: 4pt 7pt; margin-top: 3pt; }
      .alab { font-weight: bold; color: #1e7b34; font-size: .88em; }
      .atx { white-space: pre-wrap; }
      .na { color: #a00; font-style: italic; }
      .snote { white-space: pre-wrap; font-size: .88em; font-style: italic; color: #333; margin-top: 4pt; }
      .vocab { margin-top: 10pt; break-inside: auto; }
      .vocab h2 { font-size: 1.1em; text-align: center; margin: 0 0 8pt; }
      .vocab table, .pt { width: 100%; border-collapse: collapse; background: rgba(255,255,255,.6); }
      .vocab td, .vocab th, .pt td, .pt th { border: .8pt solid #555; padding: 3pt 6pt; text-align: start; }
      .vocab tr { break-inside: avoid; }
      .vocab td.n { width: 8%; text-align: center; font-weight: bold; }
      .vocab td.term { width: 40%; }
      .vocab.c3 td.term, .vocab.c3 td.mean { width: 30.6%; }
      .vocab td.mean { height: ${Math.round(fs * 1.5)}pt; }
      .vocab td.mean.ok { color: #1e7b34; font-weight: bold; }
      .pt { margin-top: 12pt; }
      .pt td:nth-child(n+2), .pt th:nth-child(n+2) { text-align: center; width: 15%; }
      .pt tr.tot td { font-weight: bold; background: #e3ecfa; }
      .key h3 { font-size: 1.02em; margin: 12pt 0 6pt; border-bottom: .8pt solid #555; }
      .sk { margin-bottom: 8pt; break-inside: avoid; }
      .skh { font-weight: bold; margin-bottom: 3pt; }
      .skq { margin: 0 0 5pt; padding-inline-start: 8pt; }
      .skqt { white-space: pre-wrap; }
      .key h2 { text-align: center; font-size: 1.2em; margin: 0 0 10pt; }
      .key.brk { break-before: page; page-break-before: always; }
      .key table.kt { width: 100%; border-collapse: collapse; background: rgba(255,255,255,.6); }
      .key table.kt td { border: 1px solid #555; padding: 4pt; text-align: center; width: 20%; }
      .ka { font-weight: bold; color: #1e4e9c; }
      .ka.none { color: #999; }
    </style></head><body><div class="head">${head.join('')}</div>${body}${key}</body></html>`;
  }

  window.buildHtml = buildHtml;
})();
