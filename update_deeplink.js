const fs = require('fs')
const path = require('path')
const file = path.join(__dirname, 'src/main/index.ts')
let content = fs.readFileSync(file, 'utf8')

// Add deep link handling
const customProtocol = `
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('novax', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('novax')
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      const url = commandLine.pop()
      if (url && url.startsWith('novax://')) {
        mainWindow.webContents.send('handle-deep-link', url)
      }
    }
  })
}

app.on('open-url', (event, url) => {
  event.preventDefault()
  if (url && url.startsWith('novax://')) {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('handle-deep-link', url)
    }
  }
})
`

// insert customProtocol before app.whenReady()
content = content.replace('app.whenReady()', customProtocol + '\napp.whenReady()')

fs.writeFileSync(file, content, 'utf8')
