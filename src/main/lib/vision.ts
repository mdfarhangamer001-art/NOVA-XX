/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain, safeStorage } from 'electron'
import { GoogleGenAI } from '@google/genai'
import os from 'os'
import Store from 'electron-store'

const store = new Store()

import { getGeminiClient } from '../ai-clients'

let lastCallTime = 0
let lastResult: any = null
const THROTTLE_LIMIT_MS = 1500

export function registerVisionHandlers(): void {
  ipcMain.removeHandler('iris-send-vision-frame')
  ipcMain.handle('iris-send-vision-frame', async (_event, base64Frame: string) => {
    const now = Date.now()
    if (now - lastCallTime < THROTTLE_LIMIT_MS && lastResult) {
      console.log(`[Screen Vision] Throttled request. Returning cached analysis.`)
      return { ...lastResult, throttled: true }
    }
    try {
      const ai = getGeminiClient()

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
        model: 'gemini-3.5-flash',
        contents: [
          {
            inlineData: {
              data: rawBase64,
              mimeType: mimeType
            }
          },
          { text: "analyze screen workflow. Identify the active application, detect text and code components, check if there are any visual anomalies, and summarize the user's workflow context." }
        ]
      })

      lastCallTime = Date.now()
      lastResult = {
        success: true,
        analysis: response.text || 'No analysis returned from model.'
      }
      return lastResult
    } catch (err: any) {
      console.error('[Screen Vision Error] failed to process vision frame:', err)
      return { success: false, error: err.message }
    }
  })
}
