import { app, IpcMain } from 'electron'
import { execFile } from 'child_process'
import fs from 'fs'
import path from 'path'

interface DeviceHistoryEntry {
  ip: string
  port: string
  lastConnected: string
}

let connectedTarget: string | null = null

const historyPath = (): string => path.join(app.getPath('userData'), 'adb-history.json')

function runAdb(
  args: string[],
  binary = false
): Promise<{ ok: boolean; stdout: string | Buffer; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      'adb',
      args,
      { encoding: binary ? 'buffer' : 'utf-8', maxBuffer: 1024 * 1024 * 25, timeout: 15000 } as any,
      (error, stdout: any, stderr: any) => {
        if (error) {
          resolve({
            ok: false,
            stdout: binary ? Buffer.alloc(0) : '',
            stderr: stderr?.toString() || error.message
          })
        } else {
          resolve({ ok: true, stdout, stderr: stderr?.toString() || '' })
        }
      }
    )
  })
}

function targetedArgs(args: string[]): string[] {
  return connectedTarget ? ['-s', connectedTarget, ...args] : args
}

function readHistory(): DeviceHistoryEntry[] {
  try {
    if (!fs.existsSync(historyPath())) return []
    return JSON.parse(fs.readFileSync(historyPath(), 'utf-8'))
  } catch {
    return []
  }
}

function writeHistory(list: DeviceHistoryEntry[]): void {
  fs.mkdirSync(path.dirname(historyPath()), { recursive: true })
  fs.writeFileSync(historyPath(), JSON.stringify(list, null, 2))
}

export async function adbConnect(
  _event: unknown,
  payload: { ip: string; port: string }
): Promise<{ success: boolean; error?: string }> {
  const { ip, port } = payload || ({} as any)
  if (!ip || !port) return { success: false, error: 'IP and Port are required.' }

  const target = `${ip}:${port}`
  const res = await runAdb(['connect', target])
  const output = typeof res.stdout === 'string' ? res.stdout : ''

  const succeeded = res.ok && (output.includes('connected to') || output.includes('already connected'))
  if (!succeeded) {
    return {
      success: false,
      error:
        output ||
        res.stderr ||
        "ADB not found or connection refused. Make sure 'adb' is installed and in PATH, and run 'adb tcpip 5555' on the phone first."
    }
  }

  connectedTarget = target
  const history = readHistory().filter((d) => !(d.ip === ip && d.port === port))
  history.push({ ip, port, lastConnected: new Date().toISOString() })
  writeHistory(history)

  return { success: true }
}

export async function adbDisconnect(): Promise<{ success: boolean }> {
  if (connectedTarget) {
    await runAdb(['disconnect', connectedTarget])
  } else {
    await runAdb(['disconnect'])
  }
  connectedTarget = null
  return { success: true }
}

export async function adbGetHistory(): Promise<DeviceHistoryEntry[]> {
  return readHistory()
}

export async function adbGetNotifications(): Promise<{ success: boolean; data: string[] }> {
  const res = await runAdb(targetedArgs(['shell', 'dumpsys', 'notification', '--noredact']))
  if (!res.ok || typeof res.stdout !== 'string') return { success: false, data: [] }

  const matches = Array.from(res.stdout.matchAll(/android\.title=(?:String \()?([^)\n]+)\)?/g))
  const titles = matches.map((m) => m[1].trim()).filter(Boolean)
  const unique = Array.from(new Set(titles)).slice(-10)

  return { success: true, data: unique }
}

export async function adbQuickAction(
  _event: unknown,
  payload: { action: 'camera' | 'wake' | 'lock' | 'home' }
): Promise<{ success: boolean; error?: string }> {
  const keyMap: Record<string, string> = { camera: '27', lock: '26', wake: '224', home: '3' }
  const key = keyMap[payload?.action]
  if (!key) return { success: false, error: 'Unknown quick action.' }

  const res = await runAdb(targetedArgs(['shell', 'input', 'keyevent', key]))
  return { success: res.ok }
}

export async function adbTelemetry(): Promise<{ success: boolean; data?: any; error?: string }> {
  const [modelRes, versionRes, batteryRes, storageRes] = await Promise.all([
    runAdb(targetedArgs(['shell', 'getprop', 'ro.product.model'])),
    runAdb(targetedArgs(['shell', 'getprop', 'ro.build.version.release'])),
    runAdb(targetedArgs(['shell', 'dumpsys', 'battery'])),
    runAdb(targetedArgs(['shell', 'df', '/data']))
  ])

  if (!modelRes.ok) {
    return { success: false, error: 'Device not reachable. Reconnect and try again.' }
  }

  const batteryText = typeof batteryRes.stdout === 'string' ? batteryRes.stdout : ''
  const levelMatch = batteryText.match(/level:\s*(\d+)/)
  const tempMatch = batteryText.match(/temperature:\s*(\d+)/)
  const statusMatch = batteryText.match(/status:\s*(\d+)/)

  const level = levelMatch ? parseInt(levelMatch[1], 10) : 0
  const temp = tempMatch ? (parseInt(tempMatch[1], 10) / 10).toFixed(1) : '0.0'
  const isCharging = statusMatch ? statusMatch[1] === '2' : false

  const storageText = typeof storageRes.stdout === 'string' ? storageRes.stdout : ''
  const storageLine = storageText.split('\n').find((l) => l.includes('/data'))
  const cols = storageLine ? storageLine.trim().split(/\s+/) : []
  const totalKb = parseInt(cols[1] || '0', 10)
  const usedKb = parseInt(cols[2] || '0', 10)
  const totalGb = totalKb ? (totalKb / (1024 * 1024)).toFixed(1) : '0'
  const usedGb = usedKb ? (usedKb / (1024 * 1024)).toFixed(1) : '0'
  const percent = totalKb ? Math.round((usedKb / totalKb) * 100) : 0

  return {
    success: true,
    data: {
      model: (typeof modelRes.stdout === 'string' ? modelRes.stdout : '').trim() || 'UNKNOWN DEVICE',
      os: `ANDROID ${(typeof versionRes.stdout === 'string' ? versionRes.stdout : '').trim() || '--'}`,
      battery: { level, isCharging, temp },
      storage: { used: `${usedGb} GB`, total: `${totalGb} GB TOTAL`, percent }
    }
  }
}

export async function adbScreenshot(): Promise<{ success: boolean; image?: string }> {
  const res = await runAdb(targetedArgs(['exec-out', 'screencap', '-p']), true)
  const buf = res.stdout as Buffer
  if (!res.ok || !buf || buf.length === 0) return { success: false }

  return { success: true, image: `data:image/png;base64,${buf.toString('base64')}` }
}

export default function registerAdbHandlers(ipcMain: IpcMain): void {
  ipcMain.removeHandler('adb-connect')
  ipcMain.handle('adb-connect', adbConnect)

  ipcMain.removeHandler('adb-disconnect')
  ipcMain.handle('adb-disconnect', adbDisconnect)

  ipcMain.removeHandler('adb-get-history')
  ipcMain.handle('adb-get-history', adbGetHistory)

  ipcMain.removeHandler('adb-get-notifications')
  ipcMain.handle('adb-get-notifications', adbGetNotifications)

  ipcMain.removeHandler('adb-quick-action')
  ipcMain.handle('adb-quick-action', adbQuickAction)

  ipcMain.removeHandler('adb-telemetry')
  ipcMain.handle('adb-telemetry', adbTelemetry)

  ipcMain.removeHandler('adb-screenshot')
  ipcMain.handle('adb-screenshot', adbScreenshot)
    }
