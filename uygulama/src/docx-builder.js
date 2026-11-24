'use strict';
// Sınavı Word (DOCX) olarak üretir. DOCX şablonu varsa onun üst/alt bilgi ve filigranını korur,
// PDF şablonu varsa şablon sayfasını her sayfanın arkasına resim olarak yerleştirir.
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { splitBody, sectInfo } = require('./template');

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

const esc = (s) => String(s == null ? '' : s)
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function makeHelpers(model) {
  const rtl = !!model.rtl;
  const font = model.font || 'Times New Roman';
  const baseSz = model.fontSize || 12;

  function run(text, o = {}) {
    let rPr = `<w:rFonts w:ascii="${esc(font)}" w:hAnsi="${esc(font)}" w:cs="${esc(font)}" w:eastAsia="${esc(font)}"/>`;
    if (o.b) rPr += '<w:b/><w:bCs/>';
    if (o.i) rPr += '<w:i/><w:iCs/>';
    if (o.color) rPr += `<w:color w:val="${o.color}"/>`;
    const sz = Math.round((o.sz || baseSz) * 2);
    rPr += `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`;
    if (o.u) rPr += '<w:u w:val="single"/>';
    if (o.shd) rPr += `<w:shd w:val="clear" w:color="auto" w:fill="${o.shd}"/>`;
    if (rtl && !o.ltr) rPr += '<w:rtl/>';
    const parts = String(text == null ? '' : text).split('\n');
    const content = parts.map((p, i) => {
      const segs = p.split('\t').map((s) => `<w:t xml:space="preserve">${esc(s)}</w:t>`).join('<w:tab/>');
      return (i ? '<w:br/>' : '') + segs;
    }).join('');
    return `<w:r><w:rPr>${rPr}</w:rPr>${content}</w:r>`;
  }

  function para(runs, o = {}) {
    let pPr = '';
    if (o.keepNext) pPr += '<w:keepNext/>';
    if (o.keepLines) pPr += '<w:keepLines/>';
    if (o.pageBreakBefore) pPr += '<w:pageBreakBefore/>';
    if (o.box) pPr += `<w:pBdr>${['top', 'left', 'bottom', 'right'].map((k) => `<w:${k} w:val="single" w:sz="6" w:space="4" w:color="${o.box}"/>`).join('')}</w:pBdr>`;
    if (o.bottomLine) pPr += `<w:pBdr><w:bottom w:val="single" w:sz="${o.bottomLine}" w:space="1" w:color="444444"/></w:pBdr>`;
    if (o.border) pPr += '<w:pBdr><w:top w:val="single" w:sz="6" w:space="4" w:color="444444"/><w:left w:val="single" w:sz="6" w:space="4" w:color="444444"/><w:bottom w:val="single" w:sz="6" w:space="4" w:color="444444"/><w:right w:val="single" w:sz="6" w:space="4" w:color="444444"/></w:pBdr>';
    if (o.shd) pPr += `<w:shd w:val="clear" w:color="auto" w:fill="${o.shd}"/>`;
    if (o.tabs) pPr += '<w:tabs>' + o.tabs.map((t) => `<w:tab w:val="${t.val || 'left'}"${t.leader ? ` w:leader="${t.leader}"` : ''} w:pos="${t.pos}"/>`).join('') + '</w:tabs>';
    if (rtl) pPr += '<w:bidi/>';
    pPr += `<w:spacing w:before="${o.before || 0}" w:after="${o.after == null ? 0 : o.after}" w:line="${o.line || 252}" w:lineRule="auto"/>`;
    if (o.ind) pPr += `<w:ind w:left="${rtl ? 0 : o.ind}" w:right="${rtl ? o.ind : 0}"/>`;
    if (o.jc) pPr += `<w:jc w:val="${o.jc}"/>`;
    if (o.sectPr) pPr += o.sectPr;
    return `<w:p><w:pPr>${pPr}</w:pPr>${Array.isArray(runs) ? runs.join('') : (runs || '')}</w:p>`;
  }
  return { run, para, rtl, baseSz };
}

const fmt = (n, lang) => String(Math.round((+n || 0) * 100) / 100).replace('.', lang === 'tr' ? ',' : '.');

