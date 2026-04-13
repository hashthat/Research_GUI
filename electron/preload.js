import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (filters) => ipcRenderer.invoke('open-file', filters),
  readFilePath: (filePath) => ipcRenderer.invoke('read-file-path', filePath),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  saveFile: (opts) => ipcRenderer.invoke('save-file', opts),
  printToPDF: (html) => ipcRenderer.invoke('print-to-pdf', html)
})
