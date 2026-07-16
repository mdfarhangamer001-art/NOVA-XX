/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { app, shell, BrowserWindow, ipcMain, desktopCapturer, session, protocol, net, Tray, Menu, dialog } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { pathToFileURL } from 'url'
import { cpus, totalmem } from 'os'
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

// ---- Low-end / weak-GPU hardware compatibility --------------------------
// Transparent + frameless + fullscreen windows (used by the UI) are GPU
// composited. On low-RAM machines, low core-count CPUs, or old/Intel
// integrated GPUs, this is the #1 cause of a black screen on launch or a
// renderer crash after a few seconds. Instead of requiring the operator to
// manually set NOVA_SAFE_MODE every time, we now:
//   1. Auto-detect likely low-end hardware and enable safe mode by default.
//   2. If the renderer still crashes / fails to load once, automatically
//      relaunch exactly one time in safe mode before giving up and showing
//      a diagnostic dialog (instead of looping forever or just going black).
// None of this touches the UI/renderer code or visual design — it only
// changes how the underlying Chromium process renders.
const LOW_END_MEM_BYTES = 4 * 1024 * 1024 * 1024 // 4GB
const LOW_END_CPU_CORES = 2

const isLikelyLowEndMachine = totalmem() < LOW_END_MEM_BYTES || cpus().length <= LOW_END_CPU_CORES
const forcedSafeMode = process.argv.includes('--nova-safe-mode') || !!process.env['NOVA_SAFE_MODE']
const alreadyAttemptedRecovery = process.argv.includes('--nova-recovered')
const safeModeActive = forcedSafeMode || isLikelyLowEndMachine

if (safeModeActive) {
  console.log(
    `[NOVA-X] Safe mode active (forced=${forcedSafeMode}, lowEndDetected=${isLikelyLowEndMachine}, ` +
      `mem=${(totalmem() / 1024 ** 3).toFixed(1)}GB, cores=${cpus().length}). Disabling hardware acceleration.`
  )
  app.disableHardwareAcceleration()
  // Extra safety net specifically for transparent-window black-screen
  // issues on old/Intel GPUs — falls back to software compositing.
  app.commandLine.appendSwitch('disable-gpu-compositing')
}

// Attempts a single automatic relaunch into safe mode after a real render
// failure. Returns true if it handled the relaunch (caller should stop and
// let the app exit), false if we've already tried that and should instead
// show the operator a diagnostic dialog.
function tryAutoRecoverInSafeMode(): boolean {
  if (safeModeActive || alreadyAttemptedRecovery) {
    return false
  }
  console.warn('[NOVA-X] Renderer failure detected — auto-relaunching once in safe mode.')
  const extraArgs = process.argv.slice(1).filter((a) => a !== '--nova-safe-mode' && a !== '--nova-recovered')
  app.relaunch({ args: [...extraArgs, '--nova-safe-mode', '--nova-recovered'] })
  app.exit(0)
  return true
}
// ---------------------------------------------------------------------

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

  // Fallback in case 'ready-to-show' never fires (seen on some weak/old
  // GPUs where the first paint silently stalls). Forces the window visible
  // instead of leaving the operator staring at nothing indefinitely.
  const readyTimeout = setTimeout(() => {
    if (!mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.warn('[NOVA-X] "ready-to-show" did not fire in time — forcing window visible.')
      mainWindow.show()
    }
  }, 8000)
  mainWindow.once('ready-to-show', () => clearTimeout(readyTimeout))

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
  // signal to the operator. These handlers surface the real cause, and
  // now also attempt one automatic safe-mode recovery before bothering
  // the operator with a dialog.
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(
      `[NOVA-X] Renderer failed to load (code ${errorCode}): ${errorDescription} — url: ${validatedURL}`
    )
    if (tryAutoRecoverInSafeMode()) return
    mainWindow.show()
    dialog.showErrorBox(
      'NOVA-X failed to load its interface',
      `The app window could not load its UI and would otherwise appear as a black screen.\n\n` +
        `Error ${errorCode}: ${errorDescription}\nURL: ${validatedURL}\n\n` +
        `An automatic safe-mode retry already ran and still failed. Most common remaining cause: the renderer ` +
        `was never built (run "npm run build" / "electron-vite build" before packaging), or ` +
        `"out/renderer/index.html" is missing/corrupted. Set NOVA_DEBUG=1 to open DevTools on next launch.`
    )
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[NOVA-X] Renderer process crashed:', details.reason, details.exitCode)
    if (tryAutoRecoverInSafeMode()) return
    dialog.showErrorBox(
      'NOVA-X renderer crashed',
      `The interface process crashed (reason: ${details.reason}). This also shows up as a black screen. ` +
        `An automatic safe-mode retry already ran and it still crashed — this machine's GPU/drivers may need ` +
        `attention. You can also try launching with NOVA_DEBUG=1 to inspect the console.`
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
