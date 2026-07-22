import React, { useState, useEffect, useRef } from 'react'
import NovaX from './UI/NovaX'
import TitleBar from './components/Titlebar'

export type VisionMode = 'camera' | 'screen' | 'none'

const IndexRoot = (): JSX.Element => {
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [micStatus, setMicStatus] = useState<'idle' | 'listening' | 'transcribing'>('idle')

  // Refs to handle audio resources without triggering re-renders in the VAD loop
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const silenceTimeoutRef = useRef<any>(null)
  const stopRequestedRef = useRef(false)
  const recognitionRef = useRef<any>(null)

  // Expose speaking state setter globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).setIsSpeaking = (val: boolean): void => {
        setIsSpeaking(val)
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).setIsSpeaking
      }
    }
  }, [])

  const toggleConnection = (): void => {
    if (isConnected) {
      stopRequestedRef.current = true
      setIsConnected(false)
      setIsMuted(false)
      setMicStatus('idle')
    } else {
      stopRequestedRef.current = false
      setIsConnected(true)
      setIsSpeaking(false)
    }
  }

  const handleMicToggle = (): void => {
    const nextMutedState = !isMuted
    setIsMuted(nextMutedState)
    if (nextMutedState) setMicStatus('idle')
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

  useEffect(() => {
    ;(window as any).speakText = (text: string) => {
      if (!window.speechSynthesis) return
      window.speechSynthesis.cancel()

      // Detect emotion tag (e.g. [EMOTION: EXCITED])
      let detectedEmotion = ''
      const emotionRegex = /\[EMOTION:\s*([A-Z_]+)\]/i
      const match = text.match(emotionRegex)
      if (match) {
        detectedEmotion = match[1].toUpperCase()
      }

      // Strip all emotion tags from the spoken text
      const cleanText = text.replace(/\[EMOTION:\s*[A-Z_]+\]/gi, '').trim()
      const utterance = new SpeechSynthesisUtterance(cleanText)

      const vibe = detectedEmotion || localStorage.getItem('novax_operator_vibe') || 'TACTICAL'
      let rate = 0.92
      let pitch = 0.95
      if (vibe === 'EMPATHETIC' || vibe === 'SAD' || vibe === 'SOFT') {
        rate = 0.88
        pitch = 1.08
      } else if (vibe === 'CALM' || vibe === 'SERENE') {
        rate = 0.82
        pitch = 0.9
      } else if (vibe === 'INTENSE' || vibe === 'FAST') {
        rate = 1.12
        pitch = 1.12
      } else if (vibe === 'EXCITED' || vibe === 'JOY' || vibe === 'HAPPY') {
        rate = 1.05
        pitch = 1.18
      }

      // Snappy default fast speech rate with speed configuration support
      const speedMultiplier = parseFloat(localStorage.getItem('novax_speech_speed') || '1.0')
      const pitchMultiplier = parseFloat(localStorage.getItem('novax_speech_pitch') || '1.0')
      utterance.rate = Math.min(2.0, Math.max(0.1, rate * speedMultiplier))
      utterance.pitch = Math.min(2.0, Math.max(0.5, pitch * pitchMultiplier))
      const voices = window.speechSynthesis.getVoices()
      const savedVoiceURI = localStorage.getItem('novax_speech_voice_uri')
      let voice = voices.find((v) => v.voiceURI === savedVoiceURI)

      if (!voice) {
        voice =
          voices.find(
            (v) =>
              v.name.includes('Female') ||
              v.name.includes('Zira') ||
              v.name.includes('Samantha') ||
              (v.lang === 'en-US' && v.name.includes('Google'))
          ) || voices[0]
      }
      if (voice) utterance.voice = voice

      utterance.onstart = () => {
        if (typeof (window as any).setIsSpeaking === 'function') {
          ;(window as any).setIsSpeaking(true)
        }
      }
      utterance.onend = () => {
        if (typeof (window as any).setIsSpeaking === 'function') {
          ;(window as any).setIsSpeaking(false)
        }
      }
      utterance.onerror = () => {
        if (typeof (window as any).setIsSpeaking === 'function') {
          ;(window as any).setIsSpeaking(false)
        }
      }

      window.speechSynthesis.speak(utterance)
    }

    return () => {
      delete (window as any).speakText
    }
  }, [])

  // Web Speech API Voice Recognition Core
  useEffect(() => {
    if (!isConnected || isMuted) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
      setMicStatus('idle')
      return
    }

    const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!Speech) {
      console.warn('Speech Recognition not supported.')
      return
    }

    const recognition = new Speech()
    recognition.continuous = true
    recognition.interimResults = false
    // Set lang to hi-IN to match user's Hindi / Hinglish request
    recognition.lang = 'hi-IN'

    recognition.onstart = () => {
      setMicStatus('listening')
      window.dispatchEvent(new CustomEvent('novax_mic_state', { detail: { status: 'listening' } }))
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' '
        }
      }
      const transcript = finalTranscript.trim()

      if (transcript && transcript.length > 0) {
        console.log('[Web Speech API] Final Transcript:', transcript)
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel()
        }
        if ((window as any).triggerVoiceCommand) {
          ;(window as any).triggerVoiceCommand(transcript)
        }
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setMicStatus('idle')
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        // Auto-restart logic if desired could go here
      }
    }

    recognition.onend = () => {
      // If it ended automatically but the call is still connected and not muted, we restart it.
      // The user requested a push-to-talk style toggle, so if isMuted is false (mic ON), we keep listening.
      if (!isMuted && isConnected) {
        recognition.start()
      } else {
        setMicStatus('idle')
      }
    }

    recognitionRef.current = recognition
    recognition.start()

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null // Prevent restart loop
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
      setMicStatus('idle')
    }
  }, [isConnected, isMuted])

  return (
    <div className="flex flex-col h-screen w-screen bg-transparent overflow-hidden relative border border-emerald-500/20 rounded-xl">
      <TitleBar />
      <div className="flex-1 relative">
        <NovaX
          isConnected={isConnected}
          toggleConnection={toggleConnection}
          isSpeaking={isSpeaking}
          isMuted={isMuted}
          handleMicToggle={handleMicToggle}
          micStatus={micStatus}
        />
      </div>
    </div>
  )
}

export default IndexRoot
