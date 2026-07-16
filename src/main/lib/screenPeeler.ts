/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrowserWindow, ipcMain, desktopCapturer, screen, clipboard, globalShortcut } from 'electron'
import { GoogleGenAI } from '@google/genai'
import { getGeminiApiKey } from './apiKey'

let overlayWindow: BrowserWindow | null = null

/**
 * Self-contained overlay UI (vanilla JS, no bundler dependency). Lets the
 * operator drag a rectangle over any part of the screen. On mouseup it
 * reports the region back to the main process via IPC.
 */
const OVERLAY_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; cursor: crosshair; background: rgba(0,0,0,0.15); overflow: hidden; }
  #hint {
    position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
    font-family: -apple-system, Segoe UI, sans-serif; font-size: 13px; letter-spacing: 0.05em;
    color: #d1fae5; background: rgba(0,0,0,0.55); padding: 8px 18px; border-radius: 999px;
    border: 1px solid rgba(16,185,129,0.4); text-transform: uppercase; pointer-events: none;
  }
  #box {
    position: fixed; border: 2px solid #10b981; background: rgba(16,185,129,0.12);
    box-shadow: 0 0 0 9999px rgba(0,0,0,0.35); display: none;
  }
</style>
</head>
<body>
  <div id="hint">Drag to select a region &middot; Esc to cancel</div>
  <div id="box"></div>
  <script>
    const { ipcRenderer } = require('electron')
    const box = document.getElementById('box')
    let startX = 0, startY = 0, dragging = false

    document.addEventListener('mousedown', (e) => {
      dragging = true
      startX = e.clientX
      startY = e.clientY
      box.style.left = startX + 'px'
      box.style.top = startY + 'px'
      box.style.width = '0px'
      box.style.height = '0px'
      box.style.display = 'block'
    })

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return
      const x = Math.min(e.clientX, startX)
      const y = Math.min(e.clientY, startY)
      const w = Math.abs(e.clientX - startX)
      const h = Math.abs(e.clientY - startY)
      box.style.left = x + 'px'
      box.style.top = y + 'px'
      box.style.width = w + 'px'
      box.style.height = h + 'px'
    })

    document.addEventListener('mouseup', (e) => {
      if (!dragging) return
      dragging = false
      const rect = {
        x: Math.min(e.clientX, startX),
        y: Math.min(e.clientY, startY),
        width: Math.abs(e.clientX - startX),
        height: Math.abs(e.clientY - startY)
      }
      if (rect.width < 5 || rect.height < 5) {
        ipcRenderer.send('screen-peel-cancel')
      } else {
        ipcRenderer.send('screen-peel-region', rect)
      }
    })

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') ipcRenderer.send('screen-peel-cancel')
    })
  </script>
</body>
</html>
`

function closeOverlay(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close()
  }
  overlayWindow = null
}

function openOverlay(): void {
  if (overlayWindow) return

  const display = screen.getPrimaryDisplay()

  overlayWindow = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    fullscreenable: false,
    webPreferences: {
      // Trusted, fully local inline content only — never loads remote pages.
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false
    }
  })

  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(OVERLAY_HTML)}`)

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })
}

async function captureRegionAsDataUrl(rect: {
  x: number
  y: number
  width: number
  height: number
}): Promise<string> {
  const display = screen.getPrimaryDisplay()
  const scaleFactor = display.scaleFactor || 1

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.round(display.size.width * scaleFactor),
      height: Math.round(display.size.height * scaleFactor)
    }
  })

  const source = sources[0]
  if (!source) throw new Error('No screen source available to capture.')

  const cropped = source.thumbnail.crop({
    x: Math.round(rect.x * scaleFactor),
    y: Math.round(rect.y * scaleFactor),
    width: Math.round(rect.width * scaleFactor),
    height: Math.round(rect.height * scaleFactor)
  })

  return cropped.toDataURL()
}

async function runOcrOnDataUrl(dataUrl: string): Promise<string> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    throw new Error('Gemini API Key is missing. Please set it in Settings > API Vault.')
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  })

  const [meta, rawBase64] = dataUrl.split(';base64,')
  const mimeType = meta.replace('data:', '') || 'image/png'

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: [
      { inlineData: { data: rawBase64, mimeType } },
      'Extract ALL text visible in this image verbatim, preserving line breaks. Return ONLY the extracted text with no commentary, headers, or markdown formatting. If there is no readable text, respond with exactly: NO_TEXT_FOUND.'
    ]
  })

  return (response.text || '').trim()
}

export function registerScreenPeelerHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.removeHandler('start-screen-peel')
  ipcMain.handle('start-screen-peel', async () => {
    openOverlay()
    return { success: true }
  })

  ipcMain.removeAllListeners('screen-peel-cancel')
  ipcMain.on('screen-peel-cancel', () => {
    closeOverlay()
    const win = getMainWindow()
    win?.webContents.send('screen-peel-result', { success: false, cancelled: true })
  })

  ipcMain.removeAllListeners('screen-peel-region')
  ipcMain.on('screen-peel-region', async (_event, rect) => {
    closeOverlay()
    const win = getMainWindow()
    try {
      const dataUrl = await captureRegionAsDataUrl(rect)
      const text = await runOcrOnDataUrl(dataUrl)

      if (text && text !== 'NO_TEXT_FOUND') {
        clipboard.writeText(text)
      }

      win?.webContents.send('screen-peel-result', {
        success: true,
        text: text === 'NO_TEXT_FOUND' ? '' : text,
        copiedToClipboard: !!text && text !== 'NO_TEXT_FOUND'
      })
    } catch (err: any) {
      console.error('[NOVA-X Screen Peeler] OCR failed:', err)
      win?.webContents.send('screen-peel-result', { success: false, error: err.message })
    }
  })

  // Global hotkey per the README: Ctrl+Alt+X triggers Screen Peeler from anywhere.
  try {
    globalShortcut.register('Control+Alt+X', () => {
      openOverlay()
    })
  } catch (err) {
    console.warn('[NOVA-X Screen Peeler] Failed to register global shortcut:', err)
  }
}

export function unregisterScreenPeelerShortcuts(): void {
  globalShortcut.unregister('Control+Alt+X')
}
