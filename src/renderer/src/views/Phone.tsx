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
  Sparkles
} from 'lucide-react'

const PhoneView = ({ glassPanel = '' }: { glassPanel?: string }) => {
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
    fetchStatus()
    const interval = setInterval(fetchStatus, 3000)
    return () => clearInterval(interval)
  }, [])

  // Listen to live events broadcasted from the main process
  useEffect(() => {
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
  }, [])

  const handleCopy = () => {
    if (companionStatus?.url) {
      navigator.clipboard.writeText(companionStatus.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleForceRefresh = async () => {
    setRefreshing(true)
    await fetchStatus()
    setTimeout(() => setRefreshing(false), 800)
  }

  const handleUnpair = async () => {
    if (window.electron?.ipcRenderer) {
      const res = await window.electron.ipcRenderer.invoke('forget-companion-device')
      setCompanionStatus(res)
      setCommandLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] [SYSTEM] All paired devices forgotten. PIN regenerated.`,
        ...prev
      ].slice(0, 50))
    }
  }

  return (
    <div className={`h-full w-full flex flex-col p-6 overflow-y-auto bg-[#030303] text-zinc-100 ${glassPanel}`}>
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800/60 pb-6 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-mono tracking-widest border border-emerald-500/20 rounded uppercase">
              COMPANION UPLINK
            </span>
            <span className="text-zinc-600 font-mono text-[9px]">•</span>
            <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider">
              AUTO-RECONNECT WIRELESS PROTOCOL
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Mobile Companion Server
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Wirelessly link your smartphone to act as a remote speech controller, mic beacon, and terminal overwatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleForceRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-all"
            title="Force telemetry synchronization"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span>Sync Telemetry</span>
          </button>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800/80 rounded-lg">
            <Network size={13} className="text-zinc-500" />
            <span className="text-[10px] font-mono text-zinc-400 font-medium">IP: {companionStatus?.ip || 'Detecting...'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Side: System Guidelines & Logs */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Pairing Instructions */}
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
                    Scan the QR code displayed on the right or enter the companion server URL into your smartphone's web browser.
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
                  <strong>PRO-TIP:</strong> The URL on your phone stores the pairing credentials in its browser's LocalStorage. It will automatically re-connect to your workstation in the background!
                </p>
              </div>
            </div>
          </div>

          {/* Live Telemetry Terminal */}
          <div className="border border-zinc-800/80 bg-zinc-950/60 rounded-2xl flex-1 flex flex-col overflow-hidden min-h-[250px]">
            {/* Terminal Header */}
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

            {/* Console Output */}
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
            {/* Connection Status Ring / Animation */}
            <div className="flex flex-col items-center text-center my-4 shrink-0">
              <div className="relative flex items-center justify-center mb-4">
                {/* Pulse rings */}
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

            {/* If DISCONNECTED: Show QR Code & PIN Code */}
            {!companionStatus?.connected ? (
              <div className="flex-1 flex flex-col justify-center items-center py-6 border-t border-b border-zinc-800/40 my-6">
                {/* QR Code Container */}
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

                {/* PIN Code Box */}
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
              /* If CONNECTED: Show Active Telemetry Metrics */
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

            {/* Connection Information Footer Controls */}
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
                    className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded transition-all shrink-0"
                    title="Copy companion address"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleUnpair}
                  className="flex-1 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-mono font-bold text-[10px] tracking-wider uppercase rounded-xl transition-all duration-200 border border-red-500/20 flex items-center justify-center gap-1.5"
                >
                  <LogOut size={13} />
                  <span>Unpair / Forget Devices</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PhoneView
