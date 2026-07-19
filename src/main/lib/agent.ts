/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain, BrowserWindow, dialog, safeStorage } from 'electron'
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
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
      const dynamicSalt =
        os.platform() + os.arch() + os.hostname() + (os.userInfo()?.username || 'system')
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
        const fallbackSalt = os.platform() + os.arch() + 'fallback'
        const ENCRYPTION_KEY = crypto.scryptSync(fallbackSalt, 'salt', 32)
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

// Map the workspace root path
const WORKSPACE_ROOT = process.cwd()

function validateAgentCommand(command: string): { valid: boolean; reason?: string } {
  const trimmed = command.trim()

  const dangerousPatterns = [
    /rm\s+-rf\s+[^\w\.\-\/]/i,
    />\s*\/etc\//,
    /curl.*\|\s*(bash|sh|zsh|python)/i,
    /wget.*\|\s*(bash|sh|zsh|python)/i,
    /chmod\s+.*777/,
    /chown\s+/i,
    /sudo\s+/i
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: `Command matches blocklisted dangerous pattern: ${pattern}` }
    }
  }

  if (
    trimmed.includes('../') &&
    (trimmed.includes('rm ') || trimmed.includes('mv ') || trimmed.includes('cp '))
  ) {
    return { valid: false, reason: 'Command attempts to modify files outside the workspace root.' }
  }

  return { valid: true }
}

// Define Tools
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

const writeFileTool: FunctionDeclaration = {
  name: 'write_file',
  description:
    'Create a new file or write/overwrite content to a file in the workspace. Requires operator approval.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filePath: {
        type: Type.STRING,
        description: 'The path of the file to write relative to the workspace root.'
      },
      content: {
        type: Type.STRING,
        description: 'The text content to write into the file.'
      }
    },
    required: ['filePath', 'content']
  }
}

