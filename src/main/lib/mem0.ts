import fs from 'fs'
import path from 'path'
import { getGeminiClient, getGeminiModelName } from '../ai-clients'

const MEMORY_FILE = path.join(process.cwd(), 'notes', 'novax_multilayer_memory.json')

export interface MultiLayerMemory {
  workingMemory: string[];
  recentMemory: { text: string; timestamp: number }[];
  factMemory: { id: string; fact: string; timestamp: number }[];
  reflectionMemory: { id: string; pattern: string; timestamp: number }[];
  personalityMemory: { activeAvatar: string };
}

// Read multi-layer memory from disk
export function readMultiLayerMemory(): MultiLayerMemory {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const data = fs.readFileSync(MEMORY_FILE, 'utf8')
      return JSON.parse(data)
    }
  } catch (e) {
    console.warn('[Mem0 Cognitive Engine] Error reading multilayer memory file:', e)
  }
  return {
    workingMemory: [],
    recentMemory: [],
    factMemory: [
      { id: '1', fact: 'Operator preference is a dark slate futuristic UI with minimal telemetry.', timestamp: Date.now() }
    ],
    reflectionMemory: [],
    personalityMemory: { activeAvatar: 'neo' }
  }
}

// Write multi-layer memory to disk
export function writeMultiLayerMemory(mem: MultiLayerMemory) {
  try {
    const dir = path.dirname(MEMORY_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(mem, null, 2), 'utf8')
    // Synchronize global memory reference if it exists
    if ((global as any).memories) {
      (global as any).memories = mem.factMemory
    }
  } catch (e) {
    console.warn('[Mem0 Cognitive Engine] Error writing multilayer memory file:', e)
  }
}

/**
 * 1. Fact-Extraction Pipeline
 * Runs in the background after a conversation turn. Extracts explicit user facts or workflow preferences.
 */
export async function extractAndStoreFacts(userMessage: string, assistantMessage: string, geminiKey?: string): Promise<void> {
  try {
    const ai = getGeminiClient(geminiKey)
    const model = await getGeminiModelName(ai, 'chat')

    const prompt = `You are the Mem0-inspired Cognitive Fact Extraction Engine for NOVA-X.
Your task is to analyze the following single turn of human-AI conversation.
Extract ANY key long-term personal facts, hobbies, preferences, constraints, names, or professional details about the human operator.
Do NOT extract transient requests or conversational filler (e.g. "say hello"). Only extract durable facts.

Conversation:
Human: "${userMessage}"
Assistant: "${assistantMessage}"

Output format:
Your output MUST be a valid JSON array of strings containing ONLY the extracted facts (e.g., ["Operator is a software developer", "Operator works on Python projects", "Operator prefers warm coffee"]).
If NO new long-term facts are found, output an empty JSON array: []
Do not include markdown tags like \`\`\`json or any conversational prefix. Output ONLY raw JSON.`

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    })

    const text = response.text?.trim() || '[]'
    let extractedFacts: string[] = []
    try {
      extractedFacts = JSON.parse(text)
    } catch {
      // Fallback: strip markdown json blocks if model returned them
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim()
      extractedFacts = JSON.parse(cleanJson)
    }

    if (Array.isArray(extractedFacts) && extractedFacts.length > 0) {
      const memory = readMultiLayerMemory()
      let modified = false

      for (const fact of extractedFacts) {
        if (!fact || typeof fact !== 'string' || fact.trim() === '') continue
        
        // Prevent near-duplicate insertions
        const isDuplicate = memory.factMemory.some(
          m => m.fact.toLowerCase().includes(fact.toLowerCase().trim()) || 
               fact.toLowerCase().trim().includes(m.fact.toLowerCase())
        )
        if (!isDuplicate) {
          memory.factMemory.push({
            id: String(Date.now() + Math.random().toString(36).substr(2, 5)),
            fact: fact.trim(),
            timestamp: Date.now()
          })
          modified = true
          console.log(`[Mem0 Extraction] Extracted and stored fact: "${fact}"`)
        }
      }

      if (modified) {
        writeMultiLayerMemory(memory)
      }
    }
  } catch (err) {
    console.error('[Mem0 Extraction] Background fact extraction failed:', err)
  }
}

/**
 * Update Working Memory (Short-Term Conversational Context)
 * Keeps a rotating buffer of active topics to prevent the AI from repeating recent details.
 */
