import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  RiBarChartBoxLine, 
  RiRadarLine, 
  RiSparkling2Line, 
  RiSettings3Line,
  RiTimeLine,
  RiCpuLine,
  RiPlayLine,
  RiPauseLine,
  RiRefreshLine
} from 'react-icons/ri'

interface ActivityLog {
  date: string
  app: string
  duration: number // in seconds
}

export default function ActivityView(): JSX.Element {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [summary, setSummary] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Fetch log data and tracking state from IPC
  const fetchData = async () => {
    if (window.electron?.ipcRenderer) {
      try {
        const enabled = await window.electron.ipcRenderer.invoke('get-activity-tracking-enabled')
        setIsTrackingEnabled(!!enabled)

        const rawLogs = await window.electron.ipcRenderer.invoke('get-activity-log')
        if (rawLogs) {
          setLogs(rawLogs)
        }
      } catch (err) {
        console.error('Error fetching activity stats:', err)
      }
    } else {
      // Browser Sandbox / Fallback Mock Data
      setIsTrackingEnabled(true)
      const mockLogs: ActivityLog[] = [
        { date: '2026-07-17', app: 'VS Code', duration: 14400 },
        { date: '2026-07-17', app: 'Chrome', duration: 7200 },
        { date: '2026-07-17', app: 'Terminal', duration: 3600 },
        { date: '2026-07-17', app: 'Slack', duration: 1800 },
        { date: '2026-07-17', app: 'Spotify', duration: 4500 },
        
        { date: '2026-07-16', app: 'VS Code', duration: 18000 },
        { date: '2026-07-16', app: 'Chrome', duration: 9000 },
        { date: '2026-07-15', app: 'VS Code', duration: 12000 },
        { date: '2026-07-14', app: 'VS Code', duration: 15000 },
        { date: '2026-07-13', app: 'VS Code', duration: 8000 },
        { date: '2026-07-12', app: 'Chrome', duration: 6000 },
        { date: '2026-07-11', app: 'Slack', duration: 3000 }
      ]
      setLogs(mockLogs)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleToggleTracking = async () => {
    const nextState = !isTrackingEnabled
    setIsTrackingEnabled(nextState)
    if (window.electron?.ipcRenderer) {
      await window.electron.ipcRenderer.invoke('set-activity-tracking-enabled', nextState)
    }
  }

  const handleGenerateSummary = async () => {
    setSummarizing(true)
    setSummary('')
    if (window.electron?.ipcRenderer) {
      try {
        const text = await window.electron.ipcRenderer.invoke('summarize-activity-day')
        setSummary(text)
      } catch (err: any) {
        setSummary(`Uplink Error: ${err.message}`)
      }
    } else {
      // Mock Summarization response
      setTimeout(() => {
        setSummary(
          `Boss, based on today's telemetry, your productivity has been exceptionally structured. You dedicated **4 hours** to development activities in VS Code and **2 hours** to research and information gathering in Chrome. Terminal operations accounted for **1 hour**, showing a balanced workflow of writing code and deploying services. Your active focus streak indicates minimal context-switching, optimizing your cognitive load beautifully. Solid performance!`
        )
      }, 1500)
    }
    setSummarizing(false)
  }

  // Group logs for Today
  const todayStr = new Date().toISOString().split('T')[0]
  const todayLogs = logs.filter(l => l.date === todayStr)

  // Format Today's Chart Data (Active Minutes)
  const chartDataToday = todayLogs.map(l => ({
    name: l.app,
    minutes: Math.round(l.duration / 60)
  })).sort((a, b) => b.minutes - a.minutes)

  // Rolling 7-day history calculation
  const getSevenDayHistory = () => {
    const map: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dStr = d.toISOString().split('T')[0]
      map[dStr] = 0
    }

    logs.forEach(l => {
      if (map[l.date] !== undefined) {
        map[l.date] += Math.round(l.duration / 60)
      }
    })

    return Object.entries(map).map(([date, mins]) => {
      const parts = date.split('-')
      const label = `${parts[1]}/${parts[2]}` // MM/DD
      return { date: label, minutes: mins }
    })
  }

  const sevenDayData = getSevenDayHistory()

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6']

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-black/20">
      <div className="max-w-5xl mx-auto">
        
        {/* Dynamic Tracking Status Bar */}
        <div className="mb-6 flex items-center justify-between p-4 bg-zinc-950/80 border border-white/5 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              {isTrackingEnabled ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-zinc-600"></span>
              )}
            </span>
            <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">
              UPLINK_ACTIVITY_RADAR: <span className={isTrackingEnabled ? 'text-emerald-400 font-bold' : 'text-zinc-600'}>{isTrackingEnabled ? 'ACTIVE_MONITORING_ON' : 'IDLE'}</span>
            </span>
          </div>

          <button
            onClick={handleToggleTracking}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-mono text-xs uppercase tracking-wider transition-all border ${
              isTrackingEnabled
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/25'
                : 'bg-zinc-900 border-white/5 hover:bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {isTrackingEnabled ? <RiPauseLine size={14} /> : <RiPlayLine size={14} />}
            {isTrackingEnabled ? 'Deactivate Monitor' : 'Activate Monitor'}
          </button>
        </div>

        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-[#00f3ff]/10 rounded-xl border border-[#00f3ff]/20 shadow-[0_0_15px_rgba(0,243,255,0.1)]">
                <RiBarChartBoxLine className="w-6 h-6 text-[#00f3ff]" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white font-mono uppercase">
                Activity & Focus <span className="text-[#00f3ff]">Metrics</span>
              </h1>
            </div>
            <p className="text-zinc-400 text-sm font-medium flex items-center gap-2 font-mono">
              <RiRadarLine className="w-4 h-4 text-emerald-400" />
              Tracks active application boundaries locally. Zero network reporting.
            </p>
          </div>
        </header>

        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-2 border-[#00f3ff]/20 border-t-[#00f3ff] rounded-full animate-spin" />
            <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Scanning OS window logs...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Today's App Breakdown */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-2xl backdrop-blur-md flex flex-col gap-4">
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
                  <RiTimeLine className="text-emerald-400" /> Today&apos;s Active App Distribution
                </h3>
                
                <div className="h-72 w-full mt-2">
                  {chartDataToday.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 font-mono text-xs">
                      No telemetry logs tracked for today yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartDataToday} layout="vertical" margin={{ left: 10, right: 30 }}>
                        <XAxis type="number" stroke="#52525b" fontSize={10} tickFormatter={(v) => `${v}m`} />
                        <YAxis type="category" dataKey="name" stroke="#52525b" fontSize={10} width={80} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }}
                          labelStyle={{ color: '#ffffff', fontFamily: 'monospace' }}
                          itemStyle={{ color: '#10b981', fontFamily: 'monospace' }}
                        />
                        <Bar dataKey="minutes" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16}>
                          {chartDataToday.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* 7-Day Trend Chart */}
              <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-2xl backdrop-blur-md flex flex-col gap-4">
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
                  <RiBarChartBoxLine className="text-[#00f3ff]" /> Rolling 7-Day History
                </h3>
                
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sevenDayData}>
                      <XAxis dataKey="date" stroke="#52525b" fontSize={10} />
                      <YAxis stroke="#52525b" fontSize={10} tickFormatter={(v) => `${v}m`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }}
                        labelStyle={{ color: '#ffffff', fontFamily: 'monospace' }}
                        itemStyle={{ color: '#00f3ff', fontFamily: 'monospace' }}
                      />
                      <Bar dataKey="minutes" fill="#00f3ff" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Right Column: AI Day Summary */}
            <div className="flex flex-col gap-6">
              
              <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-2xl backdrop-blur-md flex flex-col gap-6 h-full">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
                    <RiSparkling2Line className="text-yellow-400" /> Neural Day Summary
                  </h3>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={summarizing}
                    className="p-2 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white rounded-xl transition-all border border-white/5"
                    title="Generate updated summary"
                  >
                    <RiRefreshLine size={14} className={summarizing ? 'animate-spin' : ''} />
                  </button>
                </div>

                <div className="flex-1 flex flex-col justify-between gap-6">
                  <div className="p-4 bg-black/40 border border-white/5 rounded-xl font-sans text-xs leading-relaxed text-zinc-300 min-h-60 flex flex-col justify-center">
                    {summarizing ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
                        <span className="font-mono text-[10px] uppercase text-zinc-500 tracking-widest">Aggregating Focus Matrix...</span>
                      </div>
                    ) : summary ? (
                      <p className="whitespace-pre-wrap">{summary}</p>
                    ) : (
                      <div className="text-center text-zinc-600 font-mono py-12">
                        Click the activation trigger below to summarize your day using local Gemini intelligence.
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleGenerateSummary}
                    disabled={summarizing || chartDataToday.length === 0}
                    className="w-full py-4 bg-emerald-950 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black font-bold tracking-widest uppercase rounded-xl transition-all font-mono text-xs text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    SUMMARIZE MY DAY
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  )
}
