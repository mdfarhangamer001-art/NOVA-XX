import { useState, useEffect } from 'react'
import IRIS from './UI/IRIS'
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
        delete (window as Record<string, unknown>).setIsSpeaking
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

  // Real-time Voice Recognition Loop
  useEffect(() => {
    // @ts-ignore - Check for browser speech recognition variants
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('[NOVA-X] Speech Recognition API not supported in this environment.')
      return
    }

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    let recognition: any = null
    const shouldBeRunning = isConnected && !isMuted && !isSpeaking

    if (shouldBeRunning) {
      console.log('[NOVA-X] Activating Voice Recognition Core...')
      recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = 'en-US' // Default locale

      recognition.onstart = (): void => {
        console.log('[NOVA-X] Microphone listening active.')
      }

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      recognition.onresult = (event: any): void => {
        const lastResultIndex = event.results.length - 1
        const transcript = event.results[lastResultIndex][0].transcript
        console.log('[NOVA-X] Audio recognized:', transcript)

        if (transcript && transcript.trim().length > 0) {
          // Send recognized vocal transcript into the Conversation Core
          // @ts-ignore - Invoke global trigger handler
          if (window.triggerVoiceCommand) {
            // @ts-ignore - Invoke global trigger handler
            window.triggerVoiceCommand(transcript)
          }
        }
      }

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      recognition.onerror = (event: any): void => {
        console.error('[NOVA-X] Speech Recognition error:', event.error)
      }

      recognition.onend = (): void => {
        console.log('[NOVA-X] Microphone listener closed.')
        // Auto-restart if we should still be running and not closed manually
        if (isConnected && !isMuted && !isSpeaking) {
          try {
            recognition.start()
          } catch (err) {
            console.error('[NOVA-X] Failed restarting mic lock:', err)
          }
        }
      }

      try {
        recognition.start()
      } catch (err) {
        console.error('[NOVA-X] Error starting recognition thread:', err)
      }
    }

    return () => {
      if (recognition) {
        console.log('[NOVA-X] Deactivating recognition core.')
        recognition.onend = null // avoid loop
        try {
          recognition.stop()
        } catch (_e) {
          // Silent safe error catching
        }
      }
    }
  }, [isConnected, isMuted, isSpeaking])

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

export default IndexRoot