import { useEffect, useState, useCallback } from 'react'
import { getSystemStatus, type SystemStats } from '../services/system-info'
import { saveSystemMetric, loadMetricHistory, type SystemMetricRow } from '../services/supabaseClient'

export interface LiveSystemState {
  stats: SystemStats | null
  history: SystemMetricRow[]
  loading: boolean
  error: string | null
  refresh: () => void
}

// Polls system stats via IPC and persists snapshots to Supabase for history.
export function useLiveSystemMetrics(intervalMs = 3000): LiveSystemState {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [history, setHistory] = useState<SystemMetricRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const s = await getSystemStatus()
      if (s) {
        setStats(s)
        setError(null)

        const memTotalMb = parseFloat(s.memory.total) * 1024
        const memUsedMb = (parseFloat(s.memory.total) - parseFloat(s.memory.free)) * 1024
        const memPct = parseFloat(s.memory.usedPercentage)
        const cpuPct = parseFloat(s.cpu)

        await saveSystemMetric({
          cpu_percent: cpuPct,
          mem_percent: memPct,
          mem_used_mb: memUsedMb,
          mem_total_mb: memTotalMb,
          temp_c: s.temperature,
          process_count: 0,
          load_avg: 0
        })

        const hist = await loadMetricHistory(60)
        setHistory(hist)
      } else if (!window.electron?.ipcRenderer) {
        // Browser dev fallback: synthesize plausible values so the UI is testable
        const synth: SystemStats = {
          cpu: (20 + Math.random() * 40).toFixed(1),
          memory: {
            total: '16.0',
            free: '8.0',
            usedPercentage: (40 + Math.random() * 30).toFixed(1)
          },
          temperature: 45 + Math.random() * 15,
          os: { type: 'WEB', uptime: '0h' },
          network: { tx: 10, rx: 20, latency: 25 }
        }
        setStats(synth)
        const hist = await loadMetricHistory(60)
        setHistory(hist)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Telemetry error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, intervalMs)
    return () => clearInterval(id)
  }, [refresh, intervalMs])

  return { stats, history, loading, error, refresh }
}
