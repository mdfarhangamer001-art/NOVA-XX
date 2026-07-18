import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cpu, MemoryStick, Thermometer, Activity, Power, Trash2, Plus, Zap, Clock, MapPin, X } from 'lucide-react'
import { useLiveSystemMetrics } from '../hooks/useLiveSystemMetrics'
import {
  loadProcesses,
  upsertProcess,
  deleteProcess,
  loadRoutines,
  upsertRoutine,
  deleteRoutine,
  markRoutineFired,
  type ProcessRow,
  type RoutineRow
} from '../services/supabaseClient'

const glassPanel = 'bg-black/40 backdrop-blur-xl border border-white/5'

// ---- Radial gauge --------------------------------------------------------

function RadialGauge({
  value,
  label,
  unit,
  icon,
  color,
  max = 100
}: {
  value: number
  label: string
  unit: string
  icon: React.ReactNode
  color: string
  max?: number
}): JSX.Element {
  const pct = Math.min(value / max, 1)
  const circumference = 2 * Math.PI * 52
  const offset = circumference * (1 - pct)

  return (
    <div className={`${glassPanel} rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle at center, ${color}, transparent 70%)` }} />
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <motion.circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-emerald-400 mb-1">{icon}</span>
          <span className="text-2xl font-bold font-mono text-zinc-100">{value.toFixed(1)}</span>
          <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-500">{unit}</span>
        </div>
      </div>
      <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400 mt-2">{label}</span>
    </div>
  )
}

// ---- Sparkline -----------------------------------------------------------

