import { app, shell, BrowserWindow, ipcMain, desktopCapturer, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import registerAppHandlers from './lib/APP'
import registerAgentsHandlers from './lib/Agents'
import registerGalleryHandlers from './lib/Gallery'
import registerNotesHandlers from './lib/Notes'
import registerPhoneHandlers from './lib/Phone'
import registerSettingsHandlers from './lib/Settings'
import registerGoogleAuthHandlers from './lib/google-auth'

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
