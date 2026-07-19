import { useState, useEffect } from 'react'
import { LANGUAGES } from '../data/languages'
import Logo from '../assets/Logo.png'
import { auth as firebaseAuth, googleAuthProvider } from '../services/firebase'
import { signInWithPopup, GoogleAuthProvider as FirebaseGoogleAuthProvider } from 'firebase/auth'

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
    introText: 'NOVA-X Neural System fully synchronized. I am Ares, your tactical administrator.'
  },
  {
    id: 'HELIOS',
    name: 'HELIOS (Jarvis Command)',
    gender: 'MALE',
    description: 'Rich, tech-forward, mechanical tactical voice for rapid command feedback.',
    pitch: 0.65,
    rate: 0.96,
    chimeFreq: 240,
    introText:
      'Helios protocol active. System online and ready to execute terminal operations, operator.'
  },
  {
    id: 'LYRA',
    name: 'LYRA (Virtual Clear)',
    gender: 'FEMALE',
    description: 'Crisp, neutral, pleasant virtual companion voice optimized for clean responses.',
    pitch: 1.12,
    rate: 1.0,
    chimeFreq: 440,
    introText:
      'Lyra virtual engine online. Diagnostics complete, how can I assist your workflow today?'
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

  // Mic state & real-time input level tracking
  const [micStatus, setMicStatus] = useState<'idle' | 'listening' | 'transcribing'>('idle')
  const [micLevel, setMicLevel] = useState<number>(0)

  useEffect(() => {
    const handleMicState = (e: any) => {
      if (e.detail?.status) {
        setMicStatus(e.detail.status)
      }
    }
    const handleMicLevel = (e: any) => {
      setMicLevel(e.detail || 0)
    }

    window.addEventListener('novax_mic_state', handleMicState)
    window.addEventListener('novax_mic_level', handleMicLevel)

    return () => {
      window.removeEventListener('novax_mic_state', handleMicState)
      window.removeEventListener('novax_mic_level', handleMicLevel)
    }
  }, [])

  const getMicPulseClass = () => {
    if (micLevel > 0.08)
      return 'scale-125 border-emerald-400/85 shadow-[0_0_20px_rgba(52,211,153,0.6)]'
    if (micLevel > 0.04)
      return 'scale-115 border-emerald-400/65 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
    if (micLevel > 0.01)
      return 'scale-105 border-emerald-400/45 shadow-[0_0_10px_rgba(52,211,153,0.2)]'
    return 'scale-100 border-emerald-500/30'
  }

  // 3D Core customization states
  const [coreType, setCoreType] = useState<
    'quantum' | 'cube' | 'matrix' | 'nebula' | 'eva' | 'jarvis'
  >(
    (localStorage.getItem('novax_core_type') as
      'quantum' | 'cube' | 'matrix' | 'nebula' | 'eva' | 'jarvis') || 'quantum'
  )
  const [coreSize, setCoreSize] = useState<number>(
    parseFloat(localStorage.getItem('novax_core_size') || '0.8')
  )

  useEffect(() => {
    // Initial system check and briefing
    if (isConnected) {
      setTimeout(() => {
        triggerDailyBriefing()
      }, 2000)
    }
  }, [isConnected])

  const triggerDailyBriefing = async () => {
    const hours = new Date().getHours()
    let greeting = 'Good evening'
    if (hours < 12) greeting = 'Good morning'
    else if (hours < 18) greeting = 'Good afternoon'

    const briefingText = `${greeting}, Boss. Systems are 100% operational. Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. I have synchronized your neural store and prepared your tactical environment.`

    if ((window as any).speakText) {
      ;(window as any).speakText(briefingText)
    }
  }

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
  const [googleStep, setGoogleStep] = useState<'waiting' | 'success' | 'failed'>('waiting')

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
          memory: {
            total: '16.0',
            free: '6.4',
            usedPercentage: (Math.random() * 5 + 58).toFixed(1)
          },
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

  const getBestVoiceForGenderAndLang = (
    gender: 'MALE' | 'FEMALE',
    lang: string
  ): SpeechSynthesisVoice | null => {
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
          ? v.name.toLowerCase().includes('male') ||
            v.name.toLowerCase().includes('david') ||
            v.name.toLowerCase().includes('google uk english male')
          : v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('zira') ||
            v.name.toLowerCase().includes('google uk english female'))
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
  const changeVisionMode = (mode: 'off' | 'camera' | 'screen'): void => {
    setVisionMode(mode)
  }

  // Synthesize diagnostic electronic chime using Web Audio
  const playDiagnosticChime = (freq: number): void => {
    try {
      const audioCtx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )()
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

      // Prevent memory context leaks and crashes on low-end systems
      setTimeout(() => {
        try {
          audioCtx.close()
        } catch (_) {}
      }, 350)
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

  // Initialize Electron OAuth
  const triggerGoogleSignIn = async (): Promise<void> => {
    setShowGoogleModal(true)
    setGoogleStep('waiting')
    setAuthLoading(true)
    setAuthProgress('Waiting for secure Google Browser Sign-In...')

    const isRealElectron =
      typeof window !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron')
    if (window.electron?.ipcRenderer && isRealElectron) {
      try {
        const res = await window.electron.ipcRenderer.invoke('google-sign-in')
        if (res && res.success) {
          setGoogleStep('success')
          setAuthProgress('Google profile synced successfully!')
          const operatorUser: OperatorUser = {
            name: res.name || 'Operator',
            email: res.email || '',
            provider: 'GOOGLE_AUTH',
            syncTime: res.syncTime || new Date().toLocaleTimeString(),
            avatar: res.avatar || ''
          }
          localStorage.setItem('novax_operator', JSON.stringify(operatorUser))
          setTimeout(() => {
            setAuthOperator(operatorUser)
            setAuthLoading(false)
            setShowGoogleModal(false)
            playDiagnosticChime(880)
          }, 1500)
        } else {
          setGoogleStep('failed')
          setAuthProgress(res?.error || 'Google Sign-In failed.')
          setAuthLoading(false)
          playDiagnosticChime(150)
        }
      } catch (err: any) {
        setGoogleStep('failed')
        setAuthProgress(err.message || 'Google Sign-In failed.')
        setAuthLoading(false)
        playDiagnosticChime(150)
      }
    } else {
      // Real Web-based Google Sign-In using Firebase OAuth Popup
      try {
        setAuthProgress('Opening secure Google Authorization popup...')
        const result = await signInWithPopup(firebaseAuth, googleAuthProvider)
        const credential = FirebaseGoogleAuthProvider.credentialFromResult(result)
        const accessToken = credential?.accessToken

        if (accessToken) {
          setGoogleStep('success')
          setAuthProgress('Google authentication successful! Core synchronized.')
          const operatorUser: OperatorUser = {
            name: result.user.displayName || 'Operator',
            email: result.user.email || '',
            provider: 'GOOGLE_AUTH',
            syncTime: new Date().toLocaleTimeString(),
            avatar: result.user.photoURL || '',
            accessToken: accessToken
          }
          localStorage.setItem('novax_operator', JSON.stringify(operatorUser))
          setTimeout(() => {
            setAuthOperator(operatorUser)
            setAuthLoading(false)
            setShowGoogleModal(false)
            playDiagnosticChime(880)
          }, 1500)
        } else {
          throw new Error('Google OAuth token extraction failed.')
        }
      } catch (err: any) {
        console.error('[Web Google Sign-In] Error:', err)
        setGoogleStep('failed')
        setAuthProgress(err.message || 'Google Sign-In failed.')
        setAuthLoading(false)
        playDiagnosticChime(150)
      }
    }
  }

  // Operator logout
  const handleOperatorLogout = async (): Promise<void> => {
    if (window.electron?.ipcRenderer) {
      try {
        await window.electron.ipcRenderer.invoke('google-sign-out')
      } catch (e) {}
    }
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
        {/* Dynamic Matrix-like Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,243,255,0.06)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00f3ff]/20 to-transparent" />

        <div className="w-full max-w-md bg-zinc-950/80 backdrop-blur-3xl border border-[#00f3ff]/20 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,243,255,0.1)] flex flex-col text-center relative overflow-hidden">
          {/* Hex decorative nodes */}
          <div className="absolute top-2 left-2 font-mono text-[7px] text-[#00f3ff]/30 uppercase tracking-widest">
            NODE // GATE_SYS_V1.6
          </div>
          <div className="absolute top-2 right-2 font-mono text-[7px] text-emerald-400/30 uppercase tracking-widest animate-pulse">
            ● SECURE CORE
          </div>

          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="relative w-16 h-16 flex items-center justify-center border border-[#00f3ff]/30 rounded-xl bg-zinc-900/60 shadow-[0_0_20px_rgba(0,243,255,0.15)] overflow-hidden">
              <div className="absolute inset-0 border border-emerald-400/10 rounded-lg animate-ping scale-105" />
              <img src={Logo} className="w-11 h-11" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-[0.35em] text-white font-mono">NOVA-X</h2>
              <p className="text-[10px] font-mono tracking-widest text-[#00f3ff]/70 uppercase mt-1">
                Cognitive Operating System
              </p>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 font-sans tracking-wide leading-relaxed mb-8 px-2">
            Securely link your Google Identity to enable real-time network sync and preserve dynamic
            nodes.
          </p>

          <div className="flex flex-col gap-3">
            {/* Google Authentication Portal Trigger */}
            <button
              onClick={triggerGoogleSignIn}
              disabled={authLoading}
              className="group cursor-pointer w-full py-3.5 bg-white text-black font-mono font-bold text-xs tracking-widest uppercase rounded-xl transition-all duration-300 hover:bg-neutral-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] flex items-center justify-center gap-2 border border-white"
            >
              <LogIn size={14} className="group-hover:translate-x-0.5 transition-transform" />
              Sign In with Google
            </button>
          </div>

          {showGoogleModal && (
            <div className="absolute inset-0 bg-zinc-950/98 backdrop-blur-md flex flex-col items-center justify-center p-6 z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative text-left">
                {/* Close button */}
                {googleStep !== 'success' && (
                  <button
                    onClick={() => setShowGoogleModal(false)}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white font-sans text-sm font-bold transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                )}

                {/* Google Logo */}
                <div className="flex justify-center mb-4 mt-2">
                  <svg className="w-7 h-7" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>

                {googleStep === 'waiting' && (
                  <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in duration-200">
                    <div className="w-12 h-12 border-2 border-t-transparent border-[#4285F4] rounded-full animate-spin mb-4" />
                    <span className="font-mono text-[9px] tracking-[0.25em] text-[#4285F4] uppercase animate-pulse">
                      Waiting for Browser Sign-In
                    </span>
                    <p className="font-mono text-[9px] text-zinc-500 mt-2 text-center max-w-[90%] uppercase leading-relaxed min-h-[30px]">
                      {authProgress}
                    </p>
                  </div>
                )}

                {googleStep === 'success' && (
                  <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in duration-200">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="font-mono text-[10px] tracking-[0.25em] text-emerald-400 uppercase">
                      Sync Complete
                    </span>
                    <p className="font-mono text-[9px] text-zinc-500 mt-2 text-center max-w-[90%] uppercase leading-relaxed">
                      {authProgress}
                    </p>
                  </div>
                )}

                {googleStep === 'failed' && (
                  <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in duration-200">
                    <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-4 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                    <span className="font-mono text-[10px] tracking-[0.25em] text-red-400 uppercase">
                      Sync Failed
                    </span>
                    <p className="font-mono text-[9px] text-zinc-400 mt-3 text-center max-w-[95%] uppercase leading-relaxed">
                      {authProgress}
                    </p>
                    <button
                      onClick={() => setShowGoogleModal(false)}
                      className="mt-5 px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-[10px] font-mono uppercase tracking-wider text-zinc-300 transition-colors cursor-pointer"
                    >
                      Acknowledge
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between font-mono text-[8px] text-zinc-500 uppercase tracking-widest">
            <span>Uplink: Secure Protocol</span>
            <span>OS: NOVA-X Quantum</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-transparent flex flex-col relative selection:bg-[#00f3ff]/30">
      {/* Background radial gradient flares */}
      <div className="absolute top-[10%] left-[-5%] w-[40vw] h-[40vw] bg-[#00f3ff] rounded-full mix-blend-screen blur-[180px] opacity-[0.025] pointer-events-none z-0" />
      <div className="absolute bottom-[10%] right-[-5%] w-[30vw] h-[30vw] bg-[#ff00bb] rounded-full mix-blend-screen blur-[150px] opacity-[0.02] pointer-events-none z-0" />

      {/* Main Dashboard Layout */}
      <main className="flex-1 min-h-0 grid grid-cols-12 gap-6 p-2 relative z-10">
        {/* Left Column (col-span-3): Vision Feed & Voice Configuration */}
        <div className="col-span-3 flex flex-col gap-4 z-10 min-h-0">
          {/* Operator Status Header */}
          <div className="p-3 bg-zinc-950/60 backdrop-blur-xl border border-white/10 rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-lg border border-[#00f3ff]/20 bg-zinc-900 overflow-hidden flex items-center justify-center">
                {authOperator.avatar ? (
                  <img src={authOperator.avatar} className="w-full h-full object-cover" />
                ) : (
                  <Database size={14} className="text-emerald-400" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-mono font-bold text-[10px] tracking-wider text-white uppercase leading-none">
                  {authOperator.name}
                </span>
                <span className="font-mono text-[7px] text-zinc-400 tracking-widest mt-1 font-semibold">
                  {authOperator.provider === 'GOOGLE_AUTH' ? 'GOOGLE SYNCED' : 'OFFLINE SECURED'}
                </span>
              </div>
            </div>
            <button
              onClick={handleOperatorLogout}
              title="Change User/Sign Out"
              className="p-1.5 rounded-lg border border-red-500/10 hover:border-red-500/30 bg-red-500/5 hover:bg-red-500/15 text-red-400 transition-colors cursor-pointer"
            >
              <LogOut size={12} />
            </button>
          </div>

          {/* Lens Optics Feed Container */}
          <div className="p-3 bg-zinc-950/60 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col gap-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${visionMode !== 'off' ? 'bg-[#00f3ff]' : 'bg-zinc-700'}`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${visionMode !== 'off' ? 'bg-[#00f3ff]' : 'bg-zinc-700'}`}
                  />
                </span>
                <span className="font-mono text-[8px] tracking-[0.25em] text-zinc-300 uppercase">
                  Optics Monitor
                </span>
              </div>
              <span className="font-mono text-[7px] text-zinc-500 uppercase tracking-widest font-semibold">
                {visionMode !== 'off' ? 'Active' : 'Offline'}
              </span>
            </div>

            <div className="relative aspect-video w-full rounded-lg border border-white/5 bg-[#030303] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,243,255,0.04)_0%,transparent_80%)] pointer-events-none" />
              <Camera size={18} className="text-zinc-700 absolute" />

              {/* Corner Sci-Fi Brackets */}
              <div className="absolute top-1 left-1 border-t border-l border-[#00f3ff]/30 h-2 w-2" />
              <div className="absolute top-1 right-1 border-t border-r border-[#00f3ff]/30 h-2 w-2" />
              <div className="absolute bottom-1 left-1 border-b border-l border-[#00f3ff]/30 h-2 w-2" />
              <div className="absolute bottom-1 right-1 border-b border-r border-[#00f3ff]/30 h-2 w-2" />

              <span className="font-mono text-[7px] text-zinc-500 uppercase tracking-widest absolute bottom-2">
                Camera Link Ready
              </span>
            </div>
          </div>

          {/* Futuristic Voice Selection Deck */}
          <div className="flex-1 p-3.5 bg-zinc-950/60 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col gap-3 shadow-lg overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Sliders size={13} className="text-[#00f3ff]" />
              <div className="flex flex-col">
                <span className="font-mono text-[8px] tracking-[0.25em] text-white uppercase font-bold">
                  Neural Voice Profiles
                </span>
                <span className="font-mono text-[7px] text-zinc-500">Cognitron Decoders</span>
              </div>
            </div>

            {/* Language Selection Dropdown */}
            <div className="flex flex-col gap-1 border-b border-white/5 pb-2.5">
              <label className="font-mono text-[7px] tracking-widest text-[#00f3ff] uppercase font-bold">
                SYSTEM SYNTHESIS LANGUAGE
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => {
                  setSelectedLanguage(e.target.value)
                  localStorage.setItem('novax_lang', e.target.value)
                }}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white font-mono outline-none focus:border-[#00f3ff] cursor-pointer hover:bg-zinc-800 transition-colors"
              >
                {LANGUAGES.map((lang) => (
                  <option
                    key={lang.code}
                    value={lang.code}
                    className="bg-zinc-950 text-white font-mono text-xs"
                  >
                    {lang.name} {lang.nativeName ? `(${lang.nativeName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-h-0">
              {VOICES.map((v) => {
                const isSelected = activeVoice === v.id
                return (
                  <button
                    key={v.id}
                    onClick={(): void => handleVoiceSelect(v.id)}
                    className={`text-left p-2.5 rounded-lg border transition-all duration-300 relative overflow-hidden flex flex-col gap-1 cursor-pointer group ${
                      isSelected
                        ? 'bg-[#00f3ff]/5 border-[#00f3ff]/40 shadow-[0_0_12px_rgba(0,243,255,0.08)]'
                        : 'bg-zinc-900/30 border-white/5 hover:border-white/15 hover:bg-zinc-900/50'
                    }`}
                  >
                    {/* Tiny visual pulse for selected voice */}
                    {isSelected && (
                      <div className="absolute top-0 right-0 h-full w-0.5 bg-[#00f3ff] animate-pulse" />
                    )}

                    <div className="flex items-center justify-between">
                      <span
                        className={`font-mono text-[9px] font-bold tracking-widest uppercase ${isSelected ? 'text-[#00f3ff]' : 'text-zinc-300'}`}
                      >
                        {v.name}
                      </span>
                      <span
                        className={`font-mono text-[7px] uppercase px-1.5 py-0.5 rounded border ${isSelected ? 'bg-[#00f3ff]/10 text-[#00f3ff] border-[#00f3ff]/20' : 'bg-zinc-800/80 text-zinc-500 border-transparent'}`}
                      >
                        {v.gender}
                      </span>
                    </div>
                    <p className="font-sans text-[8px] text-zinc-500 group-hover:text-zinc-400 transition-colors leading-relaxed">
                      {v.description}
                    </p>
                  </button>
                )
              })}
            </div>

            {/* Synthesizer volume sliders */}
            <div className="border-t border-white/5 pt-2.5 space-y-2">
              <div className="flex items-center justify-between font-mono text-[8px] text-zinc-400 uppercase tracking-widest">
                <span className="flex items-center gap-1">
                  <Volume2 size={10} /> Chime Gain
                </span>
                <span>{Math.round(voiceVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={voiceVolume}
                onChange={(e): void => setVoiceVolume(parseFloat(e.target.value))}
                className="w-full accent-[#00f3ff] bg-zinc-800 h-1 rounded-lg cursor-pointer"
              />

              <button
                onClick={(): void => speakVoiceIntro(activeVoice)}
                className="cursor-pointer w-full py-1.5 bg-[#00f3ff]/10 hover:bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/20 rounded-md font-mono text-[8px] font-bold tracking-widest uppercase transition-all"
              >
                Diagnostic Chime Synthesis
              </button>
            </div>
          </div>
        </div>

        {/* Center Column (col-span-6): 3D Sphere Core Workspace & Telemetry Header/Footer */}
        <div className="col-span-6 relative flex flex-col justify-between items-center min-h-0 gap-4">
          {/* TELEMETRY HEADER (All CPU, RAM, Temp, Network elements moved to the top bar!) */}
          <div className="w-full bg-zinc-950/70 backdrop-blur-2xl border border-white/10 rounded-xl p-3 shadow-lg flex flex-col gap-2 z-20">
            <div className="flex items-center justify-between border-b border-white/5 pb-1">
              <div className="flex items-center gap-2">
                <Activity size={10} className="text-[#00f3ff]" />
                <span className="font-mono text-[8px] tracking-[0.25em] text-white font-bold uppercase">
                  NOVA-X Operational Telemetry
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[7px] text-zinc-500 uppercase tracking-widest font-semibold">
                  OS: {stats.os?.type || 'WINDOWS'}
                </span>
                <span className="font-mono text-[7px] text-zinc-500 uppercase tracking-widest font-semibold">
                  UPTIME: {stats.os?.uptime || '0h'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {/* CPU load bar */}
              <div className="bg-zinc-900/40 border border-white/5 rounded-lg p-2 flex flex-col justify-between">
                <div className="flex items-center justify-between font-mono text-[8px] text-zinc-400 uppercase">
                  <span className="flex items-center gap-1">
                    <Cpu size={10} className="text-emerald-400" /> CPU Load
                  </span>
                  <span className="font-bold text-white">{cpuValue.toFixed(1)}%</span>
                </div>
                <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden relative">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${cpuValue}%`,
                      backgroundColor: getHealthColor(cpuValue, 100),
                      boxShadow: `0 0 8px ${getHealthColor(cpuValue, 100)}80`
                    }}
                  />
                </div>
              </div>

              {/* RAM Usage bar */}
              <div className="bg-zinc-900/40 border border-white/5 rounded-lg p-2 flex flex-col justify-between">
                <div className="flex items-center justify-between font-mono text-[8px] text-zinc-400 uppercase">
                  <span className="flex items-center gap-1">
                    <Database size={10} className="text-orange-400" /> RAM Load
                  </span>
                  <span className="font-bold text-white">{ramValue.toFixed(1)}%</span>
                </div>
                <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden relative">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${ramValue}%`,
                      backgroundColor: getHealthColor(ramValue, 100),
                      boxShadow: `0 0 8px ${getHealthColor(ramValue, 100)}80`
                    }}
                  />
                </div>
              </div>

              {/* Laptop Temperature gauge */}
              <div className="bg-zinc-900/40 border border-white/5 rounded-lg p-2 flex flex-col justify-between">
                <div className="flex items-center justify-between font-mono text-[8px] text-zinc-400 uppercase">
                  <span className="flex items-center gap-1">
                    <Thermometer size={10} className="text-purple-400" /> Core Temp
                  </span>
                  <span className="font-bold text-white">{tempValue.toFixed(1)}°C</span>
                </div>
                <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden relative">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, (tempValue / 100) * 100))}%`,
                      backgroundColor: getHealthColor(tempValue, 100),
                      boxShadow: `0 0 8px ${getHealthColor(tempValue, 100)}80`
                    }}
                  />
                </div>
              </div>

              {/* Network Transmit Rate */}
              <div className="bg-zinc-900/40 border border-white/5 rounded-lg p-2 flex flex-col justify-between">
                <div className="flex items-center justify-between font-mono text-[8px] text-zinc-400 uppercase">
                  <span className="flex items-center gap-1">
                    <Radio size={10} className="text-[#00f3ff]" /> Net Stream
                  </span>
                  <span className="font-bold text-white">{stats.network?.latency || 24} ms</span>
                </div>
                <div className="mt-1 flex items-center gap-2 font-mono text-[7px] text-zinc-500 uppercase">
                  <span className="flex items-center gap-0.5 text-pink-500">
                    <ArrowUp size={8} /> {stats.network?.tx || 0} kbps
                  </span>
                  <span className="flex items-center gap-0.5 text-blue-400">
                    <ArrowDown size={8} /> {stats.network?.rx || 0} kbps
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main 3D Sphere Interactive Canvas */}
          <div className="flex-1 w-full relative flex items-center justify-center border border-white/5 rounded-2xl overflow-hidden bg-zinc-950/20 shadow-inner">
            {/* Floating Core Customizer bar at the top of the canvas */}
            <div className="absolute top-4 flex items-center gap-1.5 p-1.5 rounded-xl border border-white/5 bg-zinc-950/85 backdrop-blur-md z-20 shadow-xl max-w-[95%] overflow-x-auto scrollbar-none">
              <button
                onClick={() => {
                  setCoreType('quantum')
                  localStorage.setItem('novax_core_type', 'quantum')
                }}
                className={`px-2 py-1 text-[7px] font-mono tracking-wider uppercase rounded-lg border transition-all cursor-pointer shrink-0 ${
                  coreType === 'quantum'
                    ? 'bg-[#00f3ff]/10 text-[#00f3ff] border-[#00f3ff]/20'
                    : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                Quantum
              </button>
              <button
                onClick={() => {
                  setCoreType('cube')
                  localStorage.setItem('novax_core_type', 'cube')
                }}
                className={`px-2 py-1 text-[7px] font-mono tracking-wider uppercase rounded-lg border transition-all cursor-pointer shrink-0 ${
                  coreType === 'cube'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(57,255,20,0.1)]'
                    : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                Hypercube
              </button>
              <button
                onClick={() => {
                  setCoreType('matrix')
                  localStorage.setItem('novax_core_type', 'matrix')
                }}
                className={`px-2 py-1 text-[7px] font-mono tracking-wider uppercase rounded-lg border transition-all cursor-pointer shrink-0 ${
                  coreType === 'matrix'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.1)]'
                    : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                Ring Matrix
              </button>
              <button
                onClick={() => {
                  setCoreType('nebula')
                  localStorage.setItem('novax_core_type', 'nebula')
                }}
                className={`px-2 py-1 text-[7px] font-mono tracking-wider uppercase rounded-lg border transition-all cursor-pointer shrink-0 ${
                  coreType === 'nebula'
                    ? 'bg-pink-500/10 text-pink-400 border-pink-500/20 shadow-[0_0_8px_rgba(236,72,153,0.1)]'
                    : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                Nebula Swarm
              </button>
              <button
                onClick={() => {
                  setCoreType('eva')
                  localStorage.setItem('novax_core_type', 'eva')
                }}
                className={`px-2 py-1 text-[7px] font-mono tracking-wider uppercase rounded-lg border transition-all cursor-pointer shrink-0 ${
                  coreType === 'eva'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.1)]'
                    : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                Eva swarms
              </button>
              <button
                onClick={() => {
                  setCoreType('jarvis')
                  localStorage.setItem('novax_core_type', 'jarvis')
                }}
                className={`px-2 py-1 text-[7px] font-mono tracking-wider uppercase rounded-lg border transition-all cursor-pointer shrink-0 ${
                  coreType === 'jarvis'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)]'
                    : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                Jarvis grid
              </button>

              <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />

              <span className="text-[7px] font-mono text-zinc-500 tracking-wider uppercase ml-1 shrink-0">
                Scale:
              </span>
              <input
                type="range"
                min="0.5"
                max="1.2"
                step="0.05"
                value={coreSize}
                onChange={(e) => {
                  const sz = parseFloat(e.target.value)
                  setCoreSize(sz)
                  localStorage.setItem('novax_core_size', sz.toString())
                }}
                className="w-16 accent-[#00f3ff] bg-zinc-800 h-1 rounded-lg cursor-pointer shrink-0"
              />
            </div>

            {/* Embedded 3D Core with dynamic type and size scale properties */}
            <AICore
              isConnected={isConnected}
              isSpeaking={isSpeaking}
              coreType={coreType}
              coreSize={coreSize}
            />

            {/* FLANKING DOCK LEFT (Optics mode switch) */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20 bg-zinc-950/80 backdrop-blur-2xl border border-white/10 p-1.5 rounded-2xl shadow-2xl">
              <div className="px-2 py-1 border-b border-white/5 mb-1 text-center">
                <span className="text-[7px] font-mono tracking-widest text-zinc-500 uppercase font-semibold">
                  Lens Input
                </span>
              </div>
              <button
                onClick={(): void => changeVisionMode('camera')}
                title="Toggle Camera Lens"
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 border cursor-pointer ${
                  visionMode === 'camera'
                    ? 'bg-[#00f3ff]/10 text-[#00f3ff] border-[#00f3ff]/30 shadow-[0_0_15px_rgba(0,243,255,0.15)]'
                    : 'bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/15 hover:text-white'
                }`}
              >
                <Camera size={14} />
              </button>
              <button
                onClick={(): void => changeVisionMode('screen')}
                title="Toggle Screen Display"
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 border cursor-pointer ${
                  visionMode === 'screen'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                    : 'bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/15 hover:text-white'
                }`}
              >
                <Monitor size={14} />
              </button>
              <button
                onClick={(): void => changeVisionMode('off')}
                title="Offline Lens"
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 border cursor-pointer ${
                  visionMode === 'off'
                    ? 'bg-zinc-800 text-zinc-500 border-zinc-700'
                    : 'bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/15 hover:text-white'
                }`}
              >
                <Tv size={14} />
              </button>
            </div>

            {/* FLANKING DOCK RIGHT (Microphone toggle pod & Call Core) */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20 bg-zinc-950/80 backdrop-blur-2xl border border-white/10 p-1.5 rounded-2xl shadow-2xl">
              <div className="px-2 py-1 border-b border-white/5 mb-1 text-center">
                <span className="text-[7px] font-mono tracking-widest text-zinc-500 uppercase font-semibold">
                  Comm Core
                </span>
              </div>

              {/* Standalone glowing microphone option moved here to the side! */}
              <button
                onClick={handleMicToggle}
                disabled={!isConnected}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all duration-300 cursor-pointer ${
                  !isConnected
                    ? 'opacity-20 cursor-not-allowed bg-zinc-900 border-transparent text-zinc-600'
                    : isMuted
                      ? 'bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)] hover:bg-red-500/20'
                      : 'bg-[#00f3ff]/10 text-[#00f3ff] border-[#00f3ff]/30 shadow-[0_0_15px_rgba(0,243,255,0.2)] hover:border-[#00f3ff]/50'
                }`}
              >
                {isMuted ? <MicOff size={14} /> : <Mic size={14} className="animate-pulse" />}
              </button>

              {/* Main Phone Connection/Call bridge toggle */}
              <button
                onClick={toggleConnection}
                title={isConnected ? 'Disconnect NOVA-X' : 'Connect NOVA-X'}
                className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all duration-300 cursor-pointer ${
                  isConnected
                    ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:bg-red-400 border-transparent'
                    : 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-400 border-transparent'
                }`}
              >
                {isConnected ? <PhoneOff size={14} /> : <Phone size={14} />}
              </button>
            </div>

            {/* Micro holographic telemetry indicators */}
            <div className="absolute bottom-4 flex items-center gap-6 p-2 rounded-full border border-white/5 bg-black/40 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-[8px] font-mono text-zinc-500">
                <span>FREQ:</span>
                <span className="text-[#00f3ff] font-bold">14.2 GHz</span>
              </div>
              <div className="flex items-center gap-1.5 text-[8px] font-mono text-zinc-500">
                <span>CORE:</span>
                <span className="text-emerald-400 font-bold">
                  {isConnected ? 'SYNCHRONIZED' : 'STANDBY'}
                </span>
              </div>
            </div>
          </div>

          {/* CHROME CORE DECIBEL PULSE AND INTERACTIVE VOICE INTERFACE */}
          <div className="w-full bg-zinc-950/70 backdrop-blur-2xl border border-white/10 rounded-xl p-3.5 shadow-lg flex flex-col items-center gap-3 z-20">
            <div className="flex items-center justify-between w-full border-b border-white/5 pb-2">
              <span className="font-mono text-[8px] tracking-[0.25em] text-zinc-400 font-bold uppercase">
                Neural Comm Interface
              </span>
              <span
                className={`font-mono text-[8px] uppercase font-semibold transition-all duration-300 ${
                  isSpeaking
                    ? 'text-cyan-400 animate-pulse'
                    : micStatus === 'listening'
                      ? 'text-emerald-400 animate-pulse font-bold'
                      : micStatus === 'transcribing'
                        ? 'text-amber-400 animate-pulse'
                        : isConnected
                          ? 'text-emerald-500'
                          : 'text-zinc-500'
                }`}
              >
                {isSpeaking
                  ? 'NOVA-X SPEAKING'
                  : micStatus === 'listening'
                    ? 'LISTENING...'
                    : micStatus === 'transcribing'
                      ? 'TRANSCRIBING...'
                      : isConnected
                        ? 'Bridge Secure'
                        : 'Line Standby'}
              </span>
            </div>

            <div className="flex items-center justify-center gap-8 w-full py-1.5 relative">
              {/* Pulsing microphone feedback visualizer circle */}
              <div className="relative flex items-center justify-center">
                {isConnected && !isMuted && (
                  <>
                    <div className="absolute w-14 h-14 rounded-full border border-emerald-500/20 animate-ping" />
                    <div
                      className={`absolute w-12 h-12 rounded-full border transition-all duration-300 ${
                        isSpeaking
                          ? 'scale-125 border-pink-500/40 animate-pulse'
                          : micStatus === 'listening'
                            ? getMicPulseClass()
                            : 'scale-100 border-emerald-500/30'
                      }`}
                    />
                  </>
                )}
                <button
                  onClick={handleMicToggle}
                  disabled={!isConnected}
                  title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                  className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all duration-300 relative z-10 cursor-pointer ${
                    !isConnected
                      ? 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                      : isMuted
                        ? 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  }`}
                >
                  {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              </div>

              {/* Call connection button */}
              <button
                onClick={toggleConnection}
                title={isConnected ? 'Disconnect NOVA-X' : 'Connect NOVA-X'}
                className={`px-5 py-2.5 flex items-center gap-2 rounded-xl border font-mono text-[9px] font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer ${
                  isConnected
                    ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:bg-red-400 border-transparent'
                    : 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-400 border-transparent'
                }`}
              >
                {isConnected ? (
                  <>
                    <PhoneOff size={12} />
                    Disconnect Core
                  </>
                ) : (
                  <>
                    <Phone size={12} />
                    Establish Link
                  </>
                )}
              </button>
            </div>

            {/* Simulated ambient sound waveform nodes */}
            <div className="flex items-end justify-center gap-0.5 h-6 w-48 mt-1">
              {[...Array(24)].map((_, i) => {
                const height =
                  isConnected && !isMuted
                    ? isSpeaking
                      ? Math.floor(Math.random() * 20 + 4)
                      : Math.floor(Math.random() * 6 + 2)
                    : 2
                return (
                  <div
                    key={i}
                    className={`w-[3px] rounded-full transition-all duration-150 ${isConnected && !isMuted ? (isSpeaking ? 'bg-gradient-to-t from-emerald-500 to-pink-500' : 'bg-emerald-500/60') : 'bg-zinc-800'}`}
                    style={{ height: `${height}px` }}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column (col-span-3): Conversation Live Panel */}
        <div className="col-span-3 h-full flex flex-col z-10 min-h-0">
          <RightPanel />
        </div>
      </main>
    </div>
  )
}
