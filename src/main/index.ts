/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { app, shell, BrowserWindow, ipcMain, desktopCapturer, session, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import icon from '../../resources/icon.png?asset'
import registerSystemHandlers from './lib/system'
import { registerAgentHandlers } from './lib/agent'
import { registerVisionHandlers } from './lib/vision'

const store = new Store()

// Automatic GPU crash detection & fallback
const gpuCrashCount = (store.get('gpu_crash_count') as number) || 0
const disableGpuFlag = store.get('disable_gpu') === true

if (disableGpuFlag || gpuCrashCount >= 2) {
  console.warn('[NOVA-X Main] Disabling hardware acceleration due to previous crashes or settings.')
  app.disableHardwareAcceleration()
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    backgroundColor: '#000000',
    transparent: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true
    }
  })

  // Reset stable run timer after 10 seconds of active window session
  const stableTimer = setTimeout(() => {
    store.set('gpu_crash_count', 0)
    console.log('[NOVA-X Main] Application running stably. Resetting GPU crash counter.')
  }, 10000)

  mainWindow.on('closed', () => {
    clearTimeout(stableTimer)
  })

  // Listen for render process or GPU crashes to toggle hardware acceleration dynamically
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[NOVA-X Main] Render process crashed/gone:', details)
    const currentCount = (store.get('gpu_crash_count') as number) || 0
    store.set('gpu_crash_count', currentCount + 1)
  })

  mainWindow.webContents.on('child-process-gone', (_event, details) => {
    if (details.type === 'GPU-process') {
      console.error('[NOVA-X Main] GPU process crashed/gone:', details)
      const currentCount = (store.get('gpu_crash_count') as number) || 0
      store.set('gpu_crash_count', currentCount + 1)
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Restrict permissions to trusted local application origins to prevent external exploits.
  // Since NOVA-X requires media (camera, microphone) and display permissions for its core AI operations,
  // we allow them only for our trusted local file protocol, media stream protocol, or local development URL.
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const url = webContents.getURL()
    const devUrl = process.env['ELECTRON_RENDERER_URL'] || ''
    const isTrusted = url.startsWith('file://') || 
                      url.startsWith('http://localhost') || 
                      url.startsWith('media://') || 
                      url.includes('127.0.0.1') ||
                      (devUrl && url.startsWith(devUrl))
    
    if (isTrusted) {
      callback(true)
    } else {
      console.warn(`[NOVA-X Security] Blocked permission request '${permission}' for untrusted external origin: ${url}`)
      callback(false)
    }
  })

  session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    const devUrl = process.env['ELECTRON_RENDERER_URL'] || ''
    const isTrusted = requestingOrigin.startsWith('file://') || 
                      requestingOrigin.startsWith('http://localhost') || 
                      requestingOrigin.startsWith('media://') || 
                      requestingOrigin.includes('127.0.0.1') ||
                      requestingOrigin === 'null' || // Electron file protocol sometimes reports null origin
                      (devUrl && requestingOrigin.startsWith(devUrl))
    return isTrusted
  })

  session.defaultSession.setDisplayMediaRequestHandler((_request: any, callback: any) => {
    desktopCapturer
      .getSources({ types: ['screen'] })
      .then((sources) => {
        if (sources && sources.length > 0) {
          callback({ video: sources[0] })
        } else {
          console.error('[NOVA-X] No screens found to share.')
          // @ts-ignore - explicitly fail the callback safely
          callback()
        }
      })
      .catch((err) => {
        console.error('[NOVA-X] Screen capture failed:', err)
        // @ts-ignore
        callback()
      })
  })

  protocol.handle('media', (request) => {
    const filePath = decodeURIComponent(request.url.replace('media://', ''))
    return net.fetch(pathToFileURL(filePath).toString())
  })

  registerSystemHandlers(ipcMain)
  registerAgentHandlers()
  registerVisionHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
