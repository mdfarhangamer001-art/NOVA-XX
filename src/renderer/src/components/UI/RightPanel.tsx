import { useState, useEffect, useRef } from 'react'

interface Message {
  role: 'user' | 'model' | 'system'
  text: string
}

export default function RightPanel() {
  const [chatHistory, setChatHistory] = useState<Message[]>([])
  const [activeModelText, setActiveModelText] = useState('')
  const [userInput, setUserInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
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

  // Custom clear chat helper
  const clearLocalChat = () => {
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
              className={`max-w-[85%] p-3.5 rounded-2xl text-xs font-mono tracking-wide leading-relaxed shadow-lg ${
                msg.role === 'user'
                  ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20 rounded-br-none'
                  : 'bg-zinc-900/60 text-zinc-100 border border-white/5 rounded-bl-none'
              }`}
            >
              <div className="text-[8px] opacity-40 uppercase font-bold tracking-widest mb-1 select-none">
                {msg.role === 'user' ? 'Operator' : 'Nova-X'}
              </div>
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}

        {activeModelText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] p-3.5 rounded-2xl bg-zinc-900/60 text-zinc-100 border border-white/5 rounded-bl-none text-xs font-mono tracking-wide leading-relaxed shadow-lg">
              <div className="text-[8px] text-emerald-400 opacity-60 uppercase font-bold tracking-widest mb-1 select-none">
                Nova-X (Typing)
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

          // Append User message
          const userMessage: Message = { role: 'user', text: query }
          setChatHistory((prev) => {
            const updated = [...prev, userMessage].slice(-30)
            localStorage.setItem('novax_chat_history', JSON.stringify(updated))
            return updated
          })

          // Retrieve Gemini key
          let apiKey = localStorage.getItem('mock_geminiKey') || ''
          if (!apiKey && window.electron?.ipcRenderer) {
            try {
              const keys = await window.electron.ipcRenderer.invoke('secure-get-keys')
              if (keys && keys.geminiKey) {
                apiKey = keys.geminiKey
              }
            } catch (err) {
              console.error('Failed to fetch keys', err)
            }
          }

          if (apiKey) {
            setActiveModelText('Thinking...')
            try {
              // Construct historical context messages
              const historyContext = chatHistory.slice(-6).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
              }))
              
              const systemInstruction = "You are NOVA-X, a hyper-advanced cognitive neural operator system. You are speaking to your creator and operator. You MUST always address them as 'Boss' (e.g., 'Yes, Boss', 'Understood, Boss'). Your tone should be authoritative, highly technical, professional, deep, and concise. Never use fluffy or conversational filler."
              
              const contents = [
                ...historyContext,
                { role: 'user', parts: [{ text: query }] }
              ]

              const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents,
                  systemInstruction: {
                    parts: [{ text: systemInstruction }]
                  },
                  generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 256
                  }
                })
              })

              const result = await response.json()
              const modelReply = result?.candidates?.[0]?.content?.parts?.[0]?.text || "System under heavy load, Boss. Please check your credentials."
              
              setActiveModelText('')
              const modelMessage: Message = { role: 'model', text: modelReply }
              setChatHistory((prev) => {
                const updated = [...prev, modelMessage].slice(-30)
                localStorage.setItem('novax_chat_history', JSON.stringify(updated))
                return updated
              })

              // Speak the text
              if ((window as any).speakText) {
                ;(window as any).speakText(modelReply)
              }
            } catch (err) {
              console.error('Gemini call failed', err)
              setActiveModelText('')
              const errorMessage: Message = { role: 'model', text: 'Error in cognitive link, Boss. Verify your Gemini API Key in Settings.' }
              setChatHistory((prev) => [...prev, errorMessage].slice(-30))
            }
          } else {
            // Simulated response when no API key is set
            setActiveModelText('Simulating core processing...')
            setTimeout(() => {
              const answers = [
                "Understood, Boss. All system metrics are within normal thresholds. What is our next operational vector?",
                "Yes, Boss. Telemetry nodes are fully stabilized. Neural networks are running on port 3000.",
                "Acknowledged, Boss. I have synchronized our central data indexes. Offline backup completed successfully."
              ]
              const randomAnswer = answers[Math.floor(Math.random() * answers.length)]
              setActiveModelText('')
              const modelMessage: Message = { role: 'model', text: randomAnswer }
              setChatHistory((prev) => {
                const updated = [...prev, modelMessage].slice(-30)
                localStorage.setItem('novax_chat_history', JSON.stringify(updated))
                return updated
              })
              if ((window as any).speakText) {
                ;(window as any).speakText(randomAnswer)
              }
            }, 1000)
          }
        }}
        className="p-3 bg-black/40 border-t border-white/5 flex gap-2 items-center shrink-0"
      >
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter command, Boss..."
          className="flex-1 bg-zinc-900/60 border border-white/5 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none focus:border-emerald-500/50 transition-all placeholder-zinc-600"
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
