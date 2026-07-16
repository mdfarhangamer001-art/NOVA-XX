import { app, IpcMain } from 'electron'
import fs from 'fs'
import path from 'path'

interface StoredNote {
  title: string
  content: string
  createdAt: string
}

interface NoteResponse extends StoredNote {
  filename: string
}

const notesDir = (): string => path.join(app.getPath('userData'), 'notes')

function ensureNotesDir(): void {
  const dir = notesDir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function slugify(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return slug || 'note'
}

function isInsideNotesDir(filePath: string): boolean {
  const resolved = path.resolve(filePath)
  return resolved.startsWith(path.resolve(notesDir()))
}

export async function getNotes(): Promise<NoteResponse[]> {
  ensureNotesDir()
  const dir = notesDir()
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))

  const notes: NoteResponse[] = []
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
      const data = JSON.parse(raw) as StoredNote
      notes.push({ filename: file, ...data })
    } catch (err) {
      console.error('[NOVA-X Notes] Failed to parse note file:', file, err)
    }
  }

  return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function saveNote(
  _event: unknown,
  payload: { title: string; content: string; filename?: string }
): Promise<{ success: boolean; filename?: string; error?: string }> {
  try {
    ensureNotesDir()
    const { title, content, filename } = payload
    if (!title?.trim() || !content?.trim()) {
      return { success: false, error: 'Title and content are required.' }
    }

    const createdAt = new Date().toISOString()
    const finalContent = content.trim().startsWith('#') ? content : `# ${title}\n\n${content}`

    const targetFilename =
      filename && fs.existsSync(path.join(notesDir(), filename))
        ? filename
        : `${slugify(title)}_${Date.now()}.json`

    fs.writeFileSync(
      path.join(notesDir(), targetFilename),
      JSON.stringify({ title, content: finalContent, createdAt }, null, 2)
    )

    return { success: true, filename: targetFilename }
  } catch (err: any) {
    console.error('[NOVA-X Notes] Failed to save note:', err)
    return { success: false, error: err?.message || 'Unknown error while saving note.' }
  }
}

export async function deleteNote(
  _event: unknown,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  try {
    ensureNotesDir()
    const target = path.join(notesDir(), filename)
    if (isInsideNotesDir(target) && fs.existsSync(target)) {
      fs.unlinkSync(target)
    }
    return { success: true }
  } catch (err: any) {
    console.error('[NOVA-X Notes] Failed to delete note:', err)
    return { success: false, error: err?.message || 'Unknown error while deleting note.' }
  }
}

export default function registerNotesHandlers(ipcMain: IpcMain): void {
  ipcMain.removeHandler('get-notes')
  ipcMain.handle('get-notes', getNotes)

  ipcMain.removeHandler('save-note')
  ipcMain.handle('save-note', saveNote)

  ipcMain.removeHandler('delete-note')
  ipcMain.handle('delete-note', deleteNote)
}
