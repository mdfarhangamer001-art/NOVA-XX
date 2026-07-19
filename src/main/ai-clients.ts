
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
      console.log('[AI Clients] Loaded credentials.json')
    } catch (err) {
      console.error('[AI Clients] Failed to read credentials.json:', err)
    }
  }
}

// Initial load
loadCredentials()

export function getApiKey(key: string, envVal?: string): string {
  // Always reload to ensure we have the latest if something else updated it
  loadCredentials()
  
  if (removedKeys[key]) return ''
  if (mockKeys[key] === '') return ''
  return mockKeys[key] || envVal || ''
}

export function saveKeys(newKeys: any) {
  mockKeys = { ...mockKeys, ...newKeys }
  
  Object.keys(newKeys).forEach(key => {
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
    fs.writeFileSync(credentialsPath, JSON.stringify({
      keys: mockKeys,
      removed: removedKeys,
      primaryEngine: primaryEngine
    }, null, 2), 'utf8')
    console.log('[AI Clients] Keys saved to credentials.json')
  } catch (err) {
    console.error('[AI Clients] Failed to save keys:', err)
  }
}

export function getGeminiClient() {
  const apiKey = getApiKey('geminiKey', process.env.GEMINI_API_KEY)
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING')
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

export function getGroqClient() {
  const apiKey = getApiKey('groqKey', process.env.GROQ_API_KEY)
  if (!apiKey) {
    throw new Error('GROQ_API_KEY_MISSING')
  }
  return new Groq({ apiKey })
}

export function getPrimaryEngine() {
  return primaryEngine
}
