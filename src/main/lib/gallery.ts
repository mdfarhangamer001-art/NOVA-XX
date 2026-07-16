import { app, dialog, shell, IpcMain } from 'electron'
import fs from 'fs'
import path from 'path'

const MEDIA_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4']

const galleryDir = (): string => path.join(app.getPath('userData'), 'gallery')

function ensureGalleryDir(): void {
  const dir = galleryDir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function isInsideGalleryDir(filePath: string): boolean {
  const resolved = path.resolve(filePath)
  return resolved.startsWith(path.resolve(galleryDir()))
}

function toFileUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`
}

export async function getGallery() {
  ensureGalleryDir()
  const dir = galleryDir()
  const files = fs
    .readdirSync(dir)
    .filter((f) => MEDIA_EXTENSIONS.includes(path.extname(f).toLowerCase()))

  return files.map((filename) => {
    const fullPath = path.join(dir, filename)
    const stats = fs.statSync(fullPath)
    return {
      filename,
      displayName: filename,
      path: fullPath,
      url: toFileUrl(fullPath),
      createdAt: stats.birthtime
    }
  })
}

export async function deleteImage(
  _event: unknown,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  try {
    ensureGalleryDir()
    const target = path.join(galleryDir(), filename)
    if (isInsideGalleryDir(target) && fs.existsSync(target)) {
      fs.unlinkSync(target)
    }
    return { success: true }
  } catch (err: any) {
    console.error('[NOVA-X Gallery] Failed to delete media:', err)
    return { success: false, error: err?.message || 'Unknown error while deleting media.' }
  }
}

export async function openImageLocation(
  _event: unknown,
  filePath: string
): Promise<{ success: boolean }> {
  shell.showItemInFolder(filePath)
  return { success: true }
}

export async function saveImageExternal(
  _event: unknown,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { canceled, filePath: destPath } = await dialog.showSaveDialog({
      defaultPath: path.basename(filePath)
    })
    if (canceled || !destPath) return { success: false }

    fs.copyFileSync(filePath, destPath)
    return { success: true }
  } catch (err: any) {
    console.error('[NOVA-X Gallery] Failed to export media:', err)
    return { success: false, error: err?.message || 'Unknown error while exporting media.' }
  }
}

export default function registerGalleryHandlers(ipcMain: IpcMain): void {
  ipcMain.removeHandler('get-gallery')
  ipcMain.handle('get-gallery', getGallery)

  ipcMain.removeHandler('delete-image')
  ipcMain.handle('delete-image', deleteImage)

  ipcMain.removeHandler('open-image-location')
  ipcMain.handle('open-image-location', openImageLocation)

  ipcMain.removeHandler('save-image-external')
  ipcMain.handle('save-image-external', saveImageExternal)
}