const runCommandTool: FunctionDeclaration = {
  name: 'run_command',
  description:
    'Run a shell command in the project workspace (e.g. npm run test, npm run lint). Requires operator approval.',
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

    const systemInstruction = `You are the NOVA-X Coding Agent. You are a highly professional, expert developer agent.
You have native access to the workspace file-system and terminal via custom tools.
Your goal is to fulfill the user's prompt by examining files, reading contents, writing correct modifications, and running check commands.
Always verify code correctness and syntax integrity.
Work carefully and step-by-step. Let the operator know exactly what you are doing.`

    const tools: any[] = [
      {
        functionDeclarations: [listFilesTool, readFileTool, writeFileTool, runCommandTool]
      }
    ]

    try {
      sendLog(`Task received: "${prompt}"`)
      sendLog('Analyzing task strategy and compiling toolchain...')

      // We maintain history manually for the loop
      const contentsHistory: any[] = [{ role: 'user', parts: [{ text: prompt }] }]

      let loopCount = 0
      const maxLoops = 8

      while (loopCount < maxLoops) {
        loopCount++
        sendLog(`[Step ${loopCount}] Querying Gemini neural model...`)

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: contentsHistory,
          config: {
            systemInstruction,
            tools
          }
        })

        // Add model response to history
        const modelContent = response.candidates?.[0]?.content
        if (modelContent) {
          contentsHistory.push(modelContent)
        }

        const textResponse = response.text
        if (textResponse) {
          sendLog(`Agent response: ${textResponse}`)
        }

        const functionCalls = response.functionCalls
        if (!functionCalls || functionCalls.length === 0) {
          sendLog('Agent has finished the task. Terminating agent loop.')
          return { success: true, summary: textResponse || 'Task complete.' }
        }

        // Handle function call
        const call = functionCalls[0]
        const toolName = call.name
        const args: any = call.args
        sendLog(`Agent requested tool execution: ${toolName}(${JSON.stringify(args)})`)

        let toolResult: any = null

        if (toolName === 'list_files') {
          try {
            const targetDir = path.resolve(WORKSPACE_ROOT, args.directory || '.')
            if (!targetDir.startsWith(WORKSPACE_ROOT)) {
              toolResult = { error: 'Permission Denied: Cannot traverse outside workspace.' }
            } else {
              if (fs.existsSync(targetDir)) {
                const files = fs.readdirSync(targetDir)
                const fileStats = files.map((file) => {
                  const fp = path.join(targetDir, file)
                  const isDir = fs.statSync(fp).isDirectory()
                  return `${file}${isDir ? '/' : ''}`
                })
                toolResult = { files: fileStats }
                sendLog(`Found ${files.length} items in directory.`)
              } else {
                toolResult = { error: 'Directory does not exist.' }
              }
            }
          } catch (e: any) {
            toolResult = { error: e.message }
          }
        } else if (toolName === 'read_file') {
          try {
            const targetPath = path.resolve(WORKSPACE_ROOT, args.filePath)
            if (!targetPath.startsWith(WORKSPACE_ROOT)) {
              toolResult = { error: 'Permission Denied: Cannot access file outside workspace.' }
            } else {
              if (fs.existsSync(targetPath)) {
                const content = fs.readFileSync(targetPath, 'utf8')
                toolResult = { content }
                sendLog(`Successfully read file of size: ${content.length} characters.`)
              } else {
                toolResult = { error: 'File does not exist.' }
              }
            }
          } catch (e: any) {
            toolResult = { error: e.message }
          }
        } else if (toolName === 'write_file') {
          // Ask for Operator Confirmation
          sendLog('Awaiting operator authorization for write_file operation...')
          const dialogResponse = await dialog.showMessageBox(focusedWindow || undefined!, {
            type: 'warning',
            buttons: ['Reject', 'Authorize Write'],
            defaultId: 1,
            cancelId: 0,
            title: 'NOVA-X Coding Agent Authorization',
            message: 'Write File Action Requested',
            detail: `The Coding Agent is requesting to write to file:\n\n${args.filePath}\n\nDo you authorize this file system write operation?`
          })

          if (dialogResponse.response !== 1) {
            sendLog('Operator REJECTED the write file request.')
            toolResult = { error: 'Operator rejected the write file request.' }
          } else {
            try {
              const targetPath = path.resolve(WORKSPACE_ROOT, args.filePath)
              if (!targetPath.startsWith(WORKSPACE_ROOT)) {
                toolResult = { error: 'Permission Denied: Cannot write file outside workspace.' }
              } else {
                fs.mkdirSync(path.dirname(targetPath), { recursive: true })
                fs.writeFileSync(targetPath, args.content, 'utf8')
                toolResult = { success: true }
                sendLog(`Successfully wrote code modification to: ${args.filePath}`)
              }
            } catch (e: any) {
              toolResult = { error: e.message }
            }
          }
        } else if (toolName === 'run_command') {
          // Ask for Operator Confirmation
          sendLog('Awaiting operator authorization for run_command operation...')
          const dialogResponse = await dialog.showMessageBox(focusedWindow || undefined!, {
            type: 'warning',
            buttons: ['Reject', 'Authorize Command'],
            defaultId: 1,
            cancelId: 0,
            title: 'NOVA-X Coding Agent Authorization',
            message: 'Terminal Command Action Requested',
            detail: `The Coding Agent is requesting to run terminal command:\n\n${args.command}\n\nDo you authorize executing this shell command?`
          })

          if (dialogResponse.response !== 1) {
            sendLog('Operator REJECTED the terminal command execution.')
            toolResult = { error: 'Operator rejected the run command execution.' }
          } else {
            const validation = validateAgentCommand(args.command)
            if (!validation.valid) {
              sendLog(`[NOVA-X Security] Agent command blocked: ${validation.reason}`)
              toolResult = { error: `Security block: ${validation.reason}` }
            } else {
              try {
                sendLog(`Running shell command: ${args.command}`)
                const result = await new Promise<{ stdout: string; stderr: string }>(
                  (resolve, reject) => {
                    exec(args.command, { cwd: WORKSPACE_ROOT }, (error, stdout, stderr) => {
                      resolve({ stdout, stderr })
                    })
                  }
                )
                toolResult = { stdout: result.stdout, stderr: result.stderr }
                sendLog(`Command execution complete. Stdout length: ${result.stdout.length}`)
              } catch (e: any) {
                toolResult = { error: e.message }
              }
            }
          }
        }

        // Add function response to history
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

      sendLog('Maximum step loops exceeded without final response. Stopping.')
      return { success: false, error: 'Maximum loop steps exceeded.' }
    } catch (err: any) {
      sendLog(`ERROR in agent loop: ${err.message}`)
      return { success: false, error: err.message }
    }
  })
}
