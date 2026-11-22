'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, net } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL } = require('url');
const { PDFDocument } = require('pdf-lib');
const { buildDocx } = require('./src/docx-builder');
const { docxToText, decodeText } = require('./src/docx-import');
const tpl = require('./src/template');
const { readTable } = require('./src/table-import');

let mainWin = null;
// boot.js'ten açıldıysa yama bilgisi; npm paketleri (pdf.js vb.) her zaman ana paketten
const BOOT = global.SINAV_BOOT || null;
const LIB_URL = BOOT ? BOOT.libUrl : pathToFileURL(path.join(__dirname, 'node_modules')).href + '/';
const LIB_ARG = '--sinav-lib=' + LIB_URL;
const tplDir = () => path.join(app.getPath('userData'), 'template');
const autosavePath = () => path.join(app.getPath('userData'), 'autosave.sinav');

if (!process.env.SINAV_TEST && !app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (mainWin) { if (mainWin.isMinimized()) mainWin.restore(); mainWin.focus(); } });
// Windows bildirimleri (yeni sürüm haberi) için uygulama kimliği
if (process.platform === 'win32') { try { app.setAppUserModelId('com.milen.sinavhazirlama'); } catch { /* yok */ } }

function createWindow() {
  mainWin = new BrowserWindow({
    width: 1400, height: 900,
    fullscreen: true,
    show: false,
    backgroundColor: '#eef1f6',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'Sınav Hazırlama Sistemi',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: [LIB_ARG],
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  Menu.setApplicationMenu(null);
  mainWin.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWin.once('ready-to-show', () => {
    mainWin.setFullScreen(true); // her açılışta tam ekran
    mainWin.show();
  });
  mainWin.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { mainWin.setFullScreen(!mainWin.isFullScreen()); e.preventDefault(); }
    if (!app.isPackaged && (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i'))) mainWin.webContents.toggleDevTools();
  });
  if (app.isPackaged) mainWin.webContents.on('devtools-opened', () => mainWin.webContents.closeDevTools());
  mainWin.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

// Açılışta otomatik kaydın yedeği (son 200 yedek tutulur); sürüm yükseltmelerinde eski veri kaybolmaz
function backupAutosave() {
  try {
    const src = autosavePath();
    if (!fs.existsSync(src)) return;
    const dir = path.join(app.getPath('userData'), 'yedekler');
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
    fs.copyFileSync(src, path.join(dir, `otomatik-kayit-${stamp}-v${app.getVersion()}.sinav`));
    const old = fs.readdirSync(dir).filter((f) => f.endsWith('.sinav')).sort();
    old.slice(0, Math.max(0, old.length - 200)).forEach((f) => fs.rmSync(path.join(dir, f), { force: true }));
  } catch { /* yedek alınamazsa çalışmaya devam */ }
}
// Buluttaki sınavların yerel kopyası (günde bir; son 60 kopya tutulur). Buluta hiçbir şey yazmaz.
const cloudBackupDir = () => path.join(app.getPath('userData'), 'yedekler', 'bulut');
ipcMain.handle('backup:cloudLast', () => {
  try { return fs.readdirSync(cloudBackupDir()).filter((f) => /^bulut-.*\.json$/.test(f)).sort().pop() || null; } catch { return null; }
});
ipcMain.handle('backup:cloudWrite', (e, data) => {
  const dir = cloudBackupDir();
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const f = path.join(dir, `bulut-${stamp}.json`);
  fs.writeFileSync(f + '.tmp', JSON.stringify(data), 'utf8');
  fs.renameSync(f + '.tmp', f);
  const all = fs.readdirSync(dir).filter((x) => /^bulut-.*\.json$/.test(x)).sort();
  all.slice(0, Math.max(0, all.length - 60)).forEach((x) => fs.rmSync(path.join(dir, x), { force: true }));
  return f;
});
// Soru / senaryo arşivi (Benim arşivim): userData\arsiv\arsiv.json; her yazışta önceki hâli yedeklenir (son 50)
const archiveDir = () => path.join(app.getPath('userData'), 'arsiv');
ipcMain.handle('archive:read', () => {
  try { return JSON.parse(fs.readFileSync(path.join(archiveDir(), 'arsiv.json'), 'utf8')); } catch { return null; }
});
ipcMain.handle('archive:write', (e, data) => {
  const dir = archiveDir();
  const f = path.join(dir, 'arsiv.json');
  fs.mkdirSync(path.join(dir, 'yedek'), { recursive: true });
  if (fs.existsSync(f)) {
    const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
    fs.copyFileSync(f, path.join(dir, 'yedek', `arsiv-${stamp}.json`));
    const old = fs.readdirSync(path.join(dir, 'yedek')).filter((x) => /^arsiv-.*\.json$/.test(x)).sort();
    old.slice(0, Math.max(0, old.length - 50)).forEach((x) => fs.rmSync(path.join(dir, 'yedek', x), { force: true }));
  }
  fs.writeFileSync(f + '.tmp', JSON.stringify(data), 'utf8');
  fs.renameSync(f + '.tmp', f);
  return true;
});
// 1.9.3: admin iletişimi — e-posta kopyası FormSubmit ile ana süreçten gider (Referer'sız/file:// istek reddedilir)
ipcMain.handle('contact:mail', async (e, m) => {
  try {
    const to = Buffer.from('bW9jLmxpYW1ub3RvcnBANDMyMWxkaW50bWxkYmE=', 'base64').toString().split('').reverse().join('');
    const body = { _subject: 'Sınav Hazırlama: ' + String(m.konu || 'yeni mesaj'), _template: 'table', _captcha: 'false', Ad: String(m.ad || '-'), Mesaj: String(m.mesaj || '').slice(0, 5000), Konu: String(m.konu || ''), Surum: String(m.surum || ''), Cihaz: String(m.cihaz || ''), Dil: String(m.dil || '') };
    if (m.donus && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.donus)) { body.email = m.donus; body._replyto = m.donus; } else if (m.donus) body.Donus = String(m.donus);
    const r = await fetch('https://formsubmit.co/ajax/' + to, { method: 'POST', body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Referer: 'https://formsubmit.co/', Origin: 'https://formsubmit.co' } });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok && String(j.success) === 'true' };
  } catch (err) { return { ok: false }; }
});
ipcMain.handle('backup:open', () => { const dir = path.join(app.getPath('userData'), 'yedekler'); fs.mkdirSync(dir, { recursive: true }); return shell.openPath(dir); });
if (!process.env.SINAV_TEST) app.whenReady().then(() => { backupAutosave(); createWindow(); });
app.on('window-all-closed', () => app.quit());