/* ---- 1.10.1: soru / şık görselleri (satır içi resim) ---- */
// model._media: [{ name, buf, ext }] — belge yazılırken word/media altına konur, ilişkileri rIdQm<n>
function mediaRun(model, im, maxWcm, maxHcm) {
  if (!im || !im.data) return '';
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/.exec(im.data);
  if (!m) return '';
  model._media = model._media || [];
  const i = model._media.length + 1;
  const ext = m[1] === 'png' ? 'png' : 'jpeg';
  model._media.push({ name: `qimg${i}.${ext}`, buf: Buffer.from(m[2], 'base64'), ext, rid: 'rIdQm' + i });
  const EMU = 360000; // 1 cm
  let w = (im.w || 400) * 9525, h = (im.h || 300) * 9525; // 96 dpi varsayımı
  const sc = Math.min(1, (maxWcm * EMU) / w, (maxHcm * EMU) / h);
  w = Math.round(w * sc); h = Math.round(h * sc);
  const id = 500 + i;
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${w}" cy="${h}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="${id}" name="Resim ${i}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>' +
    `<pic:nvPicPr><pic:cNvPr id="${id}" name="qimg${i}.${ext}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="rIdQm${i}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
}
// zip'e görselleri ve ilişkilerini ekler
async function addMedia(zip, model) {
  const media = model._media || [];
  if (!media.length) return;
  media.forEach((m) => zip.file('word/media/' + m.name, m.buf));
  const relP = 'word/_rels/document.xml.rels';
  let rels = zip.file(relP) ? await zip.file(relP).async('string') : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  rels = rels.replace('</Relationships>', media.map((m) => `<Relationship Id="${m.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.name}"/>`).join('') + '</Relationships>');
  zip.file(relP, rels);
  let ct = await zip.file('[Content_Types].xml').async('string');
  if (!/Extension="png"/i.test(ct)) ct = ct.replace('<Types ', '<Types ').replace(/(<Types[^>]*>)/, '$1<Default Extension="png" ContentType="image/png"/>');
  if (!/Extension="jpeg"/i.test(ct)) ct = ct.replace(/(<Types[^>]*>)/, '$1<Default Extension="jpeg" ContentType="image/jpeg"/>');
  zip.file('[Content_Types].xml', ct);
}

/* ---- genel tablo ---- */
function table(model, widths, rows, o = {}) {
  const border = (n) => `<w:${n} w:val="single" w:sz="6" w:space="0" w:color="555555"/>`;
  const total = widths.reduce((a, b) => a + b, 0);
  let x = '<w:tbl><w:tblPr>' + (model.rtl ? '<w:bidiVisual/>' : '') +
    `<w:tblW w:w="${total}" w:type="dxa"/><w:jc w:val="center"/>` +
    `<w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(border).join('')}</w:tblBorders>` +
    '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="0000"/></w:tblPr><w:tblGrid>';
  widths.forEach((w) => { x += `<w:gridCol w:w="${w}"/>`; });
  x += '</w:tblGrid>';
  rows.forEach((r, ri) => {
    x += `<w:tr><w:trPr><w:cantSplit/>${ri === 0 && o.header ? '<w:tblHeader/>' : ''}${o.minH ? `<w:trHeight w:val="${o.minH}"/>` : ''}</w:trPr>`;
    let ci = 0;
    r.cells.forEach((c) => {
      const span = c.span || 1;
      const w = widths.slice(ci, ci + span).reduce((a, b) => a + b, 0);
      ci += span;
      x += `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}${c.shd || r.shd ? `<w:shd w:val="clear" w:color="auto" w:fill="${c.shd || r.shd}"/>` : ''}<w:vAlign w:val="center"/></w:tcPr>${c.p}</w:tc>`;
    });
    x += '</w:tr>';
  });
  return x + '</w:tbl>';
}

/* ---- sınav gövdesi ---- */
// Dönen bölümler: head (tek sütun), questions (test, ayarlı sütun), tail (senaryolar, kelime testi, anahtar; tek sütun)
function buildContent(model, layout) {
  const { run, para, baseSz } = makeHelpers(model);
  const h2 = model.lang2 ? makeHelpers({ ...model, rtl: model.rtl2 }) : null;
  const L = model.labels;
  const L2 = model.labels2 || {};
  const letters = model.letters;
  const out = { head: [], questions: [], tail: [], tailBreak: false };
  const variant = model.variant;
  const sec = model.sections || { test: true };
  const hasTest = sec.test && model.questions.length > 0;
  const hasScen = sec.scen && (model.scenarios || []).length > 0;
  const hasVocab = sec.vocab && !!model.vocab;
  const multi = [hasTest, hasScen, hasVocab].filter(Boolean).length > 1;
  const W = layout.fullWidth;
  const P = (n) => fmt(n, model.lang);
  // ikinci dilde paragraf
  const para2 = (text, o = {}) => (h2 && text ? h2.para(h2.run(text, o.r || {}), o.p || {}) : '');
  const partTitle = (text, brk) => para(run(text, { b: true, sz: baseSz + 1 }), { jc: 'center', bottomLine: 8, before: 120, after: 160, pageBreakBefore: brk, keepNext: true });

  // Şablonun üst bilgisi ilk sayfada daha uzunsa: ilk sayfaya boşluk
  const fx = Math.round(((model.margins && model.margins.firstExtra) || 0) * 567);
  if (fx > 0) out.head.push(`<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${fx}" w:lineRule="exact"/></w:pPr></w:p>`);
  // Başlık
  if (model.school) out.head.push(para(run(model.school, { b: true, sz: baseSz + 1 }), { jc: 'center', after: 40 }));
  if (model.title) out.head.push(para(run(model.title, { b: true, sz: baseSz + 3 }), { jc: 'center', after: 80 }));
  if (variant === 'teacher') out.head.push(para(run(L.teacherCopy, { b: true, color: 'B00000', sz: baseSz - 1 }), { jc: 'center', after: 80 }));
  if (variant !== 'key') {
    if (model.showInfo) {
      const tabs = [{ pos: Math.round(W * 0.45) }, { pos: Math.round(W * 0.68) }, { pos: Math.round(W * 0.85) }];
      const txt = `${L.name}: ................................\t${L.number}: ...........\t${L.class}: ........\t${L.score}: ........`;
      out.head.push(para(run(txt, { sz: baseSz - 1 }), { border: true, tabs, after: 120, before: 60 }));
    }
    if (model.instructions) out.head.push(para(run(model.instructions, { i: true, sz: baseSz - 1 }), { after: 160 }));
  }

  // Test soruları
  if (variant !== 'key' && hasTest) {
    if (multi) out.head.push(partTitle(L.testPart, false));
    const colW = layout.colWidth;
    const imgW = Math.max(3, (colW / 567) * 0.75);
    if (model.biTest && h2) {
      // iki dil yan yana: her soru iki hücreli bir satır (ikinci dilin hücresi kendi yönünde)
      const W2 = Math.floor(layout.fullWidth / 2);
      const cellOf = (H, lg, stem, opts, letters) => {
        let x = H.para([H.run(q0.n + '. ', { b: true }), H.run(stem || '')], { keepNext: true, keepLines: true, before: 80, after: 40 });
        opts.slice(0, model.optionCount).forEach((o, i) => {
          const mk = variant === 'teacher' && model.markCorrect && q0.correct === i;
          const runs = [H.run(letters[i] + ') ', { b: true, shd: mk ? 'C6EFCE' : null }), H.run(o || '', { b: mk, shd: mk ? 'C6EFCE' : null })];
          if (q0.oimg && q0.oimg[i]) runs.push('<w:r><w:br/></w:r>' + mediaRun(model, q0.oimg[i], 3.5, 2.5));
          if (mk) runs.push(H.run(' ✓', { b: true, color: '1E7B34' }));
          x += H.para(runs, { ind: 200, keepLines: true, after: 0 });
        });
        void lg;
        return x + H.para('', { after: 60 });
      };
      let q0 = null;
      const B = (n) => `<w:${n} w:val="nil"/>`;
      model.questions.forEach((q) => {
        q0 = q;
        const c1 = cellOf(makeHelpers(model), model.lang, q.stem, q.options, letters);
        const c2 = cellOf(h2, model.lang2, q.stem2, q.options2 || [], model.letters2 || letters);
        let x = '<w:tbl><w:tblPr>' + (model.rtl ? '<w:bidiVisual/>' : '') + `<w:tblW w:w="${W2 * 2}" w:type="dxa"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH'].map(B).join('')}<w:insideV w:val="single" w:sz="4" w:space="0" w:color="999999"/></w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="90" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="0000"/></w:tblPr><w:tblGrid><w:gridCol w:w="${W2}"/><w:gridCol w:w="${W2}"/></w:tblGrid>`;
        x += `<w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="${W2}" w:type="dxa"/></w:tcPr>${c1}</w:tc><w:tc><w:tcPr><w:tcW w:w="${W2}" w:type="dxa"/></w:tcPr>${c2}</w:tc></w:tr></w:tbl>`;
        out.questions.push(x);
        if (q.img) out.questions.push(para(mediaRun(model, q.img, Math.min(12, (layout.fullWidth / 567) * 0.6), 6.5), { jc: 'center', after: 80 }));
        else out.questions.push(para('', { after: 40 }));
      });
    } else model.questions.forEach((q) => {
      out.questions.push(para([run(q.n + '. ', { b: true }), run(q.stem)], { keepNext: true, keepLines: true, before: 120, after: 40 }));
      if (q.img) out.questions.push(para(mediaRun(model, q.img, imgW, 6.5), { jc: 'center', keepNext: true, after: 40 }));
      const opts = q.options.slice(0, model.optionCount);
      const mark = (i) => variant === 'teacher' && model.markCorrect && q.correct === i;
      const maxLen = Math.max(...opts.map((o) => (o || '').length));
      const hasOImg = !!(q.oimg && q.oimg.some(Boolean));
      const inline = model.inlineShort && !hasOImg && !opts.some((o) => /\n/.test(o || '')) &&
        maxLen * (model.fontSize || 12) * 0.55 * 20 < colW / opts.length - 400;
      if (inline) {
        const step = Math.floor(colW / opts.length);
        const tabs = opts.slice(1).map((_, i) => ({ pos: step * (i + 1) }));
        const runs = [];
        opts.forEach((o, i) => {
          if (i) runs.push('<w:r><w:tab/></w:r>');
          runs.push(run(letters[i] + ') ', { b: true, shd: mark(i) ? 'C6EFCE' : null }));
          runs.push(run(o || '', { b: mark(i), shd: mark(i) ? 'C6EFCE' : null }));
          if (mark(i)) runs.push(run(' ✓', { b: true, color: '1E7B34' }));
        });
        out.questions.push(para(runs, { ind: 200, tabs, keepLines: true, after: 60 }));
      } else {
        opts.forEach((o, i) => {
          const last = i === opts.length - 1;
          const runs = [run(letters[i] + ') ', { b: true, shd: mark(i) ? 'C6EFCE' : null }), run(o || '', { b: mark(i), shd: mark(i) ? 'C6EFCE' : null })];
          if (hasOImg && q.oimg[i]) runs.push('<w:r><w:br/></w:r>' + mediaRun(model, q.oimg[i], Math.min(5, imgW), 3));
          if (mark(i)) runs.push(run(' ✓', { b: true, color: '1E7B34' }));
          out.questions.push(para(runs, { ind: 280, keepNext: !last, keepLines: true, after: last ? 60 : 0 }));
        });
      }
    });
  }

  const T = out.tail;
  // Senaryolar
  if (variant !== 'key' && hasScen) {
    out.tailBreak = hasTest;
    if (multi) T.push(partTitle(L.scenPart, false));
    const lineTabs = [{ pos: W - 20, val: model.rtl ? 'left' : 'right', leader: 'dot' }];
    model.scenarios.forEach((sc, i) => {
      const brk = !!model.scenNewPage && i > 0;
      const ttl = `${L.scenario} ${sc.n}${sc.title ? ' — ' + sc.title : ''}`;
      T.push(para([run(ttl, { b: true, sz: baseSz + 1 }), run(`   (${P(sc.points)} ${L.points})`, { b: true, color: '1E4E9C', sz: baseSz - 1 })], { keepNext: true, bottomLine: 6, before: brk ? 0 : 200, after: 100, pageBreakBefore: brk }));
      if (model.lang2 && (sc.title2 || sc.text2)) T.push(para2(`${L2.scenario} ${sc.n}${sc.title2 ? ' — ' + sc.title2 : ''}`, { r: { b: true }, p: { keepNext: true, after: 60 } }));
      if (sc.text) T.push(para(run(sc.text), { after: 100, keepNext: true }));
      if (sc.text2) T.push(para2(sc.text2, { p: { after: 100, keepNext: true } }));
      sc.questions.forEach((q) => {
        const qr = [run(`${sc.n}.${q.n} `, { b: true })];
        if (q.text) qr.push(run(q.text, { b: true }));
        qr.push(run(`  (${P(q.points)} ${L.points})`, { sz: baseSz - 2, color: '555555' }));
        T.push(para(qr, { keepNext: true, keepLines: true, before: 80, after: 40 }));
        if (q.text2) T.push(para2(q.text2, { r: { b: true }, p: { keepNext: true, after: 40 } }));
        if (variant === 'student') {
          for (let k = 0; k < q.lines; k++) T.push(para('<w:r><w:tab/></w:r>', { tabs: lineTabs, line: 360, before: 60, keepNext: k < q.lines - 1 }));
        } else {
          T.push(para(run('✓ ' + L.answer, { b: true, color: '1E7B34', sz: baseSz - 1 }), { box: '1E7B34', shd: 'E9F7EC', keepNext: true, before: 40 }));
          T.push(para(q.answer ? run(q.answer) : run(L.noAnswer, { i: true, color: 'AA0000' }), { box: '1E7B34', shd: 'E9F7EC', after: q.answer2 ? 0 : 100, keepNext: !!q.answer2 }));
          if (q.answer2) T.push(para2(q.answer2, { p: { box: '1E7B34', shd: 'E9F7EC', after: 100 } }));
        }
      });
      if (model.scenNote) T.push(para(run(model.scenNote, { i: true, sz: baseSz - 1 }), { before: 80, after: 40 }));
      if (model.scenNote2) T.push(para2(model.scenNote2, { r: { i: true, sz: baseSz - 1 }, p: { after: 40 } }));
    });
  }
  // Kelime testi
  const vocabBlock = () => {
    const vo = model.vocab;
    const show = variant !== 'student';
    T.push(para([run(vo.title || L.vocab, { b: true, sz: baseSz + 1 }), run(`   (${P(vo.total)} ${L.points})`, { b: true, color: '1E4E9C', sz: baseSz - 1 })], { jc: 'center', before: 240, after: 120, keepNext: true }));
    const cols = vo.cols && vo.cols.length ? vo.cols : [{ key: 'meaning', label: L.meaning }];
    // # sütunu %8; kalan genişlik kelime ve anlam sütunlarına eşit bölünür
    const wn = Math.round(W * 0.08), wc = Math.floor((W - wn) / (cols.length + 1));
    const widths = [wn, W - wn - wc * cols.length, ...cols.map(() => wc)];
    const rows = [{ shd: 'EEEEEE', cells: [para(run('#', { b: true }), { jc: 'center' }), para(run(L.term, { b: true })), ...cols.map((c) => para(run(c.label, { b: true })))].map((p) => ({ p })) }];
    vo.items.forEach((it) => {
      const latin = !/[؀-ۿ]/.test(it.term);
      const termP = (latin && model.rtl) ? makeHelpers({ ...model, rtl: false }).para(makeHelpers({ ...model, rtl: false }).run(it.term)) : para(run(it.term));
      const cells = cols.map((c) => {
        const val = it[c.key] || '';
        const mh = makeHelpers({ ...model, rtl: /[؀-ۿ]/.test(val) });
        return { p: show ? mh.para(mh.run(val, { b: true, color: '1E7B34' })) : para('') };
      });
      rows.push({ cells: [{ p: para(run(String(it.n), { b: true }), { jc: 'center' }) }, { p: termP }, ...cells] });
    });
    T.push(table(model, widths, rows, { header: true, minH: Math.round((model.fontSize || 12) * 20 * 1.6) }));
  };
  if (variant !== 'key' && hasVocab) vocabBlock();

  // Cevap anahtarı
  const wantKey = variant === 'key' || (variant === 'teacher' && model.keyAtEnd);
  if (wantKey) {
    const K = [];
    if (hasTest) {
      if (multi) K.push(para(run(L.testKey, { b: true }), { bottomLine: 6, before: 200, after: 100, keepNext: true }));
      K.push(keyTable(model, W, run, para));
    }
    if (variant === 'key' && hasScen) {
      K.push(para(run(L.scenPart, { b: true }), { bottomLine: 6, before: 240, after: 100, keepNext: true }));
      model.scenarios.forEach((sc) => {
        K.push(para([run(`${L.scenario} ${sc.n}${sc.title ? ' — ' + sc.title : ''}`, { b: true }), run(`   (${P(sc.points)} ${L.points})`, { color: '1E4E9C', sz: baseSz - 1 })], { keepNext: true, before: 120, after: 40 }));
        sc.questions.forEach((q) => {
          K.push(para([run(`${sc.n}.${q.n} `, { b: true }), run(q.text || ''), run(`  (${P(q.points)} ${L.points})`, { sz: baseSz - 2, color: '555555' })], { keepNext: true, ind: 200, after: 20 }));
          K.push(para(q.answer ? run(q.answer) : run(L.noAnswer, { i: true, color: 'AA0000' }), { box: '1E7B34', shd: 'E9F7EC', ind: 200, after: q.answer2 ? 0 : 80 }));
          if (q.answer2) K.push(para2(q.answer2, { p: { box: '1E7B34', shd: 'E9F7EC', ind: 200, after: 80 } }));
        });
      });
    }
    // anahtar içinde kelime testi, sonra puan tablosu
    const keyStart = K.length;
    if (variant === 'key' && hasVocab) { const save = T.length; vocabBlock(); K.push(...T.splice(save)); }
    void keyStart;
    if (multi || hasScen) {
      const rows = [{ shd: 'EEEEEE', cells: [L.section, L.count, L.score].map((x, i) => ({ p: para(run(x, { b: true }), { jc: i ? 'center' : undefined }) })) }];
      if (hasTest) rows.push({ cells: [{ p: para(run(L.testKey)) }, { p: para(run(String(model.questions.length)), { jc: 'center' }) }, { p: para('') }] });
      if (hasScen) model.scenarios.forEach((sc) => rows.push({ cells: [{ p: para(run(`${L.scenario} ${sc.n}${sc.title ? ' — ' + sc.title : ''}`)) }, { p: para(run(String(sc.questions.length)), { jc: 'center' }) }, { p: para(run(P(sc.points), { b: true }), { jc: 'center' }) }] }));
      if (hasVocab) rows.push({ cells: [{ p: para(run(model.vocab.title || L.vocab)) }, { p: para(run(String(model.vocab.items.length)), { jc: 'center' }) }, { p: para(run(P(model.vocab.total), { b: true }), { jc: 'center' }) }] });
      if (model.totals && model.totals.all != null) rows.push({ shd: 'E3ECFA', cells: [{ span: 2, p: para(run(L.total, { b: true })) }, { p: para(run(P(model.totals.all), { b: true }), { jc: 'center' }) }] });
      K.push(para('', { after: 160 }));
      K.push(table(model, [Math.round(W * 0.64), Math.round(W * 0.16), W - Math.round(W * 0.64) - Math.round(W * 0.16)], rows, {}));
    }
    if (K.length) {
      const brk = variant !== 'key' && (T.length > 0 || hasTest);
      const kt = para(run(L.answerKey + (model.title && variant !== 'key' ? ' — ' + model.title : ''), { b: true, sz: baseSz + 2 }), { jc: 'center', after: 160, pageBreakBefore: brk && T.length > 0 });
      if (!T.length && hasTest && variant !== 'key') out.tailBreak = true;
      T.push(kt, ...K);
    }
  }
  return out;
}

