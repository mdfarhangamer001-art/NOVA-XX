import { AppItem, getAllApps } from '@renderer/src/services/system-info'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  RiAppsLine,
  RiTerminalBoxLine,
  RiChromeLine,
  RiCodeLine,
  RiSpotifyLine,
  RiDiscordLine,
  RiGamepadLine
} from 'react-icons/ri'

// Icons mapping for better scalability
const ICON_MAP: Record<string, { icon: any, color: string, bg: string }> = {
  chrome: { icon: RiChromeLine, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  edge: { icon: RiChromeLine, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  code: { icon: RiCodeLine, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  dev: { icon: RiCodeLine, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  spotify: { icon: RiSpotifyLine, color: 'text-green-400', bg: 'bg-green-500/10' },
  music: { icon: RiSpotifyLine, color: 'text-green-400', bg: 'bg-green-500/10' },
  discord: { icon: RiDiscordLine, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  telegram: { icon: RiDiscordLine, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  game: { icon: RiGamepadLine, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  launcher: { icon: RiGamepadLine, color: 'text-purple-400', bg: 'bg-purple-500/10' },
}

const SmartIcon = ({ name }: { name: string }) => {
  const lower = name.toLowerCase()
  const matchKey = Object.keys(ICON_MAP).find((key) => lower.includes(key))
  const { icon: Icon, color, bg } = matchKey ? ICON_MAP[matchKey] : 
    { icon: RiTerminalBoxLine, color: 'text-zinc-400', bg: 'bg-zinc-800' }

  return (
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border border-white/5 ${bg} ${color} shadow-sm group-hover:scale-110 transition-transform`}>
      <Icon size={20} />
    </div>
  )
}

const AppCard = ({ app }: { app: AppItem }) => (
  <div
    onClick={() => window.electron.ipcRenderer.invoke('open-app', app.name)}
    className="bg-zinc-950/40 backdrop-blur-xl border border-white/5 rounded-xl p-4 flex items-center gap-4 hover:bg-white/10 hover:border-emerald-500/30 transition-all cursor-pointer group active:scale-95"
  >
    <SmartIcon name={app.name} />
    <div className="flex-1 overflow-hidden">
      <div className="text-xs font-bold text-zinc-200 truncate group-hover:text-emerald-400 transition-colors">
        {app.name}
      </div>
      <div className="text-[8px] text-zinc-600 truncate font-mono mt-1 opacity-70 group-hover:opacity-100">
        INSTALLED
      </div>
    </div>
  </div>
)

const AppsView = () => {
  const [allApps, setAllApps] = useState<AppItem[]>([])
  const [visibleApps, setVisibleApps] = useState<AppItem[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const observer = useRef<IntersectionObserver | null>(null)
  
  const lastAppElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleApps.length < allApps.length) {
        setPage((prev) => prev + 1)
      }
    })
    if (node) observer.current.observe(node)
  }, [loading, visibleApps.length, allApps.length])

  useEffect(() => {
    getAllApps().then((raw) => {
      const cleanData = (Array.isArray(raw) ? raw : []).filter(
        (item) => item?.name && item?.id
      )
      setAllApps(cleanData)
      setVisibleApps(cleanData.slice(0, 15))
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    setVisibleApps(allApps.slice(0, page * 12 + 6))
  }, [page, allApps])

  return (
    <div className="flex-1 bg-white/8 p-8 h-full flex flex-col animate-in fade-in zoom-in duration-300">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
            <RiAppsLine className="text-emerald-400" size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-200 tracking-widest">SYSTEM APPLICATIONS</h2>
            <p className="text-[10px] text-zinc-500 font-mono">INDEXED SOFTWARE LIBRARY</p>
          </div>
        </div>
        <div className="text-xs font-mono text-emerald-500 bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/20">
          {loading ? 'INDEXING...' : `${allApps.length} FOUND`}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 pb-4 scrollbar-small min-h-0">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleApps.map((app, index) => (
            <div key={app.id} ref={index === visibleApps.length - 1 ? lastAppElementRef : null}>
              <AppCard app={app} />
            </div>
          ))}

          {loading && <div className="text-zinc-500 text-xs p-4 text-center col-span-full">Scanning System...</div>}
        </div>
      </div>
    </div>
  )
}

export default AppsView
