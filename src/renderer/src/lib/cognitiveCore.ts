// Cognitive Core: shared mood + context state for NOVA-X
// Drives the 3D sphere's visual mood and retains conversation context across turns.

export type Mood =
  | 'idle'      // dormant, awaiting input
  | 'curious'   // processing a question
  | 'focused'   // deep reasoning / long task
  | 'pleased'   // positive outcome / agreement
  | 'alert'     // detected urgency / error / concern
  | 'speaking'  // actively voicing a response

export interface MoodState {
  mood: Mood
  intensity: number // 0..1, cognitive load / emotional strength
  ts: number
}

type Listener = (state: MoodState) => void

const listeners = new Set<Listener>()
let current: MoodState = { mood: 'idle', intensity: 0, ts: Date.now() }

export function getMood(): MoodState {
  return current
}

export function setMood(mood: Mood, intensity = 0.5): void {
  current = { mood, intensity: Math.max(0, Math.min(1, intensity)), ts: Date.now() }
  listeners.forEach((l) => {
    try {
      l(current)
    } catch (e) {
      console.error('[CognitiveCore] mood listener error', e)
    }
  })
}

export function onMoodChange(l: Listener): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

// Lightweight emotional-nuance detector. Analyzes text for sentiment/urgency cues
// and maps to a mood + intensity. This is heuristic, not ML — fast and offline.
const POSITIVE = /\b(good|great|excellent|perfect|thanks|thank you|awesome|love|nice|well done|brilliant|fantastic|yes|correct|exactly|spot on)\b/i
const NEGATIVE = /\b(bad|wrong|error|fail|broken|stuck|hate|terrible|not working|crash|issue|problem|urgent|asap|now|help|stuck|annoying)\b/i
const QUESTION = /\b(what|why|how|when|where|who|which|can you|could you|do you|is it|are we|should i|explain|tell me|what's)\b/i
const URGENT = /\b(urgent|asap|immediately|now|quickly|emergency|critical|right now|help me)\b/i
const LONG_TASK = /\b(analyze|compile|build|deploy|search|scan|monitor|generate|create|write|refactor|process|calculate)\b/i

export function detectMood(text: string, isUserInput = true): MoodState {
  const t = text.trim()
  if (!t) return { mood: 'idle', intensity: 0, ts: Date.now() }

  if (URGENT.test(t)) return { mood: 'alert', intensity: 0.9, ts: Date.now() }
  if (NEGATIVE.test(t)) return { mood: 'alert', intensity: 0.6, ts: Date.now() }
  if (QUESTION.test(t) && isUserInput) return { mood: 'curious', intensity: 0.55, ts: Date.now() }
  if (POSITIVE.test(t)) return { mood: 'pleased', intensity: 0.5, ts: Date.now() }
  if (LONG_TASK.test(t)) return { mood: 'focused', intensity: 0.75, ts: Date.now() }

  // Default: mild curiosity for user, gentle focus for model output
  return isUserInput
    ? { mood: 'curious', intensity: 0.35, ts: Date.now() }
    : { mood: 'focused', intensity: 0.3, ts: Date.now() }
}

// Mood → color mapping used by both the 3D sphere and any 2D HUD fallback.
export const MOOD_COLORS: Record<Mood, { primary: string; secondary: string; accent: string }> = {
  idle: { primary: '#00f3ff', secondary: '#39ff14', accent: '#00f3ff' },
  curious: { primary: '#00ccff', secondary: '#00aaff', accent: '#00f3ff' },
  focused: { primary: '#ffaa00', secondary: '#ff7700', accent: '#ffdd00' },
  pleased: { primary: '#39ff14', secondary: '#00ff88', accent: '#88ff00' },
  alert: { primary: '#ff3300', secondary: '#ff0044', accent: '#ff6600' },
  speaking: { primary: '#ff0077', secondary: '#ff00bb', accent: '#ff66aa' }
}
