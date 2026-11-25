'use strict';
// Sınav Hazırlama — preload. window.fcHost (ortak çekirdek: pencere düğmeleri, güncelleme, indirme) + window.api (uygulama).
// 1.10.0: eski yama (.sinavyama) ve pencere kanalları kaldırıldı; pencere düğmeleri ve güncelleme ortak çekirdekte.
const { contextBridge, ipcRenderer } = require('electron');
require('./cekirdek/electron/fc-preload.js');

// npm kitaplıklarının (pdf.js, jszip, docx-preview) adresi: paket kökündeki node_modules
const LIB = (process.argv.find((a) => a.startsWith('--sinav-lib=')) || '').slice(12) || null;

const inv = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);
const on = (ch) => (cb) => { const f = (_e, d) => cb(d); ipcRenderer.on(ch, f); return () => ipcRenderer.removeListener(ch, f); };

contextBridge.exposeInMainWorld('api', {
  shell: 'fc',                       // yeni kabuk (1.10.0+)
  openDialog: inv('dlg:open'),
  saveDialog: inv('dlg:save'),
  readExam: inv('exam:read'),
  writeExam: inv('exam:write'),
  readAutosave: inv('autosave:read'),
  writeAutosave: inv('autosave:write'),
  openPath: inv('shell:open'),
  showItem: inv('shell:showItem'),
  readImportFile: inv('import:readFile'),
  readTable: inv('vocab:readTable'),
  readBinary: inv('file:readBinary'),
  readOcrData: inv('ocr:data'),
  openBackups: inv('backup:open'),
  cloudBackupLast: inv('backup:cloudLast'),
  cloudBackupWrite: inv('backup:cloudWrite'),
  backupWrite: inv('backup:write'),
  getTemplate: inv('template:get'),
  importTemplate: inv('template:import'),
  readTemplateBg: inv('template:readBg'),
  setTemplateImages: inv('template:setImages'),
  readTemplateImages: inv('template:readImages'),
  setTemplateAuto: inv('template:setAuto'),
  removeTemplate: inv('template:remove'),
  exportTemplateRaw: inv('template:exportRaw'),
  importTemplateRaw: inv('template:importRaw'),
  appInfo: inv('app:info'),
  readDict: inv('dict:read'),
  libBase: LIB,
  relaunch: inv('app:relaunch'),
  focusWin: inv('app:focus'),
  makePdf: inv('pdf:make'),
  makeDocx: inv('docx:make'),
  translate: inv('translate'),
  translateDict: inv('translate:dict'),
  archiveRead: inv('archive:read'),
  archiveWrite: inv('archive:write'),
  // Wi-Fi eşitleme
  lan: {
    status: inv('lan:status'), setOpen: inv('lan:setOpen'), pinShow: inv('lan:pinShow'), pinHide: inv('lan:pinHide'),
    discover: inv('lan:discover'), pair: inv('lan:pair'), unpair: inv('lan:unpair'), put: inv('lan:put'), list: inv('lan:list'),
    get: inv('lan:get'), sync: inv('lan:sync'), openBackups: inv('lan:openBackups'),
    onChanged: on('lan:changed'), onPaired: on('lan:paired'),
  },
  // 1.10.1: genel arama, sonuçlar (optik okuma), çevrimiçi sınav, QR
  dizin: { search: inv('dizin:search'), get: inv('dizin:get'), rebuild: inv('dizin:rebuild') },
  sonuc: { read: inv('sonuc:read'), write: inv('sonuc:write') },
  yedek: { simdi: inv('yedek:simdi'), dogrula: inv('yedek:dogrula') },
  canli: {
    start: inv('canli:start'), status: inv('canli:status'), setOpen: inv('canli:setOpen'), allowRe: inv('canli:allowRe'), finishAll: inv('canli:finishAll'),
    stop: inv('canli:stop'), list: inv('canli:list'), get: inv('canli:get'), scanResult: inv('canli:scanResult'),
    onChanged: on('canli:changed'), onScan: on('canli:scan'),
  },
  qr: inv('qr:make'),
  writeText: inv('file:writeText'),
  writeBase64: inv('file:writeBase64'),
});
