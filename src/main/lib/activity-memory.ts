import Store from 'electron-store'

const store = new Store()

export interface ActivityLog {
  timestamp: string
  type: 'camera' | 'screen' | 'system'
  description: string
  metadata?: any
}

export function logActivity(
  type: 'camera' | 'screen' | 'system',
  description: string,
  metadata?: any
) {
  const logs: ActivityLog[] = (store.get('activity_logs') as ActivityLog[]) || []
  const newLog: ActivityLog = {
    timestamp: new Date().toISOString(),
    type,
    description,
    metadata
  }

  // Keep last 1000 logs
  const updatedLogs = [newLog, ...logs].slice(0, 1000)
  store.set('activity_logs', updatedLogs)
  console.log(`[Activity Memory] Logged ${type}: ${description}`)
}

export function getActivityLogs(limit = 20): ActivityLog[] {
  const logs: ActivityLog[] = (store.get('activity_logs') as ActivityLog[]) || []
  return logs.slice(0, limit)
}

export function getRecentActivitySummary(): string {
  const logs = getActivityLogs(10)
  if (logs.length === 0) return 'No recent activity recorded.'

  return logs
    .map(
      (l) =>
        `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.type.toUpperCase()}: ${l.description}`
    )
    .join('\n')
}
