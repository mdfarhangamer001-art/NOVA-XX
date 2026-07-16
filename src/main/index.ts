import { app, shell, BrowserWindow, ipcMain, desktopCapturer, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// यहाँ पाथ अपडेट किए गए हैं ताकि वे renderer/src/views/ को पॉइंट करें
import registerAppHandlers from '../renderer/src/views/APP'
import registerAgentsHandlers from '../renderer/src/views/Agents'
import registerGalleryHandlers from '../renderer/src/views/Gallery'
import registerNotesHandlers from '../renderer/src/views/Notes'
import registerPhoneHandlers from '../renderer/src/views/Phone'
import registerSettingsHandlers from '../renderer/src/views/Settings'
import registerGoogleAuthHandlers from '../renderer/src/views/google-auth'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
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

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
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

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // हैंडलर्स अब सही पाथ से रजिस्टर होंगे
  registerAppHandlers(ipcMain)
  registerAgentsHandlers(ipcMain)
  registerGalleryHandlers(ipcMain)
  registerNotesHandlers(ipcMain)
  registerPhoneHandlers(ipcMain)
  registerSettingsHandlers(ipcMain)
  registerGoogleAuthHandlers(ipcMain)

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
