/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * secureKeys.ts
 * -----------------------------------------------------------------------
 * Single source of truth for reading/writing API keys (Gemini, Groq,
 * HuggingFace, Tavily, OpenRouter, etc).
 *
 * Security notes:
 * - We rely ONLY on Electron's native `safeStorage` API. On Windows this
 *   uses DPAPI, on macOS the Keychain, on Linux libsecret/kwallet. These
 *   are OS-managed, hardware/account-bound encryption stores and are far
 *   stronger than any hand-rolled AES scheme we could write ourselves.
 * - The previous implementation had a "legacy" custom AES-256-CBC fallback
 *   that derived its key from machine info (platform+arch+hostname+user)
 *   using a HARDCODED salt string ('salt'). That is a real weakness:
 *   the salt must never be constant, and machine info is guessable/
 *   enumerable. That code path has been removed entirely rather than
 *   patched, since it was already dead code (nothing ever wrote to
 *   `secure_api_keys_enc`).
 * - If `safeStorage` encryption is unavailable on the host (rare - e.g.
 *   some locked-down Linux setups with no keyring), we still allow the
 *   app to function by storing keys in plaintext in electron-store, but
 *   we loudly warn in the console and flag it via `isKeyStorageSecure()`
 *   so the renderer/Settings UI can show the user a real warning instead
 *   of silently downgrading their security.
 */

import { safeStorage } from 'electron'
import Store from 'electron-store'

const store = new Store()

const ENCRYPTED_STORE_KEY = 'secure_api_keys_encrypted'
const PLAINTEXT_STORE_KEY = 'secure_api_keys'

export interface ApiKeyMap {
  GEMINI_API_KEY?: string
  GROQ_API_KEY?: string
  HUGGINGFACE_API_KEY?: string
  TAVILY_API_KEY?: string
  OPENROUTER_API_KEY?: string
  [key: string]: string | undefined
}

/** Returns true if we can actually encrypt keys at rest on this machine. */
export function isKeyStorageSecure(): boolean {
  try {
    return !!(safeStorage && safeStorage.isEncryptionAvailable())
  } catch {
    return false
  }
}

/** Persist the full key map. Encrypts when possible, warns when not. */
export function saveApiKeys(keys: ApiKeyMap): { success: boolean; secure: boolean; error?: string } {
  try {
    // Never persist obviously-empty/whitespace-only values.
    const cleaned: ApiKeyMap = {}
    for (const [k, v] of Object.entries(keys || {})) {
      if (typeof v === 'string' && v.trim().length > 0) cleaned[k] = v.trim()
    }

    if (isKeyStorageSecure()) {
      try {
        const encrypted = safeStorage.encryptString(JSON.stringify(cleaned))
        store.set(ENCRYPTED_STORE_KEY, encrypted.toString('base64'))
        // Make sure we don't leave a stale plaintext copy lying around from
        // before encryption became available.
        store.delete(PLAINTEXT_STORE_KEY)
        return { success: true, secure: true }
      } catch (e) {
        console.error('[NOVA-X SecureKeys] safeStorage.encryptString failed, falling back to plaintext:', e)
      }
    }

    console.warn(
      '[NOVA-X SecureKeys] WARNING: OS-level key encryption is unavailable on this machine. ' +
      'API keys will be stored in PLAINTEXT on disk. This is not secure — consider enabling ' +
      'a system keyring (Linux) or running on Windows/macOS where DPAPI/Keychain is available.'
    )
    store.set(PLAINTEXT_STORE_KEY, cleaned)
    return { success: true, secure: false }
  } catch (e: any) {
    // Previously an error here (e.g. disk write permission issue, a
    // corrupted store file, safeStorage misbehaving) would throw all the
    // way up through the IPC handler as an unhandled rejection, which the
    // renderer just showed as a generic "Failed to save keys" with no
    // real information. Now we always return a structured result so the
    // actual cause is visible.
    console.error('[NOVA-X SecureKeys] saveApiKeys failed entirely:', e)
    return { success: false, secure: false, error: e?.message || String(e) }
  }
}

/** Retrieve the full key map, decrypting if needed. */
export function getApiKeys(): ApiKeyMap {
  try {
    const encryptedBase64 = store.get(ENCRYPTED_STORE_KEY) as string | undefined
    if (encryptedBase64 && isKeyStorageSecure()) {
      try {
        const decrypted = safeStorage.decryptString(Buffer.from(encryptedBase64, 'base64'))
        return JSON.parse(decrypted)
      } catch (decryptErr) {
        // A corrupted/undecryptable blob (e.g. saved under a different
        // Windows user account, or the DPAPI key rotated) would otherwise
        // make EVERY future save/load fail silently forever, since we'd
        // keep trying to decrypt the same bad data. Clear it so the next
        // save starts fresh instead of being permanently stuck.
        console.error('[NOVA-X SecureKeys] Stored key blob is corrupted/undecryptable, clearing it:', decryptErr)
        store.delete(ENCRYPTED_STORE_KEY)
      }
    }
  } catch (e) {
    console.error('[NOVA-X SecureKeys] Failed to decrypt stored keys:', e)
  }
  return (store.get(PLAINTEXT_STORE_KEY) as ApiKeyMap) || {}
}

/**
 * Convenience getter for the Gemini key specifically, since it's needed
 * in several main-process modules (agent, vision, system/chat bridge).
 * Checks env var override first (useful for dev), then secure store.
 * Accepts both `GEMINI_API_KEY` and legacy `geminiKey` field names so
 * older saved key blobs keep working.
 */
export function getGeminiApiKey(): string {
  const envKey = process.env.GEMINI_API_KEY
  if (envKey) return envKey

  const keys: any = getApiKeys()
  if (keys.GEMINI_API_KEY) return keys.GEMINI_API_KEY
  if (keys.geminiKey) return keys.geminiKey
  return ''
}
