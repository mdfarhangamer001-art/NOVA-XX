import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI & {
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>
        send(channel: string, ...args: any[]): void
        on(channel: string, func: (...args: any[]) => void): () => void
      }
    }
    api: unknown
    iris: {
      sendVisionFrame(base64Frame: string): Promise<any>
      transcribeAudio(
        base64Audio: string,
        mimeType: string,
        languageHint?: string
      ): Promise<{ success: boolean; transcript?: string; error?: string }>
    }
  }
}```

---

## src/renderer/src/IRISRoot.tsx  (REPLACE)
```tsx
import { useState, useEffect, useRef } from 'react'
import IRIS from './UI/IRIS'
import TitleBar from './components/Titlebar'
import {
  startWakeWordEngine,
  stopWakeWordEngine,
  isWakeWordEnabled,
  isWakeEngineSupported
} from './services/wakeWordEngine'

export type VisionMode = 'camera' | 'screen' | 'none'

const IndexRoot = (): JSX.Element => {
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  // Expose speaking state setter globally to link speech engine with Three.js rendering
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore - Expose global setter for speaking animation state linkage
      window.setIsSpeaking = (val: boolean): void => {
        setIsSpeaking(val)
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        /* eslint-disable-next-line @typescript-eslint/no-dynamic-delete */
        delete (window as Record<string, unknown>).setIsSpeaking
      }
    }
  }, [])

  // Tracks whether the current session was started by the wake word
  // (as opposed to the manual mic button), so we know whether to
  // auto-sleep after a period of silence.
  const wokenByVoiceRef = useRef(false)
  const idleSleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearIdleSleepTimer = (): void => {
    if (idleSleepTimerRef.current) {
      clearTimeout(idleSleepTimerRef.current)
      idleSleepTimerRef.current = null
    }
  }

  const toggleConnection = (): void => {
    if (isConnected) {
      wokenByVoiceRef.current = false
      clearIdleSleepTimer()
      setIsConnected(false)
      setIsMuted(false)
    } else {
      wokenByVoiceRef.current = false
      setIsConnected(true)
      setIsSpeaking(false) // Wait for user speech first
    }
  }

  const handleMicToggle = (): void => {
    const nextMutedState = !isMuted
    setIsMuted(nextMutedState)
  }

  const [activeLang, setActiveLang] = useState(() => {
    return (window as any).selectedLanguage || localStorage.getItem('novax_lang') || 'en-US'
  })

  useEffect(() => {
    const handleLangChange = (e: any) => {
      setActiveLang(e.detail || 'en-US')
    }
    window.addEventListener('novax_lang_changed', handleLangChange)
    return () => {
      window.removeEventListener('novax_lang_changed', handleLangChange)
    }
  }, [])

  // Background Wake Word Listener
  // Runs only while the assistant is NOT already connected, so it never
  // fights with the main conversation recognizer below for the microphone.
  useEffect(() => {
    if (isConnected) {
      stopWakeWordEngine()
      return
    }

    if (!isWakeWordEnabled() || !isWakeEngineSupported()) {
      return
    }

    startWakeWordEngine(activeLang, {
      onWake: (spokenRemainder) => {
        console.log('[NOVA-X] Woken by voice. Activating conversation core.')
        wokenByVoiceRef.current = true
        setIsMuted(false)
        setIsConnected(true)
        setIsSpeaking(false)

        // Bring the window to the foreground even if it was minimized
        // or sitting in the background when the wake word was spoken.
        if ((window as any).electron?.ipcRenderer) {
          ;(window as any).electron.ipcRenderer.send('focus-window')
        }

        // Greet the operator, and if they packed a command into the same
        // breath ("Hey IRIS, open Chrome"), run it immediately.
        setTimeout(() => {
          if ((window as any).speakText) {
            ;(window as any).speakText(spokenRemainder ? 'On it, Boss.' : 'Yes, Boss?')
          }
          if (spokenRemainder && (window as any).triggerVoiceCommand) {
            ;(window as any).triggerVoiceCommand(spokenRemainder)
          }
        }, 150)
      }
    })

    return () => {
      stopWakeWordEngine()
    }
  }, [isConnected, activeLang])

  // Auto-sleep: if a session was started hands-free by the wake word and
  // the operator goes quiet for a while, drop back to background
  // listening instead of keeping the mic hot indefinitely.
  useEffect(() => {
    if (!isConnected || !wokenByVoiceRef.current) {
      clearIdleSleepTimer()
      return
    }

    clearIdleSleepTimer()
    idleSleepTimerRef.current = setTimeout(() => {
      if (wokenByVoiceRef.current) {
        console.log('[NOVA-X] No activity detected. Returning to background listening.')
        wokenByVoiceRef.current = false
        setIsConnected(false)
        setIsMuted(false)
      }
    }, 45000)

    return clearIdleSleepTimer
    // Restart the idle timer every time the assistant finishes speaking
    // or the mic hears something new, since those are our best signals
    // of continued activity.
  }, [isConnected, isSpeaking])

  // Real-time Voice Recognition Loop
  //
  // NOTE: this used to rely on the browser's built-in SpeechRecognition
  // (webkitSpeechRecognition). That API needs a Google-owned key baked
  // into Chromium to reach Google's speech servers — a real Chrome browser
  // has that key, Electron's bundled Chromium does not. Net effect: the
  // mic would visibly turn on, the user would speak, and nothing would
  // ever come back (silent failure or a generic "network" error) — exactly
  // the "mic on tha, bola kuch, jawab hi nahi aaya" symptom.
  //
  // Fix: capture the mic ourselves, detect when the operator starts/stops
  // talking with a simple volume-based VAD, record just that utterance,
  // and transcribe it through the Gemini API key the app already has
  // configured (via window.iris.transcribeAudio -> apiKey.ts). This does
  // not touch the API key UI or any visual component.
  useEffect(() => {
    const shouldBeRunning = isConnected && !isMuted && !isSpeaking
    if (!shouldBeRunning) return

    let stopped = false
    let stream: MediaStream | null = null
    let audioCtx: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let source: MediaStreamAudioSourceNode | null = null
    let recorder: MediaRecorder | null = null
    let vadFrame = 0
    let speaking = false
    let silenceStartedAt = 0
    let chunks: BlobPart[] = []

    // Tuning: quiet enough to catch normal speech, not so sensitive that
    // fan/keyboard noise triggers it. SILENCE_MS is how long the operator
    // has to stop talking before we consider the utterance finished.
    const VOLUME_THRESHOLD = 0.02
    const SILENCE_MS = 1100
    const MIN_UTTERANCE_MS = 300

    let utteranceStartedAt = 0

    const pickMimeType = (): string => {
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
      for (const c of candidates) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c)) return c
      }
      return 'audio/webm'
    }

    const blobToBase64 = (blob: Blob): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          resolve(result.split(',')[1] || '')
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

    const startRecorder = (mimeType: string): void => {
      if (!stream) return
      chunks = []
      recorder = new MediaRecorder(stream, { mimeType })
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data)
      }
      recorder.onstop = () => {
        void (async () => {
          const duration = Date.now() - utteranceStartedAt
          if (duration < MIN_UTTERANCE_MS || chunks.length === 0) return
          try {
            const blob = new Blob(chunks, { type: mimeType })
            const base64 = await blobToBase64(blob)
            if (!base64) return
            const result = await window.iris.transcribeAudio(base64, mimeType, activeLang)
            if (result?.success && result.transcript && result.transcript.trim().length > 0) {
              console.log('[NOVA-X] Audio recognized:', result.transcript)
              // @ts-ignore - Invoke global trigger handler
              if (window.triggerVoiceCommand) {
                // @ts-ignore
                window.triggerVoiceCommand(result.transcript)
              }
            } else if (result && !result.success) {
              console.error('[NOVA-X] Transcription failed:', result.error)
            }
          } catch (err) {
            console.error('[NOVA-X] Failed to transcribe captured audio:', err)
          }
        })()
      }
      recorder.start()
      utteranceStartedAt = Date.now()
    }

    const tick = (): void => {
      if (stopped || !analyser) return
      const data = new Uint8Array(analyser.fftSize)
      analyser.getByteTimeDomainData(data)
      let sumSquares = 0
      for (let i = 0; i < data.length; i++) {
        const normalized = (data[i] - 128) / 128
        sumSquares += normalized * normalized
      }
      const rms = Math.sqrt(sumSquares / data.length)
      const now = Date.now()

      if (rms > VOLUME_THRESHOLD) {
        if (!speaking) {
          speaking = true
          const mimeType = pickMimeType()
          startRecorder(mimeType)
        }
        silenceStartedAt = 0
      } else if (speaking) {
        if (silenceStartedAt === 0) silenceStartedAt = now
        if (now - silenceStartedAt > SILENCE_MS) {
          speaking = false
          silenceStartedAt = 0
          if (recorder && recorder.state !== 'inactive') recorder.stop()
        }
      }

      vadFrame = requestAnimationFrame(tick)
    }

    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        audioCtx = new AudioContext()
        analyser = audioCtx.createAnalyser()
        analyser.fftSize = 1024
        source = audioCtx.createMediaStreamSource(stream)
        source.connect(analyser)
        console.log('[NOVA-X] Microphone listening active.')
        vadFrame = requestAnimationFrame(tick)
      } catch (err) {
        console.error('[NOVA-X] Could not access microphone:', err)
      }
    })()

    return () => {
      stopped = true
      console.log('[NOVA-X] Deactivating recognition core.')
      if (vadFrame) cancelAnimationFrame(vadFrame)
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null
        try {
          recorder.stop()
        } catch (_e) {
          // ignore
        }
      }
      if (source) source.disconnect()
      if (audioCtx) void audioCtx.close()
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
  }, [isConnected, isMuted, isSpeaking, activeLang])

  return (
    <div className="flex flex-col h-screen w-screen bg-black overflow-hidden relative border border-emerald-500/20 rounded-xl">
      <TitleBar />
      <div className="flex-1 relative">
        <IRIS
          isConnected={isConnected}
          toggleConnection={toggleConnection}
          isSpeaking={isSpeaking}
          isMuted={isMuted}
          handleMicToggle={handleMicToggle}
        />
      </div>
    </div>
  )
}