function keyTable(model, width, run, para) {
  const perRow = 5;
  const qs = model.questions;
  const rows = Math.ceil(qs.length / perRow) || 1;
  const cw = Math.floor(width / perRow);
  const border = (n) => `<w:${n} w:val="single" w:sz="6" w:space="0" w:color="555555"/>`;
  let x = '<w:tbl><w:tblPr>' + (model.rtl ? '<w:bidiVisual/>' : '') +
    `<w:tblW w:w="${cw * perRow}" w:type="dxa"/><w:jc w:val="center"/>` +
    `<w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(border).join('')}</w:tblBorders>` +
    '<w:tblLayout w:type="fixed"/><w:tblLook w:val="0000"/></w:tblPr><w:tblGrid>';
  for (let i = 0; i < perRow; i++) x += `<w:gridCol w:w="${cw}"/>`;
  x += '</w:tblGrid>';
  for (let r = 0; r < rows; r++) {
    x += '<w:tr><w:trPr><w:cantSplit/></w:trPr>';
    for (let c = 0; c < perRow; c++) {
      const q = qs[r * perRow + c];
      const cell = q
        ? para([run(q.n + '. ', { b: true }), run(q.correct >= 0 ? model.letters[q.correct] : '—', { b: true, color: q.correct >= 0 ? '1E4E9C' : '999999' })], { jc: 'center', before: 40, after: 40 })
        : para('', {});
      x += `<w:tc><w:tcPr><w:tcW w:w="${cw}" w:type="dxa"/></w:tcPr>${cell}</w:tc>`;
    }
    x += '</w:tr>';
  }
  return x + '</w:tbl>';
}

