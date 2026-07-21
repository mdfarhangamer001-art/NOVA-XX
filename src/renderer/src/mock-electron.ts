// Real HTTP/SSE Bridge for NOVA-X in the Web Sandbox
if (typeof window !== 'undefined') {
  // Setup SSE (Server-Sent Events) for real-time events from the backend (e.g. chat stream, companion commands)
  const eventListeners: Record<string, Set<(...args: any[]) => void>> = {}

  const setupSSE = () => {
    console.log('[NOVA-X Bridge] Initializing EventStream connection...')
    const eventSource = new EventSource('/api/ipc-events')

    eventSource.onmessage = (event) => {
      try {
        const { channel, data } = JSON.parse(event.data)
        console.log(`[NOVA-X SSE] Event received [${channel}]:`, data)
        if (eventListeners[channel]) {
          eventListeners[channel].forEach((listener) => {
            try {
              listener({}, data)
            } catch (err) {
              console.error('[NOVA-X SSE] Callback error:', err)
            }
          })
        }
      } catch (e) {
        console.error('[NOVA-X SSE] JSON Parse Error:', e)
      }
    }

    eventSource.onerror = (e) => {
      console.warn('[NOVA-X SSE] EventSource disconnected. Retrying in 3s...', e)
      eventSource.close()
      setTimeout(setupSSE, 3000)
    }
  }

  setupSSE()

  // Define window.electron with a real bridge to /api/ipc
  if (!window.electron) {
    const mockIpcRenderer = {
      send: (channel: string, ...args: any[]) => {
        console.log(`[NOVA-X Bridge] send: ${channel}`, args)
        fetch('/api/ipc-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel, args })
        }).catch((err: any) => {
          if (err.message !== 'Failed to fetch') {
            console.error('[NOVA-X Bridge] Send failure:', err)
          }
        })
      },
      on: (channel: string, func: (...args: any[]) => void) => {
        if (!eventListeners[channel]) {
          eventListeners[channel] = new Set()
        }
        eventListeners[channel].add(func)
        return () => {
          eventListeners[channel]?.delete(func)
        }
      },
      off: (channel: string, func: (...args: any[]) => void) => {
        eventListeners[channel]?.delete(func)
      },
      removeListener: (channel: string, func: (...args: any[]) => void) => {
        eventListeners[channel]?.delete(func)
      },
      removeAllListeners: (channel: string) => {
        delete eventListeners[channel]
      },
      invoke: async (channel: string, ...args: any[]) => {
        console.log(`[NOVA-X Bridge] invoke: ${channel}`, args)
        try {
          const res = await fetch('/api/ipc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel, args })
          })
          if (!res.ok) {
            let serverError = `HTTP Error ${res.status}`
            try {
              const errData = await res.json()
              if (errData && errData.error) {
                serverError = errData.error
              }
            } catch (_) {}
            throw new Error(serverError)
          }
          const data = await res.json()
          if (data.error) {
            throw new Error(data.error)
          }
          return data.result
        } catch (err: any) {
          if (err.message !== 'Failed to fetch') {
            console.error(`[NOVA-X Bridge] IPC channel ${channel} failed:`, err)
          }
          throw err
        }
      }
    }

    ;(window as any).electron = {
      ipcRenderer: mockIpcRenderer,
      process: {
        platform: 'linux'
      }
    }
  }

  // Define window.iris with a real bridge to /api/ipc
  if (!(window as any).iris) {
    ;(window as any).iris = {
      getHistory: async () => {
        try {
          return await window.electron.ipcRenderer.invoke('iris-get-history')
        } catch (e) {
          return []
        }
      },
      sendVisionFrame: async (base64Frame: string) => {
        return await window.electron.ipcRenderer.invoke('iris-send-vision-frame', base64Frame)
      },
      transcribeAudio: async (base64Audio: string, mimeType: string) => {
        let geminiKey = localStorage.getItem('novax_gemini_key') || ''
        let groqKey = localStorage.getItem('novax_groq_key') || ''

        try {
          const secureKeys = await window.electron.ipcRenderer.invoke('secure-get-keys')
          if (secureKeys) {
            if (secureKeys.geminiKey) geminiKey = secureKeys.geminiKey
            if (secureKeys.groqKey) groqKey = secureKeys.groqKey
          }
        } catch (e) {
          // ignore secure key fetch failure in mock
        }

        return await window.electron.ipcRenderer.invoke('iris-transcribe-audio', {
          base64Audio,
          mimeType,
          geminiKey,
          groqKey
        })
      },
      getMemories: async (params?: any) => {
        return await window.electron.ipcRenderer.invoke('get-memories', params)
      },
      deleteMemory: async (index: number) => {
        return await window.electron.ipcRenderer.invoke('delete-memory', index)
      },
      launchApp: async (appName: string) => {
        return await window.electron.ipcRenderer.invoke('launch-app', appName)
      },
      adbConnect: async (ip: string, port: string) => {
        return await window.electron.ipcRenderer.invoke('adb-connect', { ip, port })
      },
      adbDisconnect: async () => {
        return await window.electron.ipcRenderer.invoke('adb-disconnect')
      },
      adbTelemetry: async () => {
        return await window.electron.ipcRenderer.invoke('adb-telemetry')
      },
      adbQuickAction: async (action: string) => {
        return await window.electron.ipcRenderer.invoke('adb-quick-action', { action })
      },
      onTranscript: (callback: any) => {
        ;(window as any)._onTranscriptCallback = callback
      },
      onTranscriptComplete: (callback: any) => {
        ;(window as any)._onTranscriptCompleteCallback = callback
      }
    }
  }
}
export {}
