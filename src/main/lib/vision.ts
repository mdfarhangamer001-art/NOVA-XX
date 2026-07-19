/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain } from 'electron'
import { GoogleGenAI, Type } from '@google/genai'
import { getGeminiApiKey } from './secureKeys'

let lastCallTime = 0
let lastResult: any = null
const THROTTLE_LIMIT_MS = 1500

// Self-correction cooldown: even when frames aren't throttled, we don't
// want to re-surface the SAME anomaly to the user every single frame.
// We remember the last anomaly description and only re-alert if it
// changes, or after this cooldown elapses.
let lastAnomalySignature: string | null = null
let lastAnomalyAlertTime = 0
const ANOMALY_REALERT_COOLDOWN_MS = 30000

const VISION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    activeApplication: {
      type: Type.STRING,
      description: 'Best guess at the application or window currently in focus.'
    },
    workflowSummary: {
      type: Type.STRING,
      description: 'One or two sentence summary of what the user appears to be doing.'
    },
    anomalyDetected: {
      type: Type.BOOLEAN,
      description: 'True if there is an error dialog, crash, stuck/frozen state, failed build, broken UI, or other actionable problem visible on screen.'
    },
    anomalyDescription: {
      type: Type.STRING,
      description: 'If anomalyDetected is true, a concise description of the problem. Empty string otherwise.'
    },
    suggestedAction: {
      type: Type.STRING,
      description: 'If anomalyDetected is true, a concrete, specific suggestion for how to fix or respond to it. Empty string otherwise.'
    },
    severity: {
      type: Type.STRING,
      enum: ['none', 'low', 'medium', 'high'],
      description: 'How urgent the anomaly is. "none" if nothing is wrong.'
    }
  },
  required: ['activeApplication', 'workflowSummary', 'anomalyDetected', 'anomalyDescription', 'suggestedAction', 'severity']
}

export function registerVisionHandlers(): void {
  ipcMain.removeHandler('iris-send-vision-frame')
  ipcMain.handle('iris-send-vision-frame', async (_event, base64Frame: string) => {
    const now = Date.now()
    if (now - lastCallTime < THROTTLE_LIMIT_MS && lastResult) {
      console.log(`[Screen Vision] Throttled request. Returning cached analysis.`)
      return { ...lastResult, throttled: true }
    }
    try {
      const apiKey = getGeminiApiKey()
      if (!apiKey) {
      throw new Error('Gemini API Key is missing. Please set it in Settings > NOVA-X Vault.')
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      })

      // Strip data URL scheme prefix if present
      let rawBase64 = base64Frame
      let mimeType = 'image/jpeg'
      if (base64Frame.includes(';base64,')) {
        const parts = base64Frame.split(';base64,')
        rawBase64 = parts[1]
        const mimeMatch = parts[0].match(/data:(.*)/)
        if (mimeMatch) {
          mimeType = mimeMatch[1]
        }
      }

      console.log(`[Screen Vision] Processing screen frame of mime: ${mimeType}`)

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            inlineData: {
              data: rawBase64,
              mimeType: mimeType
            }
          },
          'Analyze this screen capture. Identify the active application, summarize the user\'s workflow, ' +
          'and specifically look for error dialogs, crash reports, failed builds/tests, frozen/unresponsive ' +
          'UI, red error text/tracebacks, or anything else that looks broken and actionable. ' +
          'Respond ONLY with the structured JSON described by the schema.'
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: VISION_RESPONSE_SCHEMA
        }
      })

      let parsed: any
      try {
        parsed = JSON.parse(response.text || '{}')
      } catch (parseErr) {
        console.error('[Screen Vision] Failed to parse structured response, falling back to raw text:', parseErr)
        parsed = {
          activeApplication: 'unknown',
          workflowSummary: response.text || 'No analysis returned from model.',
          anomalyDetected: false,
          anomalyDescription: '',
          suggestedAction: '',
          severity: 'none'
        }
      }

      // Decide whether this anomaly should actually surface to the user,
      // vs. being suppressed as a repeat of what we already flagged.
      let shouldAlert = false
      if (parsed.anomalyDetected && parsed.severity && parsed.severity !== 'none') {
        const signature = `${parsed.anomalyDescription}`.trim()
        const nowTs = Date.now()
        const isNewAnomaly = signature !== lastAnomalySignature
        const cooldownElapsed = nowTs - lastAnomalyAlertTime > ANOMALY_REALERT_COOLDOWN_MS
        if (signature && (isNewAnomaly || cooldownElapsed)) {
          shouldAlert = true
          lastAnomalySignature = signature
          lastAnomalyAlertTime = nowTs
        }
      } else {
        // Screen looks fine again — reset so a recurring issue re-alerts.
        lastAnomalySignature = null
      }

      lastCallTime = Date.now()
      lastResult = {
        success: true,
        analysis: parsed.workflowSummary,
        activeApplication: parsed.activeApplication,
        anomalyDetected: !!parsed.anomalyDetected,
        anomalyDescription: parsed.anomalyDescription || '',
        suggestedAction: parsed.suggestedAction || '',
        severity: parsed.severity || 'none',
        shouldAlert
      }
      return lastResult

    } catch (err: any) {
      console.error('[Screen Vision Error] failed to process vision frame:', err)
      return { success: false, error: err.message }
    }
  })
}
