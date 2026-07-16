import { useState, useEffect } from 'react'
import { LANGUAGES } from '../data/languages'

// JWT token decode helper for real Google login profile parsing
const decodeJwt = (token: string): any => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    return null
  }
}

import {
  Camera,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Monitor,
  Cpu,
  Thermometer,
  Database,
  Radio,
  ArrowUp,
  ArrowDown,
  Activity,
  LogIn,
  Lock,
  LogOut,
  Sliders,
  Volume2,
  Tv
} from 'lucide-react'
import RightPanel from '@renderer/components/UI/RightPanel'
import AICore from '@renderer/components/UI/AICoreSphere'
import OrbErrorBoundary from '@renderer/components/UI/OrbErrorBoundary'
import { getSystemStatus, SystemStats } from '@renderer/services/system-info'

// 4 Custom Futuristic Neural Voices
interface VoiceProfile {
  id: string
  name: string
  gender: 'MALE' | 'FEMALE'
  description: string
  pitch: number
  rate: number
  chimeFreq: number
  introText: string
}

interface OperatorUser {
  name: string
  email: string
  provider: string
  syncTime: string
  avatar: string
}

const VOICES: VoiceProfile[] = [
  {
    id: 'ARES',
    name: 'ARES (Jarvis Heavy)',
    gender: 'MALE',
    description: 'Deep, resonant, baritone Jarvis-level AI core with slow authoritative timbre.',
    pitch: 0.52,
    rate: 0.82,
    chimeFreq: 180,
    introText: 'Nova-X Neural System fully synchronized. I am Ares, your tactical administrator.'
  },
  {
    id: 'HELIOS',
    name: 'HELIOS (Jarvis Command)',
    gender: 'MALE',
    description: 'Rich, tech-forward, mechanical tactical voice for rapid command feedback.',
    pitch: 0.65,
    rate: 0.96,
    chimeFreq: 240,
    introText: 'Helios protocol active. System online and ready to execute terminal operations, operator.'
  },
  {
    id: 'LYRA',
    name: 'LYRA (Virtual Clear)',
    gender: 'FEMALE',
    description: 'Crisp, neutral, pleasant virtual companion voice optimized for clean responses.',
    pitch: 1.12,
    rate: 1.0,
    chimeFreq: 440,
    introText: 'Lyra virtual engine online. Diagnostics complete, how can I assist your workflow today?'
  },
  {
    id: 'ECHO',
    name: 'ECHO (Holographic)',
    gender: 'FEMALE',
    description: 'Warm, soft, spatial virtual voice with natural, casual speech pacing.',
    pitch: 1.25,
    rate: 1.02,
    chimeFreq: 520,
    introText: 'Echo holographic model synced. Let us get started, I am here to assist.'
  }
]

