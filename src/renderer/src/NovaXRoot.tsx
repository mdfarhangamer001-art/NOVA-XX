import { useState, useEffect } from 'react'
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
      const utterance = new SpeechSynthesisUtterance(text)

      const vibe = localStorage.getItem('novax_operator_vibe') || 'TACTICAL'
      let rate = 1.05
      let pitch = 0.95
      if (vibe === 'EMPATHETIC') {
        rate = 0.92
        pitch = 1.05
      } else if (vibe === 'CALM') {
        rate = 0.85
        pitch = 0.88
      } else if (vibe === 'INTENSE') {
        rate = 1.2
        pitch = 1.08
      }

      utterance.rate = rate
      utterance.pitch = pitch
      const voices = window.speechSynthesis.getVoices()
      const voice =
        voices.find(
          (v) =>
            v.name.includes('Female') ||
            v.name.includes('Zira') ||
            v.name.includes('Samantha') ||
            (v.lang === 'en-US' && v.name.includes('Google'))
        ) || voices[0]
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

  // Modern VAD-based Voice Recognition Core
  useEffect(() => {
    let audioChunks: Blob[] = []
    let isRecordingInternal = false

    const threshold = 0.015
    const silenceDelay = 1500

    const stopMic = () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      analyserRef.current = null
      setMicStatus('idle')
    }

    const startVAD = async () => {
      if (stopRequestedRef.current) return
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
        audioContextRef.current = new AudioContext()
        analyserRef.current = audioContextRef.current.createAnalyser()
        const source = audioContextRef.current.createMediaStreamSource(stream)
        source.connect(analyserRef.current)
        analyserRef.current.fftSize = 1024

        const dataArray = new Uint8Array(analyserRef.current.fftSize)

        const checkVolume = () => {
          if (!analyserRef.current || stopRequestedRef.current) return
          analyserRef.current.getByteTimeDomainData(dataArray)

          let sumSquares = 0
          for (let i = 0; i < dataArray.length; i++) {
            const normalized = (dataArray[i] - 128) / 128
            sumSquares += normalized * normalized
          }
          const rms = Math.sqrt(sumSquares / dataArray.length)

          window.dispatchEvent(new CustomEvent('novax_mic_level', { detail: rms }))

          if (rms > threshold) {
            if (!isRecordingInternal) {
              console.log('[NOVA-X VAD] Speech detected. Starting recording...')
              isRecordingInternal = true
              audioChunks = []
              setMicStatus('listening')
              window.dispatchEvent(
                new CustomEvent('novax_mic_state', { detail: { status: 'listening' } })
              )

              let mimeType = 'audio/webm'
              if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))
                mimeType = 'audio/webm;codecs=opus'
              else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus'))
                mimeType = 'audio/ogg;codecs=opus'

              mediaRecorderRef.current = new MediaRecorder(stream, { mimeType })
              mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data)
              }
              mediaRecorderRef.current.onstop = async () => {
                setMicStatus('transcribing')
                window.dispatchEvent(
                  new CustomEvent('novax_mic_state', { detail: { status: 'transcribing' } })
                )
                const audioBlob = new Blob(audioChunks, { type: mimeType })
                const reader = new FileReader()
                reader.readAsDataURL(audioBlob)
                reader.onloadend = async () => {
                  const base64data = (reader.result as string).split(',')[1]
                  try {
                    // @ts-ignore
                    if (window.iris?.transcribeAudio) {
                      // @ts-ignore
                      const transcript = await window.iris.transcribeAudio(
                        base64data,
                        audioBlob.type
                      )
                      if (transcript && transcript.trim().length > 0) {
                        // @ts-ignore
                        if (window.triggerVoiceCommand) window.triggerVoiceCommand(transcript)
                      }
                    }
                  } catch (err) {
                    console.error('[NOVA-X VAD] Transcription error:', err)
                  } finally {
                    setMicStatus('idle')
                    window.dispatchEvent(
                      new CustomEvent('novax_mic_state', { detail: { status: 'idle' } })
                    )
                  }
                }
              }
              mediaRecorderRef.current.start()
            }

            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current)
              silenceTimeoutRef.current = null
            }
          } else {
            if (isRecordingInternal && !silenceTimeoutRef.current) {
              silenceTimeoutRef.current = setTimeout(() => {
                console.log('[NOVA-X VAD] Silence threshold reached. Stopping recording.')
                if (
                  mediaRecorderRef.current &&
                  mediaRecorderRef.current.state !== 'inactive'
                ) {
                  mediaRecorderRef.current.stop()
                }
                isRecordingInternal = false
              }, silenceDelay)
            }
          }
          animationFrameRef.current = requestAnimationFrame(checkVolume)
        }

        checkVolume()
      } catch (err) {
        console.error('[NOVA-X VAD] Failed to initialize voice core:', err)
      }
    }

    const shouldBeRunning = isConnected && !isMuted && !isSpeaking

    if (shouldBeRunning) {
      startVAD()
    } else {
      stopMic()
    }

    return () => {
      stopMic()
    }
  }, [isConnected, isMuted, isSpeaking, activeLang])

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
