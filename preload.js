const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  
  copyToClipboard: (text) => {
    return ipcRenderer.invoke('copy-to-clipboard', text)
  },
  
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', callback)
  },
  
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})