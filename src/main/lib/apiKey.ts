/* eslint-disable @typescript-eslint/no-explicit-any */
import Store from 'electron-store'

const store = new Store()

/**
 * Single source of truth for resolving the Gemini API key.
 * Previously this exact function was copy-pasted into agent.ts, vision.ts,
 * wallpaper.ts, and screenPeeler.ts — meaning any fix to the key-resolution
 * or decryption logic had to be made in four places by hand, and would
 * silently drift out of sync if someone forgot one. Now there is one copy.
 */
export function getGeminiApiKey(): string {
  const envKey = process.env.GEMINI_API_KEY
  if (envKey) return envKey

  const secureKeys: any = store.get('secure_api_keys')
  if (secureKeys && (secureKeys.GEMINI_API_KEY || secureKeys.geminiKey)) {
    return secureKeys.GEMINI_API_KEY || secureKeys.geminiKey
  }

  const decryptedKeysStr = store.get('secure_api_keys_enc') as string
  if (decryptedKeysStr) {
    try {
      const crypto = require('crypto')
      const ENCRYPTION_KEY = crypto.scryptSync('novax-secret-vault-salt-key', 'salt', 32)
      const textParts = decryptedKeysStr.split(':')
      const iv = Buffer.from(textParts.shift()!, 'hex')
      const encryptedText = Buffer.from(textParts.join(':'), 'hex')
      const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
      let decrypted = decipher.update(encryptedText)
      decrypted = Buffer.concat([decrypted, decipher.final()])
      const parsed = JSON.parse(decrypted.toString())
      if (parsed.GEMINI_API_KEY) return parsed.GEMINI_API_KEY
    } catch (e) {
      // ignore decryption errors — falls through to empty string below
    }
  }

  return ''
}
