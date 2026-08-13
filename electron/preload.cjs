const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('timeboard', {
  getSummary: (range) => ipcRenderer.invoke('tb:summary', range),
  getUnused: (days) => ipcRenderer.invoke('tb:unused', days),
  getSettings: () => ipcRenderer.invoke('tb:getSettings'),
  setSettings: (patch) => ipcRenderer.invoke('tb:setSettings', patch),
  getNow: () => ipcRenderer.invoke('tb:now'),
  exportCsv: (range) => ipcRenderer.invoke('tb:exportCsv', range),
  uninstall: (app) => ipcRenderer.invoke('tb:uninstall', app),
  openLocation: (app) => ipcRenderer.invoke('tb:openLocation', app),
  refreshInstalled: () => ipcRenderer.invoke('tb:refreshInstalled'),
  getIcons: (reqs) => ipcRenderer.invoke('tb:icons', reqs),
  onIcon: (cb) => {
    const listener = (_e, payload) => cb(payload)
    ipcRenderer.on('tb:icon-ready', listener)
    return () => ipcRenderer.removeListener('tb:icon-ready', listener)
  },
})
