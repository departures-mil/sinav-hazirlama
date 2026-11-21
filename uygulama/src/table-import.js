'use strict';
// Word / Excel / CSV dosyalarındaki tabloları satır-sütun dizisi olarak okur (kelime listesi aktarımı için).
// .docx ve .xlsx doğrudan okunur; .doc / .xls / .odt / .ods önce Word-Excel (Windows) ya da LibreOffice ile dönüştürülür.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const JSZip = require('jszip');
const { docxToText, decodeText } = require('./docx-import');

const xmlText = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, '&');
const clean = (s) => s.replace(/[ ​‎‏‪-‮﻿]/g, ' ').replace(/\s+/g, ' ').trim();

/* ---------------- DOCX ---------------- */
// Paragraf metni: w:t, sekme ve satır sonları
function paraText(xml) {
  let out = '';
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\b[^>]*\/>|<w:cr\/>/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[1] != null) out += xmlText(m[1]);
    else out += ' ';
  }
  return out;
}

// Üst düzey öğeleri (iç içe aynı etiketleri atlayarak) bulur
function topLevel(xml, tag) {
  const res = [];
  const open = new RegExp(`<w:${tag}(?:\\s[^>]*)?>|</w:${tag}>`, 'g');
  let depth = 0, start = -1, m;
  while ((m = open.exec(xml))) {
    if (m[0][1] !== '/') { if (depth === 0) start = m.index; depth++; }
    else { depth--; if (depth === 0 && start >= 0) { res.push(xml.slice(start, m.index + m[0].length)); start = -1; } }
  }
  return res;
}

function docxTables(docXml) {
  const tables = [];
  topLevel(docXml, 'tbl').forEach((tbl) => {
    const inner = tbl.replace(/^<w:tbl[^>]*>/, '').replace(/<\/w:tbl>$/, '');
    const rows = topLevel(inner, 'tr').map((tr) => topLevel(tr.replace(/^<w:tr[^>]*>/, '').replace(/<\/w:tr>$/, ''), 'tc').map((tc) => {
      const ps = (tc.match(/<w:p\b[\s\S]*?<\/w:p>/g) || []).map(paraText).map(clean).filter(Boolean);
      return ps.join(' ');
    }));
    if (rows.length) tables.push(rows.filter((r) => r.some(Boolean)));
  });
  return tables;
}

// Tablo yoksa: her satırı sekme / ";" / " - " / " = " / ":" ile iki parçaya böl
function splitLine(l) {
  for (const sep of [/\t+/, /\s*;\s*/, /\s+[-–—=]\s+/, /\s*[:：]\s+/, /\s*,\s*/]) {
    const p = l.split(sep).map(clean).filter(Boolean);
    if (p.length >= 2) return p;
  }
  return [clean(l)];
}
function textRows(text) {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    // CSV tırnaklı alanlar
    if (/^".*"[,;\t]/.test(l)) {
      const cells = [];
      l.replace(/("([^"]|"")*"|[^,;\t]*)([,;\t]|$)/g, (m, f) => { if (m) cells.push(clean(f.replace(/^"|"$/g, '').replace(/""/g, '"'))); return ''; });
      return cells.filter((c, i) => c || i < cells.length - 1);
    }
    return splitLine(l);
  });
}

async function readDocx(buf) {
  const zip = await JSZip.loadAsync(buf);
  const doc = await zip.file('word/document.xml').async('string');
  const tables = docxTables(doc);
  const sheets = tables.filter((t) => t.length && Math.max(...t.map((r) => r.length)) >= 2)
    .map((rows, i) => ({ name: `Tablo ${i + 1}`, rows }));
  if (sheets.length > 1) {
    // aynı sütun sayılı tablolar tek liste olarak da sunulur (sayfalara bölünmüş uzun tablolar)
    const all = [];
    sheets.forEach((s) => all.push(...s.rows));
    sheets.unshift({ name: 'Tüm tablolar', rows: all });
  }
  if (sheets.length) return sheets;
  return [{ name: 'Metin', rows: textRows(await docxToText(buf)) }];
}

