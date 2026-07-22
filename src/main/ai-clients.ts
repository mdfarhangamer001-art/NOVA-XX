import { GoogleGenAI } from '@google/genai'
import Groq from 'groq-sdk'
import fs from 'fs'
import path from 'path'

const credentialsPath = path.join(process.cwd(), 'credentials.json')

interface MockKeys {
  [key: string]: string
}

let mockKeys: MockKeys = {}
let removedKeys: { [key: string]: boolean } = {}
let primaryEngine = 'gemini'

function loadCredentials() {
  if (fs.existsSync(credentialsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))
      if (data.keys) {
        mockKeys = data.keys
        removedKeys = data.removed || {}
        primaryEngine = data.primaryEngine || 'gemini'
      } else {
        mockKeys = data
      }
      console.log('[AI Clients] Loaded credentials.json. Keys found:', Object.keys(mockKeys).length)
    } catch (err) {
      console.error('[AI Clients] Failed to read credentials.json:', err)
    }
  } else {
    console.log('[AI Clients] credentials.json does not exist at:', credentialsPath)
  }
}

// Initial load
loadCredentials()

export function getApiKey(key: string, envVal?: string): string {
  if (removedKeys[key]) return ''
  if (mockKeys[key] === '') return ''
  return mockKeys[key] || envVal || ''
}

export function saveKeys(newKeys: any) {
  mockKeys = { ...mockKeys, ...newKeys }

  Object.keys(newKeys).forEach((key) => {
    if (newKeys[key] === '') {
      removedKeys[key] = true
    } else if (newKeys[key]) {
      removedKeys[key] = false
    }
  })

  if (newKeys.primaryEngine) {
    primaryEngine = newKeys.primaryEngine
  }

  try {
    fs.writeFileSync(
      credentialsPath,
      JSON.stringify(
        {
          keys: mockKeys,
          removed: removedKeys,
          primaryEngine: primaryEngine
        },
        null,
        2
      ),
      'utf8'
    )
    console.log('[AI Clients] Keys saved to credentials.json')
  } catch (err) {
    console.error('[AI Clients] Failed to save keys:', err)
  }
}

export function getGeminiClient(providedKey?: string) {
  const apiKey = providedKey || getApiKey('geminiKey', process.env.GEMINI_API_KEY)
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_')) {
    throw new Error(
      'GEMINI_API_KEY_MISSING: Please configure your Gemini API key in the application settings or environment variables.'
    )
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  })
}

let modelCache: Record<string, string> = {
  chat: 'gemini-2.5-flash',
  vision: 'gemini-2.5-flash',
  agent: 'gemini-2.5-flash',
  transcribe: 'gemini-2.5-flash'
}

let lastRefreshTime = 0
const REFRESH_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours

async function refreshModelCache(ai: any, task: 'chat' | 'vision' | 'agent' | 'transcribe') {
  const now = Date.now()
  if (now - lastRefreshTime < REFRESH_INTERVAL) {
    return
  }
  lastRefreshTime = now
  try {
    const listResponse = await ai.models.list()
    const models = listResponse.models || listResponse || []
    if (Array.isArray(models)) {
      let filtered = models
        .map((m: any) => m.name || m.id || '')
        .filter((n: string) => n.toLowerCase().includes('gemini'))

      if (filtered.length > 0) {
        let matches = filtered
        if (task === 'agent') {
          matches = filtered.filter((n) => n.includes('flash') || n.includes('pro'))
        } else {
          matches = filtered.filter((n) => n.includes('flash'))
        }

        if (matches.length > 0) {
          matches.sort((a, b) => b.localeCompare(a))
          const chosen = matches[0]
          const finalModel = chosen.startsWith('models/') ? chosen.replace('models/', '') : chosen
          modelCache[task] = finalModel
        }
      }
    }
  } catch (err) {
    // Silently handle background refresh failures
  }
}

export async function getGeminiModelName(
  ai: any,
  task: 'chat' | 'vision' | 'agent' | 'transcribe' = 'chat'
): Promise<string> {
  const cached = modelCache[task]
  // Fire off background refresh so future requests are always accurate, but return immediately
  refreshModelCache(ai, task).catch(() => {})
  return cached || 'gemini-2.5-flash'
}

export function getGroqClient(providedKey?: string) {
  const apiKey = providedKey || getApiKey('groqKey', process.env.GROQ_API_KEY)
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_')) {
    throw new Error(
      'GROQ_API_KEY_MISSING: Please configure your Groq API key in the application settings or environment variables.'
    )
  }
  return new Groq({ apiKey })
}

export function getPrimaryEngine() {
  return primaryEngine
}
