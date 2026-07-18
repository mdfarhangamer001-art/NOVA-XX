import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI & {
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>
        send(channel: string, ...args: any[]): void
        on(channel: string, func: (...args: any[]) => void): () => void
      }
    }
    api: unknown
    iris: {
      sendVisionFrame(base64Frame: string): Promise<any>
      adbConnect(ip: string, port: string): Promise<{ success: boolean; error?: string }>
      adbDisconnect(): Promise<{ success: boolean; error?: string }>
      adbTelemetry(): Promise<{
        success: boolean
        error?: string
        data?: {
          model: string
          os: string
          battery: { level: number; isCharging: boolean; temp: string }
          storage: { used: string; total: string; percent: number }
        }
      }>
      adbQuickAction(action: 'wake' | 'lock' | 'home' | 'camera'): Promise<{ success: boolean; error?: string }>
    }
  }
}
