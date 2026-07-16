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
      sendVisionFrame: (base64Frame: string) => ipcRenderer.invoke('iris-send-vision-frame', base64Frame)
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
    sendVisionFrame: (base64Frame: string) => ipcRenderer.invoke('iris-send-vision-frame', base64Frame)
  }
}