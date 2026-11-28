/* Yerel zeka — preload köprüsü. window.fcYerelZeka:
   durum(), kur(['ocr','mt']), iptal(), sil('ocr'|'mt'|'runtime'), ayar({gpu, ollama}), ilerleme(cb) → kaldırma işlevi,
   ocr({data: Uint8ClampedArray RGBA, width, height, langs, quality: 'en-iyi'|'hizli'}), cevir({text, from, to, memory}) */
'use strict';
function api(ipcRenderer) {
  return {
    durum: () => ipcRenderer.invoke('fcyz:durum'),
    kur: (names) => ipcRenderer.invoke('fcyz:kur', names),
    iptal: () => ipcRenderer.invoke('fcyz:iptal'),
    sil: (name) => ipcRenderer.invoke('fcyz:sil', name),
    ayar: (x) => ipcRenderer.invoke('fcyz:ayar', x),
    ocr: (a) => ipcRenderer.invoke('fcyz:ocr', a),
    cevir: (a) => ipcRenderer.invoke('fcyz:cevir', a),
    ilerleme: (cb) => { const f = (e, d) => { try { cb(d); } catch (x) {} }; ipcRenderer.on('fcyz:ilerleme', f); return () => ipcRenderer.removeListener('fcyz:ilerleme', f); },
  };
}
function expose(contextBridge, ipcRenderer) {
  const a = api(ipcRenderer);
  if (contextBridge && process.contextIsolated) contextBridge.exposeInMainWorld('fcYerelZeka', a);
  else if (typeof window !== 'undefined') window.fcYerelZeka = a;
  return a;
}
module.exports = { expose, api };
