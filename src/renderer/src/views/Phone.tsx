import { useState, useEffect } from 'react'
import {
  Wifi,
  ShieldAlert,
  CheckCircle,
  RefreshCw,
  Copy,
  Check,
  LogOut,
  ArrowRight,
  Smartphone,
  AlertCircle,
  Terminal,
  Network,
  Sparkles,
  Usb,
  Camera,
  Power,
  Home,
  History,
  Activity
} from 'lucide-react'

const PhoneView = ({ glassPanel = '' }: { glassPanel?: string }) => {
  const [activeSubTab, setActiveSubTab] = useState<'wireless' | 'usb'>('wireless')

  // --- Sound Engine Helper ---
  const playDiagnosticChime = (freq = 440) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch (e) {}
  }

  // ==========================================
  // --- STATE & HANDLERS FOR WIRELESS COMPANION ---
  // ==========================================
  const [companionStatus, setCompanionStatus] = useState<{
    connected: boolean
    connectedIp: string
    pin: string
    url: string
    ip: string
    port: number
  } | null>(null)
  const [commandLogs, setCommandLogs] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStatus = async () => {
    if (window.electron?.ipcRenderer) {
      try {
        const status = await window.electron.ipcRenderer.invoke('get-companion-status')
        setCompanionStatus(status)
      } catch (e) {
        console.error('Error fetching companion status:', e)
      }
    }
  }

  // Poll status on interval to stay in sync with mobile device actions
  useEffect(() => {
    if (activeSubTab === 'wireless') {
      fetchStatus()
      const interval = setInterval(fetchStatus, 3000)
      return () => clearInterval(interval)
    }
    return undefined
  }, [activeSubTab])

  // Listen to live events broadcasted from the main process
  useEffect(() => {
    if (activeSubTab !== 'wireless') return undefined

    const handleStatus = (_event: any, status: any) => {
      setCompanionStatus((prev) =>
        prev
          ? { ...prev, connected: status.connected, connectedIp: status.ip || '' }
          : null
      )
      if (status.connected) {
        setCommandLogs((prev) => [
          `[${new Date().toLocaleTimeString()}] [SYSTEM] Neural Uplink secured with device at ${status.ip}`,
          ...prev
        ].slice(0, 50))
      } else {
        setCommandLogs((prev) => [
          `[${new Date().toLocaleTimeString()}] [SYSTEM] Uplink severed by remote client.`,
          ...prev
        ].slice(0, 50))
      }
    }

    const handleCommand = (_event: any, command: string) => {
      setCommandLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] [INCOMING] Speech: "${command}"`,
        ...prev
      ].slice(0, 50))
    }

    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on('mobile-status', handleStatus)
      window.electron.ipcRenderer.on('mobile-command', handleCommand)
    }

    return () => {
      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.off('mobile-status', handleStatus)
        window.electron.ipcRenderer.off('mobile-command', handleCommand)
      }
    }
  }, [activeSubTab])

  const handleCopy = () => {
    if (companionStatus?.url) {
      navigator.clipboard.writeText(companionStatus.url)
      setCopied(true)
      playDiagnosticChime(880)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleForceRefresh = async () => {
    setRefreshing(true)
    await fetchStatus()
    playDiagnosticChime(660)
    setTimeout(() => setRefreshing(false), 800)
  }

  const handleUnpair = async () => {
    if (window.electron?.ipcRenderer) {
      const res = await window.electron.ipcRenderer.invoke('forget-companion-device')
      setCompanionStatus(res)
      playDiagnosticChime(150)
      setCommandLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] [SYSTEM] All paired devices forgotten. PIN regenerated.`,
        ...prev
      ].slice(0, 50))
    }
  }

  // ==========================================
  // --- STATE & HANDLERS FOR USB / ADB BRIDGE ---
  // ==========================================
  const [adbIp, setAdbIp] = useState('192.168.1.15')
  const [adbPort, setAdbPort] = useState('5555')
  const [adbHistory, setAdbHistory] = useState<any[]>([])
  const [adbConnected, setAdbConnected] = useState(false)
  const [adbLoading, setAdbLoading] = useState(false)
  const [adbError, setAdbError] = useState<string | null>(null)
  const [adbTelemetryData, setAdbTelemetryData] = useState<any | null>(null)
  const [screenshotData, setScreenshotData] = useState<string | null>(null)
  const [screenshotLoading, setScreenshotLoading] = useState(false)
  const [adbLogs, setAdbLogs] = useState<string[]>([])

  const loadAdbHistory = async () => {
    if (window.electron?.ipcRenderer) {
      try {
        const history = await window.electron.ipcRenderer.invoke('adb-get-history')
        setAdbHistory(history || [])
        if (history && history.length > 0) {
          setAdbIp(history[0].ip)
          setAdbPort(history[0].port)
        }
      } catch (e) {
        console.error('Error loading ADB history:', e)
      }
    }
  }

  const handleAdbConnect = async () => {
    setAdbLoading(true)
    setAdbError(null)
    setAdbLogs((prev) => [`[${new Date().toLocaleTimeString()}] Initiating physical ADB bridge on ${adbIp}:${adbPort}...`, ...prev])
    if (window.electron?.ipcRenderer) {
      try {
        const res = await window.electron.ipcRenderer.invoke('adb-connect', { ip: adbIp, port: adbPort })
        if (res.success) {
          setAdbConnected(true)
          setAdbLogs((prev) => [`[${new Date().toLocaleTimeString()}] [SUCCESS] Physical ADB bridge secured with Android hardware.`, ...prev])
          playDiagnosticChime(880)
          fetchAdbTelemetry()
        } else {
          setAdbConnected(false)
          setAdbError(res.error || 'Uplink failed')
          setAdbLogs((prev) => [`[${new Date().toLocaleTimeString()}] [FAILURE] ADB uplink refused: ${res.error || 'Connection timed out'}`, ...prev])
          playDiagnosticChime(150)
        }
      } catch (e: any) {
        setAdbConnected(false)
        setAdbError(e.message || 'Uplink failed')
        setAdbLogs((prev) => [`[${new Date().toLocaleTimeString()}] [CRITICAL] Core failure during USB handshake: ${e.message}`, ...prev])
        playDiagnosticChime(150)
      }
    }
    setAdbLoading(false)
  }

  const handleAdbDisconnect = async () => {
    setAdbLogs((prev) => [`[${new Date().toLocaleTimeString()}] Releasing ADB bridge handlers...`, ...prev])
    if (window.electron?.ipcRenderer) {
      try {
        await window.electron.ipcRenderer.invoke('adb-disconnect')
        setAdbConnected(false)
        setAdbTelemetryData(null)
        setScreenshotData(null)
        setAdbLogs((prev) => [`[${new Date().toLocaleTimeString()}] ADB bridge released. Device offline.`, ...prev])
        playDiagnosticChime(150)
      } catch (e) {}
    }
  }

  const fetchAdbTelemetry = async () => {
    if (window.electron?.ipcRenderer) {
      try {
        const res = await window.electron.ipcRenderer.invoke('adb-telemetry')
        if (res.success) {
          setAdbTelemetryData(res.data)
          setAdbConnected(true)
        } else {
          setAdbConnected(false)
          setAdbTelemetryData(null)
        }
      } catch (e) {
        setAdbConnected(false)
        setAdbTelemetryData(null)
      }
    }
  }

  const handleCaptureScreenshot = async () => {
    setScreenshotLoading(true)
    setAdbLogs((prev) => [`[${new Date().toLocaleTimeString()}] Requesting video framebuffer extract...`, ...prev])
    if (window.electron?.ipcRenderer) {
      try {
        const res = await window.electron.ipcRenderer.invoke('adb-screenshot')
        if (res.success && res.image) {
          setScreenshotData(res.image)
          setAdbLogs((prev) => [`[${new Date().toLocaleTimeString()}] Framebuffer payload synchronized successfully.`, ...prev])
          playDiagnosticChime(660)
        } else {
          setAdbLogs((prev) => [`[${new Date().toLocaleTimeString()}] [ERROR] Framebuffer empty: ${res.error || 'Access denied'}`, ...prev])
          playDiagnosticChime(150)
        }
      } catch (e: any) {
        setAdbLogs((prev) => [`[${new Date().toLocaleTimeString()}] [CRITICAL] Screenshot capture faulted: ${e.message}`, ...prev])
        playDiagnosticChime(150)
      }
    }
    setScreenshotLoading(false)
  }

  const handleQuickAction = async (action: string) => {
    setAdbLogs((prev) => [`[${new Date().toLocaleTimeString()}] Transmitting shell dispatch: ${action.toUpperCase()}`, ...prev])
    if (window.electron?.ipcRenderer) {
      try {
        const res = await window.electron.ipcRenderer.invoke('adb-quick-action', { action })
        if (res.success) {
          setAdbLogs((prev) => [`[${new Date().toLocaleTimeString()}] Shell dispatch processed.`, ...prev])
          playDiagnosticChime(440)
        } else {
          setAdbLogs((prev) => [`[${new Date().toLocaleTimeString()}] [ERROR] Dispatch failed: ${res.error}`, ...prev])
          playDiagnosticChime(150)
        }
      } catch (e: any) {
        setAdbLogs((prev) => [`[${new Date().toLocaleTimeString()}] [CRITICAL] Shell dispatcher faulted: ${e.message}`, ...prev])
        playDiagnosticChime(150)
      }
    }
  }

  useEffect(() => {
    if (activeSubTab === 'usb') {
      loadAdbHistory()
    }
  }, [activeSubTab])

  useEffect(() => {
    if (activeSubTab !== 'usb' || !adbConnected) return undefined
    
    fetchAdbTelemetry()
    const interval = setInterval(fetchAdbTelemetry, 6000)
    return () => clearInterval(interval)
  }, [activeSubTab, adbConnected])

  // --- RENDERING ---
  return (
    <div className={`h-full w-full flex flex-col p-6 overflow-y-auto bg-[#030303] text-zinc-100 ${glassPanel}`}>
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800/60 pb-6 mb-6 gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-[#00f3ff]/10 text-[#00f3ff] text-[9px] font-mono tracking-widest border border-[#00f3ff]/20 rounded uppercase">
              UPLINK LAYER
            </span>
            <span className="text-zinc-600 font-mono text-[9px]">•</span>
            <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider">
              MOBILE PHYSICAL AND WIRELESS PROTOCOLS
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Mobile Core Uplink
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Synchronize your smartphone via high-speed USB debugging tunnel or wireless local network server.
          </p>
        </div>

        {activeSubTab === 'wireless' && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleForceRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-all"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span>Sync Telemetry</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800/80 rounded-lg">
              <Network size={13} className="text-zinc-500" />
              <span className="text-[10px] font-mono text-zinc-400 font-medium">IP: {companionStatus?.ip || 'Detecting...'}</span>
            </div>
          </div>
        )}

        {activeSubTab === 'usb' && adbConnected && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800/80 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-[#00f3ff] animate-pulse"></span>
            <span className="text-[10px] font-mono text-zinc-400 font-medium">ADB LINK ACTIVE</span>
          </div>
        )}
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex gap-2 border-b border-zinc-800/40 pb-4 mb-6 shrink-0">
        <button
          onClick={() => {
            setActiveSubTab('wireless')
            playDiagnosticChime(440)
          }}
          className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all duration-200 flex items-center gap-2 ${
            activeSubTab === 'wireless'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
              : 'bg-transparent border border-zinc-900/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-800'
          }`}
        >
          <Wifi size={14} />
          Wireless Companion Link
        </button>
        <button
          onClick={() => {
            setActiveSubTab('usb')
            playDiagnosticChime(660)
          }}
          className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all duration-200 flex items-center gap-2 ${
            activeSubTab === 'usb'
              ? 'bg-[#00f3ff]/10 border border-[#00f3ff]/30 text-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.1)]'
              : 'bg-transparent border border-zinc-900/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-800'
          }`}
        >
          <Usb size={14} />
          USB / ADB Android Bridge
        </button>
      </div>

      {/* ========================================== */}
      {/* TAB 1: WIRELESS COMPANION LINK            */}
      {/* ========================================== */}
      {activeSubTab === 'wireless' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Side: Instructions & Logs */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="border border-zinc-800/80 bg-zinc-950/40 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                <Smartphone size={240} className="text-emerald-400 rotate-12" />
              </div>

              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-4 font-mono flex items-center gap-2">
                <Sparkles size={14} /> Link Protocol Guidelines
              </h2>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-mono font-bold text-zinc-400 shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200">Local Network Alignment</h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                      Ensure your mobile device and PC are active on the same Wi-Fi access point or local network.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-mono font-bold text-zinc-400 shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200">Establish Portal Link</h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                      {"Scan the QR code displayed on the right or enter the companion server URL into your smartphone's web browser."}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-mono font-bold text-zinc-400 shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200">Verify Credentials</h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                      Input the 6-digit Security Pin into the phone. The WebSocket connection registers instantly.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                <div className="flex gap-2">
                  <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-emerald-400/90 font-mono leading-relaxed">
                    <strong>PRO-TIP:</strong> {"The URL on your phone stores the pairing credentials in its browser's LocalStorage. It will automatically re-connect to your workstation in the background!"}
                  </p>
                </div>
              </div>
            </div>

            {/* Live Telemetry Terminal */}
            <div className="border border-zinc-800/80 bg-zinc-950/60 rounded-2xl flex-1 flex flex-col overflow-hidden min-h-[250px]">
              <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/40"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40"></div>
                  <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400 font-bold ml-2">
                    TELEMETRY_OVERWATCH_STREAM
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Terminal size={12} className="text-zinc-600" />
                  <span className="text-[9px] font-mono text-zinc-600">active</span>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-2 select-text selection:bg-emerald-500/20">
                {commandLogs.length === 0 ? (
                  <div className="text-zinc-600 italic h-full flex items-center justify-center">
                    [Overwatch system silent. Connect your phone and say a voice command or send a manual input to stream telemetry logs...]
                  </div>
                ) : (
                  commandLogs.map((log, index) => {
                    let color = 'text-zinc-400'
                    if (log.includes('[SYSTEM]')) color = 'text-emerald-400'
                    if (log.includes('[INCOMING]')) color = 'text-white font-medium'
                    if (log.includes('Speech')) color = 'text-[#00f3ff]'
                    return (
                      <div key={index} className={`${color} leading-relaxed border-l border-zinc-800/60 pl-2`}>
                        {log}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Beacon Core Status & Credentials */}
          <div className="lg:col-span-5">
            <div className="border border-zinc-800/80 bg-zinc-950/40 rounded-2xl p-6 h-full flex flex-col justify-between relative overflow-hidden">
              <div className="flex flex-col items-center text-center my-4 shrink-0">
                <div className="relative flex items-center justify-center mb-4">
                  {companionStatus?.connected ? (
                    <>
                      <div className="absolute w-24 h-24 rounded-full bg-emerald-500/10 animate-ping duration-[3000ms]"></div>
                      <div className="absolute w-32 h-32 rounded-full bg-emerald-500/5 animate-pulse duration-[2000ms]"></div>
                      <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                        <Wifi size={24} className="animate-pulse" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="absolute w-20 h-20 rounded-full bg-zinc-800/10 animate-pulse duration-[2000ms]"></div>
                      <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                        <Wifi size={24} />
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                    UPLINK TUNNEL STATE
                  </span>
                  <h3 className={`text-base font-bold uppercase tracking-wider mt-1 ${companionStatus?.connected ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {companionStatus?.connected ? 'CONNECTED' : 'DISCONNECTED / IDLE'}
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1 max-w-xs leading-relaxed">
                    {companionStatus?.connected
                      ? `Secure control bridge established with device ${companionStatus.connectedIp}`
                      : 'The background telemetry server is running on port 3021. Waiting for beacon handshakes.'}
                  </p>
                </div>
              </div>

              {!companionStatus?.connected ? (
                <div className="flex-1 flex flex-col justify-center items-center py-6 border-t border-b border-zinc-800/40 my-6">
                  <div className="relative group bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800/80 mb-6 flex flex-col items-center shadow-lg">
                    {companionStatus?.url ? (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                          companionStatus.url
                        )}&color=10b981&bgcolor=18181b&qzone=2`}
                        alt="Uplink QR Code"
                        className="w-36 h-36 border border-zinc-800 rounded-xl select-none"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-36 h-36 border border-dashed border-zinc-800 rounded-xl flex items-center justify-center">
                        <RefreshCw className="animate-spin text-zinc-700" size={20} />
                      </div>
                    )}
                    <span className="text-[9px] font-mono tracking-widest text-emerald-500 mt-2.5 uppercase font-medium">
                      SCAN VIA SMARTPHONE CAMERA
                    </span>
                  </div>

                  <div className="w-full text-center">
                    <span className="text-[9.5px] font-mono tracking-widest text-zinc-500 uppercase">
                      BEACON SECURITY PAIRING PIN
                    </span>
                    <div className="mt-1.5 py-3 px-6 bg-zinc-950 border border-zinc-800/80 rounded-2xl font-mono text-3xl font-bold tracking-widest text-emerald-400 select-all shadow-inner">
                      {companionStatus?.pin || '------'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center py-6 border-t border-b border-zinc-800/40 my-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">IP ADDRESS</span>
                      <p className="text-xs font-mono font-bold text-zinc-300 mt-0.5 truncate">{companionStatus?.connectedIp || 'Wireless client'}</p>
                    </div>
                    <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">LINK TYPE</span>
                      <p className="text-xs font-mono font-bold text-zinc-300 mt-0.5">WEBSOCKET</p>
                    </div>
                    <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">BRIDGE STATUS</span>
                      <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5">SECURE / ACTIVE</p>
                    </div>
                    <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">PORT ROUTER</span>
                      <p className="text-xs font-mono font-bold text-zinc-300 mt-0.5">3021 (TCP)</p>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                    <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                      The voice control matrix is listening from your mobile microphone. Simply hold down the record trigger on your phone, say your command, and release to execute in real-time.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3 shrink-0">
                <div className="flex flex-col gap-1 px-4 py-3 bg-zinc-950 border border-zinc-800/80 rounded-xl">
                  <span className="text-[9.5px] font-mono text-zinc-500 uppercase">COMPANION DIRECT PORTAL ADDRESS</span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-[10.5px] font-mono text-zinc-400 truncate select-all">
                      {companionStatus?.url || 'Detecting local network address...'}
                    </span>
                    <button
                      onClick={handleCopy}
                      disabled={!companionStatus?.url}
                      className="cursor-pointer p-1 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded transition-all shrink-0"
                    >
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleUnpair}
                    className="cursor-pointer flex-1 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-mono font-bold text-[10px] tracking-wider uppercase rounded-xl transition-all duration-200 border border-red-500/20 flex items-center justify-center gap-1.5"
                  >
                    <LogOut size={13} />
                    <span>Unpair / Forget Devices</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: USB / ADB ANDROID BRIDGE           */}
      {/* ========================================== */}
      {activeSubTab === 'usb' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Side: ADB Device Connection & Shell Logs */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Connection Form */}
            <div className="border border-zinc-800/80 bg-zinc-950/40 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-2 right-2 font-mono text-[7px] text-[#00f3ff]/30 uppercase tracking-widest">
                BRIDGE_CORE_PORTAL
              </div>

              <h2 className="text-sm font-bold uppercase tracking-wider text-[#00f3ff] mb-4 font-mono flex items-center gap-2">
                <Usb size={14} /> Android Debug Handshake
              </h2>

              <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
                {"Connect your Android device via high-speed USB debugging. First, ensure USB Debugging or Wireless Debugging is enabled in your phone's Developer Options, and accept the computer's RSA authorization fingerprint key on your device screen."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end mb-4">
                <div className="sm:col-span-7">
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">
                    Phone LAN / USB Loop IP
                  </label>
                  <input
                    type="text"
                    value={adbIp}
                    onChange={(e) => setAdbIp(e.target.value)}
                    disabled={adbConnected || adbLoading}
                    placeholder="192.168.1.15"
                    className="w-full bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 focus:border-[#00f3ff]/40 px-4 py-2.5 rounded-xl font-mono text-sm text-white focus:outline-none transition-all placeholder:text-zinc-600"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">
                    Port
                  </label>
                  <input
                    type="text"
                    value={adbPort}
                    onChange={(e) => setAdbPort(e.target.value)}
                    disabled={adbConnected || adbLoading}
                    placeholder="5555"
                    className="w-full bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 focus:border-[#00f3ff]/40 px-4 py-2.5 rounded-xl font-mono text-sm text-white focus:outline-none transition-all placeholder:text-zinc-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  {!adbConnected ? (
                    <button
                      onClick={handleAdbConnect}
                      disabled={adbLoading || !adbIp || !adbPort}
                      className="cursor-pointer w-full py-2.5 bg-[#00f3ff]/10 border border-[#00f3ff]/30 text-[#00f3ff] hover:bg-[#00f3ff] hover:text-black font-mono font-bold text-xs tracking-wider uppercase rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      {adbLoading ? <RefreshCw size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                      <span>Link</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleAdbDisconnect}
                      className="cursor-pointer w-full py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white font-mono font-bold text-xs tracking-wider uppercase rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5"
                    >
                      <LogOut size={13} />
                      <span>Sever</span>
                    </button>
                  )}
                </div>
              </div>

              {adbError && (
                <div className="p-3.5 bg-red-500/5 border border-red-500/20 rounded-xl flex gap-2 items-start text-red-400">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <p className="text-[10.5px] leading-relaxed font-mono">{adbError}</p>
                </div>
              )}

              {/* History selection */}
              {adbHistory.length > 0 && !adbConnected && (
                <div className="mt-4 border-t border-zinc-900 pt-4">
                  <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase block mb-2 flex items-center gap-1">
                    <History size={10} /> RECENT PAIRING NODE CACHE
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {adbHistory.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setAdbIp(item.ip)
                          setAdbPort(item.port)
                          playDiagnosticChime(440)
                        }}
                        className="cursor-pointer px-3 py-1.5 bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/60 rounded-xl text-[10.5px] font-mono text-zinc-400 hover:text-white transition-all flex items-center gap-1.5"
                      >
                        <Smartphone size={11} className="text-zinc-600" />
                        <span>{item.model || 'Android Phone'} ({item.ip}:{item.port})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ADB Shell Dispatch Terminal */}
            <div className="border border-zinc-800/80 bg-zinc-950/60 rounded-2xl flex-1 flex flex-col overflow-hidden min-h-[250px]">
              <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/40"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#00f3ff]/40"></div>
                  <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400 font-bold ml-2">
                    ADB_UPLINK_SHELL_BRIDGE
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Terminal size={12} className="text-zinc-600" />
                  <span className="text-[9px] font-mono text-zinc-600">active</span>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-2 select-text selection:bg-[#00f3ff]/20">
                {adbLogs.length === 0 ? (
                  <div className="text-zinc-600 italic h-full flex items-center justify-center">
                    [USB Uplink overwatch stream idle. Connect device and execute an action to begin system overwatch diagnostics...]
                  </div>
                ) : (
                  adbLogs.map((log, index) => {
                    let color = 'text-zinc-400'
                    if (log.includes('[SUCCESS]')) color = 'text-[#00f3ff]'
                    if (log.includes('[FAILURE]') || log.includes('[ERROR]')) color = 'text-red-400'
                    if (log.includes('[CRITICAL]')) color = 'text-red-500 font-bold'
                    return (
                      <div key={index} className={`${color} leading-relaxed border-l border-zinc-800/60 pl-2`}>
                        {log}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Side: ADB Device Telemetry & Screenshot Framebuffer */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Telemetry diagnostics */}
            <div className="border border-zinc-800/80 bg-zinc-950/40 rounded-2xl p-5 relative overflow-hidden">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#00f3ff] mb-4 font-mono flex items-center gap-2">
                <Activity size={14} /> Device Telemetry Stream
              </h2>

              {!adbConnected ? (
                <div className="py-8 text-center text-zinc-600 font-mono text-[11px] border border-dashed border-zinc-900 rounded-xl">
                  [Awaiting active ADB uplink connection...]
                </div>
              ) : adbTelemetryData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase block">DEVICE MODEL</span>
                      <p className="text-xs font-mono font-bold text-white mt-0.5 truncate">{adbTelemetryData.model || 'DETECTED PHONE'}</p>
                    </div>
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase block">FIRMWARE OS</span>
                      <p className="text-xs font-mono font-bold text-white mt-0.5">{adbTelemetryData.os || 'ANDROID OS'}</p>
                    </div>
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase block">BATTERY CHARGE</span>
                      <p className="text-xs font-mono font-bold text-[#00f3ff] mt-0.5 flex items-center gap-1">
                        <span>{adbTelemetryData.battery?.level}%</span>
                        {adbTelemetryData.battery?.isCharging && (
                          <span className="text-[9px] px-1 py-0.5 bg-[#00f3ff]/10 border border-[#00f3ff]/30 text-[#00f3ff] rounded uppercase font-mono tracking-tighter">
                            CHARGING
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase block">BATTERY TEMP</span>
                      <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5">{adbTelemetryData.battery?.temp || '28.5'}°C</p>
                    </div>
                  </div>

                  {/* Device Control Actions */}
                  <div className="border-t border-zinc-900 pt-4">
                    <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase block mb-3">
                      SHELL CONTROL DISPATCHER
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => handleQuickAction('wake')}
                        className="cursor-pointer py-2 bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 hover:text-white rounded-xl text-[10px] font-mono text-zinc-400 transition-all flex flex-col items-center justify-center gap-1"
                        title="Wake up display"
                      >
                        <Power size={14} className="text-[#00f3ff]" />
                        <span>Wake</span>
                      </button>
                      <button
                        onClick={() => handleQuickAction('lock')}
                        className="cursor-pointer py-2 bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 hover:text-white rounded-xl text-[10px] font-mono text-zinc-400 transition-all flex flex-col items-center justify-center gap-1"
                        title="Power lock screen"
                      >
                        <Power size={14} className="text-red-400" />
                        <span>Lock</span>
                      </button>
                      <button
                        onClick={() => handleQuickAction('home')}
                        className="cursor-pointer py-2 bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 hover:text-white rounded-xl text-[10px] font-mono text-zinc-400 transition-all flex flex-col items-center justify-center gap-1"
                        title="Simulate Home button"
                      >
                        <Home size={14} className="text-emerald-400" />
                        <span>Home</span>
                      </button>
                      <button
                        onClick={() => handleQuickAction('camera')}
                        className="cursor-pointer py-2 bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 hover:text-white rounded-xl text-[10px] font-mono text-zinc-400 transition-all flex flex-col items-center justify-center gap-1"
                        title="Launch default camera"
                      >
                        <Camera size={14} className="text-yellow-400" />
                        <span>Camera</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center gap-2 border border-zinc-900 rounded-xl">
                  <RefreshCw className="animate-spin text-zinc-600" size={18} />
                  <span className="text-[10px] font-mono text-zinc-500">Querying phone telemetry stream...</span>
                </div>
              )}
            </div>

            {/* Framebuffer feed / Screen mirroring */}
            <div className="border border-zinc-800/80 bg-zinc-950/40 rounded-2xl p-5 flex flex-col flex-1 min-h-[350px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#00f3ff] font-mono flex items-center gap-2">
                  <Camera size={14} /> Screen Mirror Stream
                </h2>
                {adbConnected && (
                  <button
                    onClick={handleCaptureScreenshot}
                    disabled={screenshotLoading}
                    className="cursor-pointer px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono text-[#00f3ff] rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw size={11} className={screenshotLoading ? 'animate-spin' : ''} />
                    <span>Sync Frame</span>
                  </button>
                )}
              </div>

              <div className="flex-1 bg-black border border-zinc-900 rounded-2xl flex items-center justify-center relative overflow-hidden p-4 min-h-[220px]">
                {!adbConnected ? (
                  <div className="text-center font-mono text-[10px] text-zinc-600 max-w-xs leading-relaxed">
                    [Mirror feed offline. Connect phone via ADB debug tunnel above to stream visual frames...]
                  </div>
                ) : screenshotLoading ? (
                  <div className="text-center font-mono text-[10px] text-[#00f3ff] animate-pulse flex flex-col items-center gap-2">
                    <RefreshCw className="animate-spin" size={16} />
                    <span>Synchronizing visual framebuffer array...</span>
                  </div>
                ) : screenshotData ? (
                  <div className="relative w-full h-full flex justify-center items-center">
                    <img
                      src={screenshotData}
                      alt="Active Screen Framebuffer"
                      className="max-h-[300px] w-auto border border-zinc-800/80 rounded-lg shadow-lg select-none pointer-events-none object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="text-center font-mono text-[10px] text-zinc-500 max-w-xs leading-relaxed flex flex-col items-center gap-3">
                    <p>{"[Frame sync queue idle. Click 'Sync Frame' to mirror your active Android physical display.]"}</p>
                    <button
                      onClick={handleCaptureScreenshot}
                      className="cursor-pointer px-4 py-2 bg-[#00f3ff]/10 hover:bg-[#00f3ff] hover:text-black border border-[#00f3ff]/30 text-[#00f3ff] text-[10px] tracking-wider uppercase font-bold rounded-xl transition-all"
                    >
                      Capture Frame
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default PhoneView
