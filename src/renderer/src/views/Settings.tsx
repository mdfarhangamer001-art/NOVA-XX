import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GiArtificialIntelligence } from 'react-icons/gi'
import {
  RiKey2Line,
  RiSave3Line,
  RiShieldKeyholeLine,
  RiPlugLine,
  RiTerminalWindowLine
} from 'react-icons/ri'

interface SettingsProps {
  isSystemActive: boolean
}

type TabType = 'keys' | 'performance'

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

  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('novax_gemini_key') || '')
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem('novax_groq_key') || '')
  const [hfKey, setHfKey] = useState(() => localStorage.getItem('novax_hf_key') || '')
  const [tavilyKey, settavilyKey] = useState(() => localStorage.getItem('novax_tavily_key') || '')
  const [openrouterKey, setOpenrouterKey] = useState(() => localStorage.getItem('novax_openrouter_key') || '')
  const [systemTone, setSystemTone] = useState(() => localStorage.getItem('novax_system_tone') || 'authoritative')

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
      window.electron.ipcRenderer.invoke('secure-get-keys').then((keys: Record<string, string> | null) => {
        if (keys) {
          if (keys.geminiKey) setGeminiKey(keys.geminiKey)
          if (keys.groqKey) setGroqKey(keys.groqKey)
          if (keys.hfKey) setHfKey(keys.hfKey)
          if (keys.tavilyKey) settavilyKey(keys.tavilyKey)
          if (keys.openrouterKey) setOpenrouterKey(keys.openrouterKey)
        }
      })
    }
  }, [])

  const toggleLowEndMode = (enabled: boolean): void => {
    localStorage.setItem('novax_low_end_mode', enabled ? 'true' : 'false')
    setLowEndMode(enabled)
    window.dispatchEvent(new CustomEvent('novax_perf_mode_changed'))
  }

  const saveApiKeys = async (): Promise<void> => {
    if (window.electron?.ipcRenderer) {
      // Remove any legacy/insecure plain text keys from localStorage
      localStorage.removeItem('novax_gemini_key')
      localStorage.removeItem('novax_groq_key')
      localStorage.removeItem('novax_hf_key')
      localStorage.removeItem('novax_tavily_key')
      localStorage.removeItem('novax_openrouter_key')
      localStorage.setItem('novax_system_tone', systemTone)

      try {
        await window.electron.ipcRenderer.invoke('secure-save-keys', {
          groqKey,
          geminiKey,
          hfKey,
          tavilyKey,
          openrouterKey
        })
        alert('API Keys securely encrypted and saved to NOVA-X Vault.')
      } catch (e) {
        alert('Failed to save keys to the secure vault.')
      }
    } else {
      localStorage.setItem('novax_gemini_key', geminiKey)
      localStorage.setItem('novax_groq_key', groqKey)
      localStorage.setItem('novax_hf_key', hfKey)
      localStorage.setItem('novax_tavily_key', tavilyKey)
      localStorage.setItem('novax_openrouter_key', openrouterKey)
      localStorage.setItem('novax_system_tone', systemTone)
      alert('API Keys saved to browser storage.')
    }
  }

  const inputContainerClass =
    'flex items-center bg-black/40 border border-white/10 rounded-lg px-4 py-3 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all duration-200 w-full'
  const labelClass = 'text-sm text-zinc-300 font-medium flex items-center gap-2 mb-2'
  const titleClass = 'text-lg font-semibold text-white flex items-center gap-3'

  const tabConfigs = [
    { id: 'keys', label: 'API Keys', icon: <RiPlugLine size={18} /> },
    { id: 'performance', label: 'Performance', icon: <RiTerminalWindowLine size={18} /> }
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
              <GiArtificialIntelligence size={28} className="text-zinc-100" />
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
                  <div className="flex justify-between items-center pb-2">
                    <span className={titleClass}>
                      <RiKey2Line className="text-emerald-400" size={24} /> API Providers
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={saveApiKeys}
                      className="bg-emerald-500 cursor-pointer text-black px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2"
                    >
                      <RiSave3Line size={18} /> Save Keys
                    </motion.button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>Google Gemini API</label>
                      <div className={inputContainerClass}>
                        <input
                          type="password"
                          value={geminiKey}
                          onChange={(e) => setGeminiKey(e.target.value)}
                          placeholder="AIzaSy..."
                          className="bg-transparent border-none outline-none text-base text-white w-full placeholder:text-zinc-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Groq Cloud API</label>
                      <div className={inputContainerClass}>
                        <input
                          type="password"
                          value={groqKey}
                          onChange={(e) => setGroqKey(e.target.value)}
                          placeholder="gsk_..."
                          className="bg-transparent border-none outline-none text-base text-white w-full placeholder:text-zinc-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Hugging Face Token</label>
                      <div className={inputContainerClass}>
                        <input
                          type="password"
                          value={hfKey}
                          onChange={(e) => setHfKey(e.target.value)}
                          placeholder="hf_..."
                          className="bg-transparent border-none outline-none text-base text-white w-full placeholder:text-zinc-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Tavily Search API</label>
                      <div className={inputContainerClass}>
                        <input
                          type="password"
                          value={tavilyKey}
                          onChange={(e) => settavilyKey(e.target.value)}
                          placeholder="tvly-..."
                          className="bg-transparent border-none outline-none text-base text-white w-full placeholder:text-zinc-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>OpenRouter API Key</label>
                      <div className={inputContainerClass}>
                        <input
                          type="password"
                          value={openrouterKey}
                          onChange={(e) => setOpenrouterKey(e.target.value)}
                          placeholder="sk-or-v1-..."
                          className="bg-transparent border-none outline-none text-base text-white w-full placeholder:text-zinc-600"
                        />
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
                  </div>

                  <div className="bg-zinc-800/50 border border-white/5 p-4 rounded-xl flex gap-3 items-start mt-4">
                    <RiShieldKeyholeLine className="text-zinc-400 shrink-0 mt-0.5" size={18} />
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
                      <RiTerminalWindowLine className="text-emerald-400" size={24} /> Performance & Graphics
                    </span>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4 p-4 bg-black/30 border border-white/5 rounded-xl">
                      <div className="flex flex-col gap-1 max-w-lg text-left">
                        <span className="text-sm font-semibold text-white">Graphics & Engine Performance</span>
                        <span className="text-[11px] text-zinc-400">
                          Adjust visual fidelity based on your hardware capabilities. The AI core experience remains seamless across all modes.
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
                          <div className="text-[9px] text-zinc-500 lowercase normal-case tracking-normal">Full 3D WebGL Core, HD rendering, dynamic particles. Recommended for dedicated GPUs.</div>
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
                          <div className="text-[9px] text-zinc-500 lowercase normal-case tracking-normal">Optimized 3D WebGL, capped resolution, low power mode. Good for modern laptops.</div>
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
                          <div className="text-[9px] text-zinc-500 lowercase normal-case tracking-normal">Lightweight 2D HUD vector core, 0% GPU usage. Perfect for older or low-spec devices.</div>
                        </button>
                      </div>
                    </div>

                    <div className="bg-zinc-800/40 border border-white/5 p-4 rounded-xl flex gap-3 items-start text-left">
                      <RiShieldKeyholeLine className="text-[#00f3ff] shrink-0 mt-0.5" size={18} />
                      <div className="flex flex-col gap-1">
                        <strong className="text-xs text-white uppercase tracking-wider font-mono">Graphics Diagnostics</strong>
                        <p className="text-[11px] text-zinc-300 leading-relaxed font-mono">
                          - Active Core Engine: {perfMode === 'low' ? 'Lightweight 2D HUD vector core (0% GPU)' : perfMode === 'medium' ? 'Hardware-Accelerated 3D WebGL (Optimized)' : 'Hardware-Accelerated 3D WebGL (High Fidelity)'}
                          <br />
                          - Memory Optimization: {perfMode === 'low' ? 'Capped at ~15MB' : perfMode === 'medium' ? 'Capped at ~100MB' : 'VRAM Intensive (~250MB)'}
                          <br />
                          - Target Framerate: Locked to system standard (60 FPS fluid pulse)
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
