import { useState, useEffect } from 'react'
import { Brain, Trash2, Clock, ShieldCheck, Cpu } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MemoryItem {
  fact: string
  timestamp: number
}

export default function MemoryView(): JSX.Element {
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMemories()
  }, [])

  const fetchMemories = async () => {
    // @ts-ignore
    if (window.iris?.getMemories) {
      // @ts-ignore
      const data = await window.iris.getMemories()
      setMemories(data)
    }
    setLoading(false)
  }

  const handleDelete = async (index: number) => {
    // @ts-ignore
    if (window.iris?.deleteMemory) {
      // @ts-ignore
      await window.iris.deleteMemory(index)
      fetchMemories()
    }
  }

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-black/20">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Brain className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white font-mono uppercase">
              Long-Term Memory <span className="text-emerald-500">Vault</span>
            </h1>
          </div>
          <p className="text-zinc-400 text-sm font-medium flex items-center gap-2">
            <Cpu className="w-3 h-3" />
            Neural patterns and extracted facts stored securely for proactive assistance.
          </p>
        </header>

        <div className="grid gap-4">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
                Accessing Synaptic Store...
              </p>
            </div>
          ) : memories.length === 0 ? (
            <div className="p-16 border border-white/5 bg-zinc-900/40 rounded-3xl text-center">
              <ShieldCheck className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-white font-bold mb-1">Memory Vault Empty</h3>
              <p className="text-zinc-500 text-sm">
                Start conversing with NOVA-X to build your personal knowledge base.
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {memories.map((item, idx) => (
                <motion.div
                  key={item.timestamp}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group relative p-6 bg-zinc-900/60 border border-white/5 rounded-2xl hover:border-emerald-500/30 transition-all shadow-lg backdrop-blur-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-zinc-100 text-lg font-medium leading-relaxed">
                        {item.fact}
                      </p>
                      <div className="mt-4 flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md">
                          <Clock className="w-3 h-3" />
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                        <span className="text-emerald-500/60 italic">Pattern Indexed</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(idx)}
                      className="p-3 bg-zinc-800/50 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}
