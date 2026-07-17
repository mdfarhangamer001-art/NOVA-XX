import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  RiClipboardLine, 
  RiDeleteBin6Line, 
  RiPushpinLine, 
  RiPushpinFill, 
  RiFileCopyLine,
  RiEyeOffLine,
  RiEyeLine,
  RiHashtag,
  RiLockPasswordLine,
  RiImageLine,
  RiShieldLine
} from 'react-icons/ri'

interface ClipboardEntry {
  id: string
  type: 'text' | 'image'
  content: string
  timestamp: number
  pinned?: boolean
}

export default function ClipboardView(): JSX.Element {
  const [entries, setEntries] = useState<ClipboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [filterSensitive, setFilterSensitive] = useState(true)
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchHistory()
    const interval = setInterval(fetchHistory, 2000) // update history periodically
    return () => clearInterval(interval)
  }, [])

  const fetchHistory = async () => {
    if (window.electron?.ipcRenderer) {
      const data = await window.electron.ipcRenderer.invoke('get-clipboard-history')
      if (data) {
        setEntries(data)
      }
    }
    setLoading(false)
  }

  const handleCopy = async (entry: ClipboardEntry) => {
    if (window.electron?.ipcRenderer) {
      await window.electron.ipcRenderer.invoke('copy-to-clipboard', {
        type: entry.type,
        content: entry.content
      })
      setCopiedId(entry.id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.electron?.ipcRenderer) {
      const updated = await window.electron.ipcRenderer.invoke('delete-clipboard-entry', id)
      if (updated) setEntries(updated)
    }
  }

  const handleTogglePin = async (id: string) => {
    if (window.electron?.ipcRenderer) {
      const updated = await window.electron.ipcRenderer.invoke('toggle-pin-clipboard-entry', id)
      if (updated) setEntries(updated)
    }
  }

  const handleClearAll = async () => {
    if (window.electron?.ipcRenderer) {
      const updated = await window.electron.ipcRenderer.invoke('clear-clipboard-history')
      if (updated) setEntries(updated)
    }
  }

  const isSensitive = (text: string): boolean => {
    const passwordRegex = /password|passwd|secret|api_key|apikey|private_key/i
    const ccRegex = /\b(?:\d[ -]*?){13,16}\b/
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/
    const apiKeyRegex = /\b[A-Za-z0-9\-_]{20,}\b/
    return passwordRegex.test(text) || ccRegex.test(text) || ssnRegex.test(text) || (text.length > 25 && apiKeyRegex.test(text))
  }

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-black/20">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                <RiClipboardLine className="w-6 h-6 text-indigo-400" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white font-mono uppercase">
                Secure Clipboard <span className="text-indigo-500">Vault</span>
              </h1>
            </div>
            <p className="text-zinc-400 text-sm font-medium flex items-center gap-2 font-mono">
              <RiShieldLine className="w-4 h-4 text-emerald-400" />
              Automatically archives and encrypts local clipboard items. 100% offline.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center">
            <button
              onClick={() => setFilterSensitive(!filterSensitive)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all border ${
                filterSensitive
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-white/5 text-zinc-500 border-transparent hover:bg-white/10 hover:text-zinc-300'
              }`}
            >
              {filterSensitive ? <RiLockPasswordLine size={14} /> : <RiHashtag size={14} />}
              {filterSensitive ? 'Privacy Guard ON' : 'Privacy Guard OFF'}
            </button>

            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl font-mono text-xs uppercase tracking-wider transition-all"
            >
              <RiDeleteBin6Line size={14} />
              Clear Unpinned
            </button>
          </div>
        </header>

        <div className="grid gap-4">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Scanning Clip Sync Nodes...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-16 border border-white/5 bg-zinc-900/40 rounded-3xl text-center backdrop-blur-md">
              <RiClipboardLine className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-white font-bold mb-1 font-mono">Clipboard History Empty</h3>
              <p className="text-zinc-500 text-sm">Copy text or images to start caching clips in the vault automatically.</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {entries.map((item) => {
                const sensitive = item.type === 'text' && isSensitive(item.content)
                const isBlurred = sensitive && filterSensitive && !revealedIds[item.id]

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`group relative p-6 bg-zinc-900/40 border rounded-2xl hover:border-indigo-500/30 transition-all shadow-lg backdrop-blur-md ${
                      item.pinned ? 'border-indigo-500/20 bg-indigo-950/10' : 'border-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        {item.type === 'text' ? (
                          <div className={`relative ${isBlurred ? 'select-none' : ''}`}>
                            <p className={`text-zinc-100 text-sm font-medium leading-relaxed break-words font-mono ${
                              isBlurred ? 'blur-[6px] opacity-40 select-none pointer-events-none' : ''
                            }`}>
                              {item.content}
                            </p>
                            {sensitive && (
                              <div className="mt-3 flex items-center gap-2">
                                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded uppercase font-mono font-bold tracking-wider">
                                  Sensitive Content
                                </span>
                                <button
                                  onClick={() => toggleReveal(item.id)}
                                  className="text-xs text-indigo-400 hover:text-indigo-300 font-mono underline flex items-center gap-1 cursor-pointer"
                                >
                                  {isBlurred ? <RiEyeLine size={12} /> : <RiEyeOffLine size={12} />}
                                  {isBlurred ? 'Reveal Context' : 'Mask Context'}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="relative rounded-lg overflow-hidden border border-white/5 max-w-md bg-black/40 p-1.5 group-hover:border-indigo-500/20 transition-all">
                            <img 
                              src={item.content} 
                              alt="Clipboard visual cache" 
                              className="max-h-48 object-contain rounded"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-3 left-3 bg-zinc-950/80 border border-white/10 px-2 py-1 rounded-md flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-indigo-400">
                              <RiImageLine size={10} /> Image File
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                          <span className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </span>
                          <span>ID: {item.id.slice(0, 8)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleCopy(item)}
                          className={`p-2.5 rounded-xl transition-all border ${
                            copiedId === item.id
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-white border-transparent'
                          }`}
                          title="Copy back to clipboard"
                        >
                          <RiFileCopyLine className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleTogglePin(item.id)}
                          className={`p-2.5 rounded-xl transition-all border ${
                            item.pinned
                              ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                              : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-white border-transparent'
                          }`}
                          title={item.pinned ? 'Unpin item' : 'Pin item'}
                        >
                          {item.pinned ? <RiPushpinFill className="w-4 h-4" /> : <RiPushpinLine className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2.5 bg-zinc-800/50 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                          title="Delete clip"
                        >
                          <RiDeleteBin6Line className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}
