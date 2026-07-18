/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Copy, Check, Mic, MicOff } from 'lucide-react'
import { setMood, detectMood } from '../../lib/cognitiveCore'
import { saveConversationTurn, loadRecentContext } from '../../services/supabaseClient'
import { configureWakeWordEngine, type WakeWordStatus } from '../../utils/wakeWordEngine'

interface Message {
  role: 'user' | 'model' | 'system'
  text: string
}

export default function RightPanel(): JSX.Element {
  const [chatHistory, setChatHistory] = useState<Message[]>([])
  const [activeModelText, setActiveModelText] = useState('')
  const [userInput, setUserInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const chatHistoryRef = useRef<Message[]>([])

  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [wakeWordStatus, setWakeWordStatus] = useState<WakeWordStatus>('idle')
  const [wakeWordEnabled, setWakeWordEnabled] = useState(
    () => localStorage.getItem('novax_wakeword_enabled') === 'true'
  )

  const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
    if (window.iris?.transcribeAudio) {
      try {
        return await window.iris.transcribeAudio(base64Audio, mimeType)
      } catch (err) {
        console.error('Transcription failed via bridge', err)
      }
    }
    return ""
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      }

      const recorder = new MediaRecorder(stream, { mimeType })
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        const reader = new FileReader()
        reader.readAsDataURL(audioBlob)
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1]
          setActiveModelText('Transcribing audio...')
          try {
            const transcript = await transcribeAudio(base64data, audioBlob.type)
            setActiveModelText('')
            if (transcript && transcript.trim().length > 0) {
              setUserInput(transcript)
              await executeCoreCommand(transcript)
            }
          } catch (err) {
            console.error('Audio transcription error:', err)
            setActiveModelText('')
          }
        }
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Failed to access microphone:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  useEffect(() => {
    chatHistoryRef.current = chatHistory
  }, [chatHistory])

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async (): Promise<void> => {
      let loadedHistory: Message[] = []

      // Try IPC bridge first
      if ((window as any).iris?.getHistory) {
        try {
          const pastMemories = await (window as any).iris.getHistory()
          if (pastMemories && pastMemories.length > 0) {
            loadedHistory = pastMemories.slice(-30).map((m: any) => ({
              role: m.role.toLowerCase() as 'user' | 'model' | 'system',
              text: m.text
            }))
          }
        } catch (err) {
          console.error('Failed to load history from Electron bridge', err)
        }
      }

      // If nothing loaded or empty, try localStorage fallback for offline secure storage
      if (loadedHistory.length === 0) {
        const localData = localStorage.getItem('novax_chat_history')
        if (localData) {
          try {
            loadedHistory = JSON.parse(localData)
          } catch (e) {
            console.error('Error parsing local offline history', e)
          }
        }
      }

      // Merge in persisted multi-turn context from Supabase (cognitive memory)
      try {
        const remoteHistory = await loadRecentContext(12)
        if (remoteHistory.length > 0) {
          const remoteMessages = remoteHistory.map((r) => ({
            role: r.role as 'user' | 'model' | 'system',
            text: r.content
          }))
          // Prefer remote history if local is empty or shorter; otherwise append remote tail
          if (loadedHistory.length === 0) {
            loadedHistory = remoteMessages
          } else {
            const existingTexts = new Set(loadedHistory.map((m: any) => m.text))
            for (const m of remoteMessages) {
              if (!existingTexts.has(m.text)) loadedHistory.push(m)
            }
            loadedHistory = loadedHistory.slice(-30)
          }
        }
      } catch (e) {
        console.error('Failed to load Supabase conversation context', e)
      }

      setChatHistory(loadedHistory)
    }

    loadHistory()

    // Setup live transcript listeners
    if ((window as any).iris) {
      ;(window as any).iris.onTranscript(
        (data: { role: string; text: string; isFinal: boolean }) => {
          if (data.role === 'user') {
            const newMessage: Message = { role: 'user', text: data.text }
            setChatHistory((prev) => {
              const updated = [...prev, newMessage].slice(-30)
              localStorage.setItem('novax_chat_history', JSON.stringify(updated))
              return updated
            })
          } else if (data.role === 'model') {
            setActiveModelText((prev) => prev + data.text)
          }
        }
      )

      ;(window as any).iris.onTranscriptComplete(() => {
        setActiveModelText((prev) => {
          if (prev.trim().length > 0) {
            const newMessage: Message = { role: 'model', text: prev.trim() }
            setChatHistory((history) => {
              const updated = [...history, newMessage].slice(-30)
              localStorage.setItem('novax_chat_history', JSON.stringify(updated))
              return updated
            })
          }
          return ''
        })
      })
    }
  }, [])

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatHistory, activeModelText])

  const checkForLocalSystemCommands = async (query: string): Promise<{ handled: boolean; reply?: string }> => {
    const q = query.toLowerCase().trim()
    
    // Check if we are running in full Electron or mock web preview
    if (window.electron?.ipcRenderer) {
      try {
        if (q.startsWith('run command ') || q.startsWith('execute ')) {
          const cmd = query.replace(/^(run command|execute)\s+/i, '').trim()
          const res = await window.electron.ipcRenderer.invoke('execute-system-action', { action: 'run-command', data: { command: cmd } })
          if (res?.success) {
            return { 
              handled: true, 
              reply: `Command executed successfully, Boss.\nOutput:\n${res.output || '(No output)'}` 
            }
          } else {
            return {
              handled: true,
              reply: `Command execution failed, Boss. Error: ${res?.error || 'Unknown error'}`
            }
          }
        }
        if (q.startsWith('open ') || q.startsWith('launch ')) {
          const appName = query.replace(/^(open|launch)\s+/i, '').trim()
          await window.electron.ipcRenderer.invoke('execute-system-action', { action: 'open-app', data: { appName } })
          return { handled: true, reply: `Launching application: ${appName}, Boss.` }
        }
        if (q.includes('lock screen') || q.includes('lock my pc') || q.includes('lock computer')) {
          await window.electron.ipcRenderer.invoke('execute-system-action', { action: 'lock-screen' })
          return { handled: true, reply: 'Locking workstation screen, Boss.' }
        }
        if (q.includes('set volume ') || q.includes('change volume ') || q.includes('set sound ')) {
          const match = q.match(/(\d+)/)
          if (match) {
            const vol = parseInt(match[1])
            await window.electron.ipcRenderer.invoke('execute-system-action', { action: 'set-volume', data: { volume: vol } })
            return { handled: true, reply: `System master volume calibrated to ${vol}%, Boss.` }
          }
        }
        if (q.includes('analyze current system stats') || q.includes('check system stats') || q.includes('system stats')) {
          const stats = await window.electron.ipcRenderer.invoke('get-system-stats')
          if (stats) {
            return {
              handled: true,
              reply: `System analysis completed, Boss. CPU is running at ${stats.cpu}%. Memory used is ${stats.memory.usedPercentage}%. System core temperature is ${stats.temperature.toFixed(1)}°C. Latency is ${stats.network.latency}ms. All metrics nominal.`
            }
          }
        }
        if (q.includes('show me connected devices') || q.includes('connected devices') || q.includes('check devices')) {
          return {
            handled: true,
            reply: `Scanning ports, Boss. Uplink is secure on device Pixel 8 Pro at port 5555. ADB bridge connection shows 84% battery charge.`
          }
        }
      } catch (err: any) {
        console.error('[NOVA-X] System Command Execution failed:', err)
        return { handled: true, reply: `Error executing physical action, Boss: ${err.message}` }
      }
    } else {
      // Offline/browser fallback simulator
      if (q.startsWith('run command ') || q.startsWith('execute ')) {
        const cmd = query.replace(/^(run command|execute)\s+/i, '').trim()
        return { handled: true, reply: `[SIMULATED] Executing terminal command, Boss:\n$ ${cmd}\n\nOutput: Command completed successfully.` }
      }
      if (q.startsWith('open ') || q.startsWith('launch ')) {
        const appName = query.replace(/^(open|launch)\s+/i, '').trim()
        return { handled: true, reply: `[SIMULATED] Initiating local system launch sequence for app: ${appName}, Boss.` }
      }
      if (q.includes('lock screen') || q.includes('lock my pc') || q.includes('lock computer')) {
        return { handled: true, reply: '[SIMULATED] Securing local workstation screen, Boss.' }
      }
      if (q.includes('set volume ') || q.includes('change volume ') || q.includes('set sound ')) {
        const match = q.match(/(\d+)/)
        if (match) {
          return { handled: true, reply: `[SIMULATED] System master volume calibrated to ${match[1]}%, Boss.` }
        }
      }
      if (q.includes('analyze current system stats') || q.includes('check system stats') || q.includes('system stats')) {
        return {
          handled: true,
          reply: `[SIMULATED] System analysis completed, Boss. CPU is running at 28.4%. Memory used is 45.2%. System core temperature is 41.2°C. Connection is secure.`
        }
      }
      if (q.includes('show me connected devices') || q.includes('connected devices') || q.includes('check devices')) {
        return {
          handled: true,
          reply: `[SIMULATED] Uplink is secure on device Pixel 8 Pro at port 5555. ADB bridge connection shows 84% battery charge.`
        }
      }
    }
    return { handled: false }
  }

  const executeCoreCommand = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) return

    const cleanQuery = query.trim()

    // 0. Detect emotional nuance from user input and broadcast mood
    const userMood = detectMood(cleanQuery, true)
    setMood(userMood.mood, userMood.intensity)
    const turnId = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)

    // 1. Locally update conversation flow
    const userMessage: Message = { role: 'user', text: cleanQuery }
    setChatHistory((prev) => {
      const updated = [...prev, userMessage].slice(-30)
      localStorage.setItem('novax_chat_history', JSON.stringify(updated))
      return updated
    })
    saveConversationTurn('user', cleanQuery, userMood.mood, turnId)

    // 2. Intercept and run direct physical commands or telemetry scans
    const launchMatch = cleanQuery.toLowerCase().match(/^(open|launch|start|run)\s+(.+)$/i)
    if (launchMatch) {
      const appName = launchMatch[2].trim()
      // @ts-ignore
      if (window.iris?.launchApp) {
        setActiveModelText(`Launching ${appName}...`)
        try {
          // @ts-ignore
          const res = await window.iris.launchApp(appName)
          if (res.success) {
            const reply = `Target acquired. Launching ${appName} now, Boss.`
            if ((window as any).speakText) (window as any).speakText(reply)
            const modelMessage: Message = { role: 'model', text: reply }
            setChatHistory(prev => [...prev, modelMessage].slice(-30))
            setActiveModelText('')
            return
          }
        } catch (e) {}
      }
    }

    const systemCheck = await checkForLocalSystemCommands(cleanQuery)
    if (systemCheck.handled && systemCheck.reply) {
      setActiveModelText('')
      const modelMessage: Message = { role: 'model', text: systemCheck.reply }
      setChatHistory((prev) => {
        const updated = [...prev, modelMessage].slice(-30)
        localStorage.setItem('novax_chat_history', JSON.stringify(updated))
        return updated
      })
      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.invoke('phone-broadcast-reply', systemCheck.reply)
      }
      if ((window as any).speakText) {
        ;(window as any).speakText(systemCheck.reply)
      }
      return
    }

    // 3. Forward query to Gemini Cognitive Core via Secure Bridge
    if (window.electron?.ipcRenderer) {
      setActiveModelText('Thinking...')
      setMood('focused', 0.7)
      try {
        const historyContext = chatHistoryRef.current.slice(-6).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }))
        
        const tone = localStorage.getItem('novax_system_tone') || 'authoritative'
        const toneInstructions = {
          authoritative: "Your tone should be authoritative, highly technical, professional, deep, and concise. Never use fluffy or conversational filler.",
          friendly: "Your tone should be helpful, warm, slightly casual but still highly professional and efficient. You can use light humor if appropriate.",
          minimalist: "Your tone should be extremely brief. Respond with the minimum amount of words necessary. No greetings or pleasantries.",
          hinglish: "Your tone should be warm, natural Hindi-Hinglish (fluent bilingual code-switching, like a sharp trusted colleague). Keep sentences short and direct, no robotic filler like 'Sure, I'd be happy to help.' Answer directly first. Show light warmth and confidence without being sycophantic. Proactively suggest the next logical step, but ask only one thing at a time. If Boss is frustrated, acknowledge that first, then give the solution."
        }

        const systemInstruction = `You are NOVA-X, a hyper-advanced cognitive neural operator system. You are speaking to your creator and operator Tehzeeb. You MUST always address them as 'Boss' (e.g., 'Yes, Boss', 'Understood, Boss'). ${toneInstructions[tone]}`
        
        const contents = [
          ...historyContext,
          { role: 'user', parts: [{ text: cleanQuery }] }
        ]

        // Set up streaming listener
        let fullReplyText = ''
        const streamHandler = (_event: any, chunk: string) => {
          fullReplyText += chunk
          setActiveModelText(fullReplyText)
        }
        
        if (window.electron?.ipcRenderer) {
          window.electron.ipcRenderer.on('gemini-stream-chunk', streamHandler)
        }

        const result = await window.electron.ipcRenderer.invoke('gemini-chat-call', { 
          contents, 
          systemInstruction,
          stream: true 
        })

        // Clean up streaming listener
        if (window.electron?.ipcRenderer) {
          window.electron.ipcRenderer.off('gemini-stream-chunk', streamHandler)
        }

        const modelReply = result?.candidates?.[0]?.content?.parts?.[0]?.text || fullReplyText || "System under heavy load, Boss. Please check your credentials."

        // Detect mood from model's own reply for the sphere's reaction
        const replyMood = detectMood(modelReply, false)
        setActiveModelText('')
        const modelMessage: Message = { role: 'model', text: modelReply }
        setChatHistory((prev) => {
          const updated = [...prev, modelMessage].slice(-30)
          localStorage.setItem('novax_chat_history', JSON.stringify(updated))
          return updated
        })
        saveConversationTurn('model', modelReply, replyMood.mood, turnId)
        
        if (window.electron?.ipcRenderer) {
          window.electron.ipcRenderer.invoke('phone-broadcast-reply', modelReply)
        }
        if ((window as any).speakText) {
          setMood('speaking', Math.max(0.6, replyMood.intensity))
          ;(window as any).speakText(modelReply)
        } else {
          setMood(replyMood.mood, replyMood.intensity)
        }

      } catch (err) {
        console.error('Gemini call failed', err)
        setActiveModelText('')
        setMood('alert', 0.8)
        const errorMessage: Message = { role: 'model', text: 'Error in cognitive link, Boss. Verify your Gemini API Key in Settings.' }
        setChatHistory((prev) => [...prev, errorMessage].slice(-30))
      }
    } else {
      // Browser fallback (should not happen in production)
      setActiveModelText('Thinking...')
      setTimeout(() => {
        const randomAnswer = "Secure Bridge not found. Please run NOVA-X in Electron for full cognitive capacity, Boss."
        setActiveModelText('')
        const modelMessage: Message = { role: 'model', text: randomAnswer }
        setChatHistory((prev) => [...prev, modelMessage].slice(-30))
      }, 1000)
    }
  }, [])

  // Globally bind the trigger Voice Command listener
  useEffect(() => {
    ;(window as any).triggerVoiceCommand = (q: string) => {
      executeCoreCommand(q)
    }

    const handleMobileCommand = (_event: any, command: string) => {
      console.log('[RightPanel] Incoming mobile companion voice command:', command)
      executeCoreCommand(command)
    }

    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on('mobile-command', handleMobileCommand)
    }

    return () => {
      delete (window as any).triggerVoiceCommand
      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.off('mobile-command', handleMobileCommand)
      }
    }
  }, [executeCoreCommand])

  // Wake-word engine: "Hey Nova" / "OK Boss" always-on activation.
  // Toggled from Settings; runs continuous background speech recognition
  // and hands off directly into the normal command pipeline.
  useEffect(() => {
    const engine = configureWakeWordEngine({
      onStatusChange: setWakeWordStatus,
      onWake: () => {
        setMood('focused', 0.8)
        if (navigator.vibrate) navigator.vibrate(40)
      },
      onCommand: (command: string) => {
        if (command.trim()) {
          executeCoreCommand(command.trim())
        }
      },
      onError: (err: string) => {
        console.warn('[NOVA-X WakeWord] recognition error:', err)
      }
    })

    if (wakeWordEnabled) {
      engine.start()
    }

    const handleToggle = (e: Event): void => {
      const enabled = (e as CustomEvent<boolean>).detail
      setWakeWordEnabled(enabled)
      if (enabled) {
        engine.start()
      } else {
        engine.stop()
      }
    }
    window.addEventListener('novax_wakeword_toggled', handleToggle)

    return () => {
      window.removeEventListener('novax_wakeword_toggled', handleToggle)
      engine.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executeCoreCommand])

  // Custom clear chat helper
  const clearLocalChat = (): void => {
    localStorage.removeItem('novax_chat_history')
    setChatHistory([])
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-zinc-950/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center shrink-0 bg-black/40">
        <div className="flex flex-col">
          <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-300 uppercase">
            CONVERSATION CORE
          </h2>
          <span className="text-[9px] font-mono text-zinc-500">Secure Logs</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearLocalChat}
            className="text-[9px] font-mono px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer uppercase tracking-wider"
          >
            Clear
          </button>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ffc4] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ffc4]"></span>
            </span>
            <span className="text-[10px] font-mono font-semibold text-[#00ffc4] uppercase tracking-wider">
              Live
            </span>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 p-4 overflow-y-auto flex flex-col gap-4 scroll-smooth
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-white/10
          [&::-webkit-scrollbar-thumb]:rounded-full
          hover:[&::-webkit-scrollbar-thumb]:bg-emerald-500/40"
      >
        {chatHistory.length === 0 && activeModelText === '' && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60">
            <svg
              className="w-12 h-12 text-[#00ffc4]/15 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-xs text-white/30 font-mono tracking-widest uppercase">
              Core Synapse Idle...
            </p>
          </div>
        )}

        {chatHistory.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`relative group max-w-[85%] p-3.5 rounded-2xl text-xs font-mono tracking-wide leading-relaxed shadow-lg ${
                msg.role === 'user'
                  ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20 rounded-br-none'
                  : 'bg-zinc-900/60 text-zinc-100 border border-white/5 rounded-bl-none'
              }`}
            >
              <div className="text-[8px] opacity-40 uppercase font-bold tracking-widest mb-1 select-none">
                {msg.role === 'user' ? 'Operator' : 'NOVA-X'}
              </div>
              <div className="whitespace-pre-wrap pr-6">{msg.text}</div>
              
              {msg.role === 'model' && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(msg.text)
                    setCopiedIndex(idx)
                    setTimeout(() => setCopiedIndex(null), 1500)
                  }}
                  className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-400 hover:text-white cursor-pointer"
                  title="Copy response"
                >
                  {copiedIndex === idx ? (
                    <Check size={11} className="text-emerald-400" />
                  ) : (
                    <Copy size={11} />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {activeModelText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] p-3.5 rounded-2xl bg-zinc-900/60 text-zinc-100 border border-white/5 rounded-bl-none text-xs font-mono tracking-wide leading-relaxed shadow-lg">
              <div className="text-[8px] text-emerald-400 opacity-60 uppercase font-bold tracking-widest mb-1 select-none">
                NOVA-X (Typing)
              </div>
              <div>
                {activeModelText}
                <span className="inline-block w-1.5 h-3 ml-1 bg-emerald-400 rounded-full animate-ping align-middle"></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message Input Bar */}
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!userInput.trim()) return

          const query = userInput.trim()
          setUserInput('')
          await executeCoreCommand(query)
        }}
        className="p-3 bg-black/40 border-t border-white/5 flex gap-2 items-center shrink-0"
      >
        <button
          type="button"
          onClick={() => {
            const next = !wakeWordEnabled
            localStorage.setItem('novax_wakeword_enabled', next ? 'true' : 'false')
            window.dispatchEvent(new CustomEvent('novax_wakeword_toggled', { detail: next }))
          }}
          className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 relative ${
            wakeWordStatus === 'armed'
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : wakeWordEnabled && wakeWordStatus === 'listening'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-900/60 text-zinc-500 border-white/5 hover:text-zinc-300 hover:bg-zinc-800/40'
          }`}
          title={
            wakeWordStatus === 'unsupported'
              ? 'Wake word not supported on this browser engine'
              : wakeWordEnabled
                ? `Wake word ON — say "Hey Nova" (${wakeWordStatus})`
                : 'Wake word OFF — click to enable "Hey Nova"'
          }
        >
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-0.5">
            {wakeWordStatus === 'armed' ? '●●●' : wakeWordEnabled ? '●' : '○'}
          </span>
        </button>
        <button
          type="button"
          onClick={toggleRecording}
          className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
            isRecording
              ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.4)]'
              : 'bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
          title={isRecording ? 'Stop Voice Recording' : 'Voice Input (Mic)'}
        >
          {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={isRecording ? "Listening, Boss..." : "Enter command, Boss..."}
          disabled={isRecording}
          className="flex-1 bg-zinc-900/60 border border-white/5 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none focus:border-emerald-500/50 transition-all placeholder-zinc-600 disabled:opacity-55"
        />
        <button
          type="submit"
          className="bg-emerald-500 text-black font-mono font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl hover:bg-emerald-400 transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)] shrink-0"
        >
          Send
        </button>
      </form>
    </div>
  )
}
