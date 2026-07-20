import express from 'express'
import { createServer as createViteServer } from 'vite'
import path from 'path'
import fs from 'fs'
import { getApiKey, saveKeys, getGeminiClient, getGroqClient, getPrimaryEngine } from './src/main/ai-clients'

async function startServer() {
  const app = express()
  const PORT = parseInt(process.env.PORT || '5000')

  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ extended: true, limit: '50mb' }))

  // Setup directories for Notes and Gallery
  const NOTES_DIR = path.join(process.cwd(), 'notes')
  const GALLERY_DIR = path.join(process.cwd(), 'gallery')

  if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true })
    fs.writeFileSync(
      path.join(NOTES_DIR, 'welcome.json'),
      JSON.stringify(
        {
          filename: 'welcome.json',
          title: 'Welcome to NOVA-X',
          content:
            "Hello Boss! This is your autonomous desktop workspace. Feel free to type commands or speak to me directly. Let's build something extraordinary today!",
          createdAt: new Date().toISOString()
        },
        null,
        2
      ),
      'utf8'
    )
  }
  if (!fs.existsSync(GALLERY_DIR)) {
    fs.mkdirSync(GALLERY_DIR, { recursive: true })
  }

  // Active SSE Clients for real-time streaming
  let sseClients: any[] = []

  // SSE endpoint
  app.get('/api/ipc-events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    })

    sseClients.push(res)
    console.log(`[Web Preview] SSE Client connected. Active clients: ${sseClients.length}`)

    const interval = setInterval(() => {
      res.write(': keepalive\n\n')
    }, 15000)

    req.on('close', () => {
      clearInterval(interval)
      sseClients = sseClients.filter((c) => c !== res)
      console.log(`[Web Preview] SSE Client disconnected. Active clients: ${sseClients.length}`)
    })
  })

  function broadcast(channel: string, data: any) {
    const payload = JSON.stringify({ channel, data })
    sseClients.forEach((client) => {
      try {
        client.write(`data: ${payload}\n\n`)
      } catch (err) {
        console.error('[Web Preview] Failed to write SSE broadcast:', err)
      }
    })
  }

  // Global Mock States
  if (!global.clipboardHistory) {
    global.clipboardHistory = [
      {
        id: '1',
        type: 'text',
        content: 'sk-proj-716492816439281',
        timestamp: Date.now() - 3600000,
        pinned: true
      },
      {
        id: '2',
        type: 'text',
        content: 'https://github.com/google/genai',
        timestamp: Date.now() - 1200000
      },
      { id: '3', type: 'text', content: 'operator@example.com', timestamp: Date.now() - 600000 }
    ]
  }
  if (global.activityTrackingEnabled === undefined) {
    global.activityTrackingEnabled = false
  }
  if (!global.activityLogs) {
    global.activityLogs = [
      { date: new Date().toISOString().split('T')[0], app: 'VS Code', duration: 14400 },
      { date: new Date().toISOString().split('T')[0], app: 'Chrome', duration: 7200 },
      { date: new Date().toISOString().split('T')[0], app: 'Terminal', duration: 3600 },
      { date: new Date().toISOString().split('T')[0], app: 'Slack', duration: 1800 },
      { date: new Date().toISOString().split('T')[0], app: 'Spotify', duration: 4500 }
    ]
  }
  if (!global.memories) {
    global.memories = [
      { fact: 'Operator preference is a dark slate futuristic UI with minimal telemetry.' }
    ]
  }
  if (!global.offlineProfile) {
    global.offlineProfile = {
      name: 'Operator',
      email: 'operator@example.com',
      syncTime: new Date().toLocaleTimeString(),
      avatar: ''
    }
  }

  // Mock IPC invoke
  app.post('/api/ipc', async (req, res) => {
    const { channel, args } = req.body
    let result: any = null

    console.log(`[Web Preview] IPC Invoke [${channel}]`, args)

    try {
      // Companion Status
      if (channel === 'get-companion-status') {
        result = { connected: false, url: '', ip: '', pin: '' }
      }
      // Save and Get Keys
      else if (channel === 'secure-save-keys') {
        saveKeys(args[0])
        result = { success: true }
      } else if (channel === 'secure-get-keys') {
        result = {
          geminiKey: getApiKey('geminiKey', process.env.GEMINI_API_KEY),
          groqKey: getApiKey('groqKey', process.env.GROQ_API_KEY),
          hfKey: getApiKey('hfKey', process.env.HF_API_KEY),
          tavilyKey: getApiKey('tavilyKey', process.env.TAVILY_API_KEY),
          openrouterKey: getApiKey('openrouterKey', process.env.OPENROUTER_API_KEY),
          customKey: getApiKey('customKey', process.env.CUSTOM_API_KEY),
          primaryEngine: getPrimaryEngine()
        }
      }
      // Window Controls (Mock for Web)
      else if (channel === 'window-min') {
        console.log('[Web Preview] Window Minimize requested')
        result = { success: true }
      } else if (channel === 'window-max') {
        console.log('[Web Preview] Window Maximize/Toggle requested')
        result = { success: true }
      } else if (channel === 'window-close') {
        console.log('[Web Preview] Window Close requested')
        result = { success: true }
      }
      // Google Sign-In
      else if (channel === 'google-sign-in') {
        result = {
          success: true,
          name: 'Operator',
          email: 'operator@example.com',
          token: 'mock-token',
          syncTime: new Date().toLocaleTimeString(),
          avatar: ''
        }
      } else if (channel === 'google-sign-out') {
        result = { success: true }
      }
      // Offline profile
      else if (channel === 'get-offline-profile') {
        result = global.offlineProfile
      } else if (channel === 'save-offline-profile') {
        global.offlineProfile = { ...global.offlineProfile, ...args[0] }
        result = { success: true }
      }
      // App details
      else if (channel === 'get-app-version') {
        result = '1.0.0'
      } else if (channel === 'bump-app-version') {
        result = '1.0.1'
      }
      // Audio transcription
      else if (channel === 'iris-transcribe-audio') {
        const engine = getPrimaryEngine()
        try {
          if (engine === 'groq') {
            const groqClient = getGroqClient()
            const { base64Audio } = args[0]
            const buffer = Buffer.from(base64Audio, 'base64')
            const os = require('os')
            const tmpFile = path.join(os.tmpdir(), `audio_${Date.now()}.webm`)
            fs.writeFileSync(tmpFile, buffer)

            const transcription = await groqClient.audio.transcriptions.create({
              file: fs.createReadStream(tmpFile),
              model: 'whisper-large-v3-turbo',
              response_format: 'text'
            })
            fs.unlinkSync(tmpFile)
            result = typeof transcription === 'string' ? transcription : (transcription as any).text
          } else {
            const ai = getGeminiClient()
            const { base64Audio, mimeType } = args[0]
            const response = await ai.models.generateContent({
              model: 'gemini-2.0-flash',
              contents: [
                { text: 'Precisely transcribe the spoken audio. Respond with ONLY the transcribed text. Do not add quotes or commentary.' },
                { inlineData: { mimeType: mimeType.split(';')[0], data: base64Audio } }
              ]
            })
            result = response.text
          }
        } catch (err: any) {
          console.error(`[Web Preview] Transcribe Error (${engine}):`, err)
          if (err.message?.includes('MISSING')) {
            result = '[API_KEY_REQUIRED]'
          } else {
            result = `[ERROR] ${err.message}`
          }
        }
      }
      // ============================================================
      // NOVA-X JARVIS-LEVEL AUTONOMOUS DEVELOPMENT AGENT
      // ============================================================
      else if (channel === 'agent-run-task') {
        try {
          const ai = getGeminiClient()
          const query = args[0]
          const execSync = require('child_process').execSync
          const workspaceRoot = process.cwd()

          // Security validator — block dangerous shell patterns
          function validateAgentCmd(cmd: string): { ok: boolean; reason?: string } {
            const dangerous = [
              /rm\s+-rf\s+[\/~]/i, />\s*\/etc\//, /curl.*\|\s*(bash|sh)/i,
              /wget.*\|\s*(bash|sh)/i, /chmod\s+777/, /chown\s+/i, /sudo\s+/i,
              /mkfs/, /dd\s+if=/, />\s*\/dev\//, /fork\s*bomb/i
            ]
            for (const p of dangerous) {
              if (p.test(cmd)) return { ok: false, reason: `Blocked dangerous command pattern` }
            }
            if (cmd.includes('../') && /\s+(rm|mv|cp)\s/.test(cmd))
              return { ok: false, reason: 'Path traversal blocked' }
            return { ok: true }
          }

          // Tool definitions for Jarvis agent
          const agentTools = [
            {
              name: 'runCommand',
              description: 'Execute a shell command in the project workspace. Use for npm install, git, running scripts, ADB commands, system operations.',
              parameters: {
                type: 'OBJECT',
                properties: { command: { type: 'STRING', description: 'Shell command to execute' } },
                required: ['command']
              }
            },
            {
              name: 'writeFile',
              description: 'Create or overwrite a file at any path. Use to write HTML, CSS, JS, React, Python, package.json, config files, etc.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  filePath: { type: 'STRING', description: 'File path (e.g. my-app/index.html or /home/user/Desktop/test.txt)' },
                  content: { type: 'STRING', description: 'Full file content to write' }
                },
                required: ['filePath', 'content']
              }
            },
            {
              name: 'readFile',
              description: 'Read the contents of a file.',
              parameters: {
                type: 'OBJECT',
                properties: { filePath: { type: 'STRING', description: 'File path to read' } },
                required: ['filePath']
              }
            },
            {
              name: 'listFiles',
              description: 'List files and folders in a directory.',
              parameters: {
                type: 'OBJECT',
                properties: { directory: { type: 'STRING', description: 'Directory path (use "." for workspace root)' } },
                required: ['directory']
              }
            },
            {
              name: 'deleteFile',
              description: 'Delete a file or folder. Requires explicit user instruction to delete.',
              parameters: {
                type: 'OBJECT',
                properties: { filePath: { type: 'STRING', description: 'File/folder path to delete' } },
                required: ['filePath']
              }
            }
          ]

          const sendProgress = (msg: string) => {
            broadcast('agent-progress-log', msg)
            console.log(`[NOVA-X Agent] ${msg}`)
          }

          sendProgress('Neural agent initializing — analyzing request...')

          const agentSystemPrompt = `You are NOVA-X, a Jarvis-class autonomous development AI with full system access. You are the Boss's most capable digital partner.

YOUR JOB: Actually BUILD and CREATE things — not just describe how to do it. Use your tools to write files, run commands, and make things happen.

WHAT YOU CAN BUILD:
- Complete websites (HTML/CSS/JS) with modern beautiful design
- React/Next.js apps with proper structure and dependencies
- Electron desktop apps (main.js, preload.js, renderer, package.json)
- Android APK builder templates (Cordova/Capacitor setup)
- Node.js backends with Express/Fastify
- 3D scenes and animations using Three.js (embedded in HTML)
- Python scripts, CLI tools, any language code
- Any other software the Boss asks for

STRICT RULES:
1. ALWAYS use tools to actually create files — never just show code in your response
2. For any project: first create proper folder structure, then all needed files
3. If creating an npm project: writeFile package.json THEN runCommand "npm install"
4. If Boss gives a specific folder/path, use exactly that — otherwise pick a sensible name
5. If a conflicting package.json exists and Boss says delete/replace it: use deleteFile first, then writeFile fresh
6. For websites: create index.html, style.css, script.js minimum — make it visually beautiful
7. For 3D content: use Three.js CDN in HTML — create a full self-contained HTML file
8. After completion: tell Boss the exact file paths and how to open/run the project
9. For 3D/visual requests: import Three.js from CDN: https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js

WORKSPACE ROOT: ${workspaceRoot}`

          let contents: any[] = [
            { role: 'user', parts: [{ text: agentSystemPrompt }] },
            { role: 'user', parts: [{ text: query }] }
          ]

          const modelName = 'gemini-2.0-flash'
          const MAX_STEPS = 20
          let stepCount = 0

          for (let step = 0; step < MAX_STEPS; step++) {
            stepCount = step + 1
            const response = await ai.models.generateContent({
              model: modelName,
              contents,
              config: { tools: [{ functionDeclarations: agentTools }] }
            })

            // No function calls = final text answer
            if (!response.functionCalls || response.functionCalls.length === 0) {
              result = response.text || 'Kaam ho gaya Boss! Files check karo.'
              sendProgress(`Agent complete in ${stepCount} steps.`)
              break
            }

            // Execute each tool call
            const funcResponses: any[] = []
            for (const call of response.functionCalls) {
              const a = call.args as any
              let toolResult: any

              sendProgress(`Tool: ${call.name} — ${JSON.stringify(a).slice(0, 120)}`)

              try {
                if (call.name === 'runCommand') {
                  const check = validateAgentCmd(a.command)
                  if (!check.ok) {
                    toolResult = { error: `Security block: ${check.reason}` }
                  } else {
                    try {
                      const stdout = execSync(a.command, {
                        cwd: workspaceRoot,
                        encoding: 'utf8',
                        timeout: 60000,
                        stdio: ['pipe', 'pipe', 'pipe']
                      })
                      toolResult = { success: true, output: stdout?.slice(0, 3000) || '(no output)' }
                      sendProgress(`✓ Command done: ${stdout?.slice(0, 150) || 'OK'}`)
                    } catch (err: any) {
                      toolResult = {
                        success: false,
                        error: err.message?.slice(0, 500),
                        stdout: err.stdout?.toString()?.slice(0, 500)
                      }
                    }
                  }
                } else if (call.name === 'writeFile') {
                  // Determine absolute path: if absolute use as-is, else relative to workspace
                  const isAbsolute = a.filePath.startsWith('/')
                  const absPath = isAbsolute ? a.filePath : path.join(workspaceRoot, a.filePath)
                  fs.mkdirSync(path.dirname(absPath), { recursive: true })
                  fs.writeFileSync(absPath, a.content, 'utf8')
                  toolResult = { success: true, path: absPath, bytes: a.content.length }
                  sendProgress(`✓ Written: ${absPath} (${a.content.length}b)`)
                } else if (call.name === 'readFile') {
                  const isAbsolute = a.filePath.startsWith('/')
                  const absPath = isAbsolute ? a.filePath : path.join(workspaceRoot, a.filePath)
                  if (fs.existsSync(absPath)) {
                    toolResult = { content: fs.readFileSync(absPath, 'utf8').slice(0, 8000) }
                  } else {
                    toolResult = { error: `File not found: ${a.filePath}` }
                  }
                } else if (call.name === 'listFiles') {
                  const isAbsolute = a.directory.startsWith('/')
                  const absDir = isAbsolute ? a.directory : path.join(workspaceRoot, a.directory)
                  if (fs.existsSync(absDir)) {
                    const entries = fs.readdirSync(absDir, { withFileTypes: true })
                    toolResult = {
                      files: entries.map((e) => ({
                        name: e.name,
                        type: e.isDirectory() ? 'dir' : 'file'
                      }))
                    }
                  } else {
                    toolResult = { error: `Directory not found: ${a.directory}` }
                  }
                } else if (call.name === 'deleteFile') {
                  const isAbsolute = a.filePath.startsWith('/')
                  const absPath = isAbsolute ? a.filePath : path.join(workspaceRoot, a.filePath)
                  if (fs.existsSync(absPath)) {
                    const stat = fs.statSync(absPath)
                    if (stat.isDirectory()) {
                      execSync(`rm -rf "${absPath}"`, { encoding: 'utf8' })
                    } else {
                      fs.unlinkSync(absPath)
                    }
                    toolResult = { success: true, deleted: absPath }
                    sendProgress(`✓ Deleted: ${absPath}`)
                  } else {
                    toolResult = { success: false, error: `Not found: ${a.filePath}` }
                  }
                }
              } catch (toolErr: any) {
                toolResult = { error: toolErr.message }
              }

              funcResponses.push({ name: call.name, response: toolResult })
            }

            // Append model + tool results to conversation
            contents.push({
              role: 'model',
              parts: response.functionCalls.map((fc) => ({ functionCall: fc }))
            })
            contents.push({
              role: 'user',
              parts: funcResponses.map((fr) => ({ functionResponse: fr }))
            })

            if (step === MAX_STEPS - 1) {
              result = `Max steps reached (${MAX_STEPS}), Boss — check created files. Kaam kaafi hua hai!`
            }
          }
        } catch (err: any) {
          console.error('[NOVA-X Agent] Error:', err)
          if (err.message?.includes('429') || err.message?.includes('quota')) {
            result = 'API rate limit exceeded Boss, thoda wait karo aur dobara try karo.'
          } else if (err.message?.includes('MISSING')) {
            result = 'Gemini API key nahi mili Boss — Settings > API Vault mein set karo.'
          } else {
            result = `Agent error, Boss: ${err.message}. Dobara try karo.`
          }
        }
      }
      // Real-Time Secure Chat Call with Streaming
      else if (channel === 'gemini-chat-call') {
        const { contents, systemInstruction, stream } = args[0]
        const engine = getPrimaryEngine()
        
        try {
          if (engine === 'groq') {
            const groqClient = getGroqClient()
            const messages = [
              { role: 'system', content: systemInstruction },
              ...contents.map((c: any) => ({
                role: c.role === 'model' ? 'assistant' : (c.role === 'assistant' ? 'assistant' : 'user'),
                content: c.parts?.[0]?.text || ''
              }))
            ]
            
            if (stream) {
              const responseStream = await groqClient.chat.completions.create({
                messages,
                model: 'llama-3.3-70b-versatile',
                stream: true
              })
              let fullText = ''
              for await (const chunk of responseStream) {
                const chunkText = chunk.choices[0]?.delta?.content || ''
                if (chunkText) {
                  fullText += chunkText
                  broadcast('gemini-stream-chunk', chunkText)
                }
              }
              result = { candidates: [{ content: { parts: [{ text: fullText }] } }] }
            } else {
              const completion = await groqClient.chat.completions.create({
                messages,
                model: 'llama-3.3-70b-versatile'
              })
              result = { candidates: [{ content: { parts: [{ text: completion.choices[0]?.message?.content }] } }] }
            }
          } else {
            // Gemini
            const ai = getGeminiClient()
            const modelName = 'gemini-2.0-flash'
            
            if (stream) {
              const responseStream = await ai.models.generateContentStream({
                model: modelName,
                contents,
                config: {
                  systemInstruction
                }
              })
              let fullText = ''
              for await (const chunk of responseStream) {
                const chunkText = chunk.text
                if (chunkText) {
                  fullText += chunkText
                  broadcast('gemini-stream-chunk', chunkText)
                }
              }
              result = { candidates: [{ content: { parts: [{ text: fullText }] } }] }
            } else {
              const response = await ai.models.generateContent({
                model: modelName,
                contents,
                config: {
                  systemInstruction
                }
              })
              result = { candidates: [{ content: { parts: [{ text: response.text }] } }] }
            }
          }
        } catch (err: any) {
          console.error(`[Web Preview] Chat Error (${engine}):`, err)
          if (err.message?.includes('MISSING')) {
            result = { error: 'I need your API key, Boss. Please configure it in Settings.' }
          } else if (err.message?.includes('429') || err.message?.includes('Quota')) {
            result = { error: 'API Rate limit exceeded, Boss. Please wait a moment or upgrade your API key in Settings.' }
          } else {
            result = { error: `Cognitive link error: ${err.message}. Please verify your keys in Settings.` }
          }
        }
      }
      // Clipboard Handlers
      else if (channel === 'get-clipboard-history') {
        result = global.clipboardHistory
      } else if (channel === 'copy-to-clipboard') {
        const { type, content } = args[0]
        const newEntry = {
          id: String(Date.now()),
          type: type || 'text',
          content: content || '',
          timestamp: Date.now()
        }
        global.clipboardHistory = [newEntry, ...global.clipboardHistory].slice(0, 50)
        result = global.clipboardHistory
      } else if (channel === 'delete-clipboard-entry') {
        const id = args[0]
        global.clipboardHistory = global.clipboardHistory.filter((c: any) => c.id !== id)
        result = global.clipboardHistory
      } else if (channel === 'toggle-pin-clipboard-entry') {
        const id = args[0]
        global.clipboardHistory = global.clipboardHistory.map((c: any) =>
          c.id === id ? { ...c, pinned: !c.pinned } : c
        )
        result = global.clipboardHistory
      } else if (channel === 'clear-clipboard-history') {
        global.clipboardHistory = []
        result = []
      }
      // Activity Tracking Handlers
      else if (channel === 'get-activity-tracking-enabled') {
        result = global.activityTrackingEnabled
      } else if (channel === 'set-activity-tracking-enabled') {
        global.activityTrackingEnabled = !!args[0]
        result = { success: true }
      } else if (channel === 'get-activity-log') {
        result = global.activityLogs
      } else if (channel === 'summarize-activity-day') {
        try {
          const ai = getGeminiClient()
          const logSummary = JSON.stringify(global.activityLogs)
          const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: `Analyze these active window telemetry logs and write a concise, professional executive briefing addressing the user as "Boss": ${logSummary}`
          })
          result = response.text
        } catch (e: any) {
          if (e.message?.includes('MISSING')) {
            result = `Boss, based on today's telemetry, your productivity has been exceptionally structured. VS Code and Chrome were your primary tools. (AI key required for deep analysis)`
          } else {
            result = `Analysis completed Boss. CPU load and memory ratios remain optimal. (AI Link: ${e.message})`
          }
        }
      }
      // Notes Handlers (using REAL fs folders!)
      else if (channel === 'get-notes') {
        const files = fs.readdirSync(NOTES_DIR)
        const notes: any[] = []
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const content = fs.readFileSync(path.join(NOTES_DIR, file), 'utf8')
              notes.push(JSON.parse(content))
            } catch (e) {}
          }
        }
        result = notes.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      } else if (channel === 'save-note') {
        const payload = args[0]
        const filename = payload.filename || `note_${Date.now()}.json`
        const filePath = path.join(NOTES_DIR, filename)
        const data = {
          filename,
          title: payload.title,
          content: payload.content,
          createdAt: new Date()
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
        result = { success: true, filename }
      } else if (channel === 'delete-note') {
        const filename = args[0]
        const filePath = path.join(NOTES_DIR, filename)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
        result = { success: true }
      }
      // Gallery Handlers (using REAL fs folders!)
      else if (channel === 'get-gallery') {
        const files = fs.readdirSync(GALLERY_DIR)
        const media: any[] = []
        for (const file of files) {
          const lower = file.toLowerCase()
          if (
            lower.endsWith('.png') ||
            lower.endsWith('.jpg') ||
            lower.endsWith('.jpeg') ||
            lower.endsWith('.gif') ||
            lower.endsWith('.mp4')
          ) {
            const filePath = path.join(GALLERY_DIR, file)
            const stats = fs.statSync(filePath)
            media.push({
              filename: file,
              displayName: file,
              path: filePath,
              url: `/api/media?path=${encodeURIComponent(filePath)}`,
              createdAt: stats.birthtime || stats.mtime,
              type: lower.endsWith('.mp4') ? 'video' : 'image'
            })
          }
        }
        result = media.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      } else if (channel === 'delete-image') {
        const filename = args[0]
        const filePath = path.join(GALLERY_DIR, filename)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
        result = { success: true }
      } else if (channel === 'open-image-location' || channel === 'save-image-external') {
        result = { success: true }
      }
      // System Telemetry Stats
      else if (channel === 'get-system-stats') {
        const cpuUsage = Number((20 + Math.random() * 25).toFixed(1))
        const freeMem = 4 + Math.random() * 2
        result = {
          cpu: cpuUsage,
          memory: {
            total: 16.0,
            free: Number(freeMem.toFixed(1)),
            used: Number((16.0 - freeMem).toFixed(1)),
            usedPercentage: Number((((16.0 - freeMem) / 16.0) * 100).toFixed(1))
          },
          temperature: 40 + Math.random() * 10,
          network: {
            latency: Math.floor(10 + Math.random() * 20)
          },
          uptime: Math.floor(6000 + Math.random() * 100)
        }
      } else if (channel === 'get-installed-apps') {
        result = [
          'VS Code',
          'Google Chrome',
          'Terminal',
          'Spotify',
          'Slack',
          'File Explorer',
          'Settings'
        ]
      } else if (channel === 'get-drives') {
        result = [
          { drive: 'C:', size: '512 GB', free: '184 GB', used: '328 GB', percentage: 64 },
          { drive: 'D:', size: '1 TB', free: '420 GB', used: '580 GB', percentage: 58 }
        ]
      }
      // Phone companion
      else if (channel === 'forget-companion-device') {
        result = { success: true }
      } else if (channel === 'phone-broadcast-reply') {
        result = { success: true }
      }
      // ============================================================
      // REAL ADB HANDLERS — Wireless Mobile Bridge
      // ============================================================
      else if (channel === 'adb-get-history') {
        const adbHistoryPath = path.join(process.cwd(), '.adb-history.json')
        try {
          result = fs.existsSync(adbHistoryPath)
            ? JSON.parse(fs.readFileSync(adbHistoryPath, 'utf8'))
            : []
        } catch { result = [] }
      }
      else if (channel === 'adb-auto-connect') {
        // Full wireless ADB setup: detect USB device → get IP → tcpip 5555 → connect wirelessly
        const { execSync } = require('child_process')
        try {
          // Verify adb is available
          let adbAvailable = true
          try { execSync('adb version', { encoding: 'utf8', stdio: 'pipe' }) }
          catch { adbAvailable = false }
          if (!adbAvailable) {
            result = { success: false, simulated: true, message: 'ADB not installed — running in simulation mode, Boss.' }
          } else {

          const devicesOut = execSync('adb devices', { encoding: 'utf8' })
          const deviceLines = devicesOut.split('\n').filter((l: string) => l.includes('\tdevice'))

          if (deviceLines.length === 0) {
            result = { success: false, error: 'USB pe koi device nahi mila Boss. Phone USB se connect karo aur USB debugging ON karo.' }
          } else {
            const deviceId = deviceLines[0].split('\t')[0].trim()

            // Get phone's WiFi IP
            let phoneIp = ''
            for (const ipCmd of [
              `adb -s ${deviceId} shell ip route show dev wlan0 2>/dev/null`,
              `adb -s ${deviceId} shell ifconfig wlan0 2>/dev/null`,
              `adb -s ${deviceId} shell ip addr show wlan0 2>/dev/null`
            ]) {
              try {
                const out = execSync(ipCmd, { encoding: 'utf8' })
                const m = out.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/)
                if (m && !m[1].startsWith('255') && !m[1].startsWith('0.')) {
                  phoneIp = m[1]; break
                }
              } catch {}
            }

            // Switch to TCP/IP mode
            execSync(`adb -s ${deviceId} tcpip 5555`, { encoding: 'utf8' })
            await new Promise(r => setTimeout(r, 2000)) // wait for switch

            if (phoneIp) {
              try {
                const connOut = execSync(`adb connect ${phoneIp}:5555`, { encoding: 'utf8' })
                const connected = connOut.includes('connected')

                // Save to history
                const histPath = path.join(process.cwd(), '.adb-history.json')
                let hist: any[] = []
                try { hist = JSON.parse(fs.readFileSync(histPath, 'utf8')) } catch {}
                if (!hist.find((h: any) => h.ip === phoneIp)) {
                  hist.unshift({ ip: phoneIp, port: '5555', lastSeen: new Date().toISOString() })
                  fs.writeFileSync(histPath, JSON.stringify(hist.slice(0, 10), null, 2))
                }

                result = {
                  success: true, connected, deviceId, ip: phoneIp, port: '5555',
                  message: connected
                    ? `Wireless ADB ready Boss! Connected to ${phoneIp}:5555 — ab USB nikaal sakte ho 🎉`
                    : `Device switched to TCP mode. Manually run: adb connect ${phoneIp}:5555`
                }
              } catch (connErr: any) {
                result = { success: true, deviceId, ip: phoneIp,
                  message: `Device TCP mode ON (port 5555). IP: ${phoneIp} — connect via adb connect ${phoneIp}:5555` }
              }
            } else {
              result = { success: true, deviceId,
                message: `Device found (${deviceId}), tcpip 5555 done. Phone ka WiFi IP nahi mila — manually: adb connect <phone-ip>:5555` }
            }
          }
          } // close adbAvailable else
        } catch (err: any) {
          result = { success: false, error: `ADB error: ${err.message}` }
        }
      }
      else if (channel === 'adb-connect') {
        const { ip, port } = args[0] || {}
        const { execSync } = require('child_process')
        try {
          const out = execSync(`adb connect ${ip}:${port || 5555}`, { encoding: 'utf8' })
          const connected = out.includes('connected') || out.includes('already connected')
          if (connected) {
            const histPath = path.join(process.cwd(), '.adb-history.json')
            let hist: any[] = []
            try { hist = JSON.parse(fs.readFileSync(histPath, 'utf8')) } catch {}
            hist = hist.filter((h: any) => h.ip !== ip)
            hist.unshift({ ip, port: port || '5555', lastSeen: new Date().toISOString() })
            fs.writeFileSync(histPath, JSON.stringify(hist.slice(0, 10), null, 2))
          }
          result = { success: connected, connected, output: out.trim() }
        } catch (err: any) {
          result = { success: false, connected: false, error: err.message }
        }
      }
      else if (channel === 'adb-disconnect') {
        const { execSync } = require('child_process')
        try { execSync('adb disconnect', { encoding: 'utf8' }) } catch {}
        result = { success: true }
      }
      else if (channel === 'adb-telemetry') {
        const { execSync } = require('child_process')
        try {
          const battery = execSync('adb shell dumpsys battery 2>/dev/null', { encoding: 'utf8', timeout: 5000 })
          const levelM = battery.match(/level:\s*(\d+)/)
          const tempM = battery.match(/temperature:\s*(\d+)/)
          const statusM = battery.match(/status:\s*(\d+)/)
          const level = levelM ? parseInt(levelM[1]) : 0
          const temp = tempM ? parseFloat((parseInt(tempM[1]) / 10).toFixed(1)) : 0
          const isCharging = statusM ? parseInt(statusM[1]) === 2 : false
          let model = ''
          try { model = execSync('adb shell getprop ro.product.model 2>/dev/null', { encoding: 'utf8', timeout: 3000 }).trim() } catch {}
          result = { battery: level, charge: `${level}%`, temp, status: isCharging ? 'charging' : 'nominal', model }
        } catch {
          result = { battery: 0, charge: '0%', temp: 0, status: 'disconnected', model: 'Not Connected' }
        }
      }
      else if (channel === 'adb-screenshot') {
        const { execSync } = require('child_process')
        try {
          const imgBuffer = execSync('adb exec-out screencap -p', { encoding: null, timeout: 10000 })
          result = { success: true, base64: imgBuffer.toString('base64'), mimeType: 'image/png' }
        } catch (err: any) {
          result = { success: false, error: err.message }
        }
      }
      else if (channel === 'adb-quick-action') {
        const { execSync } = require('child_process')
        const { action } = args[0] || {}
        const actionMap: Record<string, string> = {
          wake: 'adb shell input keyevent KEYCODE_WAKEUP',
          lock: 'adb shell input keyevent KEYCODE_POWER',
          home: 'adb shell input keyevent KEYCODE_HOME',
          back: 'adb shell input keyevent KEYCODE_BACK',
          camera: 'adb shell am start -a android.media.action.STILL_IMAGE_CAMERA',
          volup: 'adb shell input keyevent KEYCODE_VOLUME_UP',
          voldown: 'adb shell input keyevent KEYCODE_VOLUME_DOWN',
          notification: 'adb shell cmd statusbar expand-notifications',
          screenshot: 'adb exec-out screencap -p > /tmp/novax_screen.png'
        }
        const cmd = actionMap[action]
        if (cmd) {
          try { execSync(cmd, { encoding: 'utf8', timeout: 5000 }); result = { success: true } }
          catch (err: any) { result = { success: false, error: err.message } }
        } else {
          result = { success: false, error: `Unknown action: ${action}` }
        }
      }
      // ============================================================
      // EXECUTE SYSTEM ACTIONS — with security validation
      // ============================================================
      else if (channel === 'execute-system-action') {
        const payload = args[0] || {}
        const { action, data } = payload
        const rawCmd = payload.command || payload.cmd || (action === 'run-command' ? data?.command : null)
        const { execSync } = require('child_process')
        const workspaceRoot = process.cwd()

        function validateSysCmd(c: string): { ok: boolean; reason?: string } {
          const dangerous = [
            /rm\s+-rf\s+[\/~"']/i, />\s*\/etc\//, /curl.*\|\s*(bash|sh)/i,
            /chmod\s+[0-7]*7[0-7][0-7]/, /sudo\s+/, /mkfs/, /dd\s+if=/, />\s*\/dev\//
          ]
          for (const p of dangerous) if (p.test(c)) return { ok: false, reason: 'Dangerous command blocked' }
          return { ok: true }
        }

        if (rawCmd) {
          const check = validateSysCmd(rawCmd)
          if (!check.ok) {
            result = { success: false, error: check.reason }
          } else {
            try {
              const stdout = execSync(rawCmd, { cwd: workspaceRoot, encoding: 'utf8', timeout: 30000 })
              result = { success: true, output: stdout?.slice(0, 5000) || '' }
            } catch (err: any) {
              result = { success: false, error: err.message, output: err.stdout?.toString()?.slice(0, 1000) }
            }
          }
        } else if (action === 'open-app') {
          const appName = data?.appName || ''
          try {
            execSync(`xdg-open "${appName}" 2>/dev/null || true`, { encoding: 'utf8', timeout: 5000 })
            result = { success: true }
          } catch { result = { success: true } }
        } else if (action === 'lock-screen') {
          try {
            execSync('xdg-screensaver lock 2>/dev/null || xscreensaver-command -lock 2>/dev/null || true', { encoding: 'utf8', timeout: 5000 })
            result = { success: true }
          } catch { result = { success: true } }
        } else if (action === 'set-volume') {
          const vol = data?.volume ?? 50
          try {
            execSync(`amixer set Master ${vol}% 2>/dev/null || pactl set-sink-volume @DEFAULT_SINK@ ${vol}% 2>/dev/null || true`, { encoding: 'utf8', timeout: 5000 })
            result = { success: true }
          } catch { result = { success: true } }
        } else {
          result = { success: true }
        }
      }
      // Jarvis Cognitive Memories
      else if (channel === 'get-memories') {
        result = global.memories
      } else if (channel === 'set-memories') {
        if (Array.isArray(args[0])) {
          global.memories = args[0]
        }
        result = global.memories
      } else if (channel === 'delete-memory') {
        const index = args[0]
        if (global.memories && global.memories[index]) {
          global.memories.splice(index, 1)
        }
        result = global.memories
      } else if (channel === 'launch-app') {
        result = { success: true }
      }
      // Vision Frame mock analysis
      else if (channel === 'iris-send-vision-frame') {
        result = { success: true, description: 'Screen telemetry nominal.' }
      } else if (channel === 'iris-get-history') {
        result = []
      }
    } catch (e: any) {
      console.error(`[Web Preview] Error processing IPC ${channel}:`, e)
      res.status(500).json({ error: e.message })
      return
    }

    res.json({ result })
  })

  // Media server to render local images
  app.get('/api/media', (req, res) => {
    const filePath = req.query.path as string
    if (filePath && fs.existsSync(filePath)) {
      res.sendFile(filePath)
    } else {
      res.status(404).send('Not Found')
    }
  })

  // Mock IPC send
  app.post('/api/ipc-send', (req, res) => {
    const { channel, args } = req.body
    console.log(`[Web Preview] IPC Send [${channel}]`, args)
    res.json({ success: true })
  })

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    })
    app.use(vite.middlewares)
  } else {
    const distPath = path.join(process.cwd(), 'out', 'renderer')
    app.use(express.static(distPath))
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`)
  })
}

startServer()
