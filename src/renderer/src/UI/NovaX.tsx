import {
  LayoutGrid,
  FolderOpen,
  Phone,
  Settings,
  Image,
  Cpu,
  Heart,
  Clipboard,
  BarChart2,
  Mail,
  ShieldAlert,
  Brain,
  Zap,
  Orbit,
  Atom,
  Flame,
  Sparkles
} from 'lucide-react'
import { useState, Suspense, lazy, useEffect, useRef } from 'react'

import DashboardView from '../views/Dashboard'
import PhoneView from '../views/Phone'
import SettingsView from '@renderer/views/Settings'
import AgentsView from '../views/Agents'

const OverlordView = lazy(() => import('../views/Overlord'))
const NotesView = lazy(() => import('../views/Notes'))
const GalleryView = lazy(() => import('../views/Gallery'))
const MemoryView = lazy(() => import('../views/Memory'))
const ClipboardView = lazy(() => import('../views/Clipboard'))
const ActivityView = lazy(() => import('../views/Activity'))
const GmailView = lazy(() => import('../views/Gmail'))

import Logo from '../assets/Logo.png'

interface NovaXProps {
  isConnected: boolean
  toggleConnection: () => void
  isSpeaking: boolean
  isMuted: boolean
  handleMicToggle: () => void
  micStatus?: 'idle' | 'listening' | 'transcribing'
}

const glassPanel = 'bg-zinc-950/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl'

const systemIcons = [
  {
    id: 'cpu',
    label: 'Quantum Matrix',
    component: Cpu,
    color: '#10b981',
    glow: 'rgba(16,185,129,0.5)',
    shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.35)]'
  },
  {
    id: 'brain',
    label: 'Cognitive Synapse',
    component: Brain,
    color: '#00f3ff',
    glow: 'rgba(0,243,255,0.5)',
    shadow: 'shadow-[0_0_20px_rgba(0,243,255,0.35)]'
  },
  {
    id: 'zap',
    label: 'Tesla Core',
    component: Zap,
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.5)',
    shadow: 'shadow-[0_0_20px_rgba(251,191,36,0.35)]'
  },
  {
    id: 'orbit',
    label: 'Cosmic Orbit',
    component: Orbit,
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.5)',
    shadow: 'shadow-[0_0_20px_rgba(167,139,250,0.35)]'
  },
  {
    id: 'atom',
    label: 'Fusion Engine',
    component: Atom,
    color: '#ec4899',
    glow: 'rgba(236,72,153,0.5)',
    shadow: 'shadow-[0_0_20px_rgba(236,72,153,0.35)]'
  },
  {
    id: 'flame',
    label: 'Plasma Core',
    component: Flame,
    color: '#f97316',
    glow: 'rgba(249,115,22,0.5)',
    shadow: 'shadow-[0_0_20px_rgba(249,115,22,0.35)]'
  }
]

