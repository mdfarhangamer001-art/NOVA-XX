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
      // Agent orchestration (Upgraded model!)
      else if (channel === 'agent-run-task') {
        try {
          const ai = getGeminiClient()
          const query = args[0]
          const execSync = require('child_process').execSync
          const workspaceRoot = process.cwd()

          const runCommandDeclaration = {
            name: 'runCommand',
            description:
              'Executes a shell command on the host machine. Can be used to create files, build apps, deploy websites, or change system settings.',
            parameters: {
              type: 'OBJECT',
              properties: {
                command: {
                  type: 'STRING',
                  description: 'The shell command to execute.'
                }
              },
              required: ['command']
            }
          }

          let contents = [
            {
              role: 'user',
              parts: [
                {
                  text: 'You are NOVA-X, an advanced autonomous AI desktop assistant. You have full system control. Fulfill the operator\'s request. If asked to create a website, use runCommand to create files (e.g. echo "code" > index.html) and deploy it if requested. If asked to change wallpaper, use runCommand with appropriate OS commands. Ensure you execute tasks for real, do not simulate.'
                }
              ]
            },
            { role: 'user', parts: [{ text: query }] }
          ]

          const modelName = 'gemini-2.0-flash'
          const response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              tools: [{ functionDeclarations: [runCommandDeclaration] }]
            }
          })

          let finalResponse = response

          if (finalResponse.functionCalls?.[0]) {
            const call = finalResponse.functionCalls[0]
            
            console.log('[Web Preview] Executing command:', call.args.command)
            let resultOutput
            try {
              const stdout = execSync(call.args.command as string, { cwd: workspaceRoot, encoding: 'utf8' })
              resultOutput = { success: true, output: stdout.slice(0, 2000) }
            } catch (err) {
              resultOutput = { success: false, error: err.message }
            }

            contents.push({ role: 'model', parts: [{ functionCall: call }] })
            contents.push({
              role: 'user',
              parts: [{ functionResponse: { name: 'runCommand', response: resultOutput } }]
            })

            const followUp = await ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                tools: [{ functionDeclarations: [runCommandDeclaration] }]
              }
            })
            finalResponse = followUp
          }

          result = finalResponse.text
        } catch (err) {
          console.error('[Web Preview] Agent Error:', err)
          result = 'Sorry, there was an error processing your request: ' + err.message
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
      } else if (channel === 'adb-get-history') {
        result = []
      } else if (channel === 'adb-connect') {
        result = { success: true, connected: true }
      } else if (channel === 'adb-disconnect') {
        result = { success: true }
      } else if (channel === 'adb-telemetry') {
        result = { battery: 84, charge: '84%', temp: 36.2, status: 'nominal' }
      } else if (channel === 'adb-screenshot') {
        result = { success: true }
      } else if (channel === 'adb-quick-action') {
        result = { success: true }
      } else if (channel === 'phone-broadcast-reply') {
        result = { success: true }
      }
      // Execute system terminal commands (REAL Terminal!)
      else if (channel === 'execute-system-action') {
        const payload = args[0]
        const cmd = payload.command || payload.cmd
        const execSync = require('child_process').execSync
        if (cmd) {
          try {
            const stdout = execSync(cmd, { cwd: process.cwd(), encoding: 'utf8' })
            result = { success: true, output: stdout }
          } catch (err: any) {
            result = { success: false, error: err.message }
          }
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
