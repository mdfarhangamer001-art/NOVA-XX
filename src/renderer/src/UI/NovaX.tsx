import { LayoutGrid, FolderOpen, Phone, Settings, Image, Cpu, Heart, Clipboard, BarChart2, Mail } from 'lucide-react'
import { useState, Suspense, lazy, useEffect } from 'react'


import DashboardView from '../views/Dashboard'
import PhoneView from '../views/Phone'
import SettingsView from '@renderer/views/Settings'
import AgentsView from '../views/Agents'

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
}

const glassPanel = 'bg-zinc-950/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl'

const NovaX = ({
  isConnected,
  toggleConnection,
  isSpeaking,
  isMuted,
  handleMicToggle
}: NovaXProps) => {
  const [activeTab, setActiveTab] = useState('DASHBOARD')

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

  const tabs = [
    { id: 'DASHBOARD', label: 'Command', icon: <LayoutGrid size={16} /> },
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
        <div className="flex items-center gap-3 w-48 cursor-pointer">
          <img src={Logo} className="w-14 h-14" />

          <div
            onClick={() => {
              setActiveTab('DASHBOARD')
            }}
            className="flex flex-col leading-none"
          >
            <span className="font-black tracking-widest text-[14px] text-zinc-100 uppercase -ml-1.5 font-mono text-emerald-400">
              NOVA-X
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-white/5 backdrop-blur-md shadow-2xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`cursor-pointer px-4 py-1.5 text-[11px] font-bold tracking-widest uppercase rounded-lg transition-all duration-200 flex items-center gap-2 ${
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
              Network
            </span>
            <span
              className={`text-[9px] font-mono tracking-widest uppercase mt-1 ${isConnected ? 'text-emerald-500' : 'text-red-500'}`}
            >
              {isConnected ? 'Connected' : 'Offline'}
            </span>
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
