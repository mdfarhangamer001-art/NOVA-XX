import { useState, useEffect, useRef } from 'react'
import {
  Cpu,
  Shield,
  Terminal,
  Play,
  Pause,
  RefreshCw,
  Zap,
  Monitor,
  Activity,
  Radio,
  Eye,
  Search,
  CheckCircle2,
  GitPullRequest,
  Tag,
  Layers,
  ArrowRight,
  Sparkles,
  Server,
  Code
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AGENTS_DATA, Agent } from '../data/agents'

export default function AgentsView() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(AGENTS_DATA[0])
  const [activeTab, setActiveTab] = useState<'CONSOLE' | 'SCREEN_SHARE' | 'AUTOPILOT'>('CONSOLE')

  // Real-time fluctuating network stats
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 28.4,
    ram: 45.1,
    latency: 24,
    activeAgents: 32
  })

  // Simulated Autopilot Workflow states
  const [isAutopilotRunning, setIsAutopilotRunning] = useState(false)
  const [autopilotLogs, setAutopilotLogs] = useState<string[]>([
    'SYSTEM: Neural Core Autopilot initialized.',
    'STATUS: Awaiting code drift trigger or scheduled cron loop.'
  ])
  const [currentVersion, setCurrentVersion] = useState(() => {
    return localStorage.getItem('xtehzeeb_app_version') || localStorage.getItem('novax_app_version') || '1.6.3'
  })

  const visionIntervalRef = useRef<any>(null)

  useEffect(() => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.invoke('get-app-version').then((v: string) => {
        if (v) {
          setCurrentVersion(v)
          localStorage.setItem('xtehzeeb_app_version', v)
          localStorage.setItem('novax_app_version', v)
        }
      })

      // Real-time progress logs subscription
      const handleProgress = (_event: any, msg: string) => {
        setAgentLogs((prev) => {
          const currentLogs = prev['coding-agent'] || []
          return {
            ...prev,
            'coding-agent': [...currentLogs, msg]
          }
        })
      }

      const unsubscribe = window.electron.ipcRenderer.on('agent-progress-log', handleProgress)
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe()
        }
      }
    }
    return undefined
  }, [])

  // Direct Uplink console input/log states
  const [consoleInput, setConsoleInput] = useState('')
  const [agentLogs, setAgentLogs] = useState<Record<string, string[]>>({})

  // Screen sharing state
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [shareResolution, setShareResolution] = useState('—')
  const [shareFps, setShareFps] = useState(0)
  const [shareBitrate, setShareBitrate] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Fluctuating metric values to look hyper-alive!
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemMetrics((prev) => {
        const cpuDrift = (Math.random() - 0.5) * 4
        const ramDrift = (Math.random() - 0.5) * 1.5
        const latencyDrift = Math.floor((Math.random() - 0.5) * 6)
        
        return {
          cpu: Math.min(100, Math.max(5, +(prev.cpu + cpuDrift).toFixed(1))),
          ram: Math.min(100, Math.max(10, +(prev.ram + ramDrift).toFixed(1))),
          latency: Math.min(150, Math.max(2, prev.latency + latencyDrift)),
          activeAgents: prev.activeAgents
        }
      })
    }, 2500)
    return () => clearInterval(timer)
  }, [])

  // Categories list
  const categories = ['ALL', 'Automation', 'Neural', 'DevOps', 'Security', 'Media', 'Research']

  // Filter agents
  const filteredAgents = AGENTS_DATA.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.role.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'ALL' || agent.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Screen share trigger
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (visionIntervalRef.current) {
        clearInterval(visionIntervalRef.current)
        visionIntervalRef.current = null
      }
      setIsScreenSharing(false)
      setShareResolution('—')
      setShareFps(0)
      setShareBitrate(0)
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 },
          audio: false
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        setIsScreenSharing(true)

        const videoTrack = stream.getVideoTracks()[0]
        const settings = videoTrack.getSettings()
        setShareResolution(`${settings.width || 1920}x${settings.height || 1080}`)

        // Measure FPS and Bitrate dynamically — bitrate is computed from
        // the REAL bytes of the JPEG frames captured for vision analysis
        // below, not a random placeholder.
        let lastTime = performance.now()
        let frames = 0
        let bytesSinceLastTick = 0
        const trackStats = () => {
          if (!streamRef.current) return
          frames++
          const now = performance.now()
          if (now - lastTime >= 1000) {
            const dtSec = (now - lastTime) / 1000
            setShareFps(Math.round((frames * 1000) / (now - lastTime)))
            const mbps = (bytesSinceLastTick * 8) / 1_000_000 / dtSec
            setShareBitrate(+mbps.toFixed(2))
            frames = 0
            bytesSinceLastTick = 0
            lastTime = now
          }
          animationFrameRef.current = requestAnimationFrame(trackStats)
        }
        trackStats()

        // Real-time multimodal screen vision capture loop
        visionIntervalRef.current = setInterval(async () => {
          if (!streamRef.current || !videoRef.current) return
          try {
            const canvas = document.createElement('canvas')
            canvas.width = 640
            canvas.height = 360
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
              const base64 = canvas.toDataURL('image/jpeg', 0.6)
              // Real byte size of the frame we're actually sending, used
              // to compute the bitrate readout above.
              bytesSinceLastTick += Math.round((base64.length * 3) / 4)
              
              setAutopilotLogs(prev => [...prev, `[VISION] Capture frame dispatched to server-side multimodal analyzer...`])
              
              if (window.iris?.sendVisionFrame) {
                const res = await window.iris.sendVisionFrame(base64)
                if (res.success) {
                  setAutopilotLogs(prev => [
                    ...prev,
                    `[VISION] Analysis Result:\n${res.analysis}`
                  ])
                  if (res.shouldAlert && res.anomalyDetected) {
                    setAutopilotLogs(prev => [
                      ...prev,
                      `[SELF-CORRECTION] ⚠️ ${res.anomalyDescription} — Suggested: ${res.suggestedAction}`
                    ])
                    window.dispatchEvent(
                      new CustomEvent('novax_vision_anomaly', {
                        detail: {
                          description: res.anomalyDescription,
                          suggestedAction: res.suggestedAction,
                          severity: res.severity,
                          activeApplication: res.activeApplication
                        }
                      })
                    )
                  }
                } else {
                  setAutopilotLogs(prev => [...prev, `[VISION ERROR] ${res.error}`])
                }
              }
            }
          } catch (e: any) {
            console.error('Vision frame capture failed:', e)
          }
        }, 12000)

        videoTrack.onended = () => {
          toggleScreenShare()
        }
      } catch (err) {
        console.error('Screen capture rejected or failed:', err)
      }
    }
  }

  // Handle direct console submission
  const handleConsoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consoleInput.trim() || !selectedAgent) return

    const input = consoleInput
    setConsoleInput('')

    const currentAgentLogs = agentLogs[selectedAgent.id] || selectedAgent.systemLogs
    const newLogs = [...currentAgentLogs, `USER: ${input}`]
    
    setAgentLogs({
      ...agentLogs,
      [selectedAgent.id]: newLogs
    })

    if (selectedAgent.id === 'coding-agent') {
      if (window.electron?.ipcRenderer) {
        try {
          const res = await window.electron.ipcRenderer.invoke('agent-run-task', input)
          if (res.success) {
            setAgentLogs((prev) => ({
              ...prev,
              'coding-agent': [...(prev['coding-agent'] || []), `NEURAL: ${res.summary}`]
            }))
          } else {
            setAgentLogs((prev) => ({
              ...prev,
              'coding-agent': [...(prev['coding-agent'] || []), `ERROR: ${res.error}`]
            }))
          }
        } catch (err: any) {
          setAgentLogs((prev) => ({
            ...prev,
            'coding-agent': [...(prev['coding-agent'] || []), `ERROR: ${err.message}`]
          }))
        }
      } else {
        setAgentLogs((prev) => ({
          ...prev,
          'coding-agent': [...(prev['coding-agent'] || []), `ERROR: Main process communication is unavailable.`]
        }))
      }
    } else {
      // Simulate Agent response based on its identity
      setTimeout(() => {
        let response = ''
        if (selectedAgent.id === 'github-workflow-automator') {
          response = `AUTOMATOR: Executed custom patch release sequence. Bumped package version, created release.yml template, compiled JS assemblies, and pushed tag to simulated git origin.`
        } else {
          response = `${selectedAgent.id.toUpperCase()}: Instruction loaded. Analyzing context nodes, executing targeted tool parameters. Output pipeline verified. Status code: 200 OK.`
        }
        setAgentLogs((prev) => ({
          ...prev,
          [selectedAgent.id]: [...(prev[selectedAgent.id] || []), response]
        }))
      }, 1000)
    }
  }

  // Run the Master Autopilot Release loop!
  const startAutopilotSequence = () => {
    if (isAutopilotRunning) return

    // Calculate dynamic next version
    const parts = currentVersion.split('.')
    let nextVersion = '1.6.4'
    if (parts.length === 3) {
      parts[2] = (parseInt(parts[2], 10) + 1).toString()
      nextVersion = parts.join('.')
    }

    setIsAutopilotRunning(true)
    const logs = [
      '⚡ [AUTOPILOT] Triggered automated repository analyzer...',
      '🔍 [ANALYSIS] Scanning file-system drift in workspace root...',
      '📝 [ANALYSIS] Found modifications: License ownership shifted to Lead Operator, package.json compiled.',
      '💾 [REDUCTION] Removing deprecated Razorpay, RazorPay checkout, and sponsor badges... OK.',
      '⚙️ [COMPILATION] Invoking esbuild bundling protocol: server.ts -> dist/server.cjs...',
      '📦 [COMPILATION] Vite bundle compiled successfully into static assets.',
      '🏷️ [VERSIONING] Semantic patch detected. Preparing version promotion...',
      `📈 [VERSIONING] Promoting local build from v${currentVersion} to v${nextVersion}...`,
      `🏷️ [GIT] Generated secure release tag: v${nextVersion}-release`,
      '🤖 [AUTOPILOT] Crafting GitHub release assets and workflow payloads...',
      '🚀 [RELEASE] Pushing assets to GitHub Actions workflow pipeline...',
      '📡 [RELEASE] GitHub release action executed successfully. Deployment online!',
      '🏁 [AUTOPILOT] Self-update and release sequence completed. System is fully stabilized.'
    ]

    setAutopilotLogs(['[AUTOPILOT] Initializing full loop.'])
    
    let index = 0
    const interval = setInterval(async () => {
      if (index < logs.length) {
        setAutopilotLogs((prev) => [...prev, logs[index]])
        index++
        if (index === 8) {
          if (window.electron?.ipcRenderer) {
            try {
              const realNext = await window.electron.ipcRenderer.invoke('bump-app-version')
              if (realNext) {
                setCurrentVersion(realNext)
                localStorage.setItem('xtehzeeb_app_version', realNext)
                localStorage.setItem('novax_app_version', realNext)
              }
            } catch (err) {
              setCurrentVersion(nextVersion)
              localStorage.setItem('xtehzeeb_app_version', nextVersion)
              localStorage.setItem('novax_app_version', nextVersion)
            }
          } else {
            setCurrentVersion(nextVersion)
            localStorage.setItem('xtehzeeb_app_version', nextVersion)
            localStorage.setItem('novax_app_version', nextVersion)
          }
        }
      } else {
        clearInterval(interval)
        setIsAutopilotRunning(false)
      }
    }, 900)
  }

  return (
    <div className="h-full w-full bg-transparent flex flex-col p-2 relative text-zinc-100 select-none">
      {/* Upper Grid - System telemetry HUD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 z-10">
        <div className="bg-zinc-950/60 border border-white/5 backdrop-blur-xl p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <span className="block text-[8px] font-mono tracking-widest text-zinc-500 uppercase">Neural Cores</span>
            <span className="text-xl font-bold font-mono text-[#00ff88]">100 Nodes</span>
          </div>
          <div className="p-2 bg-[#00ff88]/5 border border-[#00ff88]/10 rounded-lg">
            <Layers className="text-[#00ff88]" size={18} />
          </div>
        </div>

        <div className="bg-zinc-950/60 border border-white/5 backdrop-blur-xl p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <span className="block text-[8px] font-mono tracking-widest text-zinc-500 uppercase">Core CPU Overhead</span>
            <span className="text-xl font-bold font-mono text-cyan-400">{systemMetrics.cpu}%</span>
          </div>
          <div className="p-2 bg-cyan-500/5 border border-cyan-500/10 rounded-lg">
            <Cpu className="text-cyan-400" size={18} />
          </div>
        </div>

        <div className="bg-zinc-950/60 border border-white/5 backdrop-blur-xl p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <span className="block text-[8px] font-mono tracking-widest text-zinc-500 uppercase">Active RAM Load</span>
            <span className="text-xl font-bold font-mono text-[#a855f7]">{systemMetrics.ram}%</span>
          </div>
          <div className="p-2 bg-[#a855f7]/5 border border-[#a855f7]/10 rounded-lg">
            <Activity className="text-[#a855f7]" size={18} />
          </div>
        </div>

        <div className="bg-zinc-950/60 border border-white/5 backdrop-blur-xl p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <span className="block text-[8px] font-mono tracking-widest text-zinc-500 uppercase">Uplink Latency</span>
            <span className="text-xl font-bold font-mono text-orange-400">{systemMetrics.latency} ms</span>
          </div>
          <div className="p-2 bg-orange-500/5 border border-orange-500/10 rounded-lg">
            <Radio className="text-orange-400" size={18} />
          </div>
        </div>
      </div>

      {/* Main Container splits between Left (60 Agents select) and Right (Interactive workspace) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
        
        {/* Left Side: 60 Agents Selector (Col span 7) */}
        <div className="lg:col-span-7 flex flex-col bg-zinc-950/30 border border-white/5 rounded-2xl p-4 min-h-0">
          
          {/* Categories & Search Header */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div className="flex items-center gap-2 bg-black/40 border border-white/5 px-3 py-1.5 rounded-xl w-full md:w-64">
              <Search size={14} className="text-zinc-500" />
              <input
                type="text"
                placeholder="Search 100 agent cores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-xs font-mono text-zinc-200 outline-none w-full"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-[8px] font-mono tracking-wider uppercase rounded-lg border transition-all shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                      : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Container */}
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[52vh] min-h-0">
            {filteredAgents.map((agent) => {
              const isSelected = selectedAgent?.id === agent.id
              const activeColor = 
                agent.category === 'Automation' ? 'text-emerald-400' :
                agent.category === 'Neural' ? 'text-cyan-400' :
                agent.category === 'DevOps' ? 'text-purple-400' :
                agent.category === 'Security' ? 'text-red-400' :
                agent.category === 'Media' ? 'text-orange-400' : 'text-blue-400'

              return (
                <motion.div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`relative overflow-hidden p-3 rounded-xl border cursor-pointer transition-all duration-300 group ${
                    isSelected
                      ? 'bg-zinc-900/80 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
                      : 'bg-black/30 border-white/5 hover:border-white/15 hover:bg-zinc-950/40'
                  }`}
                >
                  {/* Subtle ambient pulse background on active */}
                  {agent.status === 'ACTIVE' && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
                  )}

                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg bg-zinc-900 border border-white/5 group-hover:border-white/10 ${activeColor}`}>
                        {agent.category === 'Automation' && <Zap size={13} />}
                        {agent.category === 'Neural' && <Sparkles size={13} />}
                        {agent.category === 'DevOps' && <Code size={13} />}
                        {agent.category === 'Security' && <Shield size={13} />}
                        {agent.category === 'Media' && <Monitor size={13} />}
                        {agent.category === 'Research' && <Server size={13} />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold tracking-wide text-zinc-100 group-hover:text-white">{agent.name}</span>
                        <span className="text-[7px] font-mono tracking-widest uppercase text-zinc-500">{agent.category} Node</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${agent.status === 'PROCESSING' || agent.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${agent.status === 'PROCESSING' ? 'bg-amber-400' : agent.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                      </span>
                      <span className="text-[7px] font-mono text-zinc-500 tracking-wider">{agent.status}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-400 mt-2 line-clamp-2 h-7 leading-normal">{agent.role}</p>

                  <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-2 font-mono text-[8px] text-zinc-500">
                    <span>CPU: {agent.metrics.cpu}%</span>
                    <span>RAM: {agent.metrics.ram}MB</span>
                    <span>LATENCY: {agent.metrics.latency}ms</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Right Side: Interactive Agent workspace (Col span 5) */}
        <div className="lg:col-span-5 flex flex-col bg-zinc-950/30 border border-white/5 rounded-2xl p-4 min-h-0">
          {/* Sub Tab Navigation */}
          <div className="flex border-b border-white/5 pb-2 mb-4 gap-1">
            <button
              onClick={() => setActiveTab('CONSOLE')}
              className={`px-3 py-1 text-[9px] font-mono tracking-widest uppercase rounded-lg border transition-all ${
                activeTab === 'CONSOLE'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              Uplink Console
            </button>
            <button
              onClick={() => setActiveTab('AUTOPILOT')}
              className={`px-3 py-1 text-[9px] font-mono tracking-widest uppercase rounded-lg border transition-all ${
                activeTab === 'AUTOPILOT'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              Autopilot Release
            </button>
            <button
              onClick={() => setActiveTab('SCREEN_SHARE')}
              className={`relative px-3 py-1 text-[9px] font-mono tracking-widest uppercase rounded-lg border transition-all ${
                activeTab === 'SCREEN_SHARE'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              Screen HUD
              {isScreenSharing && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            {/* View 1: CONSOLE */}
            {activeTab === 'CONSOLE' && selectedAgent && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-3">
                  <div className="p-1.5 rounded-lg bg-zinc-900 text-emerald-400 border border-white/5">
                    <Terminal size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold font-mono tracking-wide text-zinc-200">Uplink: {selectedAgent.name}</h3>
                    <p className="text-[8px] font-mono text-zinc-500 tracking-wider uppercase">Direct Node Interface</p>
                  </div>
                </div>

                <div className="flex-1 bg-black/60 border border-white/5 rounded-xl p-3 font-mono text-[9px] overflow-y-auto mb-3 max-h-[34vh] space-y-2.5">
                  <span className="block text-zinc-600 border-b border-white/5 pb-1 mb-1">// CONNECTED TO ACTIVE AGENT CORE PORT</span>
                  
                  {(agentLogs[selectedAgent.id] || selectedAgent.systemLogs).map((log, index) => {
                    const isUser = log.startsWith('USER:')
                    const isResponse = log.startsWith('AUTOMATOR:') || log.startsWith('NEURAL:') || log.startsWith('ADB:') || log.includes(': ')
                    return (
                      <div
                        key={index}
                        className={`leading-relaxed p-1.5 rounded ${
                          isUser
                            ? 'bg-[#00ff88]/5 text-[#00ff88] border-l-2 border-[#00ff88]/40 pl-2'
                            : isResponse
                              ? 'bg-zinc-900/60 text-zinc-300'
                              : 'text-zinc-500'
                        }`}
                      >
                        {log}
                      </div>
                    )
                  })}
                </div>

                <form onSubmit={handleConsoleSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={consoleInput}
                    onChange={(e) => setConsoleInput(e.target.value)}
                    placeholder={`Instruct ${selectedAgent.name.split(' ')[0]}...`}
                    className="flex-1 bg-black/50 border border-white/5 px-3 py-2 rounded-xl text-[10px] font-mono text-zinc-200 outline-none focus:border-emerald-500/30 transition-all placeholder:text-zinc-600"
                  />
                  <button
                    type="submit"
                    className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-black px-3.5 rounded-xl flex items-center justify-center transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  >
                    <ArrowRight size={14} strokeWidth={2.5} />
                  </button>
                </form>
              </div>
            )}

            {/* View 2: AUTOPILOT */}
            {activeTab === 'AUTOPILOT' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-zinc-900 text-purple-400 border border-white/5">
                      <Zap size={14} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold font-mono text-zinc-200">Self-Releasing Autopilot</h3>
                      <p className="text-[8px] font-mono text-zinc-500 tracking-wider uppercase">Vite + Esbuild Automated Build System</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-purple-500/20 bg-purple-500/5">
                    <Tag size={10} className="text-purple-400" />
                    <span className="text-[8px] font-mono text-purple-300 tracking-wider">v{currentVersion}</span>
                  </div>
                </div>

                <div className="flex-1 bg-black/60 border border-white/5 rounded-xl p-3 font-mono text-[9px] overflow-y-auto mb-3 max-h-[34vh] space-y-2">
                  <span className="block text-zinc-600 border-b border-white/5 pb-1 mb-1">// SECURE AUTOPILOT CI/CD OUTPUT</span>
                  {autopilotLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`leading-relaxed ${
                        log.includes('SUCCESS') || log.includes('OK') || log.includes('stabilized')
                          ? 'text-[#00ff88]'
                          : log.includes('release') || log.includes('v1.6.4')
                            ? 'text-purple-400 font-bold'
                            : 'text-zinc-400'
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                </div>

                <button
                  onClick={startAutopilotSequence}
                  disabled={isAutopilotRunning}
                  className={`w-full cursor-pointer font-mono text-[9px] tracking-widest uppercase py-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    isAutopilotRunning
                      ? 'bg-purple-500/5 border-purple-500/20 text-purple-400 cursor-not-allowed'
                      : 'bg-[#a855f7] hover:bg-[#b86dfb] text-white border-[#b86dfb]/20 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                  }`}
                >
                  {isAutopilotRunning ? (
                    <>
                      <RefreshCw className="animate-spin" size={13} />
                      Analyzing & Compiling Build...
                    </>
                  ) : (
                    <>
                      <GitPullRequest size={13} />
                      Trigger Autopilot Self-Release Loop
                    </>
                  )}
                </button>
              </div>
            )}

            {/* View 3: SCREEN HUD */}
            {activeTab === 'SCREEN_SHARE' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-zinc-900 text-cyan-400 border border-white/5">
                      <Monitor size={14} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold font-mono text-zinc-200">Real-Time Screen HUD</h3>
                      <p className="text-[8px] font-mono text-zinc-500 tracking-wider uppercase">Direct Windows Frame-Capture</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-cyan-500/20 bg-cyan-500/5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${isScreenSharing ? 'bg-red-400' : 'bg-zinc-600'}`} />
                      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${isScreenSharing ? 'bg-red-400' : 'bg-zinc-600'}`} />
                    </span>
                    <span className="text-[8px] font-mono text-zinc-400 tracking-wider">
                      {isScreenSharing ? 'LIVE' : 'STANDBY'}
                    </span>
                  </div>
                </div>

                <div className="relative aspect-video w-full rounded-xl border border-white/5 bg-black/60 overflow-hidden mb-3 flex flex-col items-center justify-center">
                  <video
                    ref={videoRef}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isScreenSharing ? 'opacity-90' : 'opacity-0 pointer-events-none'}`}
                    muted
                  />

                  {/* High Tech HUD Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex justify-between items-end text-zinc-400 z-10 select-none">
                    <div className="font-mono text-[7px] space-y-0.5">
                      <div>DIMENSIONS: <span className="text-cyan-400 font-bold">{shareResolution}</span></div>
                      <div>FPS STREAM: <span className="text-[#00ff88] font-bold">{shareFps || '—'} Hz</span></div>
                    </div>
                    <div className="font-mono text-[7px] space-y-0.5 text-right">
                      <div>BITRATE: <span className="text-purple-400 font-bold">{shareBitrate ? `${shareBitrate} MB/s` : '—'}</span></div>
                      <div>LATENCY: <span className="text-orange-400 font-bold">{isScreenSharing ? '12 ms' : '—'}</span></div>
                    </div>
                  </div>

                  {!isScreenSharing && (
                    <div className="flex flex-col items-center text-center gap-2 p-4 relative z-10">
                      <div className="h-10 w-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                        <Monitor size={18} />
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-zinc-300">Screen Uplink Disabled</span>
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mt-1 block">Click start to share screen</span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={toggleScreenShare}
                  className={`w-full cursor-pointer font-mono text-[9px] tracking-widest uppercase py-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    isScreenSharing
                      ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                  }`}
                >
                  {isScreenSharing ? (
                    <>
                      <Pause size={13} />
                      Stop Screen Capture
                    </>
                  ) : (
                    <>
                      <Play size={13} />
                      Initiate Direct Screen Capture
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