/* ---- sectPr düzenleme ---- */
function modSect(base, { cols, type, titlePg, rtl }) {
  let s = base.replace(/<w:type\b[^>]*\/>/g, '')
    .replace(/<w:cols\b[^>]*\/>/g, '').replace(/<w:cols\b[^>]*>[\s\S]*?<\/w:cols>/g, '')
    .replace(/<w:sectPrChange\b[\s\S]*?<\/w:sectPrChange>/g, '');
  if (titlePg === false) s = s.replace(/<w:titlePg\b[^>]*\/>/g, '');
  if (rtl === false) s = s.replace(/<w:bidi\b[^>]*\/>/g, '');
  else if (rtl === true && !/<w:bidi\b/.test(s)) s = s.replace(/(<w:docGrid\b|<\/w:sectPr>)/, '<w:bidi/>$1');
  const insertBefore = (str, tags, ins) => {
    let idx = -1;
    for (const t of tags) { const i = str.indexOf('<w:' + t); if (i >= 0 && (idx < 0 || i < idx)) idx = i; }
    if (idx < 0) idx = str.lastIndexOf('</w:sectPr>');
    return str.slice(0, idx) + ins + str.slice(idx);
  };
  if (/^<w:sectPr\b[^>]*\/>$/.test(s.trim())) s = s.trim().replace(/\/>$/, '></w:sectPr>');
  const later = ['formProt', 'vAlign', 'noEndnote', 'titlePg', 'textDirection', 'bidi', 'rtlGutter', 'docGrid', 'printerSettings'];
  s = insertBefore(s, later, `<w:cols w:num="${cols}" w:space="567"${cols > 1 ? ' w:sep="1"' : ''}/>`);
  if (type) s = insertBefore(s, ['pgSz', 'pgMar', 'paperSrc', 'pgBorders', 'lnNumType', 'pgNumType', 'cols', ...later], `<w:type w:val="${type}"/>`);
  return s;
}

