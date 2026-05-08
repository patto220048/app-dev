import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // File dialogs
  openImages: () => ipcRenderer.invoke('dialog:openImages'),
  openAudio: () => ipcRenderer.invoke('dialog:openAudio'),
  saveExport: () => ipcRenderer.invoke('dialog:saveExport'),

  // File operations
  readFileAsBase64: (path: string) => ipcRenderer.invoke('file:readAsBase64', path),
  readFileBuffer: (path: string) => ipcRenderer.invoke('file:readBuffer', path),
  readDataUrl: (path: string) => ipcRenderer.invoke('file:readDataUrl', path),

  // Project
  saveProject: (data: string) => ipcRenderer.invoke('project:save', data),
  loadProject: () => ipcRenderer.invoke('project:load'),
  exportProject: (options: any) => ipcRenderer.invoke('project:export', options),

  // Settings
  saveSettings: (settings: string) => ipcRenderer.invoke('settings:save', settings),
  loadSettings: () => ipcRenderer.invoke('settings:load'),

  // App
  getDataPath: () => ipcRenderer.invoke('app:getDataPath')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
