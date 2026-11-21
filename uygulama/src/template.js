'use strict';
// Arka plan şablonu: PDF veya DOCX dosyasından her sayfaya basılacak bg.pdf üretir.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const JSZip = require('jszip');
const { PDFDocument } = require('pdf-lib');

function getMeta(dir) {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    if (!fs.existsSync(path.join(dir, 'bg.pdf'))) return null;
    return m;
  } catch { return null; }
}

function remove(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function run(cmd, args, timeout = 180000) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, windowsHide: true }, (err, stdout, stderr) => {
      if (err) { err.stderr = stderr; reject(err); } else resolve(stdout);
    });
  });
}

/* ---- DOCX -> PDF yöntemleri ---- */
async function convertWithWord(inPath, outPath) {
  if (process.platform !== 'win32') throw new Error('Word yalnızca Windows');
  const q = (s) => s.replace(/'/g, "''");
  const ps = `$ErrorActionPreference='Stop'; $w = New-Object -ComObject Word.Application; $w.Visible = $false; $w.DisplayAlerts = 0; ` +
    `try { $d = $w.Documents.Open('${q(inPath)}', $false, $true); $d.ExportAsFixedFormat('${q(outPath)}', 17); $d.Close($false) } finally { $w.Quit() }`;
  await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', ps]);
  if (!fs.existsSync(outPath)) throw new Error('Word PDF üretmedi');
}

function findSoffice() {
  const cands = process.platform === 'win32'
    ? ['C:\\Program Files\\LibreOffice\\program\\soffice.exe', 'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe']
    : process.platform === 'darwin'
      ? ['/Applications/LibreOffice.app/Contents/MacOS/soffice']
      : ['/usr/bin/soffice', '/usr/local/bin/soffice', '/usr/bin/libreoffice', '/snap/bin/libreoffice'];
  return cands.find((c) => fs.existsSync(c)) || null;
}

async function convertWithSoffice(inPath, outPath) {
  const soffice = findSoffice();
  if (!soffice) throw new Error('LibreOffice yok');
  const outDir = path.dirname(outPath);
  const profile = path.join(os.tmpdir(), 'sinav-lo-profile');
  await run(soffice, [`-env:UserInstallation=${require('url').pathToFileURL(profile).href}`, '--headless', '--convert-to', 'pdf', '--outdir', outDir, inPath]);
  const produced = path.join(outDir, path.basename(inPath, path.extname(inPath)) + '.pdf');
  if (!fs.existsSync(produced)) throw new Error('LibreOffice PDF üretmedi');
  if (produced !== outPath) fs.renameSync(produced, outPath);
}

/* ---- DOCX şablonundan gövdeyi ayıkla, 2 sayfalık arka plan belgesi yap ---- */
function splitBody(docXml) {
  const bOpen = docXml.indexOf('<w:body>');
  const bClose = docXml.lastIndexOf('</w:body>');
  const inner = docXml.slice(bOpen + 8, bClose);
  // gövdenin son (üst seviye) sectPr'ı: öncesinde bir blok kapanışı olan son eşleşme
  let sIdx = -1;
  const re = /<w:sectPr[\s>/]/g;
  let m;
  while ((m = re.exec(inner))) {
    const before = inner.slice(0, m.index).trimEnd();
    if (before === '' || /<\/w:(p|tbl|sdt|customXml)>$/.test(before) || /<w:p\/>$/.test(before)) sIdx = m.index;
  }
  let sect = '', body = inner;
  if (sIdx >= 0) {
    sect = inner.slice(sIdx).trim();
    body = inner.slice(0, sIdx);
  }
  return { head: docXml.slice(0, bOpen + 8), body, sect, tail: docXml.slice(bClose) };
}

function sectInfo(sect) {
  const pgSz = (sect.match(/<w:pgSz\b[^>]*>/) || [''])[0];
  const pgMar = (sect.match(/<w:pgMar\b[^>]*>/) || [''])[0];
  const a = (tag, name, d) => { const m = tag.match(new RegExp(`w:${name}="(-?\\d+)"`)); return m ? parseInt(m[1], 10) : d; };
  let w = a(pgSz, 'w', 11906), h = a(pgSz, 'h', 16838);
  if (/w:orient="landscape"/.test(pgSz) && w < h) [w, h] = [h, w];
  return {
    wTw: w, hTw: h,
    mar: { top: a(pgMar, 'top', 1417), bottom: a(pgMar, 'bottom', 1417), left: a(pgMar, 'left', 1417), right: a(pgMar, 'right', 1417), header: a(pgMar, 'header', 708), footer: a(pgMar, 'footer', 708) },
  };
}

async function extractWatermarks(zip) {
  // Başlıklardaki VML filigranları (metin ve resim)
  const marks = [];
  const files = Object.keys(zip.files).filter((f) => /^word\/header\d*\.xml$/.test(f));
  for (const f of files) {
    const xml = await zip.file(f).async('string');
    const relsName = f.replace('word/', 'word/_rels/') + '.rels';
    const rels = zip.file(relsName) ? await zip.file(relsName).async('string') : '';
    const re = /<v:shape\b([^>]*)>([\s\S]*?)<\/v:shape>/g;
    let m;
    while ((m = re.exec(xml))) {
      const attrs = m[1], inner = m[2];
      const style = (attrs.match(/style="([^"]*)"/) || [, ''])[1];
      const rot = (style.match(/rotation:(-?[\d.]+)/) || [, '0'])[1];
      const tp = inner.match(/<v:textpath\b[^>]*string="([^"]*)"/);
      if (tp) {
        const fill = (attrs.match(/fillcolor="([^"]*)"/) || [, '#c0c0c0'])[1];
        const op = (inner.match(/<v:fill\b[^>]*opacity="([^"]*)"/) || [, '.5'])[1];
        const font = (inner.match(/font-family:&quot;([^&]*)&quot;/) || [, 'Calibri'])[1];
        marks.push({ kind: 'text', text: decodeXml(tp[1]), color: fill.split(' ')[0], rotation: parseFloat(rot), opacity: parseOpacity(op), font, header: f });
        continue;
      }
      const im = inner.match(/<v:imagedata\b[^>]*r:id="([^"]+)"/);
      if (im && /WordPictureWatermark|PowerPlusWaterMark|mso-position-horizontal:center/.test(attrs + style)) {
        const t = rels.match(new RegExp(`Id="${im[1]}"[^>]*Target="([^"]+)"`)) || rels.match(new RegExp(`Target="([^"]+)"[^>]*Id="${im[1]}"`));
        if (t) {
          const p = path.posix.normalize('word/' + t[1]);
          const file = zip.file(p);
          if (file) {
            const ext = path.extname(p).slice(1).toLowerCase();
            const b64 = await file.async('base64');
            marks.push({ kind: 'image', src: `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${b64}`, header: f, washout: /gain="[^"]+"/.test(inner) });
          }
        }
      }
    }
  }
  // aynı filigran birden fazla başlıkta olabilir; tekrarları at
  const seen = new Set();
  return marks.filter((m) => { const k = m.kind + (m.text || m.src.slice(0, 200)); if (seen.has(k)) return false; seen.add(k); return true; });
}
function parseOpacity(v) { if (!v) return 0.5; if (/f$/.test(v)) return parseInt(v, 10) / 65536; const n = parseFloat(v); return isNaN(n) ? 0.5 : n; }
function decodeXml(s) { return s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); }

