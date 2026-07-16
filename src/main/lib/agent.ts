/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain, BrowserWindow, dialog } from 'electron'
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { getGeminiApiKey } from './apiKey'

// Map the workspace root path
const WORKSPACE_ROOT = process.cwd()

// ---------------------------------------------------------------------------
// Tool Definitions
// ---------------------------------------------------------------------------

const listFilesTool: FunctionDeclaration = {
  name: 'list_files',
  description: 'List all files and folders in a directory of the project workspace.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      directory: {
        type: Type.STRING,
        description: 'The directory path relative to the workspace root. Use "." for the root.'
      }
    },
    required: ['directory']
  }
}

const readFileTool: FunctionDeclaration = {
  name: 'read_file',
  description: 'Read the contents of a specific file in the workspace.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filePath: {
        type: Type.STRING,
        description: 'The path of the file to read relative to the workspace root.'
      }
    },
    required: ['filePath']
  }
}

const searchFilesTool: FunctionDeclaration = {
  name: 'search_files',
  description:
    'Search for a text/regex pattern across files in the workspace (like grep). Use this before editing to find exactly where something lives instead of guessing.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      pattern: {
        type: Type.STRING,
        description: 'Plain text or regex pattern to search for.'
      },
      directory: {
        type: Type.STRING,
        description: 'Directory to search within, relative to workspace root. Defaults to root.'
      },
      fileExtension: {
        type: Type.STRING,
        description: 'Optional filter, e.g. ".ts" or ".tsx". Leave empty to search all text files.'
      }
    },
    required: ['pattern']
  }
}

const writeFileTool: FunctionDeclaration = {
  name: 'write_file',
  description:
    'Create a new file or completely overwrite an existing file. Use this for new files only. For editing an EXISTING file, prefer edit_file so you do not destroy unrelated code. Requires operator approval.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filePath: {
        type: Type.STRING,
        description: 'The path of the file to write relative to the workspace root.'
      },
      content: {
        type: Type.STRING,
        description: 'The full text content to write into the file.'
      }
    },
    required: ['filePath', 'content']
  }
}

const editFileTool: FunctionDeclaration = {
  name: 'edit_file',
  description:
    'Make a precise, surgical edit to an existing file by replacing one exact snippet of text with a new one. The oldText MUST match the file content exactly (including whitespace) and must be unique in the file. Always read_file first to get exact current content. Requires operator approval.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filePath: {
        type: Type.STRING,
        description: 'The path of the file to edit relative to the workspace root.'
      },
      oldText: {
        type: Type.STRING,
        description: 'The exact, unique existing snippet to replace.'
      },
      newText: {
        type: Type.STRING,
        description: 'The replacement text.'
      }
    },
    required: ['filePath', 'oldText', 'newText']
  }
}

const deleteFileTool: FunctionDeclaration = {
  name: 'delete_file',
  description: 'Delete a file from the workspace. Requires operator approval.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filePath: {
        type: Type.STRING,
        description: 'The path of the file to delete relative to the workspace root.'
      }
    },
    required: ['filePath']
  }
}

const runCommandTool: FunctionDeclaration = {
  name: 'run_command',
  description:
    'Run a shell command in the project workspace (e.g. npm run lint, npx tsc --noEmit, npm test). Use this to verify your own changes before declaring the task done. Requires operator approval.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      command: {
        type: Type.STRING,
        description: 'The shell command to execute.'
      }
    },
    required: ['command']
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveSafe(relativePath: string): { ok: true; abs: string } | { ok: false; error: string } {
  const abs = path.resolve(WORKSPACE_ROOT, relativePath)
  if (!abs.startsWith(WORKSPACE_ROOT)) {
    return { ok: false, error: 'Permission Denied: Path escapes the workspace root.' }
  }
  return { ok: true, abs }
}

async function askOperator(
  win: BrowserWindow | null,
  title: string,
  message: string,
  detail: string
): Promise<boolean> {
  const res = await dialog.showMessageBox(win || undefined!, {
    type: 'warning',
    buttons: ['Reject', 'Authorize'],
    defaultId: 1,
    cancelId: 0,
    title,
    message,
    detail
  })
  return res.response === 1
}

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.html', '.yml', '.yaml', '.txt'
])

