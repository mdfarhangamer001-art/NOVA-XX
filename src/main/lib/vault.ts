import { app, safeStorage, IpcMain } from 'electron'
import fs from 'fs'
import path from 'path'

interface ApiKeys {
  groqKey: string
  geminiKey: string
  hfKey: string
  tavilyKey: string
}

const EMPTY_KEYS: ApiKeys = { groqKey: '', geminiKey: '', hfKey: '', tavilyKey: '' }

const vaultPath = (): string => path.join(app.getPath('userData'), 'secure-vault.dat')

function readVault(): ApiKeys {
  try {
    const target = vaultPath()
    if (!fs.existsSync(target)) return { ...EMPTY_KEYS }

    const raw = fs.readFileSync(target)
    if (raw.length === 0) return { ...EMPTY_KEYS }

    const json = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(raw)
      : raw.toString('utf-8')

    return { ...EMPTY_KEYS, ...JSON.parse(json) }
  } catch (err) {
    console.error('[NOVA-X Vault] Failed to read vault:', err)
    return { ...EMPTY_KEYS }
  }
}

function writeVault(keys: ApiKeys): void {
  const target = vaultPath()
  fs.mkdirSync(path.dirname(target), { recursive: true })

  const json = JSON.stringify({ ...EMPTY_KEYS, ...keys })
  const data = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(json)
    : Buffer.from(json, 'utf-8')

  fs.writeFileSync(target, data)
}

export async function secureGetKeys(): Promise<ApiKeys> {
  return readVault()
}

export async function secureSaveKeys(
  _event: unknown,
  keys: ApiKeys
): Promise<{ success: boolean; error?: string }> {
  try {
    writeVault(keys)
    return { success: true }
  } catch (err: any) {
    console.error('[NOVA-X Vault] Failed to save keys:', err)
    return { success: false, error: err?.message || 'Unknown vault error.' }
  }
}

export default function registerVaultHandlers(ipcMain: IpcMain): void {
  ipcMain.removeHandler('secure-get-keys')
  ipcMain.handle('secure-get-keys', secureGetKeys)

  ipcMain.removeHandler('secure-save-keys')
  ipcMain.handle('secure-save-keys', secureSaveKeys)
}
