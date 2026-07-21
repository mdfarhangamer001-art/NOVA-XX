import { useState, useEffect } from 'react'
import { Brain, Trash2, Clock, ShieldCheck, Cpu, Search, Plus, Sparkles, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MemoryItem {
  id: string
  fact: string
  timestamp: number
}

type MemoryLayer = 'fact' | 'working'

export default function MemoryView(): JSX.Element {
  const [activeLayer, setActiveLayer] = useState<MemoryLayer>('fact')
  const [factMemories, setFactMemories] = useState<MemoryItem[]>([])
  const [workingMemories, setWorkingMemories] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [newFactText, setNewFactText] = useState('')
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    fetchMemories()
  }, [searchTerm])

  const fetchMemories = async () => {
    // @ts-ignore
    if (window.iris?.getMemories) {
      try {
        setLoading(true)
        // @ts-ignore
        const res = await window.iris.getMemories({ query: searchTerm })
        if (res && typeof res === 'object') {
          // Check if structure matches { factMemory, workingMemory }
          setFactMemories(res.factMemory || [])
          setWorkingMemories(res.workingMemory || [])
        } else if (Array.isArray(res)) {
          setFactMemories(res)
          setWorkingMemories([])
        }
      } catch (err) {
        console.error('Failed to load cognitive memory layers:', err)
      } finally {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }

  const handleDelete = async (type: 'fact' | 'working', indexOrId: number | string) => {
    // @ts-ignore
    if (window.electron?.ipcRenderer) {
      try {
        const res = await window.electron.ipcRenderer.invoke('delete-memory', { type, indexOrId })
        if (res && typeof res === 'object') {
          setFactMemories(res.factMemory || [])
          setWorkingMemories(res.workingMemory || [])
          showStatus('Memory pattern deleted successfully')
        }
      } catch (err) {
        console.error('Failed to delete memory item:', err)
      }
    }
  }

  const handleAddFact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFactText.trim()) return

    // @ts-ignore
    if (window.electron?.ipcRenderer) {
      try {
        const newFactItem: MemoryItem = {
          id: String(Date.now() + Math.random().toString(36).substr(2, 5)),
          fact: newFactText.trim(),
          timestamp: Date.now()
        }
        
        const updatedFactMemories = [...factMemories, newFactItem]
        const res = await window.electron.ipcRenderer.invoke('set-memories', {
          factMemory: updatedFactMemories,
          workingMemory: workingMemories
        })

        if (res && typeof res === 'object') {
          setFactMemories(res.factMemory || [])
          setWorkingMemories(res.workingMemory || [])
          setNewFactText('')
          showStatus('Fact added to Long-Term layer')
        }
      } catch (err) {
        console.error('Failed to add custom fact memory:', err)
      }
    }
  }

  const showStatus = (msg: string) => {
    setStatusMessage(msg)
    setTimeout(() => setStatusMessage(''), 3000)
  }

  return (
    <div id="cognitive-vault-panel" className="p-8 h-full overflow-y-auto custom-scrollbar bg-black/25">
      <div className="max-w-4xl mx-auto">
        
        {/* Memory Header */}
        <header className="mb-8 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/15 rounded-2xl border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-pulse">
                <Brain className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white font-mono uppercase">
                  Cognitive <span className="text-emerald-500">Memory</span> Vault
                </h1>
                <p className="text-zinc-400 text-xs font-mono uppercase tracking-widest flex items-center gap-2 mt-1">
                  <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                  Mem0 Multi-Layer Synaptic Store
                </p>
              </div>
            </div>

            {/* Neural Pulse Alert */}
            <AnimatePresence>
              {statusMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  {statusMessage}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p className="text-zinc-400 text-sm mt-3 leading-relaxed max-w-2xl">
            This module stores cognitive fragments about the human operator. By referencing permanent user profiles and short-term conversational context layers, the core intelligence prevents topic repetition and adjusts interactions dynamically.
          </p>
        </header>

        {/* Search & Operations bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
          <div className="relative md:col-span-7">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Query synaptic patterns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500/40 transition-all font-mono"
            />
          </div>

          <div className="flex bg-zinc-900/40 p-1 border border-white/5 rounded-xl md:col-span-5">
            <button
              onClick={() => setActiveLayer('fact')}
              className={`flex-1 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                activeLayer === 'fact'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Fact Layer
            </button>
            <button
              onClick={() => setActiveLayer('working')}
              className={`flex-1 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                activeLayer === 'working'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Working Layer
            </button>
          </div>
        </div>

        {/* Fact Injector Form (Only shown on Fact Tab) */}
        {activeLayer === 'fact' && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleAddFact}
            className="mb-8 p-4 bg-zinc-900/40 border border-white/5 rounded-2xl flex items-center gap-3 hover:border-white/10 transition-all"
          >
            <input
              type="text"
              placeholder="Manually index new operator fact (e.g., Operator is building a React dashboard)..."
              value={newFactText}
              onChange={(e) => setNewFactText(e.target.value)}
              className="flex-1 bg-transparent px-2 py-1 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-0"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
            >
              <Plus className="w-4 h-4" />
              Index
            </button>
          </motion.form>
        )}

        {/* Memory Content Layer */}
        <div className="grid gap-4">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-2 border-emerald-500/15 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest animate-pulse">
                Retrieving layer nodes...
              </p>
            </div>
          ) : activeLayer === 'fact' ? (
            // Fact Memory Layer (Permanent)
            factMemories.length === 0 ? (
              <div className="p-16 border border-white/5 bg-zinc-900/40 rounded-3xl text-center">
                <ShieldCheck className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-1">Permanent Layer Clear</h3>
                <p className="text-zinc-500 text-sm">
                  Start conversing with NOVA-X or add custom facts to build your long-term cognitive base.
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {factMemories.map((item, idx) => (
                  <motion.div
                    key={item.id || `fact-${idx}`}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group relative p-5 bg-zinc-900/60 border border-white/5 rounded-xl hover:border-emerald-500/20 transition-all shadow-md backdrop-blur-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-zinc-100 text-sm font-medium leading-relaxed">
                          {item.fact}
                        </p>
                        <div className="mt-3.5 flex items-center gap-4 text-[9px] font-mono uppercase tracking-widest text-zinc-500">
                          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded">
                            <Clock className="w-3 h-3" />
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                          <span className="text-emerald-500/60 italic font-bold">Synaptic Node Verified</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete('fact', item.id || idx)}
                        className="p-2.5 bg-zinc-800/40 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all border border-transparent hover:border-red-500/20"
                        title="De-index Fact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )
          ) : (
            // Working Memory Layer (Transient conversational buffer)
            workingMemories.length === 0 ? (
              <div className="p-16 border border-white/5 bg-zinc-900/40 rounded-3xl text-center">
                <AlertCircle className="w-12 h-12 text-zinc-700 mx-auto mb-4 animate-pulse" />
                <h3 className="text-white font-bold mb-1">Working Context Empty</h3>
                <p className="text-zinc-500 text-sm">
                  Send messages to populate active working context, enabling contextual avoidance loops.
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {workingMemories.map((contextItem, idx) => (
                  <motion.div
                    key={`working-${idx}`}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group relative p-5 bg-zinc-900/60 border border-white/5 rounded-xl hover:border-emerald-500/20 transition-all shadow-md backdrop-blur-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-zinc-300 text-xs font-mono leading-relaxed bg-black/30 p-3 rounded-lg border border-white/5">
                          {contextItem}
                        </p>
                        <div className="mt-3.5 flex items-center gap-4 text-[9px] font-mono uppercase tracking-widest text-zinc-500">
                          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded">
                            <Clock className="w-3 h-3" />
                            Active Context Cycle
                          </span>
                          <span className="text-amber-500/60 italic font-bold">Repetition Avoidance Flag Active</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete('working', idx)}
                        className="p-2.5 bg-zinc-800/40 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all border border-transparent hover:border-red-500/20"
                        title="Purge Active Context"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )
          )}
        </div>
      </div>
    </div>
  )
}
