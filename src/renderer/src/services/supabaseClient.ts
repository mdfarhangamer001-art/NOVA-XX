import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[IRIS Supabase] Missing env vars — cognitive persistence disabled.')
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: { persistSession: false }
})

export interface ConversationRow {
  id: string
  role: 'user' | 'model' | 'system'
  content: string
  mood: string | null
  turn_id: string
  created_at: string
}

export interface SystemMetricRow {
  id: string
  cpu_percent: number | null
  mem_percent: number | null
  mem_used_mb: number | null
  mem_total_mb: number | null
  temp_c: number | null
  process_count: number | null
  load_avg: number | null
  created_at: string
}

export interface ProcessRow {
  id: string
  name: string
  pid: number | null
  status: 'running' | 'stopped' | 'error'
  cpu_percent: number | null
  mem_mb: number | null
  command: string | null
  created_at: string
  updated_at: string
}

export interface RoutineRow {
  id: string
  title: string
  trigger: string | null
  action: string
  time_hint: string | null
  location: string | null
  enabled: boolean
  last_fired: string | null
  created_at: string
  updated_at: string
}

// ---- Conversation memory -------------------------------------------------

export async function saveConversationTurn(
  role: 'user' | 'model' | 'system',
  content: string,
  mood: string | null,
  turnId: string
): Promise<void> {
  if (!supabaseUrl) return
  const { error } = await supabase
    .from('conversations')
    .insert({ role, content, mood, turn_id: turnId })
  if (error) console.error('[IRIS Supabase] saveConversationTurn failed:', error.message)
}

export async function loadRecentContext(limit = 12): Promise<ConversationRow[]> {
  if (!supabaseUrl) return []
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[IRIS Supabase] loadRecentContext failed:', error.message)
    return []
  }
  return (data ?? []).reverse() as ConversationRow[]
}

// ---- System metrics ------------------------------------------------------

export async function saveSystemMetric(metric: {
  cpu_percent: number
  mem_percent: number
  mem_used_mb: number
  mem_total_mb: number
  temp_c: number
  process_count: number
  load_avg: number
}): Promise<void> {
  if (!supabaseUrl) return
  const { error } = await supabase.from('system_metrics').insert(metric)
  if (error) console.error('[IRIS Supabase] saveSystemMetric failed:', error.message)
}

export async function loadMetricHistory(limit = 60): Promise<SystemMetricRow[]> {
  if (!supabaseUrl) return []
  const { data, error } = await supabase
    .from('system_metrics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[IRIS Supabase] loadMetricHistory failed:', error.message)
    return []
  }
  return (data ?? []).reverse() as SystemMetricRow[]
}

// ---- Processes ------------------------------------------------------------

export async function loadProcesses(): Promise<ProcessRow[]> {
  if (!supabaseUrl) return []
  const { data, error } = await supabase
    .from('processes')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) {
    console.error('[IRIS Supabase] loadProcesses failed:', error.message)
    return []
  }
  return (data ?? []) as ProcessRow[]
}

export async function upsertProcess(p: {
  id?: string
  name: string
  pid?: number | null
  status: 'running' | 'stopped' | 'error'
  cpu_percent?: number | null
  mem_mb?: number | null
  command?: string | null
}): Promise<ProcessRow | null> {
  if (!supabaseUrl) return null
  const payload = {
    ...p,
    updated_at: new Date().toISOString()
  }
  const { data, error } = await supabase.from('processes').upsert(payload).select().maybeSingle()
  if (error) {
    console.error('[IRIS Supabase] upsertProcess failed:', error.message)
    return null
  }
  return data as ProcessRow | null
}

export async function deleteProcess(id: string): Promise<void> {
  if (!supabaseUrl) return
  const { error } = await supabase.from('processes').delete().eq('id', id)
  if (error) console.error('[IRIS Supabase] deleteProcess failed:', error.message)
}

// ---- Routines ------------------------------------------------------------

export async function loadRoutines(): Promise<RoutineRow[]> {
  if (!supabaseUrl) return []
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[IRIS Supabase] loadRoutines failed:', error.message)
    return []
  }
  return (data ?? []) as RoutineRow[]
}

export async function upsertRoutine(r: {
  id?: string
  title: string
  trigger?: string | null
  action: string
  time_hint?: string | null
  location?: string | null
  enabled?: boolean
}): Promise<RoutineRow | null> {
  if (!supabaseUrl) return null
  const payload = {
    ...r,
    updated_at: new Date().toISOString()
  }
  const { data, error } = await supabase.from('routines').upsert(payload).select().maybeSingle()
  if (error) {
    console.error('[IRIS Supabase] upsertRoutine failed:', error.message)
    return null
  }
  return data as RoutineRow | null
}

export async function deleteRoutine(id: string): Promise<void> {
  if (!supabaseUrl) return
  const { error } = await supabase.from('routines').delete().eq('id', id)
  if (error) console.error('[IRIS Supabase] deleteRoutine failed:', error.message)
}

export async function markRoutineFired(id: string): Promise<void> {
  if (!supabaseUrl) return
  const { error } = await supabase
    .from('routines')
    .update({ last_fired: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) console.error('[IRIS Supabase] markRoutineFired failed:', error.message)
}
