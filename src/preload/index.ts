import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ...electronAPI,
      ipcRenderer: {
        ...electronAPI.ipcRenderer,
        invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args)
      }
    })
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('iris', {
      sendVisionFrame: (base64Frame: string) => ipcRenderer.invoke('iris-send-vision-frame', base64Frame),
      transcribeAudio: (base64Audio: string, mimeType: string) => ipcRenderer.invoke('iris-transcribe-audio', { base64Audio, mimeType }),
      getMemories: () => ipcRenderer.invoke('get-memories'),
      deleteMemory: (index: number) => ipcRenderer.invoke('delete-memory', index),
      launchApp: (appName: string) => ipcRenderer.invoke('launch-app', appName)
    })
  } catch (error) {}
} else {
  // @ts-ignore (define in dts)
  window.electron = {
    ...electronAPI,
    ipcRenderer: {
      ...electronAPI.ipcRenderer,
      invoke: ipcRenderer.invoke.bind(ipcRenderer)
    }
  }
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore
  window.iris = {
    sendVisionFrame: (base64Frame: string) => ipcRenderer.invoke('iris-send-vision-frame', base64Frame),
    transcribeAudio: (base64Audio: string, mimeType: string) => ipcRenderer.invoke('iris-transcribe-audio', { base64Audio, mimeType }),
    getMemories: () => ipcRenderer.invoke('get-memories'),
    deleteMemory: (index: number) => ipcRenderer.invoke('delete-memory', index),
    launchApp: (appName: string) => ipcRenderer.invoke('launch-app', appName)
  }
}