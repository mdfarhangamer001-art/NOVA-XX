import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI & {
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>
        send(channel: string, ...args: any[]): void
        on(channel: string, func: (...args: any[]) => void): () => void
        off(channel: string, func: (...args: any[]) => void): void
      }
    }
    api: unknown
    iris: {
      sendVisionFrame(base64Frame: string): Promise<any>
      transcribeAudio(base64Audio: string, mimeType: string): Promise<any>
      getMemories(): Promise<any>
      deleteMemory(index: number): Promise<any>
      launchApp(appName: string): Promise<any>
      adbConnect(ip: string, port: string): Promise<any>
      adbDisconnect(): Promise<any>
      adbTelemetry(): Promise<any>
      adbQuickAction(action: string): Promise<any>
      onTranscript(callback: (data: { role: string; text: string; isFinal: boolean }) => void): void
      onTranscriptComplete(callback: () => void): void
    }
  }
}