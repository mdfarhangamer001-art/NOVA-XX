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

const SPLASH_HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /><style>
html,body{margin:0;padding:0;width:100%;height:100%;background:#060608;overflow:hidden;font-family:'Segoe UI',Consolas,monospace}
#canvas{position:absolute;top:0;left:0}
.center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;z-index:2}
.logo{font-size:38px;font-weight:700;letter-spacing:9px;color:#00ffc8;text-shadow:0 0 18px rgba(0,255,200,.65),0 0 40px rgba(0,255,200,.25);animation:pulse 1.8s ease-in-out infinite}
.sub{margin-top:10px;font-size:11px;letter-spacing:4px;color:#5ad9c2;opacity:.75}
.bar-track{margin-top:24px;width:240px;height:3px;background:rgba(0,255,200,.12);border-radius:2px;overflow:hidden}
.bar-fill{height:100%;width:0%;background:linear-gradient(90deg,#00ffc8,#00b8ff);box-shadow:0 0 10px rgba(0,255,200,.8);animation:load 1.8s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes load{0%{width:0%}60%{width:85%}100%{width:100%}}
</style></head><body>
<canvas id="canvas"></canvas>
<div class="center"><div class="logo">NOVA-X</div><div class="sub">NEURAL CORE INITIALIZING</div><div class="bar-track"><div class="bar-fill"></div></div></div>
<script>
const c=document.getElementById('canvas'),ctx=c.getContext('2d');
let w=c.width=window.innerWidth,h=c.height=window.innerHeight;
const ps=Array.from({length:50},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.6+.4,vy:Math.random()*.4+.15,a:Math.random()*.6+.2}));
function draw(){ctx.clearRect(0,0,w,h);ctx.fillStyle='#060608';ctx.fillRect(0,0,w,h);for(const p of ps){ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(0,255,200,'+p.a+')';ctx.fill();p.y-=p.vy;if(p.y<0)p.y=h}requestAnimationFrame(draw)}
draw();
window.addEventListener('resize',()=>{w=c.width=window.innerWidth;h=c.height=window.innerHeight});
</script></body></html>`

let splashWindow: BrowserWindow | null = null

function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    center: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      sandbox: true,
      contextIsolation: true
    }
  })
  splashWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(SPLASH_HTML))
  splashWindow.once('ready-to-show', () => {
    splashWindow?.show()
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
      contextIsolation: true
    }
  })

  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools()
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

  const splashShownAt = Date.now()
  mainWindow.on('ready-to-show', () => {
    const elapsed = Date.now() - splashShownAt
    const remaining = Math.max(0, 1400 - elapsed)
    setTimeout(() => {
      mainWindow.maximize()
      mainWindow.show()
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close()
        splashWindow = null
      }
    }, remaining)
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

  createSplashWindow()
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
