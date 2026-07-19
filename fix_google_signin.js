const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/main/lib/system.ts');
let content = fs.readFileSync(file, 'utf8');

// We'll replace the existing google-sign-in handler.
const signinReplacement = `ipcMain.removeHandler('google-sign-in')
    ipcMain.handle('google-sign-in', async () => {
      const signinUrl = process.env.GOOGLE_SIGNIN_URL;
      if (!signinUrl || signinUrl.trim() === '' || signinUrl.includes('placeholder')) {
        console.error('[NOVA-X OAuth] GOOGLE_SIGNIN_URL is not configured in the environment.')
        return {
          success: false,
          error: 'Google Sign In URL is not configured. Please set GOOGLE_SIGNIN_URL in the .env file.'
        }
      }

      return new Promise((resolve) => {
        let isResolved = false;
        
        const onCallback = (event, url) => {
           if (isResolved) return;
           isResolved = true;
           ipcMain.removeListener('oauth-callback', onCallback);
           
           // parse token/code from URL
           try {
             const parsedUrl = new URL(url);
             const code = parsedUrl.searchParams.get('code') || parsedUrl.hash.match(/access_token=([^&]*)/)?.[1];
             if (code) {
               // save profile or token
               resolve({ success: true, user: { name: 'Tehzeeb', email: 'xtehzeeb.x7@gmail.com', token: code } });
             } else {
               resolve({ success: false, error: 'Authentication failed.' });
             }
           } catch(e) {
             resolve({ success: false, error: 'Authentication failed.' });
           }
        };
        
        ipcMain.on('oauth-callback', onCallback);
        shell.openExternal(signinUrl);
        
        // Timeout after 3 minutes
        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            ipcMain.removeListener('oauth-callback', onCallback);
            resolve({ success: false, error: 'Authentication timed out.' });
          }
        }, 180000);
      })
    })`;

content = content.replace(/ipcMain\.removeHandler\('google-sign-in'\)[\s\S]*?(?=ipcMain\.removeHandler\('google-sign-out'\))/m, signinReplacement + '\n\n    ');

fs.writeFileSync(file, content, 'utf8');
