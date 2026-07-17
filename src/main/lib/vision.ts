/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain, safeStorage } from 'electron'
import { GoogleGenAI } from '@google/genai'
import os from 'os'
import Store from 'electron-store'

const store = new Store()

function getGeminiApiKey(): string {
  const envKey = process.env.GEMINI_API_KEY
  if (envKey) return envKey

  // 1. Try decrypting using Electron's native safeStorage API
  try {
    const encryptedBase64 = store.get('secure_api_keys_encrypted') as string
    if (encryptedBase64 && safeStorage && safeStorage.isEncryptionAvailable()) {
      const decrypted = safeStorage.decryptString(Buffer.from(encryptedBase64, 'base64'))
      const parsed = JSON.parse(decrypted)
      if (parsed.GEMINI_API_KEY) return parsed.GEMINI_API_KEY
    }
  } catch (e) {
    // ignore safeStorage decryption error
  }
  
  // 2. Try unencrypted fallback
  const secureKeys: any = store.get('secure_api_keys')
  if (secureKeys && secureKeys.GEMINI_API_KEY) {
    return secureKeys.GEMINI_API_KEY
  }
  
  // 3. Try legacy encrypted block with dynamic device-specific details
  const decryptedKeysStr = store.get('secure_api_keys_enc') as string
  if (decryptedKeysStr) {
    try {
      const crypto = require('crypto')
      // Create a secure, dynamic, device-specific salt generation pipeline
      const dynamicSalt = os.platform() + os.arch() + os.hostname() + (os.userInfo()?.username || 'system')
      const ENCRYPTION_KEY = crypto.scryptSync(dynamicSalt, 'salt', 32)
      const textParts = decryptedKeysStr.split(':')
      const iv = Buffer.from(textParts.shift()!, 'hex')
      const encryptedText = Buffer.from(textParts.join(':'), 'hex')
      const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
      let decrypted = decipher.update(encryptedText)
      decrypted = Buffer.concat([decrypted, decipher.final()])
      const parsed = JSON.parse(decrypted.toString())
      if (parsed.GEMINI_API_KEY) return parsed.GEMINI_API_KEY
    } catch (e) {
      // try legacy fallback if username info failed
      try {
        const crypto = require('crypto')
        const dynamicSaltFallback = os.platform() + os.arch() + os.hostname() + 'fallback'
        const ENCRYPTION_KEY = crypto.scryptSync(dynamicSaltFallback, 'salt', 32)
        const textParts = decryptedKeysStr.split(':')
        const iv = Buffer.from(textParts.shift()!, 'hex')
        const encryptedText = Buffer.from(textParts.join(':'), 'hex')
        const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
        let decrypted = decipher.update(encryptedText)
        decrypted = Buffer.concat([decrypted, decipher.final()])
        const parsed = JSON.parse(decrypted.toString())
        if (parsed.GEMINI_API_KEY) return parsed.GEMINI_API_KEY
      } catch (err2) {
        // ignore
      }
    }
  }

  return ''
}

let lastCallTime = 0
let lastResult: any = null
const THROTTLE_LIMIT_MS = 1500

export function registerVisionHandlers(): void {
  ipcMain.removeHandler('iris-send-vision-frame')
  ipcMain.handle('iris-send-vision-frame', async (_event, base64Frame: string) => {
    const now = Date.now()
    if (now - lastCallTime < THROTTLE_LIMIT_MS && lastResult) {
      console.log(`[Screen Vision] Throttled request. Returning cached analysis.`)
      return { ...lastResult, throttled: true }
    }
    try {
      const apiKey = getGeminiApiKey()
      if (!apiKey) {
      throw new Error('Gemini API Key is missing. Please set it in Settings > NOVA-X Vault.')
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      })

      // Strip data URL scheme prefix if present
      let rawBase64 = base64Frame
      let mimeType = 'image/jpeg'
      if (base64Frame.includes(';base64,')) {
        const parts = base64Frame.split(';base64,')
        rawBase64 = parts[1]
        const mimeMatch = parts[0].match(/data:(.*)/)
        if (mimeMatch) {
          mimeType = mimeMatch[1]
        }
      }

      console.log(`[Screen Vision] Processing screen frame of mime: ${mimeType}`)

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            inlineData: {
              data: rawBase64,
              mimeType: mimeType
            }
          },
          'analyze screen workflow. Identify the active application, detect text and code components, check if there are any visual anomalies, and summarize the user\'s workflow context.'
        ]
      })

      lastCallTime = Date.now()
      lastResult = {
        success: true,
        analysis: response.text || 'No analysis returned from model.'
      }
      return lastResult

    } catch (err: any) {
      console.error('[Screen Vision Error] failed to process vision frame:', err)
      return { success: false, error: err.message }
    }
  })
}