function assembleBody(content, baseSect, model) {
  const para = () => '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>';
  const { para: fullPara } = makeHelpers(model);
  const cols = model.columns > 1 ? model.columns : 1;
  const parts = [];
  const hasQ = content.questions.length > 0;
  const hasTail = content.tail.length > 0;
  if (!hasQ) {
    // test yok: başlık + senaryolar / kelime / anahtar tek bölümde
    let body = content.head.join('') + content.tail.join('');
    if (/<\/w:tbl>$/.test(body) || !body) body += para('', {});
    return body + modSect(baseSect, { rtl: !!model.rtl, cols: 1 });
  }
  // başlık bölümü (tek sütun)
  parts.push(...content.head);
  parts.push(fullPara('', { sectPr: modSect(baseSect, { rtl: !!model.rtl, cols: 1 }) }));
  // test bölümü
  parts.push(...content.questions);
  if (hasTail) {
    parts.push(fullPara('', { sectPr: modSect(baseSect, { rtl: !!model.rtl, cols, type: 'continuous', titlePg: false }) }));
    parts.push(...content.tail);
    if (/<\/w:tbl>$/.test(parts[parts.length - 1])) parts.push(para('', {}));
    parts.push(modSect(baseSect, { rtl: !!model.rtl, cols: 1, type: content.tailBreak ? 'nextPage' : 'continuous', titlePg: false }));
  } else {
    parts.push(modSect(baseSect, { rtl: !!model.rtl, cols, type: 'continuous', titlePg: false }));
  }
  return parts.join('');
}

