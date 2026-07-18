/**
 * NOVA-X Wake-Word Engine
 * ---------------------------------------------------------------------
 * Always-on, low-latency "Hey Nova" style activation, built on top of
 * the browser's native SpeechRecognition (Electron ships Chromium, so
 * this works out of the box with zero extra native dependencies/licenses
 * — no Porcupine/Picovoice key needed).
 *
 * How it works:
 * 1. Runs SpeechRecognition in `continuous` mode in the background.
 * 2. Every time we get a final transcript, we check if it contains one
 *    of the configured wake phrases (default: "nova", "hey nova", "ok boss").
 * 3. If the wake phrase is the *whole* utterance, we switch to "armed"
 *    mode and wait (with a short timeout) for the next final transcript,
 *    which becomes the actual command.
 * 4. If the wake phrase is followed immediately by more speech in the
 *    SAME utterance (e.g. "hey nova what's the weather"), we strip the
 *    wake phrase and fire the command immediately — this is the
 *    near-zero-latency path.
 * 5. Chromium's SpeechRecognition auto-stops after a pause, so we
 *    auto-restart it in a loop for as long as the engine is enabled.
 * 6. We pause listening while NOVA-X is speaking (TTS) so it doesn't
 *    hear itself and false-trigger.
 */

type WakeWordCallback = (command: string) => void

interface WakeWordEngineOptions {
  wakePhrases?: string[]
  armedTimeoutMs?: number
  lang?: string
  onWake?: () => void // fired the instant the wake phrase alone is heard
  onCommand?: WakeWordCallback // fired with the resolved command text
  onStatusChange?: (status: WakeWordStatus) => void
  onError?: (error: string) => void
}

export type WakeWordStatus = 'idle' | 'listening' | 'armed' | 'unsupported' | 'error'

const DEFAULT_WAKE_PHRASES = ['hey nova', 'ok nova', 'nova', 'ok boss', 'hey boss']

function normalize(text: string): string {
  return text.toLowerCase().replace(/[.,!?]/g, '').trim()
}

class WakeWordEngine {
  private recognition: any = null
  private enabled = false
  private armed = false
  private armedTimer: ReturnType<typeof setTimeout> | null = null
  private restartTimer: ReturnType<typeof setTimeout> | null = null
  private status: WakeWordStatus = 'idle'
  private opts: Required<Omit<WakeWordEngineOptions, 'onWake' | 'onCommand' | 'onStatusChange' | 'onError'>> & WakeWordEngineOptions

  constructor(options: WakeWordEngineOptions = {}) {
    this.opts = {
      wakePhrases: (options.wakePhrases || DEFAULT_WAKE_PHRASES).map(normalize),
      armedTimeoutMs: options.armedTimeoutMs ?? 6000,
      lang: options.lang || 'en-US',
      onWake: options.onWake,
      onCommand: options.onCommand,
      onStatusChange: options.onStatusChange,
      onError: options.onError
    }
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  }

  private setStatus(status: WakeWordStatus): void {
    this.status = status
    this.opts.onStatusChange?.(status)
  }

  getStatus(): WakeWordStatus {
    return this.status
  }

  setWakePhrases(phrases: string[]): void {
    this.opts.wakePhrases = phrases.map(normalize)
  }

  private matchWakePhrase(transcript: string): { matched: boolean; remainder: string } {
    const norm = normalize(transcript)
    for (const phrase of this.opts.wakePhrases as string[]) {
      if (norm === phrase) {
        return { matched: true, remainder: '' }
      }
      if (norm.startsWith(phrase + ' ')) {
        return { matched: true, remainder: norm.slice(phrase.length).trim() }
      }
    }
    return { matched: false, remainder: '' }
  }

  private armForCommand(): void {
    this.armed = true
    this.setStatus('armed')
    this.opts.onWake?.()
    if (this.armedTimer) clearTimeout(this.armedTimer)
    this.armedTimer = setTimeout(() => {
      this.armed = false
      if (this.enabled) this.setStatus('listening')
    }, this.opts.armedTimeoutMs)
  }

  private handleResult(event: any): void {
    // Ignore anything heard while NOVA-X itself is talking, to avoid
    // the assistant triggering itself off its own TTS output.
    if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) return

    const lastResultIndex = event.results.length - 1
    const result = event.results[lastResultIndex]
    if (!result || !result.isFinal) return

    const transcript = result[0]?.transcript || ''
    if (!transcript.trim()) return

    if (this.armed) {
      // We were waiting for the actual command after the wake phrase.
      this.armed = false
      if (this.armedTimer) clearTimeout(this.armedTimer)
      this.setStatus('listening')
      this.opts.onCommand?.(transcript.trim())
      return
    }

    const { matched, remainder } = this.matchWakePhrase(transcript)
    if (!matched) return

    if (remainder) {
      // "hey nova what's the weather" - fire immediately, no round-trip.
      this.opts.onWake?.()
      this.opts.onCommand?.(remainder)
    } else {
      // Just "hey nova" - arm and wait for the follow-up utterance.
      this.armForCommand()
    }
  }

  private buildRecognition(): any {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = this.opts.lang

    recognition.onresult = (event: any) => this.handleResult(event)

    recognition.onerror = (event: any) => {
      // "no-speech" and "aborted" are routine (happens constantly during
      // always-on listening) - don't treat them as real errors.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        this.opts.onError?.(event.error)
      }
    }

    recognition.onend = () => {
      // Chromium's SpeechRecognition stops itself periodically even in
      // continuous mode. Auto-restart as long as we're still enabled.
      if (this.enabled) {
        if (this.restartTimer) clearTimeout(this.restartTimer)
        this.restartTimer = setTimeout(() => {
          if (this.enabled) this.start()
        }, 250)
      } else {
        this.setStatus('idle')
      }
    }

    return recognition
  }

  start(): boolean {
    if (!this.isSupported()) {
      this.setStatus('unsupported')
      return false
    }
    this.enabled = true
    try {
      this.recognition = this.buildRecognition()
      this.recognition.start()
      this.setStatus(this.armed ? 'armed' : 'listening')
      return true
    } catch (e) {
      // start() throws if a recognition instance is already running;
      // that's fine, it means we're already listening.
      return true
    }
  }

  stop(): void {
    this.enabled = false
    this.armed = false
    if (this.armedTimer) clearTimeout(this.armedTimer)
    if (this.restartTimer) clearTimeout(this.restartTimer)
    try {
      this.recognition?.stop()
    } catch (e) {
      // ignore
    }
    this.setStatus('idle')
  }
}

let sharedEngine: WakeWordEngine | null = null

/**
 * Get (or lazily create) the single shared wake-word engine instance for
 * the app. Callers should call `.start()`/`.stop()` and register their
 * callbacks via `configureWakeWordEngine` before starting.
 */
export function getWakeWordEngine(): WakeWordEngine {
  if (!sharedEngine) sharedEngine = new WakeWordEngine()
  return sharedEngine
}

export function configureWakeWordEngine(options: WakeWordEngineOptions): WakeWordEngine {
  sharedEngine = new WakeWordEngine(options)
  return sharedEngine
}

export default WakeWordEngine
