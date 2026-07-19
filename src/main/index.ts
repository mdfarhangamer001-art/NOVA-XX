/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { app, shell, BrowserWindow, ipcMain, desktopCapturer, session, protocol, net, dialog } from 'electron'
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

// Safety net: previously an unhandled error/rejection anywhere in the
// main process would silently kill the whole app (Node's default
// behavior), which looked to the user like "the app just fails/closes
// randomly". We now log these instead of dying, so a single bad promise
// or async IPC handler can't take the whole assistant down.
process.on('uncaughtException', (error) => {
  console.error('[NOVA-X Main] Uncaught exception (recovered, app kept running):', error)
})
process.on('unhandledRejection', (reason) => {
  console.error('[NOVA-X Main] Unhandled promise rejection (recovered, app kept running):', reason)
})

let splashWindow: BrowserWindow | null = null

const SPLASH_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Initializing NOVA-X</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #030303;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100vw;
      height: 100vh;
      user-select: none;
      -webkit-app-region: drag;
    }
    canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <canvas id="splashCanvas"></canvas>
  <script>
    const canvas = document.getElementById('splashCanvas');
    const ctx = canvas.getContext('2d');
    
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();
    
    // Particle system
    const particles = [];
    const particleCount = 45;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2
      });
    }
    
    let progress = 0;
    let pulseAngle = 0;
    
    function draw() {
      ctx.fillStyle = 'rgba(3, 3, 3, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Update & draw particles
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        
        ctx.fillStyle = 'rgba(168, 85, 247, ' + p.alpha + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw lines between nearby particles
        for (let j = i + 1; j < particleCount; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 75) {
            ctx.strokeStyle = 'rgba(147, 51, 234, ' + ((1 - dist/75) * 0.15) + ')';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Draw NOVA-X pulsing logo
      pulseAngle += 0.04;
      const scale = 1 + Math.sin(pulseAngle) * 0.03;
      ctx.save();
      ctx.translate(centerX, centerY - 20);
      ctx.scale(scale, scale);
      
      ctx.shadowColor = 'rgba(168, 85, 247, 0.6)';
      ctx.shadowBlur = 15;
      
      ctx.fillStyle = '#ffffff';
      ctx.font = "bold 32px 'Segoe UI', -apple-system, sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.letterSpacing = '8px';
      ctx.fillText('NOVA-X', 4, 0);
      ctx.restore();
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
      ctx.font = "600 10px 'Courier New', Courier, monospace";
      ctx.textAlign = 'center';
      ctx.letterSpacing = '3px';
      ctx.fillText('NEURAL CORE INITIALIZING', centerX, centerY + 30);
      
      if (progress < 1) {
        progress += 0.01;
      }
      const barWidth = 240;
      const barHeight = 2;
      const barX = centerX - barWidth / 2;
      const barY = centerY + 65;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 8;
      ctx.fillRect(barX, barY, barWidth * Math.min(progress, 1), barHeight);
      ctx.shadowBlur = 0;
      
      requestAnimationFrame(draw);
    }
    
    draw();
  </script>
</body>
</html>
`

function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })

  const dataUri = 'data:text/html;charset=UTF-8,' + encodeURIComponent(SPLASH_HTML)
  splashWindow.loadURL(dataUri).catch((err) => {
    console.error('[NOVA-X Splash] Failed to load splash HTML data URI:', err)
  })

  splashWindow.on('closed', () => {
    splashWindow = null
  })
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
      contextIsolation: true,
      devTools: is.dev
    }
  })

  // Extreme Code Protection / Netflix-level security
  if (!is.dev) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
    mainWindow.webContents.on('will-attach-devtools', (event) => {
      event.preventDefault()
    })
  }

  // Reset stable run timer after 10 seconds of active window session
  const stableTimer = setTimeout(() => {
    store.set('gpu_crash_count', 0)
    console.log('[NOVA-X Main] Application running stably. Resetting GPU crash counter.')
  }, 10000)

  mainWindow.on('closed', () => {
    clearTimeout(stableTimer)
  })

  // Listen for render process or GPU crashes to toggle hardware acceleration dynamically
  let crashRecoveryAttempts = 0
  const MAX_CRASH_RECOVERY_ATTEMPTS = 3

  const handleFatalCrash = (source: string, details: any): void => {
    console.error(`[NOVA-X Main] ${source} crashed/gone:`, details)
    const currentCount = (store.get('gpu_crash_count') as number) || 0
    store.set('gpu_crash_count', currentCount + 1)

    if (mainWindow.isDestroyed()) return

    crashRecoveryAttempts++
    if (crashRecoveryAttempts <= MAX_CRASH_RECOVERY_ATTEMPTS) {
      // Previously the app just logged the crash and left the window
      // blank/frozen — user had to force-quit. Now we actually try to
      // recover by reloading the renderer.
      console.warn(
        `[NOVA-X Main] Attempting automatic recovery (attempt ${crashRecoveryAttempts}/${MAX_CRASH_RECOVERY_ATTEMPTS})...`
      )
      setTimeout(() => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.reload()
        }
      }, 500)
    } else {
      // Repeated crashes in the same session — reloading isn't helping,
      // most likely a GPU/driver issue with the 3D UI. Tell the user
      // instead of leaving them staring at a dead window, and make sure
      // the NEXT launch starts with hardware acceleration disabled.
      store.set('disable_gpu', true)
      dialog.showErrorBox(
        'NOVA-X — Display Crashed',
        'The app kept crashing repeatedly, likely due to a graphics driver issue. ' +
        'Hardware acceleration has been disabled for the next launch. Please restart NOVA-X.'
      )
    }
  }

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    handleFatalCrash('Render process', details)
  })

  mainWindow.webContents.on('child-process-gone', (_event, details) => {
    if (details.type === 'GPU-process') {
      handleFatalCrash('GPU process', details)
    }
  })

  let splashClosed = false
  const closeSplash = () => {
    if (splashClosed) return
    splashClosed = true
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close()
      splashWindow = null
    }
  }

  // Minimum splash display time of 1.5 seconds
  const splashMinTimePromise = new Promise((resolve) => setTimeout(resolve, 1500))

  // Hard timeout fallback: force close splash after 5 seconds to prevent getting stuck
  const hardTimeout = setTimeout(() => {
    console.warn('[NOVA-X Splash] Hard timeout fallback reached. Closing splash and activating main window.')
    closeSplash()
    if (!mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.maximize()
      mainWindow.show()
    }
  }, 5000)

  mainWindow.on('ready-to-show', () => {
    splashMinTimePromise.then(() => {
      clearTimeout(hardTimeout)
      closeSplash()
      if (!mainWindow.isDestroyed()) {
        mainWindow.maximize()
        mainWindow.show()
      }
    })
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
  createSplashWindow()

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

  console.log('[NOVA-X Main] Invoking registerSystemHandlers...')
  registerSystemHandlers(ipcMain)
  console.log('[NOVA-X Main] Invoking registerAgentHandlers...')
  registerAgentHandlers()
  console.log('[NOVA-X Main] Invoking registerVisionHandlers...')
  registerVisionHandlers()
  console.log('[NOVA-X Main] Creating window...')
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
