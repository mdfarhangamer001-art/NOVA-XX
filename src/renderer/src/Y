import { app, shell, safeStorage, IpcMain } from 'electron'
import http from 'http'
import https from 'https'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

/**
 * ================== SETUP REQUIRED ==================
 * 1. Go to https://console.cloud.google.com/apis/credentials
 * 2. Create Credentials -> OAuth Client ID -> Application type: "Desktop app"
 * 3. Copy the Client ID (and Client Secret) below.
 * No redirect URI needs to be registered for "Desktop app" clients — Google
 * automatically allows the http://127.0.0.1:<any-port>/callback loopback.
 * ======================================================
 */
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
const GOOGLE_CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET'

const SCOPES = ['openid', 'email', 'profile']

interface GoogleProfile {
  email: string
  name: string
  picture: string
}

interface StoredAuth {
  accessToken: string
  refreshToken: string | null
  expiresAt: number
  profile: GoogleProfile
}

const authPath = (): string => path.join(app.getPath('userData'), 'google-auth.dat')

function readAuth(): StoredAuth | null {
  try {
    const target = authPath()
    if (!fs.existsSync(target)) return null
    const raw = fs.readFileSync(target)
    if (raw.length === 0) return null
    const json = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(raw)
      : raw.toString('utf-8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

function writeAuth(data: StoredAuth | null): void {
  const target = authPath()
  if (!data) {
    if (fs.existsSync(target)) fs.unlinkSync(target)
    return
  }
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const json = JSON.stringify(data)
  const out = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(json)
    : Buffer.from(json, 'utf-8')
  fs.writeFileSync(target, out)
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function postForm(url: string, form: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(form).toString()
    const u = new URL(url)
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body)
        }
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(e)
          }
        })
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function getJson(url: string, accessToken: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    https
      .get(
        {
          hostname: u.hostname,
          path: u.pathname + u.search,
          headers: { Authorization: `Bearer ${accessToken}` }
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            try {
              resolve(JSON.parse(data))
            } catch (e) {
              reject(e)
            }
          })
        }
      )
      .on('error', reject)
  })
}

export async function googleSignInStart(): Promise<{
  success: boolean
  profile?: GoogleProfile
  error?: string
}> {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith('YOUR_')) {
    return {
      success: false,
      error:
        'Google Client ID configured nahi hai. src/main/lib/google-auth.ts mein GOOGLE_CLIENT_ID/SECRET daalo (Google Cloud Console -> OAuth Client -> Desktop App).'
    }
  }

  const codeVerifier = base64url(crypto.randomBytes(32))
  const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest())
  const state = base64url(crypto.randomBytes(16))
  let redirectUri = ''

  return new Promise((resolve) => {
    let settled = false
    const finish = (result: { success: boolean; profile?: GoogleProfile; error?: string }): void => {
      if (settled) return
      settled = true
      clearTimeout(timeoutHandle)
      try {
        server.close()
      } catch {
        // already closed
      }
      resolve(result)
    }

    const server = http.createServer((req, res) => {
      void (async () => {
        try {
          const reqUrl = new URL(req.url || '', 'http://127.0.0.1')
          if (reqUrl.pathname !== '/callback') {
            res.writeHead(404)
            res.end()
            return
          }

          const returnedState = reqUrl.searchParams.get('state')
          const code = reqUrl.searchParams.get('code')
          const errorParam = reqUrl.searchParams.get('error')

          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(
            '<html><body style="font-family:sans-serif;background:#0a0a0a;color:#fff;text-align:center;padding-top:80px"><h2>NOVA-X Sign-In Complete</h2><p>Aap ye tab band kar sakte hain aur app par wapas jaa sakte hain.</p></body></html>'
          )

          if (errorParam || !code || returnedState !== state) {
            finish({ success: false, error: errorParam || 'Sign-in cancelled or state mismatch.' })
            return
          }

          const tokenRes = await postForm('https://oauth2.googleapis.com/token', {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            code_verifier: codeVerifier,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri
          })

          if (!tokenRes.access_token) {
            finish({ success: false, error: tokenRes.error_description || 'Token exchange failed.' })
            return
          }

          const userInfo = await getJson(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            tokenRes.access_token
          )

          const profile: GoogleProfile = {
            email: userInfo.email || '',
            name: userInfo.name || userInfo.email || 'Google User',
            picture: userInfo.picture || ''
          }

          writeAuth({
            accessToken: tokenRes.access_token,
            refreshToken: tokenRes.refresh_token || null,
            expiresAt: Date.now() + (tokenRes.expires_in || 3600) * 1000,
            profile
          })

          finish({ success: true, profile })
        } catch (err: any) {
          finish({ success: false, error: err?.message || 'Unexpected sign-in error.' })
        }
      })()
    })

    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as any).port
      redirectUri = `http://127.0.0.1:${port}/callback`

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', SCOPES.join(' '))
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('code_challenge', codeChallenge)
      authUrl.searchParams.set('code_challenge_method', 'S256')
      authUrl.searchParams.set('access_type', 'offline')
      authUrl.searchParams.set('prompt', 'select_account')

      shell.openExternal(authUrl.toString())
    })

    const timeoutHandle = setTimeout(() => {
      finish({ success: false, error: 'Sign-in timed out. Try again.' })
    }, 120000)
  })
}

export async function googleSignInStatus(): Promise<{ signedIn: boolean; profile?: GoogleProfile }> {
  const auth = readAuth()
  if (!auth) return { signedIn: false }
  return { signedIn: true, profile: auth.profile }
}

export async function googleSignOut(): Promise<{ success: boolean }> {
  writeAuth(null)
  return { success: true }
}

export default function registerGoogleAuthHandlers(ipcMain: IpcMain): void {
  ipcMain.removeHandler('google-signin-start')
  ipcMain.handle('google-signin-start', googleSignInStart)

  ipcMain.removeHandler('google-signin-status')
  ipcMain.handle('google-signin-status', googleSignInStatus)

  ipcMain.removeHandler('google-signout')
  ipcMain.handle('google-signout', googleSignOut)
                        }