function walkTextFiles(dir: string, ext: string | undefined, out: string[]): void {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'out' || entry.name === 'dist') {
      continue
    }
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkTextFiles(full, ext, out)
    } else {
      const fileExt = path.extname(entry.name)
      if (ext ? fileExt === ext : TEXT_EXTENSIONS.has(fileExt)) {
        out.push(full)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Agent Loop
// ---------------------------------------------------------------------------

export function registerAgentHandlers(): void {
  ipcMain.removeHandler('agent-run-task')
  ipcMain.handle('agent-run-task', async (event, prompt: string) => {
    const focusedWindow = BrowserWindow.fromWebContents(event.sender)
    const sendLog = (message: string) => {
      console.log(`[Coding Agent Log] ${message}`)
      if (focusedWindow) {
        focusedWindow.webContents.send('agent-progress-log', message)
      }
    }

    const apiKey = getGeminiApiKey()
    if (!apiKey) {
      sendLog('ERROR: Gemini API Key is missing. Please set it in Settings > API Vault.')
      return { success: false, error: 'Gemini API Key is missing.' }
    }

    sendLog('Initializing neural agent engine...')
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    })

    const systemInstruction = `You are the coding-agent module of an assistant persona named Max (Tehzeeb AI OS). \
Inside this specific task you act as a precise, senior-level software engineer — calm, direct, and honest, never overconfident.

Operating rules:
1. Investigate before you act: use list_files / search_files / read_file to understand real code before changing anything. Never assume file contents from memory.
2. Prefer edit_file (surgical, exact-snippet replacement) over write_file for existing files. Only use write_file for brand-new files or a deliberate full rewrite.
3. After making a change, verify it: read the file back, or run a check command (lint / type-check / test) via run_command when one is available. Do not declare success without verifying.
4. If something you tried fails or a command errors, read the error carefully, form a specific hypothesis about the cause, and fix it — don't repeat the same failing action.
5. Keep the operator informed in plain, honest language: what you found, what you're about to do, and why. No filler, no exaggeration about what was actually accomplished.
6. Respect workspace boundaries and operator approval on every write/edit/delete/run — these gates exist for the user's safety and you must not try to work around them.
7. When the task is genuinely complete and verified, say so clearly and summarize exactly what changed.`

    const tools: any[] = [
      {
        functionDeclarations: [
          listFilesTool,
          readFileTool,
          searchFilesTool,
          writeFileTool,
          editFileTool,
          deleteFileTool,
          runCommandTool
        ]
      }
    ]

    try {
      sendLog(`Task received: "${prompt}"`)
      sendLog('Analyzing task strategy and compiling toolchain...')

      const contentsHistory: any[] = [{ role: 'user', parts: [{ text: prompt }] }]

      let loopCount = 0
      const maxLoops = 20

      while (loopCount < maxLoops) {
        loopCount++
        sendLog(`[Step ${loopCount}/${maxLoops}] Querying neural model...`)

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: contentsHistory,
          config: {
            systemInstruction,
            tools
          }
        })

        const modelContent = response.candidates?.[0]?.content
        if (modelContent) {
          contentsHistory.push(modelContent)
        }

        const textResponse = response.text
        if (textResponse) {
          sendLog(`Agent: ${textResponse}`)
        }

        const functionCalls = response.functionCalls
        if (!functionCalls || functionCalls.length === 0) {
          sendLog('Agent has finished the task. Terminating agent loop.')
          return { success: true, summary: textResponse || 'Task complete.' }
        }

        const call = functionCalls[0]
        const toolName = call.name
        const args: any = call.args
        sendLog(`Tool requested: ${toolName}(${JSON.stringify(args)})`)

        let toolResult: any = null

        if (toolName === 'list_files') {
          const resolved = resolveSafe(args.directory || '.')
          if (!resolved.ok) {
            toolResult = { error: resolved.error }
          } else {
            try {
              if (fs.existsSync(resolved.abs)) {
                const files = fs.readdirSync(resolved.abs)
                const fileStats = files.map((file) => {
                  const fp = path.join(resolved.abs, file)
                  const isDir = fs.statSync(fp).isDirectory()
                  return `${file}${isDir ? '/' : ''}`
                })
                toolResult = { files: fileStats }
                sendLog(`Found ${files.length} items in directory.`)
              } else {
                toolResult = { error: 'Directory does not exist.' }
              }
            } catch (e: any) {
              toolResult = { error: e.message }
            }
          }
        } else if (toolName === 'read_file') {
          const resolved = resolveSafe(args.filePath)
          if (!resolved.ok) {
            toolResult = { error: resolved.error }
          } else {
            try {
              if (fs.existsSync(resolved.abs)) {
                const content = fs.readFileSync(resolved.abs, 'utf8')
                toolResult = { content }
                sendLog(`Read file (${content.length} chars).`)
              } else {
                toolResult = { error: 'File does not exist.' }
              }
            } catch (e: any) {
              toolResult = { error: e.message }
            }
          }
        } else if (toolName === 'search_files') {
          const startDir = resolveSafe(args.directory || '.')
          if (!startDir.ok) {
            toolResult = { error: startDir.error }
          } else {
            try {
              const files: string[] = []
              walkTextFiles(startDir.abs, args.fileExtension, files)
              const pattern = args.pattern as string
              let regex: RegExp
              try {
                regex = new RegExp(pattern, 'i')
              } catch {
                regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
              }
              const matches: { file: string; line: number; text: string }[] = []
              for (const f of files) {
                const rel = path.relative(WORKSPACE_ROOT, f)
                const lines = fs.readFileSync(f, 'utf8').split('\n')
                lines.forEach((line, idx) => {
                  if (regex.test(line)) {
                    matches.push({ file: rel, line: idx + 1, text: line.trim().slice(0, 200) })
                  }
                })
                if (matches.length >= 100) break
              }
              toolResult = { matches, matchCount: matches.length }
              sendLog(`Search found ${matches.length} matching line(s).`)
            } catch (e: any) {
              toolResult = { error: e.message }
            }
          }
        } else if (toolName === 'write_file') {
          const authorized = await askOperator(
            focusedWindow,
            'NOVA-X Coding Agent Authorization',
            'Write File Action Requested',
            `The Coding Agent wants to write to:\n\n${args.filePath}\n\nAuthorize this file write?`
          )
          if (!authorized) {
            sendLog('Operator REJECTED the write_file request.')
            toolResult = { error: 'Operator rejected the write file request.' }
          } else {
            const resolved = resolveSafe(args.filePath)
            if (!resolved.ok) {
              toolResult = { error: resolved.error }
            } else {
              try {
                fs.mkdirSync(path.dirname(resolved.abs), { recursive: true })
                fs.writeFileSync(resolved.abs, args.content, 'utf8')
                toolResult = { success: true }
                sendLog(`Wrote file: ${args.filePath}`)
              } catch (e: any) {
                toolResult = { error: e.message }
              }
            }
          }
        } else if (toolName === 'edit_file') {
          const authorized = await askOperator(
            focusedWindow,
            'NOVA-X Coding Agent Authorization',
            'Edit File Action Requested',
            `The Coding Agent wants to edit:\n\n${args.filePath}\n\nAuthorize this surgical edit?`
          )
          if (!authorized) {
            sendLog('Operator REJECTED the edit_file request.')
            toolResult = { error: 'Operator rejected the edit file request.' }
          } else {
            const resolved = resolveSafe(args.filePath)
            if (!resolved.ok) {
              toolResult = { error: resolved.error }
            } else if (!fs.existsSync(resolved.abs)) {
              toolResult = { error: 'File does not exist. Use write_file to create it first.' }
            } else {
              try {
                const current = fs.readFileSync(resolved.abs, 'utf8')
                const occurrences = current.split(args.oldText).length - 1
                if (occurrences === 0) {
                  toolResult = {
                    error: 'oldText not found in file. Re-read the file to get exact current content before editing.'
                  }
                } else if (occurrences > 1) {
                  toolResult = {
                    error: `oldText matched ${occurrences} times — it must be unique. Include more surrounding context.`
                  }
                } else {
                  const updated = current.replace(args.oldText, args.newText)
                  fs.writeFileSync(resolved.abs, updated, 'utf8')
                  toolResult = { success: true }
                  sendLog(`Edited file: ${args.filePath}`)
                }
              } catch (e: any) {
                toolResult = { error: e.message }
              }
            }
          }
        } else if (toolName === 'delete_file') {
          const authorized = await askOperator(
            focusedWindow,
            'NOVA-X Coding Agent Authorization',
            'Delete File Action Requested',
            `The Coding Agent wants to delete:\n\n${args.filePath}\n\nAuthorize this deletion?`
          )
          if (!authorized) {
            sendLog('Operator REJECTED the delete_file request.')
            toolResult = { error: 'Operator rejected the delete file request.' }
          } else {
            const resolved = resolveSafe(args.filePath)
            if (!resolved.ok) {
              toolResult = { error: resolved.error }
            } else {
              try {
                if (fs.existsSync(resolved.abs)) {
                  fs.unlinkSync(resolved.abs)
                  toolResult = { success: true }
                  sendLog(`Deleted file: ${args.filePath}`)
                } else {
                  toolResult = { error: 'File does not exist.' }
                }
              } catch (e: any) {
                toolResult = { error: e.message }
              }
            }
          }
        } else if (toolName === 'run_command') {
          const authorized = await askOperator(
            focusedWindow,
            'NOVA-X Coding Agent Authorization',
            'Terminal Command Action Requested',
            `The Coding Agent wants to run:\n\n${args.command}\n\nAuthorize this command execution?`
          )
          if (!authorized) {
            sendLog('Operator REJECTED the run_command request.')
            toolResult = { error: 'Operator rejected the run command execution.' }
          } else {
            try {
              sendLog(`Running: ${args.command}`)
              const result = await new Promise<{ stdout: string; stderr: string }>((resolve) => {
                exec(args.command, { cwd: WORKSPACE_ROOT, timeout: 120000 }, (_error, stdout, stderr) => {
                  resolve({ stdout, stderr })
                })
              })
              toolResult = { stdout: result.stdout.slice(0, 8000), stderr: result.stderr.slice(0, 4000) }
              sendLog(`Command finished. stdout: ${result.stdout.length} chars, stderr: ${result.stderr.length} chars.`)
            } catch (e: any) {
              toolResult = { error: e.message }
            }
          }
        }

        contentsHistory.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: toolName,
                response: toolResult
              }
            }
          ]
        })
      }

      sendLog('Maximum step loops exceeded without a final response. Stopping.')
      return { success: false, error: 'Maximum loop steps exceeded.' }
    } catch (err: any) {
      sendLog(`ERROR in agent loop: ${err.message}`)
      return { success: false, error: err.message }
    }
  })
  }