const NovaX = ({
  isConnected,
  toggleConnection,
  isSpeaking,
  isMuted,
  handleMicToggle,
  micStatus
}: NovaXProps) => {
  const [activeTab, setActiveTab] = useState('DASHBOARD')
  const [selectedIconId, setSelectedIconId] = useState(
    localStorage.getItem('novax_system_icon') || 'cpu'
  )
  const [showIconSelector, setShowIconSelector] = useState(false)

  const playDiagnosticChime = (freq = 440) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      gain.gain.setValueAtTime(0.04, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.6)
    } catch (e) {}
  }

  const activeIconData = systemIcons.find((item) => item.id === selectedIconId) || systemIcons[0]
  const ActiveIconComponent = activeIconData.component

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('novax_system_icon')
      if (stored) setSelectedIconId(stored)
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Netflix-level code protection & obfuscation sandbox
  useEffect(() => {
    // 1. Disable Right Click context menu completely
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }
    document.addEventListener('contextmenu', handleContextMenu)

    // 2. Disable Inspect Element & View Source Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

      // F12
      if (e.key === 'F12') {
        e.preventDefault()
        return
      }

      // Ctrl+Shift+I or Cmd+Opt+I (Inspect)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key?.toLowerCase() === 'i') {
        e.preventDefault()
        return
      }
      if (isMac && e.metaKey && e.altKey && e.key?.toLowerCase() === 'i') {
        e.preventDefault()
        return
      }

      // Ctrl+Shift+J or Cmd+Opt+J (Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key?.toLowerCase() === 'j') {
        e.preventDefault()
        return
      }
      if (isMac && e.metaKey && e.altKey && e.key?.toLowerCase() === 'j') {
        e.preventDefault()
        return
      }

      // Ctrl+Shift+C (Inspect Element selection tool)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key?.toLowerCase() === 'c') {
        e.preventDefault()
        return
      }

      // Ctrl+U or Cmd+U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === 'u') {
        e.preventDefault()
        return
      }

      // Ctrl+S or Cmd+S (Save Page)
      if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === 's') {
        e.preventDefault()
        return
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (tabsRef.current) {
        if (e.deltaY !== 0) {
          e.preventDefault()
          tabsRef.current.scrollLeft += e.deltaY
        }
      }
    }

    const tabsEl = tabsRef.current
    if (tabsEl) {
      tabsEl.addEventListener('wheel', handleWheel, { passive: false })
    }
    return () => {
      if (tabsEl) {
        tabsEl.removeEventListener('wheel', handleWheel)
      }
    }
  }, [])

  const tabs = [
    { id: 'DASHBOARD', label: 'Command', icon: <LayoutGrid size={16} /> },
    {
      id: 'OVERLORD',
      label: 'Overlord',
      icon: <ShieldAlert size={16} className="text-emerald-400" />
    },
    { id: 'AGENTS', label: 'Agents', icon: <Cpu size={16} /> },
    { id: 'CLIPBOARD', label: 'Clipboard', icon: <Clipboard size={16} /> },
    { id: 'ACTIVITY', label: 'Activity', icon: <BarChart2 size={16} /> },
    { id: 'NOTES', label: 'Notes', icon: <FolderOpen size={16} /> },
    { id: 'GALLERY', label: 'Gallery', icon: <Image size={16} /> },
    { id: 'MEMORY', label: 'Memory', icon: <Heart size={16} /> },
    { id: 'GMAIL', label: 'Gmail', icon: <Mail size={16} /> },
    { id: 'PHONE', label: 'Mobile', icon: <Phone size={16} /> },
    { id: 'SETTINGS', label: 'Settings', icon: <Settings size={16} /> }
  ]

  return (
    <div className="flex flex-col h-screen w-full bg-black text-zinc-100 font-sans overflow-hidden select-none relative">
      <div className="h-16 w-full flex items-center justify-between px-6 bg-black border-b border-white/5 z-50">
        <div className="flex items-center gap-3 w-72 relative select-none">
          <img
            src={Logo}
            className="w-11 h-11 object-contain cursor-pointer hover:scale-105 transition-transform"
            onClick={() => {
              setActiveTab('DASHBOARD')
              playDiagnosticChime(440)
            }}
            title="NOVA-X Logo"
          />

          <div
            onClick={() => {
              setShowIconSelector(!showIconSelector)
              playDiagnosticChime(660)
            }}
            title="Click to customize Core Icon Avatar"
            className={`cursor-pointer w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-300 ${activeIconData.shadow} hover:scale-105`}
            style={{
              borderColor: `${activeIconData.color}40`,
              backgroundColor: `${activeIconData.color}08`
            }}
          >
            <ActiveIconComponent
              size={22}
              style={{ color: activeIconData.color }}
              className="animate-pulse"
            />
          </div>

          <div
            onClick={() => {
              setActiveTab('DASHBOARD')
            }}
            className="flex flex-col leading-none cursor-pointer"
          >
            <span className="font-black tracking-widest text-[14px] text-zinc-100 uppercase font-mono text-emerald-400">
              NOVA-X
            </span>
            <span className="text-[7.5px] font-mono text-zinc-500 tracking-widest uppercase mt-0.5 whitespace-nowrap">
              CORE: {activeIconData.label}
            </span>
          </div>

          {showIconSelector && (
            <div className="absolute top-14 left-0 z-50 w-72 bg-zinc-950/95 border border-white/10 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
              <div className="text-[10px] font-mono tracking-widest text-[#00f3ff] mb-3 uppercase flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Sparkles size={11} className="text-[#00f3ff]" /> Choose Core System Icon
              </div>
              <div className="grid grid-cols-2 gap-2">
                {systemIcons.map((item) => {
                  const IconComponent = item.component
                  const isSelected = selectedIconId === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedIconId(item.id)
                        localStorage.setItem('novax_system_icon', item.id)
                        playDiagnosticChime(880)
                        setShowIconSelector(false)
                        window.dispatchEvent(new Event('storage'))
                      }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center relative cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-900 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] text-white'
                          : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-900 hover:border-white/10 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center mb-1.5"
                        style={{
                          color: item.color,
                          background: `${item.color}10`,
                          boxShadow: isSelected ? `0 0 10px ${item.color}35` : 'none'
                        }}
                      >
                        <IconComponent size={16} />
                      </div>
                      <span className="text-[8.5px] font-mono tracking-wider font-semibold uppercase leading-none">
                        {item.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div
          ref={tabsRef}
          className="flex-1 mx-4 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-white/5 backdrop-blur-md shadow-2xl"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`cursor-pointer px-4 py-1.5 text-[11px] font-bold tracking-widest uppercase rounded-lg transition-all duration-200 flex items-center gap-2 flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className={`${activeTab === tab.id ? 'text-emerald-400' : 'text-zinc-600'}`}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 w-48">
          <div className="flex flex-col items-end leading-none">
            <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
              System
            </span>
            <div className="flex items-center gap-2 mt-1">
              {isConnected && micStatus && micStatus !== 'idle' && (
                <span className="text-[8px] font-mono tracking-widest uppercase text-emerald-400 animate-pulse bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  {micStatus}
                </span>
              )}
              <span
                className={`text-[9px] font-mono tracking-widest uppercase ${isConnected ? 'text-emerald-500' : 'text-red-500'}`}
              >
                {isConnected ? 'Active' : 'Offline'}
              </span>
            </div>
          </div>
          <div
            className={`h-2 w-2 rounded-full shadow-[0_0_8px_currentColor] ${isConnected ? 'bg-emerald-500 text-emerald-500' : 'bg-red-500 text-red-500'}`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-zinc-950 via-black to-black">
        <div className="relative h-full w-full p-4 overflow-y-auto">
          <div className={`h-full w-full ${activeTab === 'DASHBOARD' ? 'block' : 'hidden'}`}>
            <DashboardView
              isConnected={isConnected}
              toggleConnection={toggleConnection}
              isSpeaking={isSpeaking}
              isMuted={isMuted}
              handleMicToggle={handleMicToggle}
            />
          </div>

          <div className={`h-full w-full ${activeTab === 'AGENTS' ? 'block' : 'hidden'}`}>
            <AgentsView />
          </div>

          <div className={`h-full w-full ${activeTab === 'PHONE' ? 'block' : 'hidden'}`}>
            <PhoneView glassPanel={glassPanel} />
          </div>

          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center font-mono text-zinc-500">
                Loading Module...
              </div>
            }
          >
            {activeTab === 'OVERLORD' && <OverlordView />}
            {activeTab === 'NOTES' && <NotesView glassPanel={glassPanel} />}
            {activeTab === 'GALLERY' && <GalleryView />}
            {activeTab === 'MEMORY' && <MemoryView />}
            {activeTab === 'CLIPBOARD' && <ClipboardView />}
            {activeTab === 'ACTIVITY' && <ActivityView />}
            {activeTab === 'GMAIL' && <GmailView />}
            {activeTab === 'SETTINGS' && <SettingsView isSystemActive={isConnected} />}
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default NovaX