async function makeBgDocx(buf, includeBody) {
  const zip = await JSZip.loadAsync(buf);
  const docXml = await zip.file('word/document.xml').async('string');
  const parts = splitBody(docXml);
  const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p><w:p/>';
  const newBody = (includeBody ? parts.body : '<w:p/>') + pageBreak + parts.sect;
  zip.file('word/document.xml', parts.head + newBody + parts.tail);
  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return { buf: out, info: sectInfo(parts.sect), watermarks: await extractWatermarks(zip) };
}

/* ---- içe aktarma ---- */
async function importTemplate(src, dir, opts, helpers) {
  const tmpDir = dir + '.new';
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  const ext = path.extname(src).toLowerCase();
  let method = '';
  let bgPdfBytes;

  if (ext === '.pdf') {
    fs.copyFileSync(src, path.join(tmpDir, 'source.pdf'));
    const srcDoc = await PDFDocument.load(fs.readFileSync(src), { ignoreEncryption: true });
    const n = srcDoc.getPageCount();
    const out = await PDFDocument.create();
    const idx = n > 1 ? [0, 1] : [0];
    const copied = await out.copyPages(srcDoc, idx);
    copied.forEach((p) => out.addPage(p));
    bgPdfBytes = await out.save();
    method = 'pdf';
  } else if (ext === '.docx') {
    fs.copyFileSync(src, path.join(tmpDir, 'source.docx'));
    const { buf, info, watermarks } = await makeBgDocx(fs.readFileSync(src), !!opts.includeBody);
    const bgDocx = path.join(tmpDir, 'bg-src.docx');
    fs.writeFileSync(bgDocx, buf);
    const outPdf = path.join(tmpDir, 'bg-raw.pdf');
    const errors = [];
    const tries = [
      ['word', () => convertWithWord(bgDocx, outPdf)],
      ['libreoffice', () => convertWithSoffice(bgDocx, outPdf)],
    ];
    if (opts.forceMethod) tries.splice(0, tries.length, ...tries.filter((t) => t[0] === opts.forceMethod));
    for (const [name, fn] of tries) {
      try { await fn(); method = name; break; } catch (e) { errors.push(name + ': ' + e.message); }
    }
    if (!method) {
      const pdf = await helpers.renderDocxFallback(buf, {
        widthPt: info.wTw / 20, heightPt: info.hTw / 20, watermarks,
      });
      fs.writeFileSync(outPdf, pdf);
      method = 'html';
    }
    // ilk sayfa ve son sayfa (son sayfa = boş gövdeli normal sayfa)
    const raw = await PDFDocument.load(fs.readFileSync(outPdf), { ignoreEncryption: true });
    const n = raw.getPageCount();
    const out = await PDFDocument.create();
    const copied = await out.copyPages(raw, n > 1 ? [0, n - 1] : [0]);
    copied.forEach((p) => out.addPage(p));
    bgPdfBytes = await out.save();
    fs.writeFileSync(path.join(tmpDir, 'sect.json'), JSON.stringify(info));
  } else {
    throw new Error('Desteklenmeyen dosya türü: ' + ext);
  }

  fs.writeFileSync(path.join(tmpDir, 'bg.pdf'), bgPdfBytes);
  const bg = await PDFDocument.load(bgPdfBytes);
  const p0 = bg.getPage(0);
  const { width, height } = p0.getSize();
  const meta = {
    name: path.basename(src),
    type: ext.slice(1),
    method,
    includeBody: !!opts.includeBody,
    pages: bg.getPageCount(),
    widthPt: width, heightPt: height,
    createdAt: new Date().toISOString(),
    stamp: newStamp(),
    images: [],
  };
  fs.writeFileSync(path.join(tmpDir, 'meta.json'), JSON.stringify(meta, null, 1));
  fs.rmSync(dir, { recursive: true, force: true });
  fs.renameSync(tmpDir, dir);
  return meta;
}

