'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// npm kitaplıklarının (pdf.js) adresi: yamalı açılışta da ana paketteki node_modules
const LIB = (process.argv.find((a) => a.startsWith('--sinav-lib=')) || '').slice(12) || null;

const inv = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);

contextBridge.exposeInMainWorld('api', {
  toggleFullscreen: inv('win:toggleFullscreen'),
  minimize: inv('win:minimize'),
  quit: inv('win:quit'),
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
  contactMail: inv('contact:mail'),
  readDict: inv('dict:read'),
  libBase: LIB,
  inspectPatch: inv('patch:inspect'),
  installPatch: inv('patch:install'),
  installPatchData: inv('patch:installData'),
  removePatch: inv('patch:remove'),
  relaunch: inv('app:relaunch'),
  focusWin: inv('app:focus'),
  makePdf: inv('pdf:make'),
  makeDocx: inv('docx:make'),
  translate: inv('translate'),
  translateDict: inv('translate:dict'),
  archiveRead: inv('archive:read'),
  archiveWrite: inv('archive:write'),
});

// Asistan Agent: aynı bilgisayardaki programlarla sayaç paylaşımı (fc-agent-main.js)
;(function () {
  const e = require('electron'), un = (p) => p.then((r) => { if (r && r.ok) return r.data; throw new Error((r && r.error) || 'ERR'); });
  const api = { read: () => un(e.ipcRenderer.invoke('fc:agent:read')), write: (k, j) => un(e.ipcRenderer.invoke('fc:agent:write', k, j)), remove: (k) => un(e.ipcRenderer.invoke('fc:agent:remove', k)) };
  try { e.contextBridge.exposeInMainWorld('fcAgentHost', api); } catch (x) { try { window.fcAgentHost = api; } catch (y) {} }
})();
