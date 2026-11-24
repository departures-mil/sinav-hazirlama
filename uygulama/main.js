'use strict';
// Sınav Hazırlama Sistemi — Electron ana süreç.
// Pencere (her açılışta tam ekran, çerçevesiz), sağ üst pencere düğmeleri, GitHub Releases güncellemesi (yama + tam app.asar)
// ve ana süreç hata raporu ortak çekirdekten gelir (cekirdek/electron/fc-electron-main.js). Burada uygulamaya özgü IPC kalır.
// 1.10.0: eski imzalı .sinavyama yama kanalı (boot.js / patcher.js) kaldırıldı; güncelleme yalnız GitHub Releases + latest.json.
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, net } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL } = require('url');
const { PDFDocument } = require('pdf-lib');
const fc = require('./cekirdek/electron/fc-electron-main');
const { buildDocx } = require('./src/docx-builder');
const { docxToText, decodeText } = require('./src/docx-import');
const tpl = require('./src/template');
const { readTable } = require('./src/table-import');
const { createLan } = require('./src/lan');

let mainWin = null;
// npm kitaplıkları (pdf.js, jszip, docx-preview) paket kökündeki node_modules klasöründen file:// ile yüklenir
const ROOT = path.join(__dirname, '..');
const LIB_URL = pathToFileURL(path.join(ROOT, 'node_modules')).href + '/';
const LIB_ARG = '--sinav-lib=' + LIB_URL;
const SMOKE = !!process.env.SINAV_SMOKE;
const tplDir = () => path.join(app.getPath('userData'), 'template');
const autosavePath = () => path.join(app.getPath('userData'), 'autosave.sinav');

if (!process.env.SINAV_TEST && !SMOKE && !app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (mainWin) { if (mainWin.isMinimized()) mainWin.restore(); mainWin.show(); mainWin.focus(); } });
// Windows bildirimleri için uygulama kimliği (eski sürümlerle aynı)
if (process.platform === 'win32') { try { app.setAppUserModelId('com.departures.sinavhazirlama'); } catch { /* yok */ } }

function createWindow() {
  mainWin = new BrowserWindow(fc.windowOptions({
    width: 1400, height: 900, minWidth: 900, minHeight: 560,
    backgroundColor: '#070b14',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'Sınav Hazırlama Sistemi',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: [LIB_ARG],
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,          // preload ortak çekirdeğin fc-preload.js'ini require eder (contextIsolation açık)
      spellcheck: false,
    },
  }));
  Menu.setApplicationMenu(null);
  fc.install(mainWin, { channel: 'win-app' });   // tam ekran açılış, Küçült/Orta/Tam ekran/Kapat, app.asar güncelleme, ana süreç hataları
  mainWin.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWin.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { mainWin.setFullScreen(!mainWin.isFullScreen()); e.preventDefault(); }
    if (!app.isPackaged && (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i'))) mainWin.webContents.toggleDevTools();
  });
  if (app.isPackaged) mainWin.webContents.on('devtools-opened', () => mainWin.webContents.closeDevTools());
  mainWin.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  mainWin.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https:\/\//i.test(url)) shell.openExternal(url); } });
  // Kapat: önce açık sınav diske yazılır (arayüz window.__beforeClose), sonra pencere kapanır
  let flushed = false;
  mainWin.on('close', (e) => {
    if (flushed || SMOKE) return;
    e.preventDefault();
    const done = () => { flushed = true; if (!mainWin.isDestroyed()) mainWin.close(); };
    const t = setTimeout(done, 4000);
    mainWin.webContents.executeJavaScript('window.__beforeClose ? window.__beforeClose() : true').catch(() => {}).finally(() => { clearTimeout(t); done(); });
  });
  if (SMOKE) smoke();
}

