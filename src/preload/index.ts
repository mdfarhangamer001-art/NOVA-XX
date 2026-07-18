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
      launchApp: (appName: string) => ipcRenderer.invoke('launch-app', appName),
      // FIX: these two were missing entirely, causing
      // "TypeError: window.iris.onTranscript is not a function" crash.
      // They register listeners for live streaming transcript events.
      onTranscript: (callback: (data: { role: string; text: string; isFinal: boolean }) => void) => {
        const wrapped = (_event: any, data: any) => callback(data)
        ipcRenderer.on('iris-transcript', wrapped)
        return () => ipcRenderer.removeListener('iris-transcript', wrapped)
      },
      onTranscriptComplete: (callback: () => void) => {
        const wrapped = () => callback()
        ipcRenderer.on('iris-transcript-complete', wrapped)
        return () => ipcRenderer.removeListener('iris-transcript-complete', wrapped)
      }
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
    launchApp: (appName: string) => ipcRenderer.invoke('launch-app', appName),
    onTranscript: (callback: (data: { role: string; text: string; isFinal: boolean }) => void) => {
      const wrapped = (_event: any, data: any) => callback(data)
      ipcRenderer.on('iris-transcript', wrapped)
      return () => ipcRenderer.removeListener('iris-transcript', wrapped)
    },
    onTranscriptComplete: (callback: () => void) => {
      const wrapped = () => callback()
      ipcRenderer.on('iris-transcript-complete', wrapped)
      return () => ipcRenderer.removeListener('iris-transcript-complete', wrapped)
    }
  }
}
