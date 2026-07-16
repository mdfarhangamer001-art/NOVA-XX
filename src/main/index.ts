/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { app, shell, BrowserWindow, ipcMain, desktopCapturer, session, protocol, net, Tray, Menu, dialog } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import registerSystemHandlers from './lib/system'
import { registerAgentHandlers } from './lib/agent'
import { registerVisionHandlers } from './lib/vision'
import { registerWallpaperHandlers } from './lib/wallpaper'
import { registerSpeechHandlers } from './lib/speech'
import { registerScreenPeelerHandlers, unregisterScreenPeelerShortcuts } from './lib/screenPeeler'

let tray: Tray | null = null
let mainWindowRef: BrowserWindow | null = null
// Set once the operator explicitly quits from the tray menu, so the
// window-all-closed / close handlers know not to just hide the window.
let isQuitting = false

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    fullscreen: true,
    autoHideMenuBar: true,
    frame: false,
    transparent: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindowRef = mainWindow

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Instead of quitting, hide to the system tray so the wake-word
  // engine (which only runs while the window is alive) can keep
  // listening in the background and bring IRIS back on command.
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // ---- Black-screen diagnostics -------------------------------------
  // With transparent:true + frame:false, any load failure or renderer
  // crash previously showed as an unexplained black window with zero
  // signal to the operator. These handlers surface the real cause.
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(
      `[NOVA-X] Renderer failed to load (code ${errorCode}): ${errorDescription} — url: ${validatedURL}`
    )
    mainWindow.show()
    dialog.showErrorBox(
      'NOVA-X failed to load its interface',
      `The app window could not load its UI and would otherwise appear as a black screen.\n\n` +
        `Error ${errorCode}: ${errorDescription}\nURL: ${validatedURL}\n\n` +
        `Most common cause: the renderer was never built (run "npm run build" / "electron-vite build" before packaging), ` +
        `or "out/renderer/index.html" is missing/corrupted. Set NOVA_DEBUG=1 to auto-open DevTools on next launch.`
    )
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[NOVA-X] Renderer process crashed:', details.reason, details.exitCode)
    dialog.showErrorBox(
      'NOVA-X renderer crashed',
      `The interface process crashed (reason: ${details.reason}). This also shows up as a black screen. ` +
        `If this keeps happening, try launching with NOVA_DEBUG=1 to inspect the console, or with ` +
        `NOVA_SAFE_MODE=1 to disable GPU/hardware acceleration (helps on some Intel/older GPU drivers).`
    )
  })

  mainWindow.webContents.on('unresponsive', () => {
    console.warn('[NOVA-X] Renderer became unresponsive.')
  })

  if (process.env['NOVA_DEBUG']) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }
  // ---------------------------------------------------------------------

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    const rendererPath = join(__dirname, '../renderer/index.html')
    if (!existsSync(rendererPath)) {
      console.error(`[NOVA-X] Renderer build not found at: ${rendererPath}`)
      mainWindow.show()
      dialog.showErrorBox(
        'NOVA-X build is missing',
        `Expected the built UI at:\n${rendererPath}\n\nbut it does not exist. This is why you saw a black screen — ` +
          `there was nothing to load. Run "npm run build:electron" (or your dist script) first so the renderer ` +
          `is compiled into /out before starting the app.`
      )
      return
    }
    mainWindow.loadFile(rendererPath)
  }
}


function showAndFocusWindow(): void {
  if (!mainWindowRef || mainWindowRef.isDestroyed()) {
    createWindow()
    return
  }
  if (mainWindowRef.isMinimized()) mainWindowRef.restore()
  mainWindowRef.show()
  mainWindowRef.focus()
}

function createTray(): void {
  tray = new Tray(icon)
  tray.setToolTip('NOVA-X — listening for "Hey IRIS"')
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show NOVA-X', click: () => showAndFocusWindow() },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
  tray.setContextMenu(contextMenu)
  tray.on('click', () => showAndFocusWindow())
}

// Transparent, GPU-composited windows are the single most common cause of a
// black screen on first launch on laptops with older/Intel integrated GPUs
// or outdated drivers. NOVA_SAFE_MODE=1 lets the operator rule this in/out
// without editing code.
if (process.env['NOVA_SAFE_MODE']) {
  app.disableHardwareAcceleration()
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
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
  registerWallpaperHandlers()
  registerSpeechHandlers()
  registerScreenPeelerHandlers(() => mainWindowRef)
  createWindow()
  createTray()

  ipcMain.removeAllListeners('focus-window')
  ipcMain.on('focus-window', () => showAndFocusWindow())

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else showAndFocusWindow()
  })
})

app.on('before-quit', () => {
  isQuitting = true
  unregisterScreenPeelerShortcuts()
})

app.on('window-all-closed', () => {
  // Windows/Linux: keep the process alive in the tray so the wake-word
  // listener can still bring IRIS back. macOS already behaves this way
  // by convention (dock icon stays, app doesn't quit).
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit()
  }
})
