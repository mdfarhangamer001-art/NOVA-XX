import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

console.log('[NOVA-X Preload] Starting preload script initialization...')

const api = {}

const hasContextBridge = typeof contextBridge !== 'undefined'
console.log('[NOVA-X Preload] Environment inspection:', {
  hasContextBridge,
  processContextIsolated: process.contextIsolated,
  hasIpcRenderer: typeof ipcRenderer !== 'undefined',
  hasElectronAPI: typeof electronAPI !== 'undefined'
})

if (hasContextBridge) {
  try {
    console.log('[NOVA-X Preload] Initiating contextBridge.exposeInMainWorld for "electron"...')
    contextBridge.exposeInMainWorld('electron', {
      ...electronAPI,
      ipcRenderer: {
        ...electronAPI.ipcRenderer,
        invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
        send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
        on: (channel: string, listener: (...args: any[]) => void) => {
          ipcRenderer.on(channel, listener)
          return () => {
            ipcRenderer.removeListener(channel, listener)
          }
        },
        off: (channel: string, listener: (...args: any[]) => void) => {
          ipcRenderer.removeListener(channel, listener)
        }
      }
    })
    console.log('[NOVA-X Preload] contextBridge.exposeInMainWorld("electron") completed successfully.')

    console.log('[NOVA-X Preload] Initiating contextBridge.exposeInMainWorld for "api"...')
    contextBridge.exposeInMainWorld('api', api)
    console.log('[NOVA-X Preload] contextBridge.exposeInMainWorld("api") completed successfully.')

    console.log('[NOVA-X Preload] Initiating contextBridge.exposeInMainWorld for "iris"...')
    contextBridge.exposeInMainWorld('iris', {
      sendVisionFrame: (base64Frame: string) => ipcRenderer.invoke('iris-send-vision-frame', base64Frame),
      transcribeAudio: (base64Audio: string, mimeType: string) => ipcRenderer.invoke('iris-transcribe-audio', { base64Audio, mimeType }),
      getMemories: () => ipcRenderer.invoke('get-memories'),
      deleteMemory: (index: number) => ipcRenderer.invoke('delete-memory', index),
      launchApp: (appName: string) => ipcRenderer.invoke('launch-app', appName),
      adbConnect: (ip: string, port: string) => ipcRenderer.invoke('adb-connect', { ip, port }),
      adbDisconnect: () => ipcRenderer.invoke('adb-disconnect'),
      adbTelemetry: () => ipcRenderer.invoke('adb-telemetry'),
      adbQuickAction: (action: string) => ipcRenderer.invoke('adb-quick-action', { action }),
      onTranscript: (callback: any) => {
        (window as any)._onTranscriptCallback = callback;
      },
      onTranscriptComplete: (callback: any) => {
        (window as any)._onTranscriptCompleteCallback = callback;
      }
    })
    console.log('[NOVA-X Preload] contextBridge.exposeInMainWorld("iris") completed successfully.')
  } catch (error) {
    console.error('[NOVA-X Preload] Failed to expose APIs via contextBridge:', error)
    // Fallback to window assignments
    exposeOnWindow()
  }

  // Validate that critical APIs were exposed successfully
  const windowElectronType = typeof (window as any).electron
  const windowIrisType = typeof (window as any).iris
  console.log('[NOVA-X Preload] Verification check on window object in preload context:', {
    windowElectronType,
    windowIrisType,
    windowApiType: typeof (window as any).api
  })

  if (windowElectronType === 'undefined' || windowIrisType === 'undefined') {
    console.warn('[NOVA-X Preload Warning] window.electron or window.iris remains undefined after contextBridge initialization! Attempting window exposure fallback.')
    exposeOnWindow()
  } else {
    console.log('[NOVA-X Preload] Critical APIs are successfully detected on the window object.')
  }
} else {
  console.log('[NOVA-X Preload] contextBridge is not available in this environment. Falling back directly to window exposure.')
  exposeOnWindow()
}

function exposeOnWindow() {
  console.log('[NOVA-X Preload] Exposing APIs directly onto the global window object...')
  try {
    // @ts-ignore (define in dts)
    window.electron = {
      ...electronAPI,
      ipcRenderer: {
        ...electronAPI.ipcRenderer,
        invoke: ipcRenderer.invoke.bind(ipcRenderer),
        send: ipcRenderer.send.bind(ipcRenderer),
        on: (channel: string, listener: (...args: any[]) => void) => {
          ipcRenderer.on(channel, listener)
          return () => {
            ipcRenderer.removeListener(channel, listener)
          }
        },
        off: (channel: string, listener: (...args: any[]) => void) => {
          ipcRenderer.removeListener(channel, listener)
        }
      }
    }
    console.log('[NOVA-X Preload] Direct "window.electron" assignment completed.')

    // @ts-ignore (define in dts)
    window.api = api
    console.log('[NOVA-X Preload] Direct "window.api" assignment completed.')

    // @ts-ignore
    window.iris = {
      sendVisionFrame: (base64Frame: string) => ipcRenderer.invoke('iris-send-vision-frame', base64Frame),
      transcribeAudio: (base64Audio: string, mimeType: string) => ipcRenderer.invoke('iris-transcribe-audio', { base64Audio, mimeType }),
      getMemories: () => ipcRenderer.invoke('get-memories'),
      deleteMemory: (index: number) => ipcRenderer.invoke('delete-memory', index),
      launchApp: (appName: string) => ipcRenderer.invoke('launch-app', appName),
      adbConnect: (ip: string, port: string) => ipcRenderer.invoke('adb-connect', { ip, port }),
      adbDisconnect: () => ipcRenderer.invoke('adb-disconnect'),
      adbTelemetry: () => ipcRenderer.invoke('adb-telemetry'),
      adbQuickAction: (action: string) => ipcRenderer.invoke('adb-quick-action', { action }),
      onTranscript: (callback: any) => {
        (window as any)._onTranscriptCallback = callback;
      },
      onTranscriptComplete: (callback: any) => {
        (window as any)._onTranscriptCompleteCallback = callback;
      }
    }
    console.log('[NOVA-X Preload] Direct "window.iris" assignment completed.')

    // Add immediate post-check verification
    console.log('[NOVA-X Preload] Direct assignment verification:', {
      windowElectronExisted: typeof (window as any).electron !== 'undefined',
      windowIrisExisted: typeof (window as any).iris !== 'undefined',
      windowApiExisted: typeof (window as any).api !== 'undefined'
    })
  } catch (e) {
    console.error('[NOVA-X Preload] Critical error exposing APIs on window:', e)
  }
}
