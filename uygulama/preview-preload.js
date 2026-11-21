'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const LIB = (process.argv.find((a) => a.startsWith('--sinav-lib=')) || '').slice(12) || null;

contextBridge.exposeInMainWorld('pv', {
  libBase: LIB,
  info: (id) => ipcRenderer.invoke('preview:info', id),
  rebuild: (id, html) => ipcRenderer.invoke('preview:rebuild', id, html),
  save: (id) => ipcRenderer.invoke('preview:save', id),
  open: (p) => ipcRenderer.invoke('preview:open', p),
});