// Electron açılış testi (npm run test:electron): pencere yüklendi mi, çekirdek ve uygulama başladı mı?
function smoke() {
  const out = (o) => { process.stdout.write('SINAV_SMOKE ' + JSON.stringify(o) + '\n'); };
  const consoleErrors = [];
  mainWin.webContents.on('console-message', (e, level, message) => { if (level >= 3) consoleErrors.push(String(message).slice(0, 300)); });
  const fail = setTimeout(() => { out({ ok: false, error: 'timeout' }); app.exit(2); }, 60000);
  mainWin.webContents.on('did-finish-load', () => {
    setTimeout(async () => {
      try {
        const r = await mainWin.webContents.executeJavaScript(`({
          fc: !!(window.FC && FC.updater && FC.topbar && FC.lanMerge), host: window.FC && FC.host.kind, fcHost: !!window.fcHost, api: !!window.api,
          version: window.APP_RELEASE && APP_RELEASE.version, scheme: document.documentElement.dataset.scheme, lang: document.documentElement.lang,
          topbar: !!document.querySelector('.topbar .topbar-actions'), winBtns: document.querySelectorAll('.topbar .win-controls button').length,
          sync: !!document.querySelector('.topbar .sync-act'), lan: !!document.querySelector('.topbar .lan-act'), update: !!document.querySelector('.topbar .update-act'),
          kabuk: !!(window.Kabuk && Kabuk.ready), schemes: (FC.look.schemes ? FC.look.schemes() : []),
          tabs: document.querySelectorAll('.tabs button').length, title: document.title, errors: (window.__shErrors || []).slice(0, 5)
        })`);
        r.fullscreen = mainWin.isFullScreen(); r.appVersion = app.getVersion();
        r.errors = r.errors.concat(consoleErrors.filter((m) => !/net::|Failed to load resource|ERR_|raw\.githubusercontent|github\.com/.test(m)));
        clearTimeout(fail);
        out(Object.assign({ ok: r.fc && r.host === 'electron' && r.topbar && r.kabuk && r.tabs === 3 && !r.errors.length }, r));
        app.exit(0);
      } catch (e) { out({ ok: false, error: String(e && e.message || e) }); app.exit(3); }
    }, 3500);
  });
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
ipcMain.handle('backup:open', () => { const dir = path.join(app.getPath('userData'), 'yedekler'); fs.mkdirSync(dir, { recursive: true }); return shell.openPath(dir); });
if (!process.env.SINAV_TEST) app.whenReady().then(() => { backupAutosave(); initLan(); createWindow(); });
app.on('window-all-closed', () => app.quit());

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
  // atomik: önce geçici dosya, sonra yeniden adlandırma (yarım yazılmış sınav dosyası olmaz)
  const tmp = p + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1), 'utf8');
  fs.renameSync(tmp, p);
  return true;
});
ipcMain.handle('autosave:read', () => {
  try { return JSON.parse(fs.readFileSync(autosavePath(), 'utf8')); } catch { return null; }
});
ipcMain.handle('autosave:write', (e, data) => {
  const p = autosavePath();
  fs.writeFileSync(p + '.tmp', JSON.stringify(data), 'utf8');
  fs.renameSync(p + '.tmp', p);
  // Wi-Fi eşitleme açıksa (eşleşmiş cihaz varsa) açık sınav eşitleme deposuna da konur
  try { if (lan && data && data.exam && lan.status().pairs.length) lan.put(data.exam); } catch { /* eşitleme deposu sonra */ }
  return true;
});
// Eşitlemeden önce yerel hâlin yedeği (bulut ya da Wi-Fi'den gelen sürüm açık sınavın yerine geçmeden önce): son 300 tutulur
ipcMain.handle('backup:write', (e, kind, data) => {
  const dir = path.join(app.getPath('userData'), 'yedekler', 'esitleme');
  fs.mkdirSync(dir, { recursive: true });
  const k = String(kind || 'yedek').replace(/[^a-z0-9-]/gi, '').slice(0, 30) || 'yedek';
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const f = path.join(dir, `${k}-${stamp}-${Math.random().toString(36).slice(2, 6)}.json`);
  fs.writeFileSync(f + '.tmp', JSON.stringify(data), 'utf8');
  fs.renameSync(f + '.tmp', f);
  const all = fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort();
  all.slice(0, Math.max(0, all.length - 300)).forEach((x) => fs.rmSync(path.join(dir, x), { force: true }));
  return f;
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
ipcMain.handle('app:info', () => ({ platform: 'desktop', version: app.getVersion(), device: os.hostname(), packaged: app.isPackaged }));
/* ---------------- yazım sözlükleri (ana paketteki dict klasörü; yamalarla taşınmaz) ---------------- */
const DICT_DIR = path.join(__dirname, 'dict');
ipcMain.handle('dict:read', (e, lang) => {
  const rd = (f) => fs.readFileSync(path.join(DICT_DIR, f), 'utf8');
  if (lang === 'en') return { aff: rd('en.aff'), dic: rd('en.dic'), words: rd('en-words.txt') };
  if (lang === 'ar' || lang === 'tr') return { words: rd(lang + '-words.txt') };
  throw new Error('dict');
});
ipcMain.handle('app:focus', () => { if (mainWin) { if (mainWin.isMinimized()) mainWin.restore(); mainWin.show(); mainWin.focus(); } return true; });
ipcMain.handle('app:relaunch', () => { app.relaunch(); app.quit(); });

/* ---------------- Wi-Fi eşitleme (aynı ağdaki bilgisayarlar, PIN ile eşleşme) ---------------- */
let lan = null;
const toUi = (ch, ...a) => { if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send(ch, ...a); };
function initLan() {
  try {
    lan = createLan({
      dir: path.join(app.getPath('userData'), 'wifi-esitleme'), version: app.getVersion(),
      onChanged: (ids, peer) => toUi('lan:changed', { ids, peer }),
      onPaired: (peer) => { lan.setOpen(true).catch(() => {}); toUi('lan:paired', peer); },
      // karşı taraf eşitlerken bu bilgisayarda açık sınavın son hâli depoya yazılmış olsun
      beforeServe: () => (mainWin && !mainWin.isDestroyed() ? mainWin.webContents.executeJavaScript('window.__lanFlush ? window.__lanFlush() : true').catch(() => {}) : null),
      log: (m) => console.warn('[wifi]', m),
    });
  } catch (e) { console.error('wifi eşitleme başlatılamadı', e); lan = null; }
}
const lanCall = (f) => async (e, ...a) => {
  if (!lan) return { ok: false, error: 'NO_LAN' };
  try { return { ok: true, data: await f(...a) }; } catch (er) { return { ok: false, error: er.code || er.message || 'ERR' }; }
};
ipcMain.handle('lan:status', lanCall(() => lan.status()));
ipcMain.handle('lan:setOpen', lanCall((on) => lan.setOpen(!!on)));
ipcMain.handle('lan:pinShow', lanCall(() => lan.showPin()));
ipcMain.handle('lan:pinHide', lanCall(() => lan.hidePin()));
ipcMain.handle('lan:discover', lanCall(() => lan.discover(2500)));
ipcMain.handle('lan:pair', lanCall(async (o) => { const p = await lan.pair(String(o.host || ''), +o.port || 0, String(o.pin || ''), o.id || ''); await lan.setOpen(true); return p; }));
ipcMain.handle('lan:unpair', lanCall((id) => lan.unpair(String(id))));
ipcMain.handle('lan:put', lanCall((exam) => lan.put(exam)));
ipcMain.handle('lan:list', lanCall(() => lan.summary()));
ipcMain.handle('lan:get', lanCall((id) => lan.get(String(id))));
ipcMain.handle('lan:sync', lanCall((peerId) => lan.syncAll(peerId || null)));
ipcMain.handle('lan:openBackups', lanCall(() => { fs.mkdirSync(lan.conflictDir, { recursive: true }); return shell.openPath(lan.conflictDir); }));
app.on('before-quit', () => { try { if (lan) lan.stop(); } catch { /* yok */ } });
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