export default function Dashboard({
  isConnected,
  toggleConnection,
  isSpeaking,
  isMuted,
  handleMicToggle
}: {
  isConnected: boolean
  toggleConnection: () => void
  isSpeaking: boolean
  isMuted: boolean
  handleMicToggle: () => void
}): JSX.Element {
  const [visionMode, setVisionMode] = useState<'off' | 'camera' | 'screen'>('off')

  // 3D Core customization states
  const [coreType, setCoreType] = useState<'quantum' | 'cube' | 'matrix' | 'nebula'>(
    (localStorage.getItem('novax_core_type') as 'quantum' | 'cube' | 'matrix' | 'nebula') || 'quantum'
  )
  const [coreSize, setCoreSize] = useState<number>(
    parseFloat(localStorage.getItem('novax_core_size') || '0.8')
  )

  // Auth operator state (for Google bypass feature) - lazy loaded from localStorage
  const [authOperator, setAuthOperator] = useState<OperatorUser | null>(() => {
    const cachedAuth = localStorage.getItem('novax_operator')
    if (cachedAuth) {
      try {
        return JSON.parse(cachedAuth) as OperatorUser
      } catch (e) {
        localStorage.removeItem('novax_operator')
      }
    }
    return null
  })
  const [showGoogleModal, setShowGoogleModal] = useState<boolean>(false)
  const [authLoading, setAuthLoading] = useState<boolean>(false)
  const [authProgress, setAuthProgress] = useState<string>('')

  // Interactive Google Sign-In step states
  const [googleStep, setGoogleStep] = useState<'choose' | 'email' | 'password' | 'syncing'>('choose')
  const [selectedGoogleEmail, setSelectedGoogleEmail] = useState<string>('boss@gmail.com')
  const [selectedGoogleName, setSelectedGoogleName] = useState<string>('Boss')
  const [selectedGoogleAvatar, setSelectedGoogleAvatar] = useState<string>(
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&auto=format&fit=crop&q=80'
  )
  const [googlePassword, setGooglePassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [customEmail, setCustomEmail] = useState<string>('')
  const [customName, setCustomName] = useState<string>('')

  // Selected voice state - lazy loaded
  const [activeVoice, setActiveVoice] = useState<string>(() => {
    return localStorage.getItem('novax_voice') || 'ARES'
  })
  const [voiceVolume, setVoiceVolume] = useState<number>(0.8)

  // Selected language state - lazy loaded
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    return localStorage.getItem('novax_lang') || 'en-US'
  })

  // Dynamic Google script loader and window bindings
  useEffect(() => {
    ;(window as any).selectedLanguage = selectedLanguage
    window.dispatchEvent(new CustomEvent('novax_lang_changed', { detail: selectedLanguage }))
  }, [selectedLanguage])

  useEffect(() => {
    const id = 'google-gsi-client'
    if (document.getElementById(id)) return

    const script = document.createElement('script')
    script.id = id
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }, [])

  // Render official Google Identity Services login button when modal opens
  useEffect(() => {
    if (showGoogleModal && googleStep === 'choose' && (window as any).google) {
      setTimeout(() => {
        try {
          const container = document.getElementById('gsi-button-container')
          if (container) {
            ;(window as any).google.accounts.id.initialize({
              client_id: '594791243891-v9l7v6mndm8eub9oee10r2vka3f31jfe.apps.googleusercontent.com',
              callback: (response: any) => {
                try {
                  const decoded = decodeJwt(response.credential)
                  if (decoded && decoded.email) {
                    completeGoogleSignIn(
                      decoded.email,
                      decoded.name || decoded.given_name || 'Google Operator',
                      decoded.picture || ''
                    )
                  }
                } catch (err) {
                  console.error('Google credentials parsing failed', err)
                }
              }
            });
            ;(window as any).google.accounts.id.renderButton(
              container,
              { theme: 'filled_black', size: 'large', width: 320, shape: 'pill' }
            )
          }
        } catch (e) {
          console.error('GIS render error', e)
        }
      }, 150)
    }
  }, [showGoogleModal, googleStep])

  // System stats fetched locally
  const [stats, setStats] = useState<SystemStats>({
    cpu: '0.0',
    memory: { total: '0.0', free: '0.0', usedPercentage: '0.0' },
    temperature: 0,
    os: { type: 'UNKNOWN', uptime: '0h' },
    network: { tx: 0, rx: 0, latency: 0 }
  })

  // Update real-time telemetry stats
  useEffect(() => {
    const fetchStats = async (): Promise<void> => {
      const liveStats = await getSystemStatus()
      if (liveStats) {
        setStats(liveStats)
      } else {
        // Mock slight variations for visual fidelity if native Electron is idle
        setStats((prev: SystemStats) => ({
          ...prev,
          cpu: (Math.random() * 15 + 5).toFixed(1),
          memory: { total: '16.0', free: '6.4', usedPercentage: (Math.random() * 5 + 58).toFixed(1) },
          temperature: Math.floor(Math.random() * 6 + 54),
          network: {
            tx: Math.floor(Math.random() * 30 + 10),
            rx: Math.floor(Math.random() * 60 + 20),
            latency: Math.floor(Math.random() * 12 + 18)
          },
          os: { type: 'WINDOWS 11', uptime: '4h 12m' }
        }))
      }
    }

    fetchStats()
    const pollInterval = setInterval(fetchStats, 2000)
    return () => clearInterval(pollInterval)
  }, [])

  // Pre-warm SpeechSynthesis voices and watch for voiceschanged events + track user interaction
  useEffect(() => {
    const handleInteraction = () => {
      ;(window as any).hasUserInteracted = true
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('keydown', handleInteraction)
      document.removeEventListener('mousedown', handleInteraction)
    }
    document.addEventListener('click', handleInteraction)
    document.addEventListener('keydown', handleInteraction)
    document.addEventListener('mousedown', handleInteraction)

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices()
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices()
      }
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged)
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
        document.removeEventListener('click', handleInteraction)
        document.removeEventListener('keydown', handleInteraction)
        document.removeEventListener('mousedown', handleInteraction)
      }
    }
    return () => {
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('keydown', handleInteraction)
      document.removeEventListener('mousedown', handleInteraction)
    }
  }, [])

  const getBestVoiceForGenderAndLang = (gender: 'MALE' | 'FEMALE', lang: string): SpeechSynthesisVoice | null => {
    if (!window.speechSynthesis) return null
    const systemVoices = window.speechSynthesis.getVoices()
    if (systemVoices.length === 0) {
      console.warn('[NOVA-X TTS] No system TTS voices found currently.')
      return null
    }

    const langLower = lang.toLowerCase().split('-')[0] // e.g. 'hi' or 'en'

    // 1. Try exact gender AND exact language prefix match
    let matchedVoice = systemVoices.find(
      (v) =>
        v.lang.toLowerCase().startsWith(langLower) &&
        (gender === 'MALE'
          ? v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('google uk english male')
          : v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('google uk english female'))
    )

    // 2. Try any voice for that language prefix
    if (!matchedVoice) {
      matchedVoice = systemVoices.find((v) => v.lang.toLowerCase().startsWith(langLower))
    }

    // 3. Try exact language code match
    if (!matchedVoice) {
      matchedVoice = systemVoices.find((v) => v.lang.toLowerCase() === lang.toLowerCase())
    }

    // 4. Fallback to general gender-only voice matching
    if (!matchedVoice) {
      if (gender === 'MALE') {
        matchedVoice = systemVoices.find(
          (v) =>
            v.name.toLowerCase().includes('google uk english male') ||
            v.name.toLowerCase().includes('david') ||
            v.name.toLowerCase().includes('male') ||
            v.name.toLowerCase().includes('natural male') ||
            v.name.toLowerCase().includes('microsoft david')
        )
      } else {
        matchedVoice = systemVoices.find(
          (v) =>
            v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('zira') ||
            v.name.toLowerCase().includes('google uk english female') ||
            v.name.toLowerCase().includes('hazel') ||
            v.name.toLowerCase().includes('microsoft zira')
        )
      }
    }

    return matchedVoice || null
  }

  // Expose global speech synthesizer hooked up to live window and layout states
  useEffect(() => {
    ;(window as any).speakText = (text: string) => {
      if (!window.speechSynthesis) return

      if (!(window as any).hasUserInteracted) {
        console.warn('[NOVA-X TTS] Speech synthesis blocked: Awaiting user interaction (click or keypress) to satisfy browser autoplay policy.')
        return
      }

      window.speechSynthesis.cancel()

      const selected = VOICES.find((v) => v.id === activeVoice)
      if (!selected) return

      // Strip common Markdown characters for beautiful spoken audio
      const cleanText = text.replace(/[*#`_\-]/g, '').trim()
      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.lang = selectedLanguage

      // Listen for voiceschanged event if browser hasn't finished loading voices
      window.speechSynthesis.onvoiceschanged = () => {
        const matchedVoice = getBestVoiceForGenderAndLang(selected.gender, selectedLanguage)
        if (matchedVoice) {
          utterance.voice = matchedVoice
        }
      }

      const matchedVoice = getBestVoiceForGenderAndLang(selected.gender, selectedLanguage)
      if (matchedVoice) {
        utterance.voice = matchedVoice
        console.log(`[NOVA-X TTS] Matched voice: ${matchedVoice.name} (${matchedVoice.lang})`)
      } else {
        console.warn(`[NOVA-X TTS] No voice match found for gender: ${selected.gender} and language: ${selectedLanguage}. Defaulting to browser choice.`)
      }

      utterance.pitch = selected.pitch
      utterance.rate = selected.rate
      utterance.volume = voiceVolume

      utterance.onstart = () => {
        if ((window as any).setIsSpeaking) {
          ;(window as any).setIsSpeaking(true)
        }
      }
      utterance.onend = () => {
        if ((window as any).setIsSpeaking) {
          ;(window as any).setIsSpeaking(false)
        }
      }
      utterance.onerror = (e) => {
        console.error('[NOVA-X TTS ERROR] Speech synthesis failed. Code:', e.error, '| Message:', e.message, '| Utterance:', e)
        if ((window as any).setIsSpeaking) {
          ;(window as any).setIsSpeaking(false)
        }
      }

      window.speechSynthesis.speak(utterance)
    }

    return () => {
      delete (window as any).speakText
    }
  }, [activeVoice, voiceVolume, selectedLanguage])

  const changeVisionMode = (mode: 'off' | 'camera' | 'screen'): void => {
    setVisionMode(mode)
  }

  // Synthesize diagnostic electronic chime using Web Audio
  const playDiagnosticChime = (freq: number): void => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.25)

      gainNode.gain.setValueAtTime(voiceVolume * 0.15, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3)

      osc.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      osc.start()
      osc.stop(audioCtx.currentTime + 0.3)
    } catch (e) {
      console.warn('Audio playback blocked by browser/iframe permissions.')
    }
  }

  // Trigger custom selected TTS speech playback
  const speakVoiceIntro = (voiceId: string): void => {
    const selected = VOICES.find((v) => v.id === voiceId)
    if (!selected) return

    playDiagnosticChime(selected.chimeFreq)

    if (!window.speechSynthesis) {
      console.warn('Speech synthesis is not supported on this device.')
      return
    }

    window.speechSynthesis.cancel() // cancel existing queue
    const utterance = new SpeechSynthesisUtterance(selected.introText)
    utterance.lang = selectedLanguage

    const matchedVoice = getBestVoiceForGenderAndLang(selected.gender, selectedLanguage)
    if (matchedVoice) {
      utterance.voice = matchedVoice
    }

    utterance.pitch = selected.pitch
    utterance.rate = selected.rate
    utterance.volume = voiceVolume

    window.speechSynthesis.speak(utterance)
  }

  // Handle Voice Change
  const handleVoiceSelect = (voiceId: string): void => {
    setActiveVoice(voiceId)
    localStorage.setItem('novax_voice', voiceId)
    speakVoiceIntro(voiceId)
  }

  // Initialize Interactive Google Account chooser modal
  const triggerGoogleSignIn = (): void => {
    setGoogleStep('choose')
    setShowGoogleModal(true)
    setGooglePassword('')
    setShowPassword(false)
    setCustomEmail('')
    setCustomName('')
    setAuthLoading(false)
  }

  // Complete Google login with full network syncing progress bar simulation
  const completeGoogleSignIn = (email: string, name: string, avatar: string): void => {
    setGoogleStep('syncing')
    setAuthLoading(true)
    setAuthProgress('Initializing Google secure sync channel...')

    setTimeout(() => {
      setAuthProgress('Fetching secure handshake tokens from OAuth...')
      setTimeout(() => {
        setAuthProgress('Authenticating keys with Nova-X Cloud Nodes...')
        setTimeout(() => {
          setAuthProgress('Syncing active database partitions & custom profiles...')
          setTimeout(() => {
            const operatorUser: OperatorUser = {
              name: name || 'Operator',
              email: email || 'operator@gmail.com',
              provider: 'GOOGLE_AUTH',
              syncTime: new Date().toLocaleTimeString(),
              avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'
            }
            localStorage.setItem('novax_operator', JSON.stringify(operatorUser))
            setAuthOperator(operatorUser)
            setAuthLoading(false)
            setShowGoogleModal(false)
            playDiagnosticChime(880)
          }, 800)
        }, 800)
      }, 800)
    }, 800)
  }

  // Bypass Google Login and launch Local offline mode (Saving everything in operator laptop)
  const triggerLocalOfflineBypass = (): void => {
    setAuthLoading(true)
    setGoogleStep('syncing')
    setShowGoogleModal(true)
    setAuthProgress('Bypassing online authentication systems...')

    setTimeout(() => {
      setAuthProgress('Activating Secure Sandbox memory matrices...')
      setTimeout(() => {
        setAuthProgress('Local Sandbox active. Persisting data inside operator laptop...')
        setTimeout(() => {
          const localUser: OperatorUser = {
            name: 'Local Sandbox Operator',
            email: 'offline.safe@local-host',
            provider: 'LOCAL_BYPASS',
            syncTime: new Date().toLocaleTimeString(),
            avatar: ''
          }
          localStorage.setItem('novax_operator', JSON.stringify(localUser))
          setAuthOperator(localUser)
          setAuthLoading(false)
          setShowGoogleModal(false)
          playDiagnosticChime(320)
        }, 800)
      }, 800)
    }, 800)
  }

  // Operator logout
  const handleOperatorLogout = (): void => {
    localStorage.removeItem('novax_operator')
    setAuthOperator(null)
    playDiagnosticChime(150)
  }

  const cpuValue = parseFloat(stats.cpu) || 0
  const ramValue = parseFloat(stats.memory?.usedPercentage) || 0
  const tempValue = stats.temperature || 0

  // HSL Dynamic Health Color logic for widgets
  const getHealthColor = (value: number, max: number): string => {
    const ratio = Math.min(1, Math.max(0, value / max))
    const hue = 120 * (1 - ratio) // transitions Green to Red
    return `hsl(${hue}, 90%, 50%)`
  }

  // Render Login Boot Gate if unauthenticated
  if (!authOperator) {
    return (
      <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 selection:bg-[#00f3ff]/20">
        {/* Dynamic Matrix-like Background *
