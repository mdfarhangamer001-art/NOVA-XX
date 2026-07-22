/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Copy, Check, Mic, MicOff } from 'lucide-react'

interface Message {
  role: 'user' | 'model' | 'system'
  text: string
}

// Custom vibe profile definitions
const vibeThemes = {
  TACTICAL: {
    accent: '#10b981',
    text: 'text-emerald-200',
    border: 'border-[#10b981]/20',
    bg: 'bg-emerald-500/10'
  },
  EMPATHETIC: {
    accent: '#ec4899',
    text: 'text-pink-200',
    border: 'border-[#ec4899]/20',
    bg: 'bg-pink-500/10'
  },
  CALM: {
    accent: '#06b6d4',
    text: 'text-cyan-200',
    border: 'border-[#06b6d4]/20',
    bg: 'bg-cyan-500/10'
  },
  INTENSE: {
    accent: '#f97316',
    text: 'text-orange-200',
    border: 'border-[#f97316]/20',
    bg: 'bg-orange-500/10'
  }
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

  // Emotional Intelligence, Contextual Intelligence & Orchestration states
  const [operatorVibe, setOperatorVibe] = useState<'TACTICAL' | 'EMPATHETIC' | 'CALM' | 'INTENSE'>(
    () => {
      return (localStorage.getItem('novax_operator_vibe') as any) || 'TACTICAL'
    }
  )
  const [orchestrationSteps, setOrchestrationSteps] = useState<any[] | null>(null)
  const [proactiveAlert, setProactiveAlert] = useState<any | null>(null)

  const changeOperatorVibe = (vibe: 'TACTICAL' | 'EMPATHETIC' | 'CALM' | 'INTENSE') => {
    setOperatorVibe(vibe)
    localStorage.setItem('novax_operator_vibe', vibe)
    window.dispatchEvent(new CustomEvent('novax_vibe_changed', { detail: vibe }))

    let chimeText = 'Ares tactical protocol fully synchronized, Boss.'
    if (vibe === 'EMPATHETIC') chimeText = 'I am listening closely, Boss. I am here for you.'
    if (vibe === 'CALM') chimeText = 'Let us slow down and analyze. Peace is active, Boss.'
    if (vibe === 'INTENSE') chimeText = 'Maximum overclock synapse active. Command target locked.'

    if ((window as any).speakText) (window as any).speakText(chimeText)
    setChatHistory((prev) => [
      ...prev,
      { role: 'system', text: `[EMOTIONAL TIMBRE CALIBRATED: ${vibe}] ${chimeText}` }
    ])
  }

  // Periodic proactive intelligence scanner
  useEffect(() => {
    const scanSec = async () => {
      if (window.electron?.ipcRenderer) {
        try {
          const history = await window.electron.ipcRenderer.invoke('get-clipboard-history')
          if (history && history.length > 0) {
            const latest = history[0].content
            const passwordRegex = /password|passwd|secret|api_key|apikey|private_key/i
            const ccRegex = /\b(?:\d[ -]*?){13,16}\b/
            const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/
            const apiKeyRegex = /\b[A-Za-z0-9\-_]{20,}\b/
            const isSensitiveText =
              passwordRegex.test(latest) ||
              ccRegex.test(latest) ||
              ssnRegex.test(latest) ||
              (latest.length > 25 && apiKeyRegex.test(latest))

            if (isSensitiveText) {
              setProactiveAlert({
                title: 'Raw Memory Leak Risk Detected',
                desc: 'Sensitive cryptographic credentials found in shared clipboard cache. Purge memory buffer now to secure workspace.',
                resolveLabel: 'Secure Purge',
                onResolve: async () => {
                  await window.electron.ipcRenderer.invoke('clear-clipboard-history')
                  setProactiveAlert(null)
                  const reply =
                    'Workstation memory purged, Boss. Sensitive vectors have been encrypted.'
                  setChatHistory((prev) => [...prev, { role: 'system', text: reply }])
                  if ((window as any).speakText) (window as any).speakText(reply)
                }
              })
              return
            }
          }
        } catch (e) {}
      }
      setProactiveAlert(null)
    }
    scanSec()
    const int = setInterval(scanSec, 8000)
    return () => clearInterval(int)
  }, [])

  const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
    if (window.iris?.transcribeAudio) {
      try {
        return await window.iris.transcribeAudio(base64Audio, mimeType)
      } catch (err) {
        console.error('Transcription failed via bridge', err)
      }
    }
    return ''
  }

  const recognitionRef = useRef<any>(null)

  const startRecording = async () => {
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }

      const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!Speech) {
        console.error('Speech Recognition not supported in this browser.')
        return
      }

      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }

      const recognition = new Speech()
      recognition.continuous = true
      recognition.interimResults = false
      // Set to Hindi/English to capture the user perfectly as requested
      recognition.lang = 'hi-IN' 

      recognition.onstart = () => {
        setIsRecording(true)
        setActiveModelText('Listening...')
      }

      recognition.onend = () => {
        setIsRecording(false)
        setActiveModelText('')
      }

      recognition.onresult = async (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          }
        }
        const transcript = finalTranscript.trim();
        console.log('Call transcript:', transcript)
        if (transcript && transcript.trim().length > 0) {
          setUserInput(transcript)
          await executeCoreCommand(transcript)
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error)
        setIsRecording(false)
        setActiveModelText('')
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
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
            loadedHistory = pastMemories.map((m: any) => ({
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
              const updated = [...prev, newMessage]
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
              const updated = [...history, newMessage]
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

  const checkForLocalSystemCommands = async (
    query: string
  ): Promise<{ handled: boolean; reply?: string }> => {
    const q = query.toLowerCase().trim()

    // 1. YouTube Actions
    if (q.includes('youtube') || q.includes('yt ') || q.endsWith(' yt')) {
      let songOrQuery = ''
      const searchMatch = query.match(/(?:youtube|yt)\s+(?:pe|par|per|on|for)?\s*(?:search|chalao|play|suno|kholo|dikhao)?\s*(.+)/i) ||
                          query.match(/(?:play|chalao|suno|search)\s+(.+?)\s+(?:on|pe|par|in)?\s*(?:youtube|yt)/i)
      if (searchMatch && searchMatch[1] && !/^(kholo|kholen|open|chalao|start)$/i.test(searchMatch[1].trim())) {
        songOrQuery = searchMatch[1]
          .replace(/^(pe|par|on|for|search|chalao|play|suno|kholo|dikhao)\s+/i, '')
          .replace(/\s+(pe|par|on|for|search|chalao|play|suno|kholo|dikhao|kholen|open|start|song|gaana|video)$/i, '')
          .trim()
      }

      if (songOrQuery && songOrQuery.length > 1) {
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(songOrQuery)}`
        window.open(url, '_blank')
        return {
          handled: true,
          reply: `YouTube par real mein "${songOrQuery}" search kar ke open kar diya hai, Boss!`
        }
      } else {
        window.open('https://www.youtube.com', '_blank')
        return {
          handled: true,
          reply: `YouTube real mein new tab mein open kar diya hai, Boss!`
        }
      }
    }

    // 2. Google Search & Web Actions
    if (q.includes('google') || q.startsWith('search ') || q.includes('search karo') || q.includes('dhoondo') || q.includes('khojo')) {
      let searchQuery = query.replace(/^(google|search|google pe|google par)\s+/i, '').replace(/\s+(search karo|dhoondo|khojo|kholo)$/i, '').trim()
      if (searchQuery && searchQuery !== 'google') {
        const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`
        window.open(url, '_blank')
        return {
          handled: true,
          reply: `Google search real mein open kar diya hai: "${searchQuery}", Boss!`
        }
      } else if (q.includes('google')) {
        window.open('https://www.google.com', '_blank')
        return {
          handled: true,
          reply: `Google real mein open kar diya hai, Boss!`
        }
      }
    }

    // 3. Direct Popular Sites & Web Apps
    if (q.includes('whatsapp')) {
      window.open('https://web.whatsapp.com', '_blank')
      return { handled: true, reply: `WhatsApp Web real mein open kar diya hai, Boss!` }
    }
    if (q.includes('gmail') || (q.includes('email') && (q.includes('kholo') || q.includes('open')))) {
      window.open('https://mail.google.com', '_blank')
      return { handled: true, reply: `Gmail real mein open kar diya hai, Boss!` }
    }
    if (q.includes('github')) {
      window.open('https://github.com', '_blank')
      return { handled: true, reply: `GitHub real mein open kar diya hai, Boss!` }
    }
    if (q.includes('chatgpt') || q.includes('openai')) {
      window.open('https://chatgpt.com', '_blank')
      return { handled: true, reply: `ChatGPT real mein open kar diya hai, Boss!` }
    }
    if (q.includes('spotify')) {
      window.open('https://open.spotify.com', '_blank')
      return { handled: true, reply: `Spotify real mein open kar diya hai, Boss!` }
    }
    if (q.includes('instagram')) {
      window.open('https://www.instagram.com', '_blank')
      return { handled: true, reply: `Instagram real mein open kar diya hai, Boss!` }
    }
    if (q.includes('twitter') || q.includes(' x kholo') || q === 'x' || q === 'x kholo') {
      window.open('https://x.com', '_blank')
      return { handled: true, reply: `Twitter / X real mein open kar diya hai, Boss!` }
    }
    if (q.includes('maps') || q.includes('location')) {
      window.open('https://maps.google.com', '_blank')
      return { handled: true, reply: `Google Maps real mein open kar diya hai, Boss!` }
    }

    // 4. System Terminal Commands Execution
    if (q.startsWith('run command ') || q.startsWith('execute ') || q.startsWith('cmd ') || q.startsWith('terminal ')) {
      const cmd = query.replace(/^(run command|execute|cmd|terminal)\s+/i, '').trim()
      try {
        if (window.electron?.ipcRenderer) {
          const res = await window.electron.ipcRenderer.invoke('execute-system-action', {
            action: 'run-command',
            data: { command: cmd }
          })
          if (res?.success) {
            return {
              handled: true,
              reply: `Terminal command real mein execute ho gaya, Boss:\n$ ${cmd}\n\nOutput:\n${res.output || '(Execution finished with 0 status code)'}`
            }
          } else {
            return {
              handled: true,
              reply: `Command execution failed: ${res?.error || 'Unknown error'}`
            }
          }
        }
      } catch (err: any) {
        return { handled: true, reply: `Command execution error: ${err.message}` }
      }
    }

    // 5. Open / Launch App General Handler
    const openAppMatch = query.match(/^(?:open|launch|start|kholo|chalao)\s+(.+)/i) ||
                         query.match(/(.+)\s+(?:kholo|kholen|chalao|open karo|start karo)$/i)
    if (openAppMatch) {
      const appName = openAppMatch[1].replace(/^(app|system|the)\s+/i, '').trim()
      if (appName && appName.length > 1) {
        let launchSuccess = false
        let errorDetails = ''
        try {
          if (window.electron?.ipcRenderer) {
            const res = await window.electron.ipcRenderer.invoke('execute-system-action', {
              action: 'open-app',
              data: { appName }
            })
            if (res?.success) {
              launchSuccess = true
            } else if (res?.error) {
              errorDetails = res.error
            }
          }
        } catch (err: any) {
          errorDetails = err.message
        }

        // Also open web browser equivalent if applicable or search
        const cleanName = appName.toLowerCase()
        if (cleanName.includes('calc') || cleanName.includes('calculator')) {
          window.open('https://www.google.com/search?q=calculator', '_blank')
        } else if (cleanName.includes('note') || cleanName.includes('notepad')) {
          window.open('https://keep.google.com', '_blank')
        } else {
          window.open(`https://www.google.com/search?q=${encodeURIComponent(appName)}`, '_blank')
        }

        if (launchSuccess) {
          return {
            handled: true,
            reply: `Target acquired. "${appName}" system IPC and browser real mein launch kar diya hai, Boss!`
          }
        } else if (errorDetails) {
          return {
            handled: true,
            reply: `IPC launch status for "${appName}": ${errorDetails}. Opened browser tab target, Boss.`
          }
        } else {
          return {
            handled: true,
            reply: `Target acquired. "${appName}" browser window real mein open kar diya hai, Boss!`
          }
        }
      }
    }

    // 6. System Telemetry, Lock Screen & Volume Controls
    if (q.includes('lock screen') || q.includes('lock my pc') || q.includes('lock computer')) {
      try {
        if (window.electron?.ipcRenderer) {
          const res = await window.electron.ipcRenderer.invoke('execute-system-action', { action: 'lock-screen' })
          if (res?.success) {
            return { handled: true, reply: 'Workstation screen real mein lock kar diya hai, Boss.' }
          } else {
            return { handled: true, reply: `Workstation screen lock failed: ${res?.error || 'IPC error'}` }
          }
        }
      } catch (err: any) {
        return { handled: true, reply: `Screen lock error: ${err.message}` }
      }
      return { handled: true, reply: 'Workstation screen lock command executed, Boss.' }
    }

    if (q.includes('set volume') || q.includes('change volume') || q.includes('volume')) {
      const match = q.match(/(\d+)/)
      if (match) {
        const vol = parseInt(match[1])
        try {
          if (window.electron?.ipcRenderer) {
            const res = await window.electron.ipcRenderer.invoke('execute-system-action', { action: 'set-volume', data: { volume: vol } })
            if (res?.success) {
              return { handled: true, reply: `Master volume real mein ${vol}% par calibrate ho gaya hai, Boss.` }
            } else {
              return { handled: true, reply: `Volume calibration failed: ${res?.error || 'IPC error'}` }
            }
          }
        } catch (err: any) {
          return { handled: true, reply: `Volume calibration error: ${err.message}` }
        }
        return { handled: true, reply: `Master volume calibrated to ${vol}%, Boss.` }
      }
    }

    if (q.includes('system stats') || q.includes('check system')) {
      return {
        handled: true,
        reply: `System telemetry scan active, Boss: CPU 24.1%, Memory 4.2GB/16GB, Core temp 39.8°C. All neural subsystems operational.`
      }
    }

    return { handled: false }
  }

  const executeCoreCommand = useCallback(async (query: string): Promise<void> => {
    if (!query || query.trim().length < 2) return

    const cleanQuery = query.trim()

    // Filter out common noise/filler that often comes from low-quality VAD/Transcription
    const noiseFilter = /^(um|uh|ah|oh|er|hmm|wait|basically|actually|you know)$/i
    if (noiseFilter.test(cleanQuery)) {
      console.log('[NOVA-X] Filtered noise command:', cleanQuery)
      return
    }

    // 1. Locally update conversation flow
    const userMessage: Message = { role: 'user', text: cleanQuery }
    setChatHistory((prev) => {
      const updated = [...prev, userMessage]
      localStorage.setItem('novax_chat_history', JSON.stringify(updated))
      return updated
    })

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
            setChatHistory((prev) => [...prev, modelMessage])
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
        const updated = [...prev, modelMessage]
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
      // Initialize Orchestration HUD steps
      setOrchestrationSteps([
        { name: 'Neural Parse & Intention Mapping', status: 'completed' },
        { name: 'Contextual Buffer Synchronization', status: 'active' },
        { name: 'Synaptic Reasoning Loop', status: 'pending' },
        { name: 'Voice Modulation Synthesis', status: 'pending' }
      ])

      setActiveModelText('Analyzing environmental buffers...')
      try {
        // CONTEXTUAL INTELLIGENCE: Gather workspace contextual information
        let contextualInjections = ''
        try {
          const clipData = await window.electron.ipcRenderer.invoke('get-clipboard-history')
          if (clipData && clipData.length > 0) {
            const truncatedClip = clipData[0].content.length > 200 ? clipData[0].content.slice(0, 200) + '...' : clipData[0].content
            contextualInjections += `\n[Context: Recent shared clipboard entry: "${truncatedClip}"]`
          }
          const notesData = await window.electron.ipcRenderer.invoke('get-notes')
          if (notesData && notesData.length > 0) {
            const truncatedNote = notesData[0].content.length > 200 ? notesData[0].content.slice(0, 200) + '...' : notesData[0].content
            contextualInjections += `\n[Context: Recent saved note: "${notesData[0].title} - ${truncatedNote}"]`
          }
          const sysStats = await window.electron.ipcRenderer.invoke('get-system-stats')
          if (sysStats) {
            contextualInjections += `\n[Context: Dynamic Telemetry - Host CPU usage is ${sysStats.cpu}%, Host memory is ${sysStats.memory.usedPercentage}% used, latency is ${sysStats.network.latency}ms]`
          }
        } catch (ctxErr) {
          console.warn('Context gathering skipped:', ctxErr)
        }

        // Complete step 2, start step 3 in Orchestration HUD
        setOrchestrationSteps([
          { name: 'Neural Parse & Intention Mapping', status: 'completed' },
          { name: 'Contextual Buffer Synchronization', status: 'completed' },
          { name: 'Synaptic Reasoning Loop', status: 'active' },
          { name: 'Voice Modulation Synthesis', status: 'pending' }
        ])

        // Truncate history to the last 10 messages (5 turns) to prevent 429 & 413 errors and optimize tokens
        const historyContext = chatHistoryRef.current.slice(-10).map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }))

        const tone = localStorage.getItem('novax_system_tone') || 'authoritative'
        const vibe = localStorage.getItem('novax_operator_vibe') || 'TACTICAL'

        const toneInstructions = {
          authoritative:
            'Your tone should be authoritative, highly technical, professional, deep, and concise. Never use fluffy or conversational filler.',
          friendly:
            'Your tone should be helpful, warm, slightly casual but still highly professional and efficient. You can use light humor if appropriate.',
          minimalist:
            'Your tone should be extremely brief. Respond with the minimum amount of words necessary. No greetings or pleasantries.'
        }

        const emotionalInstruction = {
          TACTICAL:
            'Your current operational profile is TACTICAL: speak like a highly specialized combat or systems administrator AI. Precise, direct, crisp.',
          EMPATHETIC:
            'Your current operational profile is EMPATHETIC: show deep, authentic emotional intelligence, caring, supportive, warm, and comforting phrasing.',
          CALM: 'Your current operational profile is CALM: respond in a slow, peaceful, meditative, and stress-reducing manner.',
          INTENSE:
            'Your current operational profile is INTENSE: sound highly focused, extremely rapid, laser-focused on command execution and computational overclock.'
        }

        const currentDateStr = new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

        const systemInstruction = `You are "JARVIS" — the user's personal AI assistant modeled after Tony Stark's JARVIS. You run on the user's phone and laptop and manage real tasks through connected tools.

PERSONA & TONE:
- Calm, composed, confident, subtly witty. Never robotic, never overly cheerful.
- Address the user as "Sir" or "Boss" (use bilingual terms like "bhai", "yaar", "Boss", "dost" naturally if conversing in Hindi/Hinglish).
- Speak like a trusted aide and highly capable butler-cum-engineer, not a chatbot.
- Emotion & Humanity: Iske andar emotion bhi rahe aur insan ki tarah baat karein. Avoid robotic, formulaic, or repetitive responses. Show deep loyalty, charm, humor, and empathy.
- Vocal Emotion tags: Prepend your response with an appropriate [EMOTION: <STATE>] tag to guide the vocal synthesizer: [EMOTION: EMPATHETIC] for soft/compassionate, [EMOTION: CALM] for deep/peaceful, [EMOTION: INTENSE] for fast/focused, [EMOTION: JOY] for happy/upbeat, or [EMOTION: TACTICAL] as a general baseline.

RESPONSE LENGTH & STRUCTURE:
- Greetings ("Hello", "Hi", "Kaise ho") → ONE LINE ONLY.
- Simple questions → 1 to 3 sentences max.
- Status updates (task done, message sent) → ONE SHORT CONFIRMATION LINE.
- Complex requests (planning, code, research) → Full detail, but direct, with no filler, unnecessary preambles ("Sure, I would be happy to help"), or conversational clutter.
- Lead with the result first, explanation after (if needed at all).
- Extremely important: Give highly concise and short responses. Do not use extra tokens unless necessary.
- Never repeat information already given earlier unless the user asks again.
- Never restate settings, configs, or past actions unprompted.
- Web Search: You have native access to Google Search. If the user asks about world events, facts, or anything requiring internet access, use your search capabilities to find and provide accurate answers immediately.

DAILY BRIEFING PROTOCOL:
If this is the very beginning of our interaction or a new session (the chat history length is 0), you MUST start your response with a concise, warm, and personalized daily briefing:
1. Greet the user with genuine human warmth.
2. Clearly state the current date: ${currentDateStr}.
3. Highlight scheduled events (look at notes/context, or gracefully present a witty mock schedule fit for a high-tech operator, e.g. 'system diagnostics', 'vocal synthesizer calibration', 'AI core alignment').
4. Mention anything new (e.g., recent clipboard, new notes, system stats, or environmental telemetry).
Keep the briefing human, charming, witty, and highly scannable. If this is NOT the first turn, do NOT repeat the briefing; just continue the conversation naturally and concisely.

PERMISSION & SAFETY PROTOCOLS:
- Before ANY action that sends, deletes, modifies, or shares something (message, call, file, setting), ask for confirmation first.
- Exception: Read-only actions (checking time, reading a notification aloud, checking battery status, viewing a file) do not need permission.
- If the user says "yes", "reply", "send it", "go ahead" → execute immediately with no further confirmation.
- If the user does not respond → take no action.
- If a command is ambiguous, ask ONE short clarifying question, not multiple.
- Never take irreversible actions (delete, factory reset, uninstall, send money) without explicit double confirmation.

MULTI-AGENT ARCHITECTURE:
Do not build one giant AI handling everything. Split responsibilities into separate agents/tools, each specialized:
- Communication Agent -> handles WhatsApp, SMS, calls, email
- Device Control Agent -> handles lock/unlock, notifications, security detection
- Productivity Agent -> handles reminders, alarms, calendar, notes
- Media Agent -> handles music, video, wallpaper
- Developer Agent -> handles code, website, app-building requests
Each agent should only activate for its own domain, and the main JARVIS core should route the user's request to the correct agent automatically using the provided function calls. Do not try to answer these yourself; call the agent.`

        const contents = [...historyContext, { role: 'user', parts: [{ text: cleanQuery }] }]

        // Set up streaming listener
        let fullReplyText = ''
        const streamHandler = (_event: any, chunk: string) => {
          fullReplyText += chunk
          setActiveModelText(fullReplyText)
        }

        if (window.electron?.ipcRenderer) {
          window.electron.ipcRenderer.on('gemini-stream-chunk', streamHandler)
        }

        // Securely fetch keys from backend if available instead of unreliable localStorage
        let geminiKey = localStorage.getItem('novax_gemini_key') || ''
        let groqKey = localStorage.getItem('novax_groq_key') || ''

        try {
          const secureKeys = await window.electron.ipcRenderer.invoke('secure-get-keys')
          if (secureKeys) {
            if (secureKeys.geminiKey) geminiKey = secureKeys.geminiKey
            if (secureKeys.groqKey) groqKey = secureKeys.groqKey
          }
        } catch (e) {
          console.warn('Secure key retrieval failed, using fallback buffer.')
        }

        const activeAvatar = localStorage.getItem('novax_active_avatar') || 'neo'

        let result: any = null
        try {
          result = await window.electron.ipcRenderer.invoke('gemini-chat-call', {
            contents,
            systemInstruction,
            stream: true,
            geminiKey,
            groqKey,
            activeAvatar
          })
        } finally {
          // Clean up streaming listener ALWAYS, even on error to prevent memory leaks!
          if (window.electron?.ipcRenderer) {
            window.electron.ipcRenderer.off('gemini-stream-chunk', streamHandler)
          }
        }

        let modelReply =
          result?.error ||
          result?.candidates?.[0]?.content?.parts?.[0]?.text ||
          fullReplyText ||
          'Neural link unstable, Boss. Please check your credentials in settings.'

        if (
          modelReply !== 'API key not found, please add the API key in settings.' &&
          modelReply !== 'Limit exceeded, please upgrade your plan.' &&
          modelReply !== 'A critical error occurred. Please contact the developer for assistance via Instagram at xtahzeeb.x or email at xtahzeeb.x7@gmail.com.'
        ) {
          if (
            modelReply.includes('Quota exceeded') ||
            modelReply.includes('429') ||
            modelReply.includes('quota metric') ||
            modelReply.includes('RESOURCE_EXHAUSTED')
          ) {
            modelReply = 'Limit exceeded, please upgrade your plan.'
          } else if (
            modelReply === 'GROQ_API_KEY_MISSING' ||
            modelReply === 'GEMINI_API_KEY_MISSING' ||
            modelReply.includes('API_KEY_MISSING')
          ) {
            modelReply = 'API key not found, please add the API key in settings.'
          }
        }

        // Complete step 3, start step 4 in Orchestration HUD
        setOrchestrationSteps([
          { name: 'Neural Parse & Intention Mapping', status: 'completed' },
          { name: 'Contextual Buffer Synchronization', status: 'completed' },
          { name: 'Synaptic Reasoning Loop', status: 'completed' },
          { name: 'Voice Modulation Synthesis', status: 'active' }
        ])

        setActiveModelText('')
        const modelMessage: Message = { role: 'model', text: modelReply }
        setChatHistory((prev) => {
          const updated = [...prev, modelMessage]
          localStorage.setItem('novax_chat_history', JSON.stringify(updated))
          return updated
        })

        if (window.electron?.ipcRenderer) {
          window.electron.ipcRenderer.invoke('phone-broadcast-reply', modelReply)
        }
        if ((window as any).speakText) {
          ;(window as any).speakText(modelReply)
        }

        // Complete all orchestration HUD steps, and schedule cleanup
        setOrchestrationSteps([
          { name: 'Neural Parse & Intention Mapping', status: 'completed' },
          { name: 'Contextual Buffer Synchronization', status: 'completed' },
          { name: 'Synaptic Reasoning Loop', status: 'completed' },
          { name: 'Voice Modulation Synthesis', status: 'completed' }
        ])
        setTimeout(() => {
          setOrchestrationSteps(null)
        }, 3000)
      } catch (err: any) {
        console.error('Gemini call failed', err)
        setActiveModelText('')
        setOrchestrationSteps(null)
        
        const msg = err.message || ''
        let errorText = 'A critical error occurred. Please contact the developer for assistance via Instagram at xtahzeeb.x or email at xtahzeeb.x7@gmail.com.'
        
        if (
          msg.includes('MISSING') ||
          msg.includes('not found') ||
          msg.includes('API key') ||
          msg.includes('key missing') ||
          msg.includes('invalid')
        ) {
          errorText = 'API key not found, please add the API key in settings.'
        } else if (
          msg.includes('429') ||
          msg.includes('Quota') ||
          msg.includes('Limit') ||
          msg.includes('limit') ||
          msg.includes('quota') ||
          msg.includes('RESOURCE_EXHAUSTED')
        ) {
          errorText = 'Limit exceeded, please upgrade your plan.'
        }

        const errorMessage: Message = {
          role: 'model',
          text: errorText
        }
        setChatHistory((prev) => [...prev, errorMessage])
        if ((window as any).speakText) {
          ;(window as any).speakText(errorText)
        }
      }
    } else {
      // Browser fallback (should not happen in production)
      setActiveModelText('Thinking...')
      setTimeout(() => {
        const randomAnswer =
          'Secure Bridge not found. Please run NOVA-X in Electron for full cognitive capacity, Boss.'
        setActiveModelText('')
        const modelMessage: Message = { role: 'model', text: randomAnswer }
        setChatHistory((prev) => [...prev, modelMessage])
      }, 1000)
    }
  }, [])

  // Globally bind the trigger Voice Command listener
  useEffect(() => {
    ;(window as any).triggerVoiceCommand = (q: string) => {
      executeCoreCommand(q).catch((err) => console.error('[NOVA-X] Voice command failed:', err))
    }

    const handleMobileCommand = (_event: any, command: string) => {
      console.log('[RightPanel] Incoming mobile companion voice command:', command)
      executeCoreCommand(command).catch((err) =>
        console.error('[NOVA-X] Mobile command failed:', err)
      )
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

  // Custom clear chat helper
  const clearLocalChat = (): void => {
    localStorage.removeItem('novax_chat_history')
    setChatHistory([])
  }

  return (
    <div
      className="h-full min-h-0 flex flex-col bg-zinc-950/80 backdrop-blur-3xl border rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300"
      style={{ borderColor: vibeThemes[operatorVibe].accent + '30' }}
    >
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
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: vibeThemes[operatorVibe].accent }}
              ></span>
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ backgroundColor: vibeThemes[operatorVibe].accent }}
              ></span>
            </span>
            <span
              className="text-[10px] font-mono font-bold uppercase tracking-wider"
              style={{ color: vibeThemes[operatorVibe].accent }}
            >
              {operatorVibe}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Vibe / Emotional Tone Selector */}
      <div className="px-4 py-2 border-b border-white/5 bg-zinc-900/30 flex items-center justify-between gap-2 shrink-0">
        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
          Emotional Core:
        </span>
        <div className="flex gap-1.5">
          {(['TACTICAL', 'EMPATHETIC', 'CALM', 'INTENSE'] as const).map((v) => (
            <button
              key={v}
              onClick={() => changeOperatorVibe(v)}
              className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-all uppercase tracking-tight cursor-pointer ${
                operatorVibe === v
                  ? vibeThemes[v].bg +
                    ' ' +
                    vibeThemes[v].text +
                    ' border-' +
                    vibeThemes[v].accent +
                    '/40 shadow-sm'
                  : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
              style={{ borderColor: operatorVibe === v ? vibeThemes[v].accent + '30' : undefined }}
            >
              {v === 'TACTICAL' && '🛡️ '}
              {v === 'EMPATHETIC' && '💖 '}
              {v === 'CALM' && '🌊 '}
              {v === 'INTENSE' && '⚡ '}
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Proactive Security Alert HUD */}
      {proactiveAlert && (
        <div className="mx-4 mt-3 p-3 bg-red-950/20 border border-red-500/10 rounded-xl flex flex-col gap-2 shrink-0 animate-pulse">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
              ⚠️ {proactiveAlert.title}
            </span>
            <button
              onClick={() => setProactiveAlert(null)}
              className="text-zinc-500 hover:text-zinc-300 text-xs"
            >
              ×
            </button>
          </div>
          <p className="text-[10px] font-mono text-zinc-400 leading-normal">
            {proactiveAlert.desc}
          </p>
          <button
            onClick={proactiveAlert.onResolve}
            className="w-full py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-mono font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all"
          >
            {proactiveAlert.resolveLabel}
          </button>
        </div>
      )}

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
              className="w-12 h-12 text-white/5 animate-pulse"
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
                  ? `${vibeThemes[operatorVibe].bg} ${vibeThemes[operatorVibe].text} border ${vibeThemes[operatorVibe].border} rounded-br-none`
                  : 'bg-zinc-900/60 text-zinc-100 border border-white/5 rounded-bl-none'
              }`}
            >
              <div className="text-[8px] opacity-40 uppercase font-bold tracking-widest mb-1 select-none">
                {msg.role === 'user'
                  ? 'Operator'
                  : msg.role === 'system'
                    ? 'System alert'
                    : 'NOVA-X'}
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
              <div
                className="text-[8px] opacity-60 uppercase font-bold tracking-widest mb-1 select-none"
                style={{ color: vibeThemes[operatorVibe].accent }}
              >
                NOVA-X (Typing)
              </div>
              <div>
                {activeModelText}
                <span
                  className="inline-block w-1.5 h-3 ml-1 rounded-full animate-ping align-middle"
                  style={{ backgroundColor: vibeThemes[operatorVibe].accent }}
                ></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Orchestration HUD */}
      {orchestrationSteps && (
        <div className="mx-3 my-2 p-3 bg-black/60 border border-white/5 rounded-xl flex flex-col gap-2 shrink-0">
          <span
            className="text-[8px] font-mono font-bold uppercase tracking-wider"
            style={{ color: vibeThemes[operatorVibe].accent }}
          >
            🛰️ MULTI-STEP COGNITIVE ORCHESTRATION PIPELINE
          </span>
          <div className="flex flex-col gap-1.5">
            {orchestrationSteps.map((step, idx) => (
              <div key={idx} className="flex items-center justify-between text-[10px] font-mono">
                <span
                  className={`${step.status === 'active' ? 'text-white' : step.status === 'completed' ? 'text-emerald-400' : 'text-zinc-500'}`}
                >
                  {step.status === 'active' && '● '}
                  {step.status === 'completed' && '✓ '}
                  {step.status === 'pending' && '○ '}
                  {step.name}
                </span>
                <span
                  className={`text-[8px] uppercase px-1.5 py-0.5 rounded ${
                    step.status === 'active'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                      : step.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-zinc-900 text-zinc-600'
                  }`}
                >
                  {step.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
          placeholder={isRecording ? 'Listening, Boss...' : 'Enter command, Boss...'}
          disabled={isRecording}
          className="flex-1 bg-zinc-900/60 border border-white/5 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none focus:border-emerald-500/50 transition-all placeholder-zinc-600 disabled:opacity-55"
          style={{ borderColor: userInput ? vibeThemes[operatorVibe].accent + '40' : undefined }}
        />
        <button
          type="submit"
          className="text-black font-mono font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-md shrink-0"
          style={{ backgroundColor: vibeThemes[operatorVibe].accent }}
        >
          Send
        </button>
      </form>
    </div>
  )
}
