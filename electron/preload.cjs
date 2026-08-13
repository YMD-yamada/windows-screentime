const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('timeboard', {
  getSummary: (range) => ipcRenderer.invoke('tb:summary', range),
  getUnused: (days) => ipcRenderer.invoke('tb:unused', days),
  getSettings: () => ipcRenderer.invoke('tb:getSettings'),
  setSettings: (patch) => ipcRenderer.invoke('tb:setSettings', patch),
  getNow: () => ipcRenderer.invoke('tb:now'),
  exportCsv: (range) => ipcRenderer.invoke('tb:exportCsv', range),
  openUninstall: (app) => ipcRenderer.invoke('tb:openUninstall', app),
  refreshInstalled: () => ipcRenderer.invoke('tb:refreshInstalled'),
})