function setImages(dir, images, auto) {
  const meta = getMeta(dir);
  if (!meta) return null;
  if (auto) meta.auto = auto;
  meta.stamp = newStamp();
  meta.images = [];
  images.forEach((dataUrl, i) => {
    const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    const f = `bg${i + 1}.png`;
    fs.writeFileSync(path.join(dir, f), Buffer.from(b64, 'base64'));
    meta.images.push(f);
  });
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 1));
  return meta;
}

function setAuto(dir, auto) {
  const meta = getMeta(dir);
  if (!meta) return null;
  meta.auto = auto;
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 1));
  return meta;
}

function readImages(dir) {
  const meta = getMeta(dir);
  if (!meta || !meta.images) return [];
  return meta.images.map((f) => 'data:image/png;base64,' + fs.readFileSync(path.join(dir, f)).toString('base64'));
}

// Bulut eşitleme: şablon klasörünün tüm dosyaları (base64) ve geri yüklenmesi
const newStamp = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
function exportRaw(dir) {
  const meta = getMeta(dir);
  if (!meta) return null;
  const files = {};
  fs.readdirSync(dir).forEach((f) => {
    if (f === 'meta.json' || f === 'bg-src.docx' || f === 'bg-raw.pdf') return;
    files[f] = fs.readFileSync(path.join(dir, f)).toString('base64');
  });
  return { meta, files };
}
function importRaw(dir, data) {
  const tmpDir = dir + '.new';
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  Object.keys(data.files || {}).forEach((f) => {
    if (!/^[\w.\-]+$/.test(f)) return;
    fs.writeFileSync(path.join(tmpDir, f), Buffer.from(data.files[f], 'base64'));
  });
  fs.writeFileSync(path.join(tmpDir, 'meta.json'), JSON.stringify(data.meta, null, 1));
  fs.rmSync(dir, { recursive: true, force: true });
  fs.renameSync(tmpDir, dir);
  return getMeta(dir);
}

module.exports = { exportRaw, importRaw, getMeta, remove, importTemplate, setImages, setAuto, readImages, splitBody, sectInfo, findSoffice };
