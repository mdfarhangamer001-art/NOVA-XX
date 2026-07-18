import { contextBridge, ipcRenderer, webFrame } from 'electron'

// FIX: We no longer import electronAPI from '@electron-toolkit/preload'.
// In the packaged app that module was failing to resolve at runtime
// ("Error: module not found: @electron-toolkit/preload"), which made the
// WHOLE preload script throw and abort before it could expose ANYTHING.
// That is why window.electron / window.iris were always undefined,
// which caused: mic not working, no AI replies, and the phone companion
// screen falling back to fake data ("Secure Bridge not found").
//
// Below is a minimal, self-contained replacement with no external deps.

const electronAPI = {
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
    sendSync: (channel: string, ...args: any[]) => ipcRenderer.sendSync(channel, ...args),
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, listener: (...args: any[]) => void) => {
      const wrapped = (_event: any, ...args: any[]) => listener(...args)
      ipcRenderer.on(channel, wrapped)
      return () => ipcRenderer.removeListener(channel, wrapped)
    },
    once: (channel: string, listener: (...args: any[]) => void) => {
      ipcRenderer.once(channel, (_event, ...args) => listener(...args))
    },
    off: (channel: string, listener: (...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, listener)
    },
    removeListener: (channel: string, listener: (...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, listener)
    },
    removeAllListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(channel)
    }
  },
  webFrame: {
    insertCSS: (css: string) => webFrame.insertCSS(css),
    setZoomFactor: (factor: number) => webFrame.setZoomFactor(factor),
    setZoomLevel: (level: number) => webFrame.setZoomLevel(level)
  },
  process: {
    platform: process.platform,
    versions: process.versions,
    env: {} as Record<string, string>
  }
}

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
  } catch (error) {
    console.error('[NOVA-X Preload] Failed to expose APIs:', error)
  }

  // Validate that critical APIs were exposed successfully
  if (typeof (window as any).electron === 'undefined' || typeof (window as any).iris === 'undefined') {
    console.warn('[NOVA-X Preload Warning] window.electron or window.iris remains undefined after contextBridge initialization!')
  }
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
