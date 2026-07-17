import { useState, useEffect } from 'react'
import NovaX from './UI/NovaX'
import TitleBar from './components/Titlebar'

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
        delete (window as any).setIsSpeaking
      }
    }
  }, [])

  const toggleConnection = (): void => {
    if (isConnected) {
      setIsConnected(false)
      setIsMuted(false)
    } else {
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

  // Modern VAD-based Voice Recognition Core
  useEffect(() => {
    let audioContext: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let microphone: MediaStreamAudioSourceNode | null = null
    let mediaRecorder: MediaRecorder | null = null
    let audioChunks: Blob[] = []
    let silenceTimeout: any = null
    let isRecordingInternal = false
    let animationFrame: number | null = null

    const threshold = 0.02 // Volume threshold for VAD
    const silenceDelay = 1500 // 1.5 seconds of silence to trigger transcription

    const startVAD = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        audioContext = new AudioContext()
        analyser = audioContext.createAnalyser()
        microphone = audioContext.createMediaStreamSource(stream)
        microphone.connect(analyser)
        analyser.fftSize = 512

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const checkVolume = () => {
          if (!analyser) return
          analyser.getByteFrequencyData(dataArray)
          
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i]
          }
          const average = sum / dataArray.length / 255

          if (average > threshold) {
            // Speech detected
            if (!isRecordingInternal) {
              console.log('[NOVA-X VAD] Speech detected. Starting recording...')
              isRecordingInternal = true
              audioChunks = []
              
              // Determine best mimeType
              let mimeType = 'audio/webm'
              if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus'
              else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) mimeType = 'audio/ogg;codecs=opus'

              mediaRecorder = new MediaRecorder(stream, { mimeType })
              mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data)
              }
              mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: mimeType })
                const reader = new FileReader()
                reader.readAsDataURL(audioBlob)
                reader.onloadend = async () => {
                  const base64data = (reader.result as string).split(',')[1]
                  console.log('[NOVA-X VAD] Transcribing audio...')
                  try {
                    // @ts-ignore
                    if (window.iris?.transcribeAudio) {
                      // @ts-ignore
                      const transcript = await window.iris.transcribeAudio(base64data, audioBlob.type)
                      console.log('[NOVA-X VAD] Transcript:', transcript)
                      if (transcript && transcript.trim().length > 0) {
                        // @ts-ignore
                        if (window.triggerVoiceCommand) {
                          // @ts-ignore
                          window.triggerVoiceCommand(transcript)
                        }
                      }
                    }
                  } catch (err) {
                    console.error('[NOVA-X VAD] Transcription error:', err)
                  }
                }
              }
              mediaRecorder.start()
            }
            
            if (silenceTimeout) {
              clearTimeout(silenceTimeout)
              silenceTimeout = null
            }
          } else {
            // Silence detected
            if (isRecordingInternal && !silenceTimeout) {
              silenceTimeout = setTimeout(() => {
                console.log('[NOVA-X VAD] Silence threshold reached. Stopping recording.')
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                  mediaRecorder.stop()
                }
                isRecordingInternal = false
              }, silenceDelay)
            }
          }
          animationFrame = requestAnimationFrame(checkVolume)
        }

        checkVolume()
      } catch (err) {
        console.error('[NOVA-X VAD] Failed to initialize voice core:', err)
      }
    }

    const shouldBeRunning = isConnected && !isMuted && !isSpeaking

    if (shouldBeRunning) {
      startVAD()
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame)
      if (silenceTimeout) clearTimeout(silenceTimeout)
      if (audioContext) audioContext.close()
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }
      if (microphone) {
        microphone.mediaStream.getTracks().forEach(t => t.stop())
      }
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
        />
      </div>
    </div>
  )
}

export default IndexRoot