export function updateWorkingMemory(userMessage: string, assistantMessage: string): void {
  try {
    const memory = readMultiLayerMemory()
    if (!memory.workingMemory) {
      memory.workingMemory = []
    }

    // Clean up input to avoid extremely long lines
    const cleanUser = userMessage.trim().substring(0, 150)
    const cleanAssistant = assistantMessage.trim().substring(0, 150)
    const entry = `[Context] User: "${cleanUser}" -> Assistant: "${cleanAssistant}"`

    memory.workingMemory.push(entry)

    // Keep the last 10 working memory entries
    if (memory.workingMemory.length > 10) {
      memory.workingMemory.shift()
    }

    writeMultiLayerMemory(memory)
    console.log('[Mem0 Working Memory] Successfully logged working context:', entry)
  } catch (err) {
    console.error('[Mem0 Working Memory] Failed to update working memory:', err)
  }
}

/**
 * 2. Agent-Confirmed Action Storage
 * Stores actions strictly when they have been executed successfully to avoid fake-confirmation issues.
 */
export function recordConfirmedAction(actionType: string, description: string): void {
  try {
    const memory = readMultiLayerMemory()
    const text = `Successfully executed action [${actionType}]: ${description}`
    
    // Add to recent memory with a strict timestamp
    memory.recentMemory.push({
      text,
      timestamp: Date.now()
    })

    // Keep the last 30 confirmed actions
    if (memory.recentMemory.length > 30) {
      memory.recentMemory.shift()
    }

    writeMultiLayerMemory(memory)
    console.log(`[Mem0 Action Storage] Saved verified success: "${text}"`)
  } catch (e) {
    console.warn('[Mem0 Action Storage] Failed to record confirmed action:', e)
  }
}

/**
 * 3. Multi-Signal Retrieval & 4. Temporal Reasoning Layer
 * Matches cognitive records combining keyword intersection, entity overlap, and temporal constraints.
 */
export function retrieveMemories(query: string, limit = 10): { id: string; text: string; score: number; type: string; timestamp: number }[] {
  const memory = readMultiLayerMemory()
  const lowercaseQuery = query.toLowerCase()
  
  // Temporal reasoning: extract target timeframe based on query relative terms
  let startTime = 0
  let endTime = Infinity
  const now = Date.now()
  const MS_PER_DAY = 24 * 60 * 60 * 1000

  if (lowercaseQuery.includes('today') || lowercaseQuery.includes('aaj')) {
    startTime = new Date().setHours(0, 0, 0, 0)
  } else if (lowercaseQuery.includes('yesterday') || lowercaseQuery.includes('kal')) {
    startTime = new Date().setHours(0, 0, 0, 0) - MS_PER_DAY
    endTime = new Date().setHours(23, 59, 59, 999) - MS_PER_DAY
  } else if (lowercaseQuery.includes('this week')) {
    startTime = now - (7 * MS_PER_DAY)
  } else if (lowercaseQuery.includes('recently') || lowercaseQuery.includes('abbi')) {
    startTime = now - (2 * MS_PER_DAY)
  }

  const results: { id: string; text: string; score: number; type: string; timestamp: number }[] = []

  // Combine fact memory and recent verified action memories
  const allCandidates = [
    ...memory.factMemory.map(f => ({ id: f.id, text: f.fact, timestamp: f.timestamp, type: 'fact' })),
    ...memory.recentMemory.map((r, idx) => ({ id: `act-${idx}`, text: r.text, timestamp: r.timestamp, type: 'action' }))
  ]

  // Extract query tokens for term matching
  const queryTokens = lowercaseQuery.split(/[\s,?.!]+/).filter(t => t.length > 3)

  for (const item of allCandidates) {
    let score = 0
    const itemTextLower = item.text.toLowerCase()

    // Signal A: Pure semantic word match score
    for (const token of queryTokens) {
      if (itemTextLower.includes(token)) {
        score += 2.0
      }
    }

    // Signal B: Keyword match with whole phrase boosts
    if (itemTextLower.includes(lowercaseQuery)) {
      score += 5.0
    }

    // Signal C: Temporal Overlap Boost
    if (item.timestamp >= startTime && item.timestamp <= endTime) {
      if (startTime > 0) {
        score += 8.0 // High priority boost if specifically matching requested timeframe
      } else {
        score += 1.0 // Slight recency boost
      }
    }

    // Filter out matches with zero score if searching, otherwise prioritize
    if (score > 0 || lowercaseQuery.trim() === '') {
      results.push({
        id: item.id,
        text: item.text,
        score,
        type: item.type,
        timestamp: item.timestamp
      })
    }
  }

  // Sort by score first, then recency
  return results
    .sort((a, b) => b.score - a.score || b.timestamp - a.timestamp)
    .slice(0, limit)
}