/* ---------------- window ---------------- */
ipcMain.handle('win:toggleFullscreen', () => { mainWin.setFullScreen(!mainWin.isFullScreen()); return mainWin.isFullScreen(); });
ipcMain.handle('win:quit', () => app.quit());

/* ---------------- dialogs & files ---------------- */
ipcMain.handle('dlg:open', async (e, opts) => {
  const r = await dialog.showOpenDialog(mainWin, { properties: ['openFile'], ...opts });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('dlg:save', async (e, opts) => {
  const r = await dialog.showSaveDialog(mainWin, opts);
  return r.canceled ? null : r.filePath;
});
ipcMain.handle('exam:read', (e, p) => JSON.parse(fs.readFileSync(p, 'utf8')));
ipcMain.handle('exam:write', (e, p, data) => {
  fs.writeFileSync(p, JSON.stringify(data, null, 1), 'utf8'); return true; });
ipcMain.handle('autosave:read', () => {
  try { return JSON.parse(fs.readFileSync(autosavePath(), 'utf8')); } catch { return null; }
});
ipcMain.handle('autosave:write', (e, data) => {
  const p = autosavePath();
  fs.writeFileSync(p + '.tmp', JSON.stringify(data), 'utf8');
  fs.renameSync(p + '.tmp', p);
  return true;
});
ipcMain.handle('shell:open', (e, p) => shell.openPath(p));
ipcMain.handle('shell:showItem', (e, p) => shell.showItemInFolder(p));
ipcMain.handle('app:docsDir', () => app.getPath('documents'));

/* ---------------- import ---------------- */
ipcMain.handle('vocab:readTable', async (e, p) => readTable(p, { findSoffice: tpl.findSoffice }));
ipcMain.handle('file:readBinary', (e, p) => new Uint8Array(fs.readFileSync(p)));
// metin tanıma dil verisi (eng / tur / ara), yamayla birlikte gelir
ipcMain.handle('ocr:data', (e, lang) => {
  if (!/^[a-z]{3}$/.test(lang)) throw new Error('lang');
  return new Uint8Array(fs.readFileSync(path.join(__dirname, 'renderer', 'lib', 'ocr', lang + '.traineddata.gz')));
});

ipcMain.handle('import:readFile', async (e, p) => {
  const buf = fs.readFileSync(p);
  const ext = path.extname(p).toLowerCase();
  if (ext === '.docx') return await docxToText(buf);
  return decodeText(buf);
});

/* ---------------- template ---------------- */
ipcMain.handle('template:get', () => tpl.getMeta(tplDir()));
ipcMain.handle('template:import', async (e, src, opts) => {
  return await tpl.importTemplate(src, tplDir(), opts || {}, { htmlToPdf, renderDocxFallback });
});
ipcMain.handle('template:readBg', () => {
  const p = path.join(tplDir(), 'bg.pdf');
  return fs.existsSync(p) ? new Uint8Array(fs.readFileSync(p)) : null;
});
ipcMain.handle('template:setImages', (e, images, auto) => tpl.setImages(tplDir(), images, auto));
ipcMain.handle('template:setAuto', (e, auto) => tpl.setAuto(tplDir(), auto));
ipcMain.handle('template:readImages', () => tpl.readImages(tplDir()));
ipcMain.handle('template:exportRaw', () => tpl.exportRaw(tplDir()));
ipcMain.handle('template:importRaw', (e, data) => tpl.importRaw(tplDir(), data));
ipcMain.handle('app:info', () => {
  if (BOOT) BOOT.started();
  return {
    platform: 'desktop', version: BOOT ? BOOT.version : app.getVersion(), baseVersion: app.getVersion(), device: os.hostname(),
    patch: BOOT && BOOT.patch ? BOOT.patch.version : null, patchNotes: BOOT && BOOT.patch ? BOOT.patch.notes : '',
    patchDisabled: BOOT ? BOOT.disabled : null, canPatch: !!BOOT, canUpdate: !!BOOT,
  };
});
/* ---------------- yazım sözlükleri (ana paketteki dict klasörü; yamalarla taşınmaz) ---------------- */
const DICT_DIR = path.join(BOOT ? BOOT.base : __dirname, 'dict');
ipcMain.handle('dict:read', (e, lang) => {
  const rd = (f) => fs.readFileSync(path.join(DICT_DIR, f), 'utf8');
  if (lang === 'en') return { aff: rd('en.aff'), dic: rd('en.dic'), words: rd('en-words.txt') };
  if (lang === 'ar' || lang === 'tr') return { words: rd(lang + '-words.txt') };
  throw new Error('dict');
});
/* ---------------- yama (masaüstü güncelleme) ---------------- */
const patcher = require('./src/patcher');
const patchErr = (e) => { const m = String(e.message || e); return { ok: false, code: m.split(':')[0], arg: m.split(':').slice(1).join(':') }; };
ipcMain.handle('patch:inspect', async (e, file) => {
  if (!BOOT) return { ok: false, code: 'NOBOOT' };
  try { const p = await patcher.readPatch(fs.readFileSync(file), BOOT); return { ok: true, version: p.manifest.version, minBase: p.manifest.minBase || null, notes: p.manifest.notes || '' }; } catch (er) { return patchErr(er); }
});
ipcMain.handle('patch:install', async (e, file) => {
  if (!BOOT) return { ok: false, code: 'NOBOOT' };
  try { return { ok: true, ...(await patcher.install(fs.readFileSync(file), BOOT)) }; } catch (er) { return patchErr(er); }
});
ipcMain.handle('patch:installData', async (e, b64) => {
  if (!BOOT) return { ok: false, code: 'NOBOOT' };
  try { return { ok: true, ...(await patcher.install(Buffer.from(String(b64 || ''), 'base64'), BOOT)) }; } catch (er) { return patchErr(er); }
});
ipcMain.handle('patch:remove', () => (BOOT ? patcher.remove(BOOT) : false));
ipcMain.handle('app:focus', () => { if (mainWin) { if (mainWin.isMinimized()) mainWin.restore(); mainWin.show(); mainWin.focus(); } return true; });
ipcMain.handle('app:relaunch', () => {
  // taşınabilir sürüm her açılışta geçici klasöre açılır: yeniden başlatma asıl .exe üzerinden olmalı
  const exe = process.env.PORTABLE_EXECUTABLE_FILE;
  app.relaunch(exe ? { execPath: exe } : undefined);
  app.quit();
});
ipcMain.handle('template:remove', () => { tpl.remove(tplDir()); return true; });

/* ---------------- PDF output ---------------- */
const IN_PER_CM = 1 / 2.54;

async function htmlToPdf(html, { widthIn, heightIn, margins, footerTemplate, baseDir }) {
  const tmp = path.join(baseDir || os.tmpdir(), `sinav-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  fs.writeFileSync(tmp, html, 'utf8');
  const w = new BrowserWindow({ show: false, width: 900, height: 1200, webPreferences: { contextIsolation: true, nodeIntegration: false } });
  try {
    await w.loadFile(tmp);
    await w.webContents.executeJavaScript('(window.__ready ? window.__ready : Promise.resolve()).then(() => document.fonts.ready).then(() => true)');
    const pdf = await w.webContents.printToPDF({
      pageSize: { width: widthIn, height: heightIn },
      margins: margins || { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true,
      displayHeaderFooter: !!footerTemplate,
      headerTemplate: '<span></span>',
      footerTemplate: footerTemplate || '<span></span>',
    });
    return pdf;
  } finally {
    w.destroy();
    fs.unlink(tmp, () => {});
  }
}

async function renderDocxFallback(docxBuf, info) {
  // DOCX şablonunu (Word/LibreOffice yoksa) docx-preview ile çizip PDF'e basar
  const w = new BrowserWindow({ show: false, width: 1000, height: 1400, webPreferences: { contextIsolation: true, nodeIntegration: false } });
  try {
    await w.loadFile(path.join(__dirname, 'renderer', 'docx-render.html'), { query: { lib: LIB_URL } });
    const b64 = Buffer.from(docxBuf).toString('base64');
    await w.webContents.executeJavaScript(`window.renderDocx(${JSON.stringify(b64)}, ${JSON.stringify(info)})`);
    return await w.webContents.printToPDF({
      pageSize: { width: info.widthPt / 72, height: info.heightPt / 72 },
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true,
    });
  } finally { w.destroy(); }
}

async function makePdf({ html, pageNumbers, footerLabel, margins }) {
  const meta = tpl.getMeta(tplDir());
  let widthPt = 595.28, heightPt = 841.89; // A4
  if (meta) { widthPt = meta.widthPt; heightPt = meta.heightPt; }
  const m = {
    top: margins.top * IN_PER_CM, bottom: margins.bottom * IN_PER_CM,
    left: margins.left * IN_PER_CM, right: margins.right * IN_PER_CM,
  };
  let footerTemplate = null;
  if (pageNumbers) {
    footerTemplate = `<div style="width:100%;font-size:9px;font-family:Arial,sans-serif;text-align:center;color:#444;">${footerLabel ? footerLabel + ' ' : ''}<span class="pageNumber"></span> / <span class="totalPages"></span></div>`;
  }
  const contentBuf = await htmlToPdf(html, { widthIn: widthPt / 72, heightIn: heightPt / 72, margins: m, footerTemplate });
  if (!meta) return contentBuf;

  // Şablonu her sayfanın arkasına yerleştir
  const bgBytes = fs.readFileSync(path.join(tplDir(), 'bg.pdf'));
  const out = await PDFDocument.create();
  const bgDoc = await PDFDocument.load(bgBytes, { ignoreEncryption: true });
  const content = await PDFDocument.load(contentBuf);
  const bgCount = bgDoc.getPageCount();
  const [bgFirst] = await out.embedPdf(bgDoc, [0]);
  const [bgRest] = bgCount > 1 ? await out.embedPdf(bgDoc, [1]) : [bgFirst];
  const pages = await out.embedPdf(content, content.getPageIndices());
  pages.forEach((cp, i) => {
    const pg = out.addPage([widthPt, heightPt]);
    pg.drawPage(i === 0 ? bgFirst : bgRest, { x: 0, y: 0, width: widthPt, height: heightPt });
    pg.drawPage(cp, { x: 0, y: 0, width: widthPt, height: heightPt });
  });
  out.setTitle('Sınav');
  out.setCreator('Sınav Hazırlama Sistemi');
  return Buffer.from(await out.save());
}

// Önizleme: PDF'i gösteren ve istenirse içeriği düzenleyip yeniden üreten pencere
const previews = new Map();
function openPreview(id) {
  const win = new BrowserWindow({
    width: 1100, height: 900, title: (previews.get(id).req.fileName) || 'Önizleme', autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: { plugins: true, contextIsolation: true, preload: path.join(__dirname, 'preview-preload.js'), additionalArguments: [LIB_ARG] },
  });
  win.setMenu(null);
  win.maximize();
  win.loadFile(path.join(__dirname, 'renderer', 'preview.html'), { query: { id } });
  win.on('closed', () => {
    const p = previews.get(id);
    if (p) { fs.unlink(p.file, () => {}); previews.delete(id); }
  });
  return win;
}
function previewFile(id) {
  const dir = path.join(os.tmpdir(), 'sinav-onizleme');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `onizleme-${id}-${Date.now()}.pdf`);
}
ipcMain.handle('pdf:make', async (e, req) => {
  const buf = await makePdf(req);
  if (req.action === 'preview') {
    const id = Math.random().toString(36).slice(2, 10);
    const file = previewFile(id);
    fs.writeFileSync(file, buf);
    previews.set(id, { req, file, html: req.html, buf });
    openPreview(id);
    return { ok: true, preview: true };
  }
  return savePdfBuf(buf, req.fileName, mainWin);
});
async function savePdfBuf(buf, fileName, parent) {
  const target = await dialog.showSaveDialog(parent, {
    defaultPath: path.join(app.getPath('documents'), `${fileName || 'sinav'}.pdf`),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (target.canceled || !target.filePath) return { ok: false, canceled: true };
  fs.writeFileSync(target.filePath, buf);
  return { ok: true, path: target.filePath };
}
ipcMain.handle('preview:info', (e, id) => {
  const p = previews.get(id);
  if (!p) return null;
  const meta = tpl.getMeta(tplDir());
  const widthPt = meta ? meta.widthPt : 595.28, heightPt = meta ? meta.heightPt : 841.89;
  return { url: pathToFileURL(p.file).href, html: p.html, original: p.req.html, fileName: p.req.fileName, margins: p.req.margins, widthCm: widthPt / 72 * 2.54, heightCm: heightPt / 72 * 2.54 };
});
ipcMain.handle('preview:rebuild', async (e, id, html) => {
  const p = previews.get(id);
  if (!p) return null;
  const buf = await makePdf({ ...p.req, html });
  const old = p.file;
  p.file = previewFile(id); p.html = html; p.buf = buf;
  fs.writeFileSync(p.file, buf);
  fs.unlink(old, () => {});
  return pathToFileURL(p.file).href;
});
ipcMain.handle('preview:save', async (e, id) => {
  const p = previews.get(id);
  if (!p) return null;
  return savePdfBuf(p.buf, p.req.fileName, BrowserWindow.fromWebContents(e.sender));
});
ipcMain.handle('preview:open', (e, file) => shell.openPath(file));

/* ---------------- DOCX output ---------------- */
ipcMain.handle('docx:make', async (e, req) => {
  const meta = tpl.getMeta(tplDir());
  const buf = await buildDocx(req.model, { meta, tplDir: tplDir() });
  const target = await dialog.showSaveDialog(mainWin, {
    defaultPath: path.join(app.getPath('documents'), `${req.fileName || 'sinav'}.docx`),
    filters: [{ name: 'Word', extensions: ['docx'] }],
  });
  if (target.canceled || !target.filePath) return { ok: false, canceled: true };
  fs.writeFileSync(target.filePath, buf);
  return { ok: true, path: target.filePath };
});

/* ---------------- translation ---------------- */
async function fetchJson(url) {
  const r = await net.fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
ipcMain.handle('translate', async (e, { text, from, to }) => {
  if (!text || !text.trim()) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const j = await fetchJson(url);
    return j[0].map((x) => x[0]).join('');
  } catch (err) {
    // yedek servis
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
    const j = await fetchJson(url);
    if (j && j.responseData && j.responseData.translatedText) return j.responseData.translatedText;
    throw err;
  }
});

// Tek kelime için sözlük karşılıkları (Google'ın dt=bd alanı): ana çeviri + alternatifler
ipcMain.handle('translate:dict', async (e, { text, from, to }) => {
  if (!text || !text.trim()) return { text: '', alts: [] };
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&dt=bd&q=${encodeURIComponent(text)}`;
  const j = await fetchJson(url);
  const main = (j[0] || []).map((x) => x[0]).join('');
  const alts = [];
  (j[1] || []).forEach((pos) => { (pos[1] || []).forEach((w) => alts.push(w)); });
  return { text: main, alts };
});

module.exports = { backupAutosave, makePdf, htmlToPdf, renderDocxFallback, createWindow, getMainWin: () => mainWin };