/* ---- sıfırdan DOCX ---- */
function freshSect(model, opts) {
  const tw = (cm) => Math.round(cm * 567);
  const m = model.margins;
  let refs = '';
  if (opts.headerDefault) refs += `<w:headerReference w:type="default" r:id="${opts.headerDefault}"/>`;
  if (opts.headerFirst) refs += `<w:headerReference w:type="first" r:id="${opts.headerFirst}"/>`;
  if (opts.footer) refs += `<w:footerReference w:type="default" r:id="${opts.footer}"/>`;
  if (opts.footer && opts.headerFirst) refs += `<w:footerReference w:type="first" r:id="${opts.footer}"/>`;
  return `<w:sectPr>${refs}<w:pgSz w:w="${opts.wTw}" w:h="${opts.hTw}"${opts.wTw > opts.hTw ? ' w:orient="landscape"' : ''}/>` +
    `<w:pgMar w:top="${tw(m.top)}" w:right="${tw(m.right)}" w:bottom="${tw(m.bottom)}" w:left="${tw(m.left)}" w:header="0" w:footer="${tw(Math.max(0.5, m.bottom / 2))}" w:gutter="0"/>` +
    `<w:cols w:space="567"/>${opts.headerFirst ? '<w:titlePg/>' : ''}${model.rtl ? '<w:bidi/>' : ''}<w:docGrid w:linePitch="360"/></w:sectPr>`;
}

