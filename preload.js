'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pendingAPI', {
  getInfo: () => ipcRenderer.invoke('db:get-info'),
  list: () => ipcRenderer.invoke('db:list'),
  seed: (items) => ipcRenderer.invoke('db:seed', items),
  create: (payload) => ipcRenderer.invoke('db:create', payload),
  update: (id, payload) => ipcRenderer.invoke('db:update', id, payload),
  remove: (id) => ipcRenderer.invoke('db:delete', id)
});