function Sparkline({ data, color }: { data: number[]; color: string }): JSX.Element {
  if (data.length < 2) return <div className="h-10" />
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 100 - ((v - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg className="w-full h-10" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
    </svg>
  )
}

// ---- Process manager -----------------------------------------------------

function ProcessManager(): JSX.Element {
  const [processes, setProcesses] = useState<ProcessRow[]>([])
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const rows = await loadProcesses()
    setProcesses(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const launch = async (): Promise<void> => {
    if (!name.trim()) return
    await upsertProcess({
      name: name.trim(),
      command: command.trim() || null,
      status: 'running',
      pid: null,
      cpu_percent: 0,
      mem_mb: 0
    })
    setName('')
    setCommand('')
    refresh()
  }

  const stop = async (p: ProcessRow): Promise<void> => {
    if (window.electron?.ipcRenderer && p.command) {
      await window.electron.ipcRenderer.invoke('execute-system-action', {
        action: 'run-command',
        data: { command: `pkill -f "${p.name}" 2>/dev/null; true` }
      })
    }
    await upsertProcess({ ...p, status: 'stopped', pid: null })
    refresh()
  }

  const start = async (p: ProcessRow): Promise<void> => {
    if (window.electron?.ipcRenderer && p.command) {
      await window.electron.ipcRenderer.invoke('execute-system-action', {
        action: 'open-app',
        data: { appName: p.command }
      })
    }
    await upsertProcess({ ...p, status: 'running' })
    refresh()
  }

  const remove = async (id: string): Promise<void> => {
    await deleteProcess(id)
    refresh()
  }

  return (
    <div className={`${glassPanel} rounded-2xl p-5 flex flex-col`}>
      <div className="flex items-center gap-2 mb-4">
        <Activity size={16} className="text-emerald-400" />
        <h3 className="text-[11px] font-mono tracking-widest uppercase text-zinc-200">Process Manager</h3>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Process name"
          className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:border-emerald-500/50 focus:outline-none"
        />
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Launch command"
          className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:border-emerald-500/50 focus:outline-none"
        />
        <button
          onClick={launch}
          className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg px-3 py-2 text-xs font-mono hover:bg-emerald-500/25 transition-all flex items-center gap-1"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 max-h-64">
        {loading ? (
          <div className="text-zinc-600 text-xs font-mono text-center py-4">Loading...</div>
        ) : processes.length === 0 ? (
          <div className="text-zinc-600 text-xs font-mono text-center py-4">No managed processes</div>
        ) : (
          processes.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-black/30 rounded-lg p-3 border border-white/5">
              <div className={`h-2 w-2 rounded-full ${p.status === 'running' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-zinc-600'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-zinc-200 truncate">{p.name}</div>
                <div className="text-[10px] font-mono text-zinc-600 truncate">{p.command || '—'}</div>
              </div>
              <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">{p.status}</span>
              {p.status === 'running' ? (
                <button onClick={() => stop(p)} className="text-zinc-500 hover:text-red-400 transition-colors" title="Stop">
                  <Power size={14} />
                </button>
              ) : (
                <button onClick={() => start(p)} className="text-zinc-500 hover:text-emerald-400 transition-colors" title="Start">
                  <Zap size={14} />
                </button>
              )}
              <button onClick={() => remove(p.id)} className="text-zinc-500 hover:text-red-400 transition-colors" title="Remove">
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ---- Proactive routines --------------------------------------------------

function RoutineManager(): JSX.Element {
  const [routines, setRoutines] = useState<RoutineRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', action: '', time_hint: '', location: '' })

  const refresh = useCallback(async () => {
    const rows = await loadRoutines()
    setRoutines(rows)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Proactive scanner: check every 30s for routines whose time_hint matches now
  useEffect(() => {
    const check = async (): Promise<void> => {
      const now = new Date()
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      for (const r of routines) {
        if (!r.enabled || !r.time_hint) continue
        if (r.time_hint === hhmm) {
          const last = r.last_fired ? new Date(r.last_fired) : null
          if (last && now.getTime() - last.getTime() < 60000) continue
          console.log(`[IRIS Proactive] Firing routine: ${r.title} → ${r.action}`)
          await markRoutineFired(r.id)
          if (typeof window !== 'undefined' && (window as any).speakText) {
            ;(window as any).speakText(`Routine triggered: ${r.title}. ${r.action}`)
          }
        }
      }
    }
    const id = setInterval(check, 30000)
    return () => clearInterval(id)
  }, [routines])

  const save = async (): Promise<void> => {
    if (!form.title.trim() || !form.action.trim()) return
    await upsertRoutine({
      title: form.title.trim(),
      action: form.action.trim(),
      time_hint: form.time_hint.trim() || null,
      location: form.location.trim() || null,
      enabled: true
    })
    setForm({ title: '', action: '', time_hint: '', location: '' })
    setShowForm(false)
    refresh()
  }

  const toggle = async (r: RoutineRow): Promise<void> => {
    await upsertRoutine({ ...r, enabled: !r.enabled })
    refresh()
  }

  const remove = async (id: string): Promise<void> => {
    await deleteRoutine(id)
    refresh()
  }

  return (
    <div className={`${glassPanel} rounded-2xl p-5 flex flex-col`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-emerald-400" />
          <h3 className="text-[11px] font-mono tracking-widest uppercase text-zinc-200">Proactive Routines</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs font-mono hover:bg-emerald-500/25 transition-all flex items-center gap-1"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'New'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4 space-y-2"
          >
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Routine title" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:border-emerald-500/50 focus:outline-none" />
            <input value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} placeholder="Action (e.g. 'Open standup doc')" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:border-emerald-500/50 focus:outline-none" />
            <div className="flex gap-2">
              <input value={form.time_hint} onChange={(e) => setForm({ ...form, time_hint: e.target.value })} placeholder="Time (HH:MM)" className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:border-emerald-500/50 focus:outline-none" />
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location (optional)" className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:border-emerald-500/50 focus:outline-none" />
            </div>
            <button onClick={save} className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg px-3 py-2 text-xs font-mono hover:bg-emerald-500/30 transition-all">
              Save Routine
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto space-y-2 max-h-64">
        {routines.length === 0 ? (
          <div className="text-zinc-600 text-xs font-mono text-center py-4">No routines configured</div>
        ) : (
          routines.map((r) => (
            <div key={r.id} className="flex items-center gap-3 bg-black/30 rounded-lg p-3 border border-white/5">
              <div className={`h-2 w-2 rounded-full ${r.enabled ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-zinc-600'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-zinc-200 truncate">{r.title}</div>
                <div className="text-[10px] font-mono text-zinc-600 truncate">{r.action}</div>
                <div className="flex items-center gap-3 mt-1">
                  {r.time_hint && <span className="text-[9px] font-mono text-emerald-500/70 flex items-center gap-1"><Clock size={9} /> {r.time_hint}</span>}
                  {r.location && <span className="text-[9px] font-mono text-cyan-500/70 flex items-center gap-1"><MapPin size={9} /> {r.location}</span>}
                </div>
              </div>
              <button onClick={() => toggle(r)} className={`text-xs font-mono px-2 py-1 rounded ${r.enabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-600 bg-white/5'}`}>
                {r.enabled ? 'ON' : 'OFF'}
              </button>
              <button onClick={() => remove(r.id)} className="text-zinc-500 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ---- Main view -----------------------------------------------------------

export default function SystemCommandCenter(): JSX.Element {
  const { stats, history, loading, error } = useLiveSystemMetrics(3000)

  const cpuHistory = history.map((h) => h.cpu_percent ?? 0)
  const memHistory = history.map((h) => h.mem_percent ?? 0)
  const tempHistory = history.map((h) => h.temp_c ?? 0)

  const cpu = stats ? parseFloat(stats.cpu) : 0
  const mem = stats ? parseFloat(stats.memory.usedPercentage) : 0
  const temp = stats ? stats.temperature : 0
  const memUsed = stats ? (parseFloat(stats.memory.total) - parseFloat(stats.memory.free)).toFixed(1) : '0'
  const memTotal = stats ? stats.memory.total : '0'

  return (
    <div className="h-full w-full flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-widest uppercase text-zinc-100 font-mono">System Command Center</h1>
          <p className="text-[10px] font-mono tracking-widest uppercase text-zinc-500 mt-1">Real-time telemetry · Process control · Proactive routines</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${error ? 'bg-red-500' : 'bg-emerald-500 shadow-[0_0_6px_#10b981]'}`} />
          <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">{error ? 'Error' : loading ? 'Syncing' : 'Live'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RadialGauge value={cpu} label="CPU Load" unit="%" icon={<Cpu size={18} />} color="#00f3ff" />
        <RadialGauge value={mem} label="Memory" unit="%" icon={<MemoryStick size={18} />} color="#39ff14" />
        <RadialGauge value={temp} label="CPU Temp" unit="°C" icon={<Thermometer size={18} />} color="#ff7700" max={100} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${glassPanel} rounded-2xl p-4`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">CPU Trend</span>
            <span className="text-xs font-mono text-cyan-400">{cpu.toFixed(1)}%</span>
          </div>
          <Sparkline data={cpuHistory} color="#00f3ff" />
        </div>
        <div className={`${glassPanel} rounded-2xl p-4`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">Memory Trend</span>
            <span className="text-xs font-mono text-emerald-400">{memUsed} / {memTotal} GB</span>
          </div>
          <Sparkline data={memHistory} color="#39ff14" />
        </div>
        <div className={`${glassPanel} rounded-2xl p-4`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">Temperature Trend</span>
            <span className="text-xs font-mono text-orange-400">{temp.toFixed(1)}°C</span>
          </div>
          <Sparkline data={tempHistory} color="#ff7700" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProcessManager />
        <RoutineManager />
      </div>

      {stats && (
        <div className={`${glassPanel} rounded-2xl p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-emerald-400" />
            <h3 className="text-[11px] font-mono tracking-widest uppercase text-zinc-200">System Info</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div><span className="text-zinc-500">OS:</span> <span className="text-zinc-200">{stats.os.type}</span></div>
            <div><span className="text-zinc-500">Uptime:</span> <span className="text-zinc-200">{stats.os.uptime}</span></div>
            <div><span className="text-zinc-500">Net TX:</span> <span className="text-cyan-400">{stats.network.tx} KB/s</span></div>
            <div><span className="text-zinc-500">Net RX:</span> <span className="text-cyan-400">{stats.network.rx} KB/s</span></div>
            <div><span className="text-zinc-500">Latency:</span> <span className="text-cyan-400">{stats.network.latency}ms</span></div>
            <div><span className="text-zinc-500">Free RAM:</span> <span className="text-emerald-400">{stats.memory.free} GB</span></div>
          </div>
        </div>
      )}
    </div>
  )
}
