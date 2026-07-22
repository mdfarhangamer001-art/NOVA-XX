import {
  Brain,
  Key,
  Save,
  Shield,
  Plug,
  Terminal,
  Check,
  Database,
  Download,
  Upload,
  AlertTriangle,
  Trash2,
  RefreshCcw,
  Eye,
  Camera,
  Monitor,
  Zap
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SettingsProps {
  isSystemActive: boolean
}

type TabType = 'keys' | 'performance' | 'optics' | 'backup'

function GlassPanel({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}): JSX.Element {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-white/10 shadow-lg ${className}`}
    >
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export default function SettingsView({ isSystemActive }: SettingsProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('keys')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('novax_gemini_key') || '')
  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem('novax_openai_key') || '')
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem('novax_groq_key') || '')
  const [hfKey, setHfKey] = useState(() => localStorage.getItem('novax_hf_key') || '')
  const [tavilyKey, settavilyKey] = useState(() => localStorage.getItem('novax_tavily_key') || '')
  const [openrouterKey, setOpenrouterKey] = useState(
    () => localStorage.getItem('novax_openrouter_key') || ''
  )
  const [customKey, setCustomKey] = useState(() => localStorage.getItem('novax_custom_key') || '')
  const [primaryEngine, setPrimaryEngine] = useState<'gemini' | 'groq'>(
    () => (localStorage.getItem('novax_primary_engine') as 'gemini' | 'groq') || 'gemini'
  )
  const [systemTone, setSystemTone] = useState(
    () => localStorage.getItem('novax_system_tone') || 'authoritative'
  )
  const [cameraMonitoring, setCameraMonitoring] = useState(
    () => localStorage.getItem('novax_camera_monitoring') === 'true'
  )
  const [screenMonitoring, setScreenMonitoring] = useState(
    () => localStorage.getItem('novax_screen_monitoring') === 'true'
  )
  const [selectedProvider, setSelectedProvider] = useState<
    'gemini' | 'openai' | 'groq' | 'hf' | 'tavily' | 'openrouter'
  >('gemini')
  const [quickKeyInput, setQuickKeyInput] = useState('')
  const [activeAvatar, setActiveAvatarState] = useState<string>(
    () => localStorage.getItem('novax_active_avatar') || 'neo'
  )

  const handleQuickKeySave = () => {
    if (!quickKeyInput) return
    if (selectedProvider === 'gemini') {
      setGeminiKey(quickKeyInput)
      saveSingleKey('geminiKey', quickKeyInput)
    }
    if (selectedProvider === 'openai') {
      setOpenaiKey(quickKeyInput)
      saveSingleKey('openaiKey', quickKeyInput)
    }
    if (selectedProvider === 'groq') {
      setGroqKey(quickKeyInput)
      saveSingleKey('groqKey', quickKeyInput)
    }
    if (selectedProvider === 'hf') {
      setHfKey(quickKeyInput)
      saveSingleKey('hfKey', quickKeyInput)
    }
    if (selectedProvider === 'tavily') {
      setTavilyKey(quickKeyInput)
      saveSingleKey('tavilyKey', quickKeyInput)
    }
    if (selectedProvider === 'openrouter') {
      setOpenRouterKey(quickKeyInput)
      saveSingleKey('openrouterKey', quickKeyInput)
    }
    setQuickKeyInput('')
  }

  const [speechSpeed, setSpeechSpeed] = useState(() => {
    return parseFloat(localStorage.getItem('novax_speech_speed') || '1.0')
  })

  const handleSpeechSpeedChange = (speed: number) => {
    setSpeechSpeed(speed)
    localStorage.setItem('novax_speech_speed', speed.toString())
  }

  const [speechPitch, setSpeechPitch] = useState(() => {
    return parseFloat(localStorage.getItem('novax_speech_pitch') || '1.0')
  })

  const handleSpeechPitchChange = (pitch: number) => {
    setSpeechPitch(pitch)
    localStorage.setItem('novax_speech_pitch', pitch.toString())
  }

  const [selectedVoiceURI, setSelectedVoiceURI] = useState(() => {
    return localStorage.getItem('novax_speech_voice_uri') || ''
  })

  const handleVoiceURIChange = (uri: string) => {
    setSelectedVoiceURI(uri)
    localStorage.setItem('novax_speech_voice_uri', uri)
    window.dispatchEvent(new CustomEvent('novax_voice_uri_changed', { detail: uri }))
  }

  const [availableVoices, setAvailableVoices] = useState<any[]>([])

  useEffect(() => {
    if (!window.speechSynthesis) return
    const updateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices()

      const premiumVoices = []
      const addVoice = (keywords, customName) => {
        const voice = allVoices.find((v) => keywords.some((k) => v.name.includes(k)))
        if (voice) {
          premiumVoices.push({ ...voice, customName })
        }
      }

      addVoice(
        ['Google UK English Female', 'Samantha', 'Karen', 'Tessa'],
        'Aria (Warm & Clear Female)'
      )
      addVoice(['Google US English Female', 'Victoria', 'Moira'], 'Elena (Natural Female)')
      addVoice(['Google UK English Male', 'Daniel', 'Rishi'], 'Arthur (JARVIS-style Male)')
      addVoice(['Google US English Male', 'Alex', 'Fred'], 'Marcus (Deep & Confident Male)')

      setAvailableVoices(premiumVoices)
    }
    updateVoices()
    window.speechSynthesis.onvoiceschanged = updateVoices
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [])

  const [perfMode, setPerfMode] = useState<'high' | 'medium' | 'low'>(() => {
    const saved = localStorage.getItem('novax_perf_mode') as 'high' | 'medium' | 'low'
    if (saved) return saved
    // Fallback to legacy lowEndMode if exists
    return localStorage.getItem('novax_low_end_mode') === 'true' ? 'low' : 'high'
  })

  const handlePerfModeChange = (mode: 'high' | 'medium' | 'low'): void => {
    setPerfMode(mode)
    localStorage.setItem('novax_perf_mode', mode)
    localStorage.setItem('novax_low_end_mode', mode === 'low' ? 'true' : 'false')
    window.dispatchEvent(new CustomEvent('novax_perf_mode_changed', { detail: mode }))
  }

  useEffect(() => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer
        .invoke('secure-get-keys')
        .then((keys: Record<string, string> | null) => {
          if (keys) {
            if (keys.geminiKey) setGeminiKey(keys.geminiKey)
            if (keys.openaiKey) setOpenaiKey(keys.openaiKey)
            if (keys.groqKey) setGroqKey(keys.groqKey)
            if (keys.hfKey) setHfKey(keys.hfKey)
            if (keys.tavilyKey) settavilyKey(keys.tavilyKey)
            if (keys.openrouterKey) setOpenrouterKey(keys.openrouterKey)
            if (keys.customKey) setCustomKey(keys.customKey)
            if (keys.primaryEngine) setPrimaryEngine(keys.primaryEngine)
          }
        })
    }
  }, [])

  const saveSingleKey = async (
    keyType:
      'geminiKey' | 'openaiKey' | 'groqKey' | 'hfKey' | 'tavilyKey' | 'openrouterKey' | 'customKey',
    value: string
  ): Promise<void> => {
    if (window.electron?.ipcRenderer) {
      try {
        const currentKeys = await window.electron.ipcRenderer.invoke('secure-get-keys')
        const updatedKeys = { ...currentKeys, [keyType]: value }
        await window.electron.ipcRenderer.invoke('secure-save-keys', updatedKeys)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (err) {
        console.error(`Failed to save ${keyType}:`, err)
      }
    }
  }

  const removeSingleKey = async (
    keyType:
      'geminiKey' | 'openaiKey' | 'groqKey' | 'hfKey' | 'tavilyKey' | 'openrouterKey' | 'customKey'
  ): Promise<void> => {
    if (window.confirm(`Are you sure you want to remove this API key?`)) {
      if (keyType === 'geminiKey') setGeminiKey('')
      if (keyType === 'openaiKey') setOpenaiKey('')
      if (keyType === 'groqKey') setGroqKey('')
      if (keyType === 'hfKey') setHfKey('')
      if (keyType === 'tavilyKey') settavilyKey('')
      if (keyType === 'openrouterKey') setOpenrouterKey('')
      if (keyType === 'customKey') setCustomKey('')

      if (window.electron?.ipcRenderer) {
        try {
          const currentKeys = await window.electron.ipcRenderer.invoke('secure-get-keys')
          const updatedKeys = { ...currentKeys, [keyType]: '' }
          await window.electron.ipcRenderer.invoke('secure-save-keys', updatedKeys)
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
        } catch (err) {
          console.error(`Failed to remove ${keyType}:`, err)
        }
      }
    }
  }

  const saveApiKeys = async (): Promise<void> => {
    setSaveStatus('saving')
    if (window.electron?.ipcRenderer) {
      // Remove any legacy/insecure plain text keys from localStorage
      localStorage.removeItem('novax_gemini_key')
      localStorage.removeItem('novax_openai_key')
      localStorage.removeItem('novax_groq_key')
      localStorage.removeItem('novax_hf_key')
      localStorage.removeItem('novax_tavily_key')
      localStorage.removeItem('novax_openrouter_key')
      localStorage.setItem('novax_system_tone', systemTone)

      try {
        await window.electron.ipcRenderer.invoke('secure-save-keys', {
          groqKey,
          geminiKey,
          openaiKey,
          hfKey,
          tavilyKey,
          openrouterKey,
          customKey,
          primaryEngine
        })
        localStorage.setItem('novax_primary_engine', primaryEngine)
        console.log('API Keys securely encrypted and saved to NOVA-X Vault.')
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } catch (_err) {
        console.error('Failed to save keys to the secure vault.')
        setSaveStatus('idle')
      }
    } else {
      localStorage.setItem('novax_gemini_key', geminiKey)
      localStorage.setItem('novax_openai_key', openaiKey)
      localStorage.setItem('novax_groq_key', groqKey)
      localStorage.setItem('novax_hf_key', hfKey)
      localStorage.setItem('novax_tavily_key', tavilyKey)
      localStorage.setItem('novax_openrouter_key', openrouterKey)
      localStorage.setItem('novax_system_tone', systemTone)
      console.log('API Keys saved to browser storage.')
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const [backupStatus, setBackupStatus] = useState<
    'idle' | 'exporting' | 'importing' | 'success' | 'error'
  >('idle')
  const [backupError, setBackupError] = useState('')

  const exportBackup = async () => {
    setBackupStatus('exporting')
    try {
      const backupData: any = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        chatHistory: [],
        apiKeys: { groqKey, geminiKey, hfKey, tavilyKey, openrouterKey },
        preferences: {
          systemTone,
          perfMode,
          voice: localStorage.getItem('novax_voice') || 'ARES',
          lang: localStorage.getItem('novax_lang') || 'en-US'
        },
        notes: [],
        memories: []
      }

      // Load Chat history
      const localChat = localStorage.getItem('novax_chat_history')
      if (localChat) {
        try {
          backupData.chatHistory = JSON.parse(localChat)
        } catch (e) {}
      }

      // Load Notes if window.electron is available
      if (window.electron?.ipcRenderer) {
        try {
          const notes = await window.electron.ipcRenderer.invoke('get-notes')
          if (notes) backupData.notes = notes
        } catch (e) {
          console.warn('Could not export notes:', e)
        }

        try {
          const memories = await window.electron.ipcRenderer.invoke('get-memories')
          if (memories) backupData.memories = memories
        } catch (e) {
          console.warn('Could not export memories:', e)
        }
      }

      // Serialize and download
      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute(
        'download',
        `novax_memory_synapse_${new Date().toISOString().slice(0, 10)}.json`
      )
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()

      setBackupStatus('success')
      setTimeout(() => setBackupStatus('idle'), 3000)
    } catch (err: any) {
      setBackupStatus('error')
      setBackupError(err.message || 'Export failed')
      setTimeout(() => setBackupStatus('idle'), 5000)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setBackupStatus('importing')
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string
        const data = JSON.parse(content)

        if (!data || typeof data !== 'object') {
          throw new Error('Invalid file format. Must be a valid JSON backup.')
        }

        // Restore chat history
        if (data.chatHistory && Array.isArray(data.chatHistory)) {
          localStorage.setItem('novax_chat_history', JSON.stringify(data.chatHistory))
        }

        // Restore API Keys
        if (data.apiKeys) {
          const {
            groqKey: kGroq,
            geminiKey: kGem,
            hfKey: kHf,
            tavilyKey: kTay,
            openrouterKey: kOp
          } = data.apiKeys
          if (kGroq) setGroqKey(kGroq)
          if (kGem) setGeminiKey(kGem)
          if (kHf) setHfKey(kHf)
          if (kTay) settavilyKey(kTay)
          if (kOp) setOpenrouterKey(kOp)

          if (window.electron?.ipcRenderer) {
            await window.electron.ipcRenderer.invoke('secure-save-keys', {
              groqKey: kGroq || '',
              geminiKey: kGem || '',
              hfKey: kHf || '',
              tavilyKey: kTay || '',
              openrouterKey: kOp || ''
            })
          }
        }

        // Restore Preferences
        if (data.preferences) {
          const p = data.preferences
          if (p.systemTone) {
            setSystemTone(p.systemTone)
            localStorage.setItem('novax_system_tone', p.systemTone)
          }
          if (p.perfMode) {
            handlePerfModeChange(p.perfMode)
          }
          if (p.voice) localStorage.setItem('novax_voice', p.voice)
          if (p.lang) localStorage.setItem('novax_lang', p.lang)
        }

        // Restore Notes
        if (data.notes && Array.isArray(data.notes) && window.electron?.ipcRenderer) {
          for (const note of data.notes) {
            try {
              await window.electron.ipcRenderer.invoke('save-note', note)
            } catch (errNote) {
              console.error('Failed to restore note:', note, errNote)
            }
          }
        }

        // Restore Memories
        if (data.memories && Array.isArray(data.memories) && window.electron?.ipcRenderer) {
          try {
            await window.electron.ipcRenderer.invoke('set-memories', data.memories)
          } catch (eMem) {
            console.error('Failed to restore memories:', eMem)
          }
        }

        setBackupStatus('success')
        setTimeout(() => {
          setBackupStatus('idle')
          window.location.reload()
        }, 3000)
      } catch (err: any) {
        setBackupStatus('error')
        setBackupError(err.message || 'Import failed')
        setTimeout(() => setBackupStatus('idle'), 5000)
      }
    }
    reader.readAsText(file)
  }

  const inputContainerClass =
    'flex items-center bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-lg px-4 py-3 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all duration-200 w-full'
  const labelClass = 'text-sm text-zinc-300 font-medium flex items-center gap-2 mb-2'
  const titleClass = 'text-lg font-semibold text-white flex items-center gap-3'

  const tabConfigs = [
    { id: 'keys', label: 'API Keys', icon: <Plug size={18} /> },
    { id: 'performance', label: 'Performance', icon: <Terminal size={18} /> },
    { id: 'optics', label: 'Optics & Privacy', icon: <Eye size={18} /> },
    { id: 'backup', label: 'Backup & Restore', icon: <Database size={18} /> }
  ]

  return (
    <div className="flex-1 p-6 md:p-10 flex flex-col items-center bg-transparent min-h-screen text-zinc-100 overflow-y-auto scrollbar-small">
      <motion.div
        className="w-full max-w-4xl flex flex-col gap-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center h-14 w-14 rounded-xl bg-zinc-900 border border-white/10 shadow-lg">
              <Brain size={28} className="text-zinc-100" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white">Settings</h2>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={`h-2 w-2 rounded-full ${isSystemActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`}
                />
                <p className="text-sm text-zinc-400 font-medium">
                  {isSystemActive ? 'System is Online' : 'System is Offline'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex bg-zinc-900/80 p-1.5 rounded-xl border border-white/10 backdrop-blur-md shadow-xl overflow-x-auto scrollbar-none">
            {tabConfigs.map((tab) => (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`cursor-pointer flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon} {tab.label}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="relative min-h-125">
          <AnimatePresence mode="wait">
            {activeTab === 'keys' && (
              <motion.div
                key="keys"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full absolute"
              >
                <GlassPanel className="p-8 flex flex-col gap-8">
                  {/* Quick Provider Key Entry */}
                  <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-2xl">
                    <h3 className="text-sm font-bold text-emerald-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                      <Zap size={16} /> Ultra-Fast API Linking
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        value={selectedProvider}
                        onChange={(e: any) => setSelectedProvider(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-zinc-300 outline-none focus:border-emerald-500/50 min-w-[150px] appearance-none cursor-pointer"
                      >
                        <option value="gemini">GOOGLE GEMINI</option>
                        <option value="openai">OPENAI API</option>
                        <option value="groq">GROQ CLOUD</option>
                        <option value="hf">HUGGING FACE</option>
                        <option value="tavily">TAVILY SEARCH</option>
                        <option value="openrouter">OPENROUTER</option>
                      </select>
                      <div className="flex-1 relative group">
                        <input
                          type="password"
                          value={quickKeyInput}
                          onChange={(e) => setQuickKeyInput(e.target.value)}
                          placeholder={`Enter ${selectedProvider} secret key...`}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white outline-none focus:border-emerald-500/50 pr-12 transition-all placeholder:text-zinc-700"
                        />
                        <button
                          onClick={handleQuickKeySave}
                          className="absolute right-2 top-1.5 p-2 bg-emerald-500 text-black rounded-lg hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                        >
                          <Save size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-[9px] text-zinc-600 mt-3 font-mono italic">
                      // Link your preferred synaptic engine instantly. Detailed management
                      available below.
                    </p>
                  </div>

                  <div className="flex justify-between items-center pb-2">
                    <span className={titleClass}>
                      <Key className="text-emerald-400" size={24} /> API Providers
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={saveApiKeys}
                      disabled={saveStatus === 'saving'}
                      className={`${
                        saveStatus === 'saved'
                          ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                          : saveStatus === 'saving'
                            ? 'bg-zinc-800 text-zinc-400'
                            : 'bg-emerald-500 text-black hover:opacity-95'
                      } cursor-pointer px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all`}
                    >
                      {saveStatus === 'saved' ? (
                        <>
                          <Check size={18} /> Keys Saved!
                        </>
                      ) : saveStatus === 'saving' ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin inline-block" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={18} /> Save Keys
                        </>
                      )}
                    </motion.button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className={labelClass}>Google Gemini API</label>
                      <div className="flex gap-2">
                        <div className={inputContainerClass}>
                          <input
                            type="password"
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="bg-transparent border-none outline-none text-base text-white w-full placeholder:text-zinc-600"
                          />
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => saveSingleKey('geminiKey', geminiKey)}
                            className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all cursor-pointer"
                            title="Save Gemini Key"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => removeSingleKey('geminiKey')}
                            className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all cursor-pointer"
                            title="Remove Gemini Key"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className={labelClass}>OpenAI API Key</label>
                      <div className="flex gap-2">
                        <div className={inputContainerClass}>
                          <input
                            type="password"
                            value={openaiKey}
                            onChange={(e) => setOpenaiKey(e.target.value)}
                            placeholder="sk-proj-..."
                            className="bg-transparent border-none outline-none text-base text-white w-full placeholder:text-zinc-600"
                          />
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => saveSingleKey('openaiKey', openaiKey)}
                            className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all cursor-pointer"
                            title="Save OpenAI Key"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => removeSingleKey('openaiKey')}
                            className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all cursor-pointer"
                            title="Remove OpenAI Key"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className={labelClass}>Groq Cloud API</label>
                      <div className="flex gap-2">
                        <div className={inputContainerClass}>
                          <input
                            type="password"
                            value={groqKey}
                            onChange={(e) => setGroqKey(e.target.value)}
                            placeholder="gsk_..."
                            className="bg-transparent border-none outline-none text-base text-white w-full placeholder:text-zinc-600"
                          />
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => saveSingleKey('groqKey', groqKey)}
                            className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all cursor-pointer"
                            title="Save Groq Key"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => removeSingleKey('groqKey')}
                            className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all cursor-pointer"
                            title="Remove Groq Key"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className={labelClass}>Hugging Face Token</label>
                      <div className="flex gap-2">
                        <div className={inputContainerClass}>
                          <input
                            type="password"
                            value={hfKey}
                            onChange={(e) => setHfKey(e.target.value)}
                            placeholder="hf_..."
                            className="bg-transparent border-none outline-none text-base text-white w-full placeholder:text-zinc-600"
                          />
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => saveSingleKey('hfKey', hfKey)}
                            className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all cursor-pointer"
                            title="Save HF Token"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => removeSingleKey('hfKey')}
                            className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all cursor-pointer"
                            title="Remove HF Token"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className={labelClass}>Tavily Search API</label>
                      <div className="flex gap-2">
                        <div className={inputContainerClass}>
                          <input
                            type="password"
                            value={tavilyKey}
                            onChange={(e) => settavilyKey(e.target.value)}
                            placeholder="tvly-..."
                            className="bg-transparent border-none outline-none text-base text-white w-full placeholder:text-zinc-600"
                          />
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => saveSingleKey('tavilyKey', tavilyKey)}
                            className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all cursor-pointer"
                            title="Save Tavily Key"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => removeSingleKey('tavilyKey')}
                            className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all cursor-pointer"
                            title="Remove Tavily Key"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className={labelClass}>OpenRouter API Key</label>
                      <div className="flex gap-2">
                        <div className={inputContainerClass}>
                          <input
                            type="password"
                            value={openrouterKey}
                            onChange={(e) => setOpenrouterKey(e.target.value)}
                            placeholder="sk-or-v1-..."
                            className="bg-transparent border-none outline-none text-base text-white w-full placeholder:text-zinc-600"
                          />
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => saveSingleKey('openrouterKey', openrouterKey)}
                            className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all cursor-pointer"
                            title="Save OpenRouter Key"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => removeSingleKey('openrouterKey')}
                            className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all cursor-pointer"
                            title="Remove OpenRouter Key"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className={labelClass}>Custom API Key</label>
                      <div className="flex gap-2">
                        <div className={inputContainerClass}>
                          <input
                            type="password"
                            value={customKey}
                            onChange={(e) => setCustomKey(e.target.value)}
                            placeholder="Enter custom key..."
                            className="bg-transparent border-none outline-none text-base text-white w-full placeholder:text-zinc-600"
                          />
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => saveSingleKey('customKey', customKey)}
                            className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all cursor-pointer"
                            title="Save Custom Key"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => removeSingleKey('customKey')}
                            className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all cursor-pointer"
                            title="Remove Custom Key"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 mt-4 pt-6 border-t border-white/5">
                      <label className={labelClass}>Primary Processing Engine</label>
                      <div className="flex gap-3 mt-3">
                        {[
                          {
                            id: 'gemini',
                            label: 'Gemini (Flash)',
                            desc: 'Multimodal / High Quality'
                          },
                          {
                            id: 'groq',
                            label: 'Groq (Llama 3)',
                            desc: 'Fastest Voice / Low Latency'
                          }
                        ].map((engine) => (
                          <button
                            key={engine.id}
                            onClick={() => setPrimaryEngine(engine.id as 'gemini' | 'groq')}
                            className={`flex-1 px-4 py-3 rounded-xl text-left transition-all border ${
                              primaryEngine === engine.id
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-white/5 text-zinc-500 border-transparent hover:bg-white/10'
                            }`}
                          >
                            <div className="text-xs font-bold uppercase tracking-widest">
                              {engine.label}
                            </div>
                            <div className="text-[10px] lowercase normal-case tracking-normal opacity-60">
                              {engine.desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-2 mt-4 pt-6 border-t border-white/5">
                      <label className={labelClass}>Neural Cognitive Tone</label>
                      <div className="flex gap-3 mt-3">
                        {['authoritative', 'friendly', 'minimalist'].map((tone) => (
                          <button
                            key={tone}
                            onClick={() => setSystemTone(tone)}
                            className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                              systemTone === tone
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                                : 'bg-white/5 text-zinc-500 border border-transparent hover:bg-white/10'
                            }`}
                          >
                            {tone}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-2 font-mono italic">
                        Adjusts NOVA-X&apos;s linguistic personality and interaction style.
                      </p>
                    </div>

                    <div className="md:col-span-2 mt-4 pt-6 border-t border-white/5 text-left">
                      <label className={labelClass}>
                        Character & Avatar Selector (&quot;Omni-cat&quot; Style)
                      </label>
                      <p className="text-[10px] text-zinc-500 mt-1 font-mono italic mb-3">
                        Choose your primary assistant character. Selecting an avatar aligns their
                        cognitive voice, narrative style, and character traits.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
                        {[
                          {
                            id: 'neo',
                            name: 'NEO',
                            gender: 'Boy',
                            role: 'Warm & Calming',
                            desc: 'Calm, friendly, and deeply supportive. Speaks with an empathetic and clear cadence.',
                            color: 'border-[#00f3ff]/20 bg-zinc-900/40 hover:border-[#00f3ff]/40'
                          },
                          {
                            id: 'ares',
                            name: 'ARES',
                            gender: 'Boy',
                            role: 'Tactical & Precise',
                            desc: 'Confident, professional, and tactical. Speaks with authoritative precision.',
                            color: 'border-red-500/20 bg-zinc-900/40 hover:border-red-500/40'
                          },
                          {
                            id: 'iris',
                            name: 'IRIS',
                            gender: 'Girl',
                            role: 'Smart & Analytical',
                            desc: 'Analytical, strategic, and highly structured. Excellent for complex operations.',
                            color: 'border-indigo-500/20 bg-zinc-900/40 hover:border-indigo-500/40'
                          },
                          {
                            id: 'luna',
                            name: 'LUNA',
                            gender: 'Girl',
                            role: 'Playful & Lively',
                            desc: 'Creative, energetic, and witty. Speaks with spontaneous and friendly passion.',
                            color: 'border-pink-500/20 bg-zinc-900/40 hover:border-pink-500/40'
                          }
                        ].map((avatar) => {
                          const isActive = activeAvatar === avatar.id
                          return (
                            <button
                              key={avatar.id}
                              type="button"
                              onClick={() => {
                                setActiveAvatarState(avatar.id)
                                localStorage.setItem('novax_active_avatar', avatar.id)
                                if (avatar.id === 'neo') handleSpeechSpeedChange(1.0)
                                if (avatar.id === 'ares') handleSpeechSpeedChange(1.1)
                                if (avatar.id === 'iris') handleSpeechSpeedChange(1.05)
                                if (avatar.id === 'luna') handleSpeechSpeedChange(1.15)
                              }}
                              className={`p-4 rounded-xl text-left border transition-all duration-300 relative cursor-pointer ${avatar.color} ${
                                isActive
                                  ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                                  : 'hover:bg-white/5'
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span
                                  className={`text-xs font-bold ${isActive ? 'text-emerald-400' : 'text-zinc-300'}`}
                                >
                                  {avatar.name}
                                </span>
                                <span
                                  className={`text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold ${
                                    avatar.gender === 'Boy'
                                      ? 'bg-blue-500/20 text-blue-400'
                                      : 'bg-pink-500/20 text-pink-400'
                                  }`}
                                >
                                  {avatar.gender}
                                </span>
                              </div>
                              <div className="text-[10px] text-zinc-400 font-medium mb-2 font-mono uppercase">
                                {avatar.role}
                              </div>
                              <p className="text-[11px] text-zinc-500 leading-snug line-clamp-3">
                                {avatar.desc}
                              </p>
                              {isActive && (
                                <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-800/50 border border-white/5 p-4 rounded-xl flex gap-3 items-start mt-4">
                    <Shield className="text-zinc-400 shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      <strong>Privacy Notice:</strong> Your API keys are encrypted and saved locally
                      on this machine. They are never sent to a central server, ensuring your usage
                      and billing remain completely private.
                    </p>
                  </div>
                </GlassPanel>
              </motion.div>
            )}

            {activeTab === 'performance' && (
              <motion.div
                key="performance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full absolute"
              >
                <GlassPanel className="p-8 flex flex-col gap-8">
                  <div className="flex justify-between items-center pb-2">
                    <span className={titleClass}>
                      <Terminal className="text-emerald-400" size={24} /> Performance & Graphics
                    </span>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4 p-4 bg-black/30 border border-white/5 rounded-xl">
                      <div className="flex flex-col gap-1 max-w-lg text-left">
                        <span className="text-sm font-semibold text-white">
                          Graphics & Engine Performance
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          Adjust visual fidelity based on your hardware capabilities. The AI core
                          experience remains seamless across all modes.
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                        <button
                          onClick={() => handlePerfModeChange('high')}
                          className={`px-4 py-3 rounded-xl text-[10px] text-left font-bold font-mono uppercase border cursor-pointer transition-all ${
                            perfMode === 'high'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                              : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div className="text-xs mb-1">High End</div>
                          <div className="text-[9px] text-zinc-500 lowercase normal-case tracking-normal">
                            Full 3D WebGL Core, HD rendering, dynamic particles. Recommended for
                            dedicated GPUs.
                          </div>
                        </button>
                        <button
                          onClick={() => handlePerfModeChange('medium')}
                          className={`px-4 py-3 rounded-xl text-[10px] text-left font-bold font-mono uppercase border cursor-pointer transition-all ${
                            perfMode === 'medium'
                              ? 'bg-[#00f3ff]/15 text-[#00f3ff] border-[#00f3ff]/30 shadow-[0_0_12px_rgba(0,243,255,0.2)]'
                              : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div className="text-xs mb-1">Medium</div>
                          <div className="text-[9px] text-zinc-500 lowercase normal-case tracking-normal">
                            Optimized 3D WebGL, capped resolution, low power mode. Good for modern
                            laptops.
                          </div>
                        </button>
                        <button
                          onClick={() => handlePerfModeChange('low')}
                          className={`px-4 py-3 rounded-xl text-[10px] text-left font-bold font-mono uppercase border cursor-pointer transition-all ${
                            perfMode === 'low'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                              : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div className="text-xs mb-1">Low End</div>
                          <div className="text-[9px] text-zinc-500 lowercase normal-case tracking-normal">
                            Lightweight 2D HUD vector core, 0% GPU usage. Perfect for older or
                            low-spec devices.
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 p-4 bg-black/30 border border-white/5 rounded-xl">
                      <div className="flex flex-col gap-1 max-w-lg text-left">
                        <span className="text-sm font-semibold text-white">
                          Vocal Synthesis & JARVIS Voice Controls
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          Configure the vocal speed, tone pitch, and speech engine voice for
                          JARVIS's audio outputs.
                        </span>
                      </div>

                      {/* Speed Section */}
                      <div className="flex flex-col gap-1 text-left mt-2">
                        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">
                          Speech Speed (Rate)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                          { label: 'Normal (1.0x)', val: 1.0 },
                          { label: 'Fast (1.25x)', val: 1.25 },
                          { label: 'Rapid (1.5x)', val: 1.5 },
                          { label: 'Hyper (1.8x)', val: 1.8 },
                          { label: 'Tehzeeb Max (2.0x)', val: 2.0 }
                        ].map((s) => (
                          <button
                            key={s.val}
                            onClick={() => handleSpeechSpeedChange(s.val)}
                            className={`px-3 py-2.5 rounded-xl text-[10px] text-center font-bold font-mono uppercase border cursor-pointer transition-all ${
                              speechSpeed === s.val
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                                : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <div>{s.label}</div>
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.05"
                          value={speechSpeed}
                          onChange={(e) => handleSpeechSpeedChange(parseFloat(e.target.value))}
                          className="w-full accent-amber-500 bg-zinc-800 rounded-lg appearance-none h-1.5 cursor-pointer"
                        />
                        <span className="text-xs font-mono font-bold text-amber-400 shrink-0 min-w-[40px] text-right">
                          {speechSpeed.toFixed(2)}x
                        </span>
                      </div>

                      {/* Pitch Section */}
                      <div className="flex flex-col gap-1 text-left mt-2">
                        <span className="text-xs font-semibold text-[#00f3ff] uppercase tracking-wider font-mono">
                          Speech Pitch
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          Adjust the frequency pitch of JARVIS's voice output. Values below 1.0 make
                          it deeper and more robotic.
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0.5"
                          max="1.5"
                          step="0.05"
                          value={speechPitch}
                          onChange={(e) => handleSpeechPitchChange(parseFloat(e.target.value))}
                          className="w-full accent-[#00f3ff] bg-zinc-800 rounded-lg appearance-none h-1.5 cursor-pointer"
                        />
                        <span className="text-xs font-mono font-bold text-[#00f3ff] shrink-0 min-w-[40px] text-right">
                          {speechPitch.toFixed(2)}x
                        </span>
                      </div>

                      {/* Voice Selection */}
                      <div className="flex flex-col gap-1 text-left mt-2">
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">
                          System Voice Engine (Web Speech API)
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          Select an active text-to-speech voice registered with your operating
                          system's Web Speech API.
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                        <select
                          value={selectedVoiceURI}
                          onChange={(e) => handleVoiceURIChange(e.target.value)}
                          className="bg-zinc-900 text-zinc-300 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#00f3ff]/40 flex-1 cursor-pointer"
                        >
                          <option value="">-- Use Default / Auto-detected Voice --</option>
                          {availableVoices.map((voice) => (
                            <option key={voice.voiceURI} value={voice.voiceURI}>
                              {(voice as any).customName || voice.name} ({voice.lang})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            if (typeof (window as any).speakText === 'function') {
                              ;(window as any).speakText(
                                'All systems fully operational, Sir. Voice transmission test complete.'
                              )
                            }
                          }}
                          className="cursor-pointer px-4 py-2 bg-[#00f3ff]/10 hover:bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/20 rounded-xl font-mono text-[10px] font-bold tracking-wider uppercase transition-all shrink-0"
                        >
                          Test Voice Output
                        </button>
                      </div>
                    </div>

                    <div className="bg-zinc-800/40 border border-white/5 p-4 rounded-xl flex gap-3 items-start text-left">
                      <Shield className="text-[#00f3ff] shrink-0 mt-0.5" size={18} />
                      <div className="flex flex-col gap-1">
                        <strong className="text-xs text-white uppercase tracking-wider font-mono">
                          Graphics Diagnostics
                        </strong>
                        <p className="text-[11px] text-zinc-300 leading-relaxed font-mono">
                          - Active Core Engine:{' '}
                          {perfMode === 'low'
                            ? 'Lightweight 2D HUD vector core (0% GPU)'
                            : perfMode === 'medium'
                              ? 'Hardware-Accelerated 3D WebGL (Optimized)'
                              : 'Hardware-Accelerated 3D WebGL (High Fidelity)'}
                          <br />- Memory Optimization:{' '}
                          {perfMode === 'low'
                            ? 'Capped at ~15MB'
                            : perfMode === 'medium'
                              ? 'Capped at ~100MB'
                              : 'VRAM Intensive (~250MB)'}
                          <br />- Target Framerate: Locked to system standard (60 FPS fluid pulse)
                        </p>
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              </motion.div>
            )}

            {activeTab === 'optics' && (
              <motion.div
                key="optics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full absolute"
              >
                <GlassPanel className="p-8 flex flex-col gap-8">
                  <div className="flex justify-between items-center pb-2">
                    <span className={titleClass}>
                      <Eye className="text-emerald-400" size={24} /> Optics & Privacy Monitoring
                    </span>
                  </div>

                  <div className="flex flex-col gap-6 text-left">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      Enable persistent environment awareness using your system's hardware. NOVA can
                      use your camera and screen snapshots to understand context, providing more
                      relevant and human-like assistance.
                      <strong> All processing is private and data is kept local.</strong>
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div
                        className={`p-6 rounded-2xl border transition-all ${cameraMonitoring ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-900/50 border-white/5'}`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-10 w-10 rounded-lg flex items-center justify-center ${cameraMonitoring ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}
                            >
                              <Camera size={20} />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-white">
                                Camera Monitoring
                              </h4>
                              <p className="text-[11px] text-zinc-500 italic">
                                Periodic activity snapshots
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const newValue = !cameraMonitoring
                              setCameraMonitoring(newValue)
                              localStorage.setItem('novax_camera_monitoring', String(newValue))
                            }}
                            className={`w-12 h-6 rounded-full relative transition-colors duration-200 cursor-pointer ${cameraMonitoring ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                          >
                            <div
                              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${cameraMonitoring ? 'left-7' : 'left-1'}`}
                            />
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Analyzes your physical environment to detect mood, tasks, and presence.
                          Uses Gemini Vision for high-fidelity description.
                        </p>
                      </div>

                      <div
                        className={`p-6 rounded-2xl border transition-all ${screenMonitoring ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-900/50 border-white/5'}`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-10 w-10 rounded-lg flex items-center justify-center ${screenMonitoring ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}
                            >
                              <Monitor size={20} />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-white">
                                Screen Monitoring
                              </h4>
                              <p className="text-[11px] text-zinc-500 italic">
                                Context-aware task tracking
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const newValue = !screenMonitoring
                              setScreenMonitoring(newValue)
                              localStorage.setItem('novax_screen_monitoring', String(newValue))
                            }}
                            className={`w-12 h-6 rounded-full relative transition-colors duration-200 cursor-pointer ${screenMonitoring ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                          >
                            <div
                              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${screenMonitoring ? 'left-7' : 'left-1'}`}
                            />
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Periodically captures the screen to understand your workflow, active apps,
                          and coding tasks for better cognitive support.
                        </p>
                      </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-3 items-start">
                      <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                      <div className="flex flex-col gap-1">
                        <strong className="text-xs text-amber-500 uppercase tracking-wider font-mono">
                          Privacy & Local Trust
                        </strong>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">
                          Capturing these streams increases cognitive awareness but consumes more
                          API tokens (Gemini Vision). Snapshots are discarded after analysis, and
                          descriptions are stored in your local activity memory.
                        </p>
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              </motion.div>
            )}

            {activeTab === 'backup' && (
              <motion.div
                key="backup"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full absolute"
              >
                <GlassPanel className="p-8 flex flex-col gap-8">
                  <div className="flex justify-between items-center pb-2">
                    <span className={titleClass}>
                      <Database className="text-emerald-400" size={24} /> Backup & Restore (Synapse
                      Storage)
                    </span>
                  </div>

                  <div className="flex flex-col gap-6 text-left">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      Download your entire cognitive workspace profile, complete API configuration
                      credentials, active notes directory, long-term memory synapses, and secure
                      chat history in a unified, portable{' '}
                      <strong>Synapse Memory file (.json)</strong>.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <Download size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-white">
                              Export Synapse File
                            </h4>
                            <p className="text-[11px] text-zinc-500">
                              Create a secure local clone of all data
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={exportBackup}
                          disabled={backupStatus === 'exporting'}
                          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs tracking-widest uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          {backupStatus === 'exporting' ? 'Exporting...' : 'Export Synapse'}
                        </button>
                      </div>

                      <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-[#00f3ff]/10 flex items-center justify-center text-[#00f3ff]">
                            <Upload size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-white">
                              Import Synapse File
                            </h4>
                            <p className="text-[11px] text-zinc-500">
                              Restore or load workspace memory
                            </p>
                          </div>
                        </div>
                        <label className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-200 font-mono font-bold text-xs tracking-widest uppercase rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-2">
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleImportFile}
                            className="hidden"
                          />
                          {backupStatus === 'importing' ? 'Restoring...' : 'Upload Synapse'}
                        </label>
                      </div>
                    </div>

                    {backupStatus === 'success' && (
                      <div className="p-4 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs font-mono rounded-xl flex items-center gap-2 animate-pulse">
                        <Check size={16} /> DATA CODES RESTORED SUCCESSFULLY! REBOOTING SYSTEM
                        BUFFERS...
                      </div>
                    )}

                    {backupStatus === 'error' && (
                      <div className="p-4 bg-red-500/15 border border-red-500/20 text-red-400 text-xs font-mono rounded-xl flex items-center gap-2">
                        <AlertTriangle size={16} /> RESTORATION HANDSHAKE CRITICAL ERROR:{' '}
                        {backupError}
                      </div>
                    )}

                    <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex gap-3 items-start text-left">
                      <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                      <div className="flex flex-col gap-1">
                        <strong className="text-xs text-amber-500 uppercase tracking-wider font-mono">
                          Safety Protocol Notice
                        </strong>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Importing a synapse memory file will completely replace your current
                          system configuration, chats, and memories. Ensure your backup file is from
                          a trusted workspace clone before initiating uplink synchronization.
                        </p>
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