function bgHeaderXml(rid, wEmu, hEmu, id) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${NS}><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="14" w:lineRule="exact"/></w:pPr><w:r><w:drawing>` +
    `<wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${id}" behindDoc="1" locked="1" layoutInCell="1" allowOverlap="1">` +
    '<wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH>' +
    '<wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV>' +
    `<wp:extent cx="${wEmu}" cy="${hEmu}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/>` +
    `<wp:docPr id="${id}" name="Arka plan ${id}"/><wp:cNvGraphicFramePr/>` +
    '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>' +
    `<pic:nvPicPr><pic:cNvPr id="${id}" name="bg${id}.png"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${wEmu}" cy="${hEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    '</pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p></w:hdr>';
}

function footerXml(model) {
  const { para, run } = makeHelpers(model);
  const fld = (instr) => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
  const p = para([run((model.labels.page || '') + ' ', { sz: 9 }), fld('PAGE'), run(' / ', { sz: 9 }), fld('NUMPAGES')], { jc: 'center' });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}>${p}</w:ftr>`;
}

async function buildFresh(model, meta, tplDir) {
  const zip = new JSZip();
  const ct = ['<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>', '<Default Extension="png" ContentType="image/png"/>',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>',
    '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>',
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'];
  const rels = ['<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>'];
  const so = { wTw: 11906, hTw: 16838 };

  if (meta && meta.images && meta.images.length) {
    so.wTw = Math.round(meta.widthPt * 20); so.hTw = Math.round(meta.heightPt * 20);
    const wEmu = Math.round(meta.widthPt * 12700), hEmu = Math.round(meta.heightPt * 12700);
    const imgs = meta.images.slice(0, 2);
    imgs.forEach((f, i) => {
      const n = i + 1;
      zip.file(`word/media/bg${n}.png`, fs.readFileSync(path.join(tplDir, f)));
      zip.file(`word/header${n}.xml`, bgHeaderXml('rIdImg', wEmu, hEmu, n));
      zip.file(`word/_rels/header${n}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/bg${n}.png"/></Relationships>`);
      ct.push(`<Override PartName="/word/header${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>`);
      rels.push(`<Relationship Id="rIdH${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header${n}.xml"/>`);
    });
    if (imgs.length > 1) { so.headerFirst = 'rIdH1'; so.headerDefault = 'rIdH2'; } else so.headerDefault = 'rIdH1';
  }
  if (model.pageNumbers) {
    zip.file('word/footer1.xml', footerXml(model));
    ct.push('<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>');
    rels.push('<Relationship Id="rIdF1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>');
    so.footer = 'rIdF1';
  }
  const baseSect = freshSect(model, so);
  const fullWidth = so.wTw - Math.round((model.margins.left + model.margins.right) * 567);
  const content = buildContent(model, layoutFor(model, fullWidth));
  const body = assembleBody(content, baseSect, model);

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${ct.join('')}</Types>`);
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>');
  zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(model.title)}</dc:title><dc:creator>Sınav Hazırlama Sistemi</dc:creator></cp:coreProperties>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`);
  const font = esc(model.font || 'Times New Roman');
  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}" w:eastAsia="${font}"/><w:sz w:val="${(model.fontSize || 12) * 2}"/><w:szCs w:val="${(model.fontSize || 12) * 2}"/><w:lang w:val="${model.lang === 'en' ? 'en-US' : 'tr-TR'}" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`);
  zip.file('word/settings.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="708"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>');
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}</w:body></w:document>`);
  await addMedia(zip, model);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function layoutFor(model, fullWidth) {
  const cols = model.columns > 1 ? model.columns : 1;
  return { fullWidth, colWidth: Math.floor((fullWidth - (cols - 1) * 567) / cols) - 300 };
}

/* ---- DOCX şablonunu kullanarak ---- */
// Şablon tek sütunlu olduğu için "sütun" ile "kenar boşluğu" aynı yerdir. Sınav iki sütunlu olunca sütun daralır ve
// sütuna göre konumlanan antet parçaları (ör. sağ üstteki yazı kutusu) sayfa dışına kayardı; bunu önler.
async function fixHeaderAnchors(zip) {
  const names = Object.keys(zip.files).filter((n) => /^word\/(header|footer)\d*\.xml$/.test(n));
  for (const n of names) {
    let x = await zip.file(n).async('string');
    const y = x.replace(/(<wp:positionH\b[^>]*relativeFrom=")(column|character)(")/g, '$1margin$3')
      .replace(/mso-position-horizontal-relative:\s*(text|char)/g, 'mso-position-horizontal-relative:margin');
    if (y !== x) zip.file(n, y);
  }
}

async function buildFromTemplate(model, meta, tplDir) {
  const src = fs.readFileSync(path.join(tplDir, 'source.docx'));
  const zip = await JSZip.loadAsync(src);
  await fixHeaderAnchors(zip);
  const docXml = await zip.file('word/document.xml').async('string');
  const parts = splitBody(docXml);
  let sect = parts.sect || '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>';
  let info = sectInfo(sect);
  // şablonun üst/alt bilgisinden ölçülen sınırlar Word kenar boşluklarından büyükse boşlukları büyüt
  if (meta.auto) {
    const a = meta.auto;
    const top = Math.max(info.mar.top, Math.round(a.other.top * 567));
    const bottom = Math.max(info.mar.bottom, Math.round(Math.max(a.first.bottom, a.other.bottom) * 567));
    sect = sect.replace(/<w:pgMar\b[^>]*\/>/, (tag) => tag.replace(/w:top="-?\d+"/, `w:top="${top}"`).replace(/w:bottom="-?\d+"/, `w:bottom="${bottom}"`));
    model = { ...model, margins: { ...(model.margins || {}), firstExtra: Math.max(0, (a.first.top * 567 - top) / 567) } };
    info = sectInfo(sect);
  } else model = { ...model, margins: { ...(model.margins || {}), firstExtra: 0 } };
  const fullWidth = info.wTw - info.mar.left - info.mar.right;
  const content = buildContent(model, layoutFor(model, fullWidth));
  const prefix = meta.includeBody ? parts.body : '';
  let body = prefix + assembleBody(content, sect, model);
  let head = parts.head;
  // kök öğede gerekli ad alanları yoksa ekle
  if (!/xmlns:r=/.test(head)) head = head.replace('<w:document ', '<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
  // 1.10.1: görseller için çizim ad alanları
  if (!/xmlns:wp=/.test(head)) head = head.replace('<w:document ', '<w:document xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ');
  if (!/xmlns:a=/.test(head)) head = head.replace('<w:document ', '<w:document xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ');
  if (!/xmlns:pic=/.test(head)) head = head.replace('<w:document ', '<w:document xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" ');
  zip.file('word/document.xml', head + body + parts.tail);
  await addMedia(zip, model);
  // Şablondaki belge özelliklerinde başlık
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

async function buildDocx(model, { meta, tplDir }) {
  if (model.biTest) model = { ...model, columns: 1 };
  model._media = [];
  const hasImgs = !!(meta && meta.images && meta.images.length && meta.images.every((f) => fs.existsSync(path.join(tplDir, f))));
  // PDF çıktısıyla aynı: antet, şablonun sayfa resmi olarak her sayfanın arkasına konur; kenar boşlukları PDF'tekiyle aynıdır
  if (hasImgs && !(meta.docxMode === 'word')) return buildFresh(model, meta, tplDir);
  if (meta && meta.type === 'docx' && fs.existsSync(path.join(tplDir, 'source.docx'))) {
    return buildFromTemplate(model, meta, tplDir);
  }
  return buildFresh(model, meta, tplDir);
}

module.exports = { buildDocx };
