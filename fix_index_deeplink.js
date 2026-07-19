const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/main/index.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `mainWindow.webContents.send('handle-deep-link', url)`,
  `ipcMain.emit('oauth-callback', null, url)`
);

content = content.replace(
  `mainWindow.webContents.send('handle-deep-link', url)`,
  `ipcMain.emit('oauth-callback', null, url)`
);

fs.writeFileSync(file, content, 'utf8');