/* ---------------- XLSX ---------------- */
const colIndex = (ref) => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
function siText(si) {
  // zengin metin parçaları; fonetik (rPh) hariç
  const s = si.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
  return (s.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g) || []).map((t) => xmlText(t.replace(/^<t[^>]*>|<\/t>$/g, ''))).join('');
}
async function readXlsx(buf) {
  const zip = await JSZip.loadAsync(buf);
  const get = async (p) => (zip.file(p) ? zip.file(p).async('string') : '');
  const shared = ((await get('xl/sharedStrings.xml')).match(/<si>[\s\S]*?<\/si>|<si\/>/g) || []).map(siText);
  const wb = await get('xl/workbook.xml');
  const rels = await get('xl/_rels/workbook.xml.rels');
  const relMap = {};
  (rels.match(/<Relationship\b[^>]*>/g) || []).forEach((r) => {
    const id = (r.match(/Id="([^"]+)"/) || [])[1];
    const tg = (r.match(/Target="([^"]+)"/) || [])[1];
    if (id && tg) relMap[id] = tg.replace(/^\/?xl\//, '').replace(/^\//, '');
  });
  const sheets = [];
  for (const s of wb.match(/<sheet\b[^>]*>/g) || []) {
    const name = xmlText((s.match(/name="([^"]*)"/) || [, 'Sayfa'])[1]);
    const rid = (s.match(/r:id="([^"]+)"/) || [])[1];
    const target = relMap[rid];
    if (!target) continue;
    const xml = await get('xl/' + target);
    const rows = [];
    (xml.match(/<row\b[\s\S]*?<\/row>|<row\b[^>]*\/>/g) || []).forEach((row) => {
      const cells = [];
      (row.match(/<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g) || []).forEach((c, k) => {
        const ref = (c.match(/\br="([A-Z]+)\d+"/) || [])[1];
        const idx = ref ? colIndex(ref) : k;
        const type = (c.match(/\bt="([^"]+)"/) || [])[1];
        let v = '';
        if (type === 'inlineStr') v = siText((c.match(/<is>([\s\S]*?)<\/is>/) || ['', ''])[1]);
        else {
          const raw = (c.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
          if (raw != null) v = type === 's' ? (shared[+raw] || '') : xmlText(raw);
        }
        cells[idx] = clean(v);
      });
      for (let i = 0; i < cells.length; i++) if (cells[i] == null) cells[i] = '';
      if (cells.some(Boolean)) rows.push(cells);
    });
    if (rows.length) sheets.push({ name, rows });
  }
  return sheets;
}

/* ---------------- eski biçimler: dönüştürme ---------------- */
function run(cmd, args, timeout = 120000) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, windowsHide: true }, (err, stdout, stderr) => { if (err) { err.stderr = stderr; reject(err); } else resolve(stdout); });
  });
}
async function convertOffice(inPath, toExt, findSoffice) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sinav-tbl-'));
  const outPath = path.join(outDir, 'girdi.' + toExt);
  const errors = [];
  if (process.platform === 'win32') {
    const q = (s) => s.replace(/'/g, "''");
    const ps = toExt === 'xlsx'
      ? `$ErrorActionPreference='Stop'; $x = New-Object -ComObject Excel.Application; $x.Visible = $false; $x.DisplayAlerts = $false; try { $w = $x.Workbooks.Open('${q(inPath)}', 0, $true); $w.SaveAs('${q(outPath)}', 51); $w.Close($false) } finally { $x.Quit() }`
      : `$ErrorActionPreference='Stop'; $w = New-Object -ComObject Word.Application; $w.Visible = $false; $w.DisplayAlerts = 0; try { $d = $w.Documents.Open('${q(inPath)}', $false, $true); $d.SaveAs2('${q(outPath)}', 16); $d.Close($false) } finally { $w.Quit() }`;
    try { await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', ps]); } catch (e) { errors.push(e.message); }
    if (fs.existsSync(outPath)) return outPath;
  }
  const soffice = findSoffice && findSoffice();
  if (soffice) {
    const profile = path.join(os.tmpdir(), 'sinav-lo-profile');
    try {
      await run(soffice, [`-env:UserInstallation=${require('url').pathToFileURL(profile).href}`, '--headless', '--convert-to', toExt, '--outdir', outDir, inPath]);
      const produced = path.join(outDir, path.basename(inPath, path.extname(inPath)) + '.' + toExt);
      if (fs.existsSync(produced)) return produced;
    } catch (e) { errors.push(e.message); }
  }
  const err = new Error('OLD_FORMAT');
  err.detail = errors.join(' | ');
  throw err;
}

async function readTable(p, { findSoffice } = {}) {
  const ext = path.extname(p).toLowerCase();
  if (ext === '.docx') return readDocx(fs.readFileSync(p));
  if (ext === '.xlsx' || ext === '.xlsm') return readXlsx(fs.readFileSync(p));
  if (ext === '.xls' || ext === '.ods') return readXlsx(fs.readFileSync(await convertOffice(p, 'xlsx', findSoffice)));
  if (ext === '.doc' || ext === '.odt' || ext === '.rtf') return readDocx(fs.readFileSync(await convertOffice(p, 'docx', findSoffice)));
  return [{ name: 'Metin', rows: textRows(decodeText(fs.readFileSync(p))) }];
}

module.exports = { readTable, readDocx, readXlsx, textRows };