export default IndexRoot```

---

## package.json  (REPLACE)
```json
{
  "name": "nova-x",
  "version": "1.6.3",
  "description": "IRIS is not another chatbot you type at. It is an intelligent Voice-First Operating Layer that gives you complete, hands-free authority over your digital environment. It lives on your desktop, watches your workflow, and executes your intent instantly.",
  "main": "./out/main/index.js",
  "author": "System Operator <operator@novax.ai>",
  "homepage": "https://novax.ai",
  "scripts": {
    "format": "prettier --write .",
    "lint": "eslint --cache .",
    "typecheck": "tsc --build --pretty tsconfig.json",
    "dev": "vite",
    "build": "vite build",
    "build:electron": "electron-vite build",
    "dist:win": "electron-vite build && electron-builder --win --publish never"
  },
  "dependencies": {
    "@electron-toolkit/preload": "^3.0.2",
    "@electron-toolkit/utils": "^4.0.0",
    "@google/genai": "^2.12.0",
    "@gsap/react": "^2.1.2",
    "@react-three/fiber": "^8.17.14",
    "chalk": "^4.1.2",
    "electron-store": "^8.2.0",
    "electron-updater": "^6.8.9",
    "firebase": "^12.16.0",
    "framer-motion": "^12.40.0",
    "glob": "^13.0.6",
    "gsap": "^3.15.0",
    "javascript-obfuscator": "^5.4.7",
    "lucide-react": "^1.17.0",
    "react-icons": "^5.6.0",
    "react-markdown": "^10.1.0",
    "react-router-dom": "^7.17.0",
    "react-tooltip": "^6.0.7",
    "remark-gfm": "^4.0.1",
    "three": "^0.184.0"
  },
  "devDependencies": {
    "@electron-toolkit/eslint-config-prettier": "^3.0.0",
    "@electron-toolkit/eslint-config-ts": "^3.1.0",
    "@electron-toolkit/tsconfig": "^2.0.0",
    "@tailwindcss/vite": "^4.3.1",
    "@types/node": "^20.19.43",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "electron": "^30.5.1",
    "electron-builder": "^25.1.7",
    "electron-rebuild": "^3.2.9",
    "electron-vite": "^5.0.0",
    "eslint": "^9.5.0",
    "eslint-plugin-react": "^7.37.5",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.3",
    "prettier": "^3.1.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwindcss": "^4.3.1",
    "typescript": "^5.3.3",
    "vite": "^7.3.5"
  },
  "allowScripts": {
    "koffi@2.16.2": true,
    "vosk-koffi@1.1.1": true
  }
}```

---

## .github/workflows/ci.yml  (NEW FILE)
```yml
name: NOVA-X CI Gate

# This runs automatically on GitHub's own machines — nothing to install or
# run locally. It exists to catch broken code BEFORE it reaches `main`,
# since release.yml builds and publishes a real .exe the moment something
# lands on main with zero checks in front of it today.
#
# Flow: open a Pull Request -> this workflow runs -> if it's red, do not
# merge -> fix -> push again -> once green, merge to main -> release.yml
# takes over and builds the installer.

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

permissions:
  contents: read

jobs:
  verify:
    name: Typecheck, Lint & Build
    runs-on: windows-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Build (renderer + main, no packaging)
        run: npm run build:electron

      - name: Summary
        if: success()
        run: echo "All checks passed — safe to merge."
        shell: bash
