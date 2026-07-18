/**
 * NOVA-X Robust Text-to-Speech Engine
 * Handles async voice loading in Electron with retries + fallbacks
 */

export type VoiceGender = 'male' | 'female'

export interface VoiceProfile {
  id: string
  name: string
  gender: VoiceGender
  lang: string
  pitch: number
  rate: number
  volume: number
}

// Neural voice profiles - mapped to best available system voice
export const VOICE_PROFILES: VoiceProfile[] = [
  { id: 'ARES', name: 'Ares', gender: 'male', lang: 'en-US', pitch: 0.85, rate: 1.0, volume: 1.0 },
  { id: 'HELIOS', name: 'Helios', gender: 'male', lang: 'en-US', pitch: 0.5, rate: 0.95, volume: 1.0 },
  { id: 'LYRA', name: 'Lyra', gender: 'female', lang: 'en-US', pitch: 1.1, rate: 1.05, volume: 1.0 },
  { id: 'ECHO', name: 'Echo', gender: 'female', lang: 'en-US', pitch: 1.3, rate: 1.1, volume: 1.0 }
]

let cachedVoices: SpeechSynthesisVoice[] = []
let voicesReady = false
let initAttempts = 0
const MAX_INIT_ATTEMPTS = 20

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([])
      return
    }

    const existing = window.speechSynthesis.getVoices()
    if (existing && existing.length > 0) {
      cachedVoices = existing
      voicesReady = true
      resolve(existing)
      return
    }

    let resolved = false
    const handler = () => {
      if (resolved) return
      const voices = window.speechSynthesis.getVoices()
      if (voices && voices.length > 0) {
        resolved = true
        cachedVoices = voices
        voicesReady = true
        window.speechSynthesis.removeEventListener('voiceschanged', handler)
        resolve(voices)
      }
    }

    window.speechSynthesis.addEventListener('voiceschanged', handler)
    // Trigger a load
    window.speechSynthesis.getVoices()

    // Retry loop - Electron sometimes needs multiple nudges
    const retry = () => {
      initAttempts++
      if (resolved) return
      const voices = window.speechSynthesis.getVoices()
      if (voices && voices.length > 0) {
        resolved = true
        cachedVoices = voices
        voicesReady = true
        window.speechSynthesis.removeEventListener('voiceschanged', handler)
        resolve(voices)
      } else if (initAttempts < MAX_INIT_ATTEMPTS) {
        setTimeout(retry, 200)
      } else {
        // Give up after ~4 seconds
        if (!resolved) {
          resolved = true
          window.speechSynthesis.removeEventListener('voiceschanged', handler)
          resolve([])
        }
      }
    }
    setTimeout(retry, 100)
  })
}

// Pre-warm voices on module load
if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices().catch(() => {})
}

function getBestVoice(
  gender: VoiceGender,
  lang: string
): SpeechSynthesisVoice | null {
  if (!cachedVoices || cachedVoices.length === 0) return null

  const langPrefix = lang.split('-')[0].toLowerCase()

  // Gender preference hints (by common voice name patterns)
  const maleHints = ['david', 'mark', 'george', 'james', 'male', 'daniel', 'alex', 'fred']
  const femaleHints = ['zira', 'susan', 'samantha', 'victoria', 'female', 'karen', 'moira', 'tessa']

  const hints = gender === 'male' ? maleHints : femaleHints

  // 1. Try exact lang match + gender hint
  let candidate = cachedVoices.find(
    (v) =>
      v.lang.toLowerCase().startsWith(langPrefix) &&
      hints.some((h) => v.name.toLowerCase().includes(h))
  )
  if (candidate) return candidate

  // 2. Try lang match only
  candidate = cachedVoices.find((v) => v.lang.toLowerCase().startsWith(langPrefix))
  if (candidate) return candidate

  // 3. Try gender hint only
  candidate = cachedVoices.find((v) => hints.some((h) => v.name.toLowerCase().includes(h)))
  if (candidate) return candidate

  // 4. Fallback to first voice
  return cachedVoices[0] || null
}

let currentProfileId = 'ARES'
let currentLang = 'en-US'

export function setTtsProfile(profileId: string): void {
  currentProfileId = profileId
}

export function setTtsLang(lang: string): void {
  currentLang = lang
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  return cachedVoices
}

export function isTtsReady(): boolean {
  return voicesReady && cachedVoices.length > 0
}

export async function ensureVoicesLoaded(): Promise<boolean> {
  if (voicesReady && cachedVoices.length > 0) return true
  const voices = await loadVoices()
  return voices.length > 0
}

/**
 * Speak text using Web Speech API with robust voice matching.
 * Returns true if speech was initiated, false if it failed.
 */
export async function speak(
  text: string,
  options?: { profileId?: string; lang?: string; onEnd?: () => void; onStart?: () => void }
): Promise<boolean> {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('[NOVA-X TTS] speechSynthesis not available')
    return false
  }

  // Ensure voices are loaded
  const hasVoices = await ensureVoicesLoaded()
  if (!hasVoices) {
    console.warn('[NOVA-X TTS] No system voices available. Cannot speak.')
    return false
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  const profileId = options?.profileId || currentProfileId
  const lang = options?.lang || currentLang
  const profile = VOICE_PROFILES.find((p) => p.id === profileId) || VOICE_PROFILES[0]

  // Clean text - remove markdown artifacts
  const cleanText = text
    .replace(/[*#`_~>|]/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (!cleanText) return false

  const utterance = new SpeechSynthesisUtterance(cleanText)
  utterance.lang = lang
  utterance.volume = profile.volume
  utterance.rate = profile.rate
  utterance.pitch = profile.pitch

  const voice = getBestVoice(profile.gender, lang)
  if (voice) {
    utterance.voice = voice
    console.log(`[NOVA-X TTS] Using voice: ${voice.name} (${voice.lang}) for profile ${profileId}`)
  } else {
    console.warn(`[NOVA-X TTS] No matching voice found for ${profile.gender}/${lang}`)
  }

  if (options?.onStart) utterance.onstart = options.onStart
  if (options?.onEnd) utterance.onend = options.onEnd

  utterance.onerror = (e) => {
    console.error('[NOVA-X TTS] Speech error:', e.error)
  }

  // Small delay helps Electron's speech synthesis start reliably
  setTimeout(() => {
    try {
      window.speechSynthesis.speak(utterance)
    } catch (err) {
      console.error('[NOVA-X TTS] Failed to speak:', err)
    }
  }, 50)

  return true
}

/**
 * Stop any ongoing speech immediately.
 */
export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

/**
 * Install the global speakText hook for legacy callers.
 * Call this once from the root component.
 */
export function installGlobalTts(): void {
  if (typeof window === 'undefined') return
  ;(window as any).speakText = (text: string) => {
    speak(text).catch(() => {})
  }
  ;(window as any).stopTts = stopSpeaking
  ;(window as any).setTtsProfile = setTtsProfile
  ;(window as any).setTtsLang = setTtsLang
  ;(window as any).ttsReady = () => isTtsReady()
}
