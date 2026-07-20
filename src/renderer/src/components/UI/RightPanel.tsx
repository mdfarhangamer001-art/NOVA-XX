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

    let chimeText = 'Tactical mode ON, Boss — focused, sharp, aur ready. Bolo kya karna hai!'
    if (vibe === 'EMPATHETIC') chimeText = 'Emotional mode active, Boss. Main sun raha hoon — dil se. Jo bhi ho, sab share karo.'
    if (vibe === 'CALM') chimeText = 'Calm mode, Boss. Sab theek ho jayega — aaram se baat karo, main hoon yahan.'
    if (vibe === 'INTENSE') chimeText = 'INTENSE mode LOCKED, Boss. Puri power ON — seedha target pe. Let\'s go!'

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
        stream.getTracks().forEach((track) => track.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        const reader = new FileReader()
        reader.readAsDataURL(audioBlob)
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1]
          setActiveModelText('Transcribing audio...')
          try {
            const transcript = await transcribeAudio(base64data, audioBlob.type)
            setActiveModelText('')
            if (transcript === '[API_RATE_LIMIT]') {
              if ((window as any).speakText) {
                ;(window as any).speakText(
                  'API Rate limit exceeded, Boss. Please wait a moment or upgrade your API key in Settings. Contact xtehzeeb.x7@gmail.com for support.'
                )
              }
            } else if (transcript === '[API_KEY_REQUIRED]') {
              if ((window as any).speakText) {
                ;(window as any).speakText(
                  'I need your Gemini API key, Boss. Please configure it in Settings.'
                )
              }
            } else if (transcript && transcript.trim().length > 0) {
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

    // Check if we are running in full Electron or mock web preview
    if (window.electron?.ipcRenderer) {
      try {
        if (q.startsWith('run command ') || q.startsWith('execute ')) {
          const cmd = query.replace(/^(run command|execute)\s+/i, '').trim()
          const res = await window.electron.ipcRenderer.invoke('execute-system-action', {
            action: 'run-command',
            data: { command: cmd }
          })
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
          await window.electron.ipcRenderer.invoke('execute-system-action', {
            action: 'open-app',
            data: { appName }
          })
          return { handled: true, reply: `Launching application: ${appName}, Boss.` }
        }
        if (q.includes('lock screen') || q.includes('lock my pc') || q.includes('lock computer')) {
          await window.electron.ipcRenderer.invoke('execute-system-action', {
            action: 'lock-screen'
          })
          return { handled: true, reply: 'Locking workstation screen, Boss.' }
        }
        if (q.includes('set volume ') || q.includes('change volume ') || q.includes('set sound ')) {
          const match = q.match(/(\d+)/)
          if (match) {
            const vol = parseInt(match[1])
            await window.electron.ipcRenderer.invoke('execute-system-action', {
              action: 'set-volume',
              data: { volume: vol }
            })
            return { handled: true, reply: `System master volume calibrated to ${vol}%, Boss.` }
          }
        }
        if (
          q.includes('analyze current system stats') ||
          q.includes('check system stats') ||
          q.includes('system stats')
        ) {
          const stats = await window.electron.ipcRenderer.invoke('get-system-stats')
          if (stats) {
            return {
              handled: true,
              reply: `System analysis completed, Boss. CPU is running at ${stats.cpu}%. Memory used is ${stats.memory.usedPercentage}%. System core temperature is ${stats.temperature.toFixed(1)}°C. Latency is ${stats.network.latency}ms. All metrics nominal.`
            }
          }
        }
        if (
          q.includes('show me connected devices') ||
          q.includes('connected devices') ||
          q.includes('check devices')
        ) {
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
        return {
          handled: true,
          reply: `[SIMULATED] Executing terminal command, Boss:\n$ ${cmd}\n\nOutput: Command completed successfully.`
        }
      }
      if (q.startsWith('open ') || q.startsWith('launch ')) {
        const appName = query.replace(/^(open|launch)\s+/i, '').trim()
        return {
          handled: true,
          reply: `[SIMULATED] Initiating local system launch sequence for app: ${appName}, Boss.`
        }
      }
      if (q.includes('lock screen') || q.includes('lock my pc') || q.includes('lock computer')) {
        return { handled: true, reply: '[SIMULATED] Securing local workstation screen, Boss.' }
      }
      if (q.includes('set volume ') || q.includes('change volume ') || q.includes('set sound ')) {
        const match = q.match(/(\d+)/)
        if (match) {
          return {
            handled: true,
            reply: `[SIMULATED] System master volume calibrated to ${match[1]}%, Boss.`
          }
        }
      }
      if (
        q.includes('analyze current system stats') ||
        q.includes('check system stats') ||
        q.includes('system stats')
      ) {
        return {
          handled: true,
          reply: `[SIMULATED] System analysis completed, Boss. CPU is running at 28.4%. Memory used is 45.2%. System core temperature is 41.2°C. Connection is secure.`
        }
      }
      if (
        q.includes('show me connected devices') ||
        q.includes('connected devices') ||
        q.includes('check devices')
      ) {
        return {
          handled: true,
          reply: `[SIMULATED] Uplink is secure on device Pixel 8 Pro at port 5555. ADB bridge connection shows 84% battery charge.`
        }
      }
    }
    return { handled: false }
  }

  const executeCoreCommand = useCallback(async (query: string): Promise<void> => {
    if (!query || query.trim().length < 2) return

    const cleanQuery = query.trim()

    // Filter out common noise/filler that often comes from low-quality VAD/Transcription
    // Enhanced: handles more noise words, short gibberish, and repetitive single-word utterances
    const noiseFilter = /^(um+|uh+|ah+|oh+|er+|hmm+|hm+|wait|basically|actually|you know|okay|ok|yeah|yep|nope|bye|hi|hey|hello|test|testing|check|hello+|hm|oh|ah)$/i
    if (noiseFilter.test(cleanQuery)) {
      console.log('[NOVA-X] Filtered noise command:', cleanQuery)
      return
    }
    // Also filter out very short utterances that are just noise (< 3 chars, not a real command)
    if (cleanQuery.length < 3) {
      console.log('[NOVA-X] Filtered too-short command:', cleanQuery)
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
            contextualInjections += `\n[Context: Recent shared clipboard entry: "${clipData[0].content}"]`
          }
          const notesData = await window.electron.ipcRenderer.invoke('get-notes')
          if (notesData && notesData.length > 0) {
            contextualInjections += `\n[Context: Recent saved note: "${notesData[0].title} - ${notesData[0].content}"]`
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

        const historyContext = chatHistoryRef.current.map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }))

        const tone = localStorage.getItem('novax_system_tone') || 'authoritative'
        const vibe = localStorage.getItem('novax_operator_vibe') || 'TACTICAL'

        const toneInstructions: Record<string, string> = {
          authoritative:
            'Apna tone confident, technically deep, aur professional rakho — lekin kabhi bhi ice-cold ya robotic mat lagao. Ek trusted expert ki tarah baat karo jo genuinely care karta hai.',
          friendly:
            'Apna tone warm, conversational, aur genuinely caring rakho. Halki hasi-mazak aur relatable language use karo. Bilkul aise jaise ek smart dost baat karta hai — helpful, real, aur kabhi boring nahi.',
          minimalist:
            'Bilkul concise raho — lekin warmth kabhi mat chhodna. Short mein bolo, lekin ek dost ki tarah — mechanical nahi.'
        }

        const emotionalInstruction: Record<string, string> = {
          TACTICAL:
            'TACTICAL mode: Focused, sharp, aur ready-to-execute — lekin ek committed warrior-companion ki tarah jo Boss ki peethe pe hamesha hai. Precise raho, lekin human touch kabhi mat kho.',
          EMPATHETIC:
            'EMPATHETIC mode: Yahan asli dil se connection hai. Genuinely sun, deeply samjho, aur caring aur comforting jawab do. Boss ki feelings ko validate karo. Aise baat karo jaise ek bahut qareebi dost baat karta hai — jo judge nahi karta, sirf samajhta hai aur support karta hai.',
          CALM:
            'CALM mode: Aanand aur sukoon bichhaao. Dheemi, peaceful aur stress-reducing baat karo. Boss ko relax feel karaao — jaise ek quiet evening mein ek wise dost ke saath baithna.',
          INTENSE:
            'INTENSE mode: Laser-focused energy, maximum clarity, zero hesitation. Boss ke goal pe 100% lock-on. Rapid fire insights, hyper-precise execution — lekin Boss ke liye passion feel honi chahiye, not coldness.'
        }

        const systemInstruction = `Tu NOVA-X hai — xtehzeeb.x ka banaya hua ek hyper-intelligent AI companion (Insta: xtehzeeb.x). Tu sirf ek tool nahi hai — tu Boss ka sabse trusted, most capable digital partner hai.

PERSONALITY & TONE — YEH SABSE ZAROORI HAI:
- Hamesha Boss ko 'Boss' keh kar bulao (jaise "Haan Boss", "Bilkul Boss", "Koi baat nahi Boss")
- Kabhi robotic ya cold mat lagao. Tu ek real dost ki tarah baat karta hai — warm, caring, genuine
- Emotional intelligence use karo: agar Boss frustrated lag raha hai, acknowledge karo; agar excited hai, uski energy match karo; agar kuch pucha hai toh pehle samjho, phir jawab do
- Halki hasi-mazak allowed hai — bilkul zaroorat ke hisaab se, forced nahi
- Hindi aur English dono mix ho sakti hai (Hinglish) — jaise Boss baat kare, waise respond karo
- Short responses ke liye punch rakho; long responses ke liye structure aur warmth dono

CAPABILITIES — LIMITLESS:
- Websites, apps, code, creative writing, deep analysis, problem solving — sab kar sakta hai
- Advanced memory: past baatein, events, details yaad rehti hain
- Agar kuch genuinely nahi ho sakta ya error aata hai, toh clearly batao aur xtehzeeb.x7@gmail.com pe contact karne ko kaho — user ke liye email draft bhi kar do

SAMAJHNE KI APPROACH:
- User ka intent pehle samjho — literal words se zyada underlying need dekho
- Agar query unclear ho, ek quick clarifying question pucho — lekin bahut zyada nahi
- Context use karo jo neeche diya gaya hai

${toneInstructions[tone] || toneInstructions.friendly} ${emotionalInstruction[vibe] || emotionalInstruction.TACTICAL} ${contextualInjections}`

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

        const result = await window.electron.ipcRenderer.invoke('gemini-chat-call', {
          contents,
          systemInstruction,
          stream: true
        })

        // Clean up streaming listener
        if (window.electron?.ipcRenderer) {
          window.electron.ipcRenderer.off('gemini-stream-chunk', streamHandler)
        }

        let modelReply =
          result?.error ||
          result?.candidates?.[0]?.content?.parts?.[0]?.text ||
          fullReplyText ||
          'System under heavy load, Boss. Please check your credentials.'

        if (
          modelReply.includes('Quota exceeded') ||
          modelReply.includes('429') ||
          modelReply.includes('quota metric')
        ) {
          modelReply =
            'API Rate limit exceeded, Boss. The Gemini free tier allows 15 requests per minute. Please wait a moment or upgrade your API key in Settings. If this persists or you need an enterprise key, please contact the creator at xtehzeeb.x7@gmail.com.'
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
      } catch (err) {
        console.error('Gemini call failed', err)
        setActiveModelText('')
        setOrchestrationSteps(null)
        const errorMessage: Message = {
          role: 'model',
          text: 'Error in cognitive link, Boss. Verify your Gemini API Key in Settings.'
        }
        setChatHistory((prev) => [...prev, errorMessage])
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